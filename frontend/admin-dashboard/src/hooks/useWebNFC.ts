import { useState, useCallback, useEffect, useRef } from 'react';

interface NFCScanResult {
  success: boolean;
  serialNumber?: string;
  error?: string;
}

// NFC Bridge Server URLs
const NFC_BRIDGE_URL = import.meta.env.VITE_NFC_BRIDGE_URL || 'http://localhost:8765';
const NFC_WS_URL = import.meta.env.VITE_NFC_WS_URL || 'ws://localhost:9090';

/**
 * Hook for NFC scanning integration
 * Supports:
 * 1. WebSocket connection to Node.js NFC service (works in any browser)
 * 2. Web NFC API (Android Chrome/Edge only)
 */
export const useWebNFC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bridgeAvailable, setBridgeAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const scanCallbackRef = useRef<((result: NFCScanResult) => void) | null>(null);
  const autoScanCallbacksRef = useRef<Set<(uid: string) => void>>(new Set());

  // Check if NFC Bridge Server is running
  const checkBridgeServer = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`${NFC_BRIDGE_URL}/status`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        return data.nfc_available === true || data.reader_connected === true;
      }
      return false;
    } catch (err) {
      return false;
    }
  }, []);

  // Connect to WebSocket NFC service
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return; // Already connected or connecting
    }

    try {
      const ws = new WebSocket(NFC_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Connected to NFC WebSocket service');
        setIsConnected(true);
        setIsSupported(true);
        setBridgeAvailable(true);
        reconnectAttempts.current = 0;
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'SCAN' && data.uid) {
            // Card scanned!
            console.log('📨 WebSocket SCAN message received:', data.uid);
            const result: NFCScanResult = {
              success: true,
              serialNumber: data.uid,
            };
            
            // Call the manual scan callback if set
            if (scanCallbackRef.current) {
              console.log('   → Calling manual scan callback');
              scanCallbackRef.current(result);
              scanCallbackRef.current = null;
            }
            
            // Notify all auto-scan subscribers
            console.log(`   → Notifying ${autoScanCallbacksRef.current.size} auto-scan subscriber(s)`);
            autoScanCallbacksRef.current.forEach((callback, index) => {
              try {
                console.log(`   → Calling auto-scan callback ${index + 1}`);
                callback(data.uid);
              } catch (err) {
                console.error(`   ❌ Error in auto-scan callback ${index + 1}:`, err);
              }
            });
            
            setIsScanning(false);
          } else if (data.type === 'CONNECTED') {
            setIsConnected(true);
            setBridgeAvailable(data.nfc_available || data.reader_connected);
          } else if (data.type === 'ERROR' || data.type === 'READER_ERROR') {
            setError(data.error || 'NFC reader error');
            setIsScanning(false);
            
            if (scanCallbackRef.current) {
              scanCallbackRef.current({
                success: false,
                error: data.error || 'NFC reader error',
              });
              scanCallbackRef.current = null;
            }
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (err) => {
        // Only log error if we've tried connecting (not on initial silent connection attempt)
        if (reconnectAttempts.current > 0) {
          // Silently handle connection errors - service might not be running
          setIsConnected(false);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        wsRef.current = null;
        
        // Only attempt to reconnect if it wasn't a clean close and we haven't exceeded max attempts
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            // Silently reconnect - don't spam console
            connectWebSocket();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          // Only set error if we've exhausted reconnection attempts
          // Don't show error if service simply isn't running (expected behavior)
          setBridgeAvailable(false);
        }
      };
    } catch (err) {
      // Silently handle - service might not be available
      setIsConnected(false);
      setBridgeAvailable(false);
    }
  }, []);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  // Check if Web NFC is supported (non-state-updating version)
  const checkSupport = useCallback(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return 'NDEFReader' in window;
  }, []);

  // Check for NFC support on mount and connect WebSocket
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Check if Web NFC API is available (Android Chrome/Edge)
    const webNfcSupported = 'NDEFReader' in window;
    
    // Check if NFC Bridge Server is available first (silent check)
    checkBridgeServer().then((available) => {
      setBridgeAvailable(available);
      setIsSupported(webNfcSupported || available);
      
      // Only try to connect WebSocket if server seems available
      // This prevents connection errors when service isn't running
      if (available) {
        connectWebSocket();
      }
    }).catch(() => {
      // Silently handle - service not available is expected
      setIsSupported(webNfcSupported);
    });

    // Cleanup on unmount
    return () => {
      disconnectWebSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  /**
   * Scan an NFC card and extract serial number
   * Tries WebSocket first (if connected), then HTTP, then Web NFC API
   */
  const scanCard = useCallback(async (): Promise<NFCScanResult> => {
    setIsScanning(true);
    setError(null);

    try {
      // If WebSocket is connected, wait for scan via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return new Promise<NFCScanResult>((resolve) => {
          // Set callback to receive scan result
          scanCallbackRef.current = (result) => {
            resolve(result);
          };

          // Set timeout
          setTimeout(() => {
            if (scanCallbackRef.current) {
              scanCallbackRef.current = null;
              setIsScanning(false);
              resolve({
                success: false,
                error: 'Scan timeout - no card detected. Please try again.',
              });
            }
          }, 35000);
        });
      }

      // Try HTTP endpoint if WebSocket not available
      const bridgeAvailable = await checkBridgeServer();
      if (bridgeAvailable) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 35000);
          
          const response = await fetch(`${NFC_BRIDGE_URL}/scan`, {
            method: 'GET',
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.serialNumber) {
              setIsScanning(false);
              return {
                success: true,
                serialNumber: data.serialNumber,
              };
            } else {
              setIsScanning(false);
              return {
                success: false,
                error: data.error || 'Failed to scan NFC card',
              };
            }
          }
        } catch (fetchError: any) {
          // If bridge server fails, try Web NFC as fallback
          console.warn('NFC Bridge Server unavailable, trying Web NFC...', fetchError);
        }
      }

      // Fallback to Web NFC API (Android Chrome/Edge only)
      if (!checkSupport()) {
        setIsScanning(false);
        return {
          success: false,
          error: 'NFC scanning is not available. Please start the NFC Bridge Server (see nfc-bridge-server/README.md) or use Chrome/Edge on Android.',
        };
      }

      // Check if NDEFReader is available (TypeScript type guard)
      if (!('NDEFReader' in window)) {
        throw new Error('NDEFReader is not available');
      }

      const ndef = new (window as any).NDEFReader();

      return new Promise<NFCScanResult>((resolve, reject) => {
        // Set a timeout for scanning (30 seconds)
        const timeout = setTimeout(() => {
          setIsScanning(false);
          reject(new Error('NFC scan timeout. Please try again.'));
        }, 30000);

        // Handle reading
        ndef.onreading = (event: any) => {
          clearTimeout(timeout);
          setIsScanning(false);

          try {
            // Extract serial number from the NFC tag
            // The serial number can be in different formats depending on the card
            let serialNumber: string | undefined;

            // Try to get serial number from tag ID (most common)
            if (event.serialNumber) {
              serialNumber = event.serialNumber;
            }

            // Try to extract from NDEF records
            if (event.message && event.message.records) {
              for (const record of event.message.records) {
                if (record.recordType === 'text') {
                  const decoder = new TextDecoder(record.encoding || 'utf-8');
                  const text = decoder.decode(record.data);
                  // Try to extract serial number from text
                  // This depends on how your NFC cards are formatted
                  const match = text.match(/(?:NFC|CARD|ID)[-:]?\s*([A-Z0-9-]+)/i);
                  if (match) {
                    serialNumber = match[1];
                    break;
                  }
                  // If text looks like a serial number, use it
                  if (text.match(/^[A-Z0-9-]+$/i)) {
                    serialNumber = text.trim();
                    break;
                  }
                } else if (record.recordType === 'url') {
                  const decoder = new TextDecoder(record.encoding || 'utf-8');
                  const url = decoder.decode(record.data);
                  // Extract from URL if it contains serial number
                  const match = url.match(/(?:NFC|CARD|ID)[-:]?\s*([A-Z0-9-]+)/i);
                  if (match) {
                    serialNumber = match[1];
                    break;
                  }
                }
              }
            }

            // If no serial number found, try to use tag ID as fallback
            if (!serialNumber) {
              // Try to get from tag ID if available
              if (event.tag && event.tag.id) {
                const tagIdArray = Array.from(new Uint8Array(event.tag.id));
                serialNumber = tagIdArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
              } else if (event.serialNumber) {
                // Use serialNumber directly if available
                serialNumber = event.serialNumber;
              } else {
                throw new Error('Could not extract serial number from NFC tag');
              }
            }

            resolve({
              success: true,
              serialNumber: serialNumber,
            });
          } catch (err: any) {
            reject(new Error(err.message || 'Failed to parse NFC tag data'));
          }
        };

        // Handle errors
        ndef.onreadingerror = (event: any) => {
          clearTimeout(timeout);
          setIsScanning(false);
          const errorMsg = event.message || 'Failed to read NFC tag';
          setError(errorMsg);
          reject(new Error(errorMsg));
        };

        // Start scanning
        ndef.scan().catch((err: any) => {
          clearTimeout(timeout);
          setIsScanning(false);
          const errorMsg = err.message || 'Failed to start NFC scan';
          setError(errorMsg);
          reject(new Error(errorMsg));
        });
      });
    } catch (err: any) {
      setIsScanning(false);
      const errorMsg = err.message || 'NFC scan failed';
      setError(errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }, [checkSupport]);

  /**
   * Stop scanning
   */
  const stopScanning = useCallback(() => {
    setIsScanning(false);
    setError(null);
  }, []);

  // Subscribe to automatic card scans (for auto-add functionality)
  const onCardScanned = useCallback((callback: (uid: string) => void) => {
    autoScanCallbacksRef.current.add(callback);
    
    // Return unsubscribe function
    return () => {
      autoScanCallbacksRef.current.delete(callback);
    };
  }, []);

  return {
    isScanning,
    isSupported,
    error,
    scanCard,
    stopScanning,
    checkSupport,
    isConnected,
    bridgeAvailable,
    connectWebSocket,
    disconnectWebSocket,
    onCardScanned,
  };
};

