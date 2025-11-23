import React, { createContext, useContext, useState, useEffect } from "react";
import { logsAPI } from "../lib/api/usherApi";
import { authService } from "../services/authService";

const ScanLogContext = createContext();

export function ScanLogProvider({ children }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load logs from server
  const refreshLogs = async () => {
    if (!authService.isAuthenticated()) {
      return;
    }

    setIsLoading(true);
    try {
      const event = authService.getEvent();
      const eventId = event?.id;
      const response = await logsAPI.list(eventId, 1);
      
      // Map server logs to component format
      const mappedLogs = response.results.map(log => ({
        cardId: log.card_id || 'N/A',
        eventId: log.event || eventId,
        eventTitle: log.event_title || 'Unknown Event',
        username: log.operator_name || log.operator_username || log.operator_role || "Unknown",
        operatorUsername: log.operator_username || null,
        operatorRole: log.operator_role || null,
        scanId: log.id,
        time: log.scan_time || log.timestamp,
        result: log.result || (log.scan_result === 'success' ? 'Valid' :
               log.scan_result === 'invalid' ? 'Invalid' :
               log.scan_result === 'duplicate' ? 'Already Scanned' : 'Not Found'),
        scanType: log.scan_type || 'NFC',
        deviceName: log.device_name || null,
        deviceType: log.device_type || null,
        notes: log.notes || null,
        attendee: log.customer_name ? {
          name: log.customer_name,
          photo: null,
          ticketValid: (log.result === 'Valid' || log.scan_result === 'success'),
          scanned: (log.result === 'Already Scanned' || log.scan_result === 'duplicate'),
        } : null,
      }));
      
      setLogs(mappedLogs);
    } catch (error) {
      console.error("Error refreshing logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load logs on mount if authenticated
  useEffect(() => {
    if (authService.isAuthenticated()) {
      refreshLogs();
    }
  }, []);

  const addLog = (log) => {
    setLogs((prev) => [log, ...prev]);
  };

  return (
    <ScanLogContext.Provider value={{ logs, addLog, refreshLogs, isLoading }}>
      {children}
    </ScanLogContext.Provider>
  );
}

export function useScanLog() {
  return useContext(ScanLogContext);
}
