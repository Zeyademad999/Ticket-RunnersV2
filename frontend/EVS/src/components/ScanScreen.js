import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { scanAPI, eventsAPI, leaveAPI, reportsAPI, authAPI } from "../lib/api/usherApi";
import { authService } from "../services/authService";
import { useScanLog } from "../contexts/ScanLogContext";
import { useWebNFC } from "../hooks/useWebNFC";
import {
  FaSearch,
  FaQrcode,
  FaList,
  FaUser,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaExclamationTriangle,
  FaPhone,
  FaTint,
  FaTag,
  FaComment,
  FaSignOutAlt,
  FaChild,
  FaSpinner,
  FaTimes,
} from "react-icons/fa";
import "./ScanScreen.css";
import ticketLogoSecondary from "../assets/ticket-logo-secondary.png";

export default function ScanScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { eventId: locationEventId, username: locationUsername } = location.state || {};
  const { addLog, refreshLogs } = useScanLog();
  
  // NFC scanning hook
  const {
    isScanning,
    isSupported,
    error: nfcError,
    scanCard,
    stopScanning,
    isConnected,
    bridgeAvailable,
  } = useWebNFC();
  
  const [cardId, setCardId] = useState("");
  const [attendee, setAttendee] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [usherComment, setUsherComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [eventId, setEventId] = useState(locationEventId);
  const [username, setUsername] = useState(locationUsername);
  const [error, setError] = useState("");
  const attendeeInfoRef = useRef(null);

  // Load event data and check authentication
  useEffect(() => {
    const checkAuth = async () => {
      if (!authService.isAuthenticated()) {
        navigate("/login");
        return;
      }

      // Get event ID from location state or localStorage
      const storedEvent = authService.getEvent();
      const storedUsher = authService.getUsher();
      
      const finalEventId = locationEventId || storedEvent?.id;
      const finalUsername = locationUsername || storedUsher?.name;

      if (!finalEventId) {
        navigate("/login");
        return;
      }

      setEventId(finalEventId);
      setUsername(finalUsername);

      // Load event details
      try {
        const eventData = await eventsAPI.getDetail(finalEventId);
        setCurrentEvent(eventData);
      } catch (error) {
        console.error("Error loading event:", error);
      }
    };

    checkAuth();
  }, [navigate, locationEventId, locationUsername]);

  useEffect(() => {
    if (attendee && scanResult) {
      attendeeInfoRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [attendee, scanResult]);

  // Handle NFC scan
  const handleNFCScan = async () => {
    setAttendee(null);
    setScanResult(null);
    setCardId("");
    setError("");
    setShowCustomerModal(false);

    try {
      const result = await scanCard();
      
      if (result.success && result.serialNumber) {
        const scannedCardId = result.serialNumber;
        setCardId(scannedCardId);
        // Automatically lookup the attendee after successful scan
        await handleLookup(scannedCardId);
      } else {
        setError(result.error || "Failed to scan NFC card");
      }
    } catch (error) {
      console.error("NFC scan error:", error);
      setError(error.message || "Failed to scan NFC card");
    }
  };

  const handleLookup = async (scannedCardId = null) => {
    const idToLookup = scannedCardId || cardId;
    if (!idToLookup.trim()) {
      return;
    }

    setIsLoading(true);
    setAttendee(null);
    setScanResult(null);

    try {
      // Get attendee information from API
      const attendeeData = await scanAPI.getAttendee(idToLookup, eventId);
      
      // Map API response to component format
      // Format emergency contact display
      let emergencyContactDisplay = "Not provided";
      if (attendeeData.emergency_contact_name || attendeeData.emergency_contact) {
        const parts = [];
        if (attendeeData.emergency_contact_name) {
          parts.push(attendeeData.emergency_contact_name);
        }
        if (attendeeData.emergency_contact) {
          parts.push(attendeeData.emergency_contact);
        }
        emergencyContactDisplay = parts.join(" - ");
      }
      
      const mappedAttendee = {
        name: attendeeData.name,
        cardId: attendeeData.card_id,
        photo: attendeeData.photo,
        ticketValid: attendeeData.ticket_status === 'valid',
        scanned: attendeeData.scan_status === 'already_scanned',
        ticketTier: attendeeData.ticket_tier,
        emergencyContact: emergencyContactDisplay,
        emergencyContactName: attendeeData.emergency_contact_name,
        emergencyContactMobile: attendeeData.emergency_contact,
        bloodType: attendeeData.blood_type,
        labels: attendeeData.labels || [],
        dependents: attendeeData.children || [],
        partTimeLeave: attendeeData.part_time_leave || null, // Part-time leave status
        lastScan: attendeeData.last_scan || null, // Last scan information
        currentScan: {
          scannedBy: username || 'Current User',
          scanTime: new Date().toISOString(),
        },
      };

      // Debug: Log children data
      console.log('EVS: Attendee children data:', attendeeData.children);
      console.log('EVS: Mapped dependents:', mappedAttendee.dependents);

      setAttendee(mappedAttendee);

      // If we got a ticket_id from the response, store it for potential refetch
      const ticketIdFromResponse = attendeeData.ticket_id;
      
      // Determine scan result
      let result = "valid";
      if (attendeeData.ticket_status !== 'valid') {
        result = "invalid";
      } else if (attendeeData.scan_status === 'already_scanned') {
        result = "already_scanned";
      }

      setScanResult(result);

      // ALWAYS process scan result with backend to create a log entry
      // This ensures EVERY scan action creates a log, regardless of result
      let processSuccess = false;
      let logId = null;
      try {
        console.log('[ScanScreen] Processing scan result:', result, 'for card:', idToLookup);
        const processResponse = await scanAPI.processResult(idToLookup, eventId, result);
        console.log('[ScanScreen] Scan result processed successfully:', processResponse);
        logId = processResponse.log_id || null;
        processSuccess = processResponse.log_created !== false;
        if (logId) {
          console.log('[ScanScreen] ✅ Log created with ID:', logId);
        } else {
          if (processResponse.log_error) {
            console.error('[ScanScreen] ❌ Log creation FAILED:', processResponse.log_error);
          } else {
            console.warn('[ScanScreen] ⚠️ No log ID returned from backend. log_created:', processResponse.log_created);
          }
        }
        
        // After processing, refresh attendee data to get updated scan information
        // This ensures we have the latest scan log data including the scan that was just created
        // Also use ticket_id from processResponse to get the correct ticket with child data
        try {
          const ticketIdFromProcess = processResponse.ticket_id;
          const updatedAttendeeData = await scanAPI.getAttendee(idToLookup, eventId, ticketIdFromProcess);
          console.log('EVS: Refreshed attendee data with ticket_id:', ticketIdFromProcess, 'children:', updatedAttendeeData.children);
          
          // Update lastScan if available
          if (updatedAttendeeData.last_scan) {
            mappedAttendee.lastScan = updatedAttendeeData.last_scan;
          }
          
          // Update children/dependents if available
          if (updatedAttendeeData.children && updatedAttendeeData.children.length > 0) {
            mappedAttendee.dependents = updatedAttendeeData.children;
            console.log('EVS: Updated dependents from refresh:', mappedAttendee.dependents);
          }
          
          setAttendee(mappedAttendee);
        } catch (refreshError) {
          console.error("Error refreshing attendee data:", refreshError);
          // Continue with existing data if refresh fails
        }
      } catch (processError) {
        console.error("[ScanScreen] Error processing scan result:", processError);
        // Even if processing fails, we still want to show the scan result
        // The backend should have created a log, but if it didn't, we'll still add locally
      }

      // Update cardId state if it was passed as parameter
      if (scannedCardId) {
        setCardId(scannedCardId);
      }
      
      // ALWAYS add to local log context - this ensures we have a log even if backend fails
      const logEntry = {
        cardId: idToLookup,
        eventId,
        username,
        time: new Date().toISOString(),
        result: result === "valid" ? "Valid" : 
                result === "invalid" ? "Invalid" :
                result === "already_scanned" ? "Already Scanned" : "Not Found",
        attendee: mappedAttendee,
        scanId: logId || null, // Use log ID from backend if available
      };
      console.log('[ScanScreen] Adding log entry to context:', logEntry);
      addLog(logEntry);
      
      // Show customer details modal
      setShowCustomerModal(true);
      
      // ALWAYS refresh logs from server to get the latest scan log entry
      // Use multiple refresh attempts to ensure we get the log
      if (refreshLogs) {
        // First refresh after short delay
        setTimeout(() => {
          console.log('[ScanScreen] First log refresh attempt');
          refreshLogs();
        }, 1000);
        
        // Second refresh after longer delay to ensure backend has saved
        setTimeout(() => {
          console.log('[ScanScreen] Second log refresh attempt');
          refreshLogs();
        }, 2500);
      }
      
      // Also trigger a custom event that LogsScreen can listen to
      window.dispatchEvent(new CustomEvent('scanCompleted', { 
        detail: { cardId: idToLookup, eventId, result, logId } 
      }));
    } catch (error) {
      // Enhanced error logging
      console.error("Lookup error:", {
        error: error,
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method
      });
      
      setAttendee(null);
      
      // Extract error message properly
      let errorMessage = "Error looking up attendee. Please try again.";
      if (error.response?.data?.error) {
        const errorData = error.response.data.error;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData && typeof errorData === 'object') {
          errorMessage = errorData.message || errorData.detail || errorMessage;
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Set error state and scan result
      setError(errorMessage);
      
      // ALWAYS create a log entry for errors/not found cases
      setScanResult("not_found");
      const logEntry = {
        cardId: idToLookup,
        eventId: eventId,
        username: username,
        time: new Date().toISOString(),
        result: "Not Found",
        attendee: null,
      };
      console.log('[ScanScreen] Adding error log entry:', logEntry);
      addLog(logEntry);
      
      // Try to process the not_found result with backend to create a log
      try {
        console.log('[ScanScreen] Processing not_found result with backend');
        await scanAPI.processResult(idToLookup, eventId, "not_found");
      } catch (processError) {
        console.error("[ScanScreen] Error processing not_found result:", processError);
        // Continue even if backend processing fails - we have local log
      }
      
      // Refresh logs to get any backend log entry
      if (refreshLogs) {
        setTimeout(() => {
          refreshLogs();
        }, 1000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportUser = () => {
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (attendee && usherComment.trim()) {
      try {
        // Prepare report data - only include fields that have valid values
        const reportData = {
          event: eventId,
          report_type: 'other',
          description: usherComment,
        };
        
        // Only include optional fields if they exist and are valid
        if (attendee.cardId) {
          reportData.card_id = attendee.cardId;
        }
        if (attendee.ticketId) {
          reportData.ticket_id = attendee.ticketId;
        }
        if (attendee.customerId) {
          reportData.customer_id = attendee.customerId;
        }
        
        await reportsAPI.create(reportData);
        
        // Update attendee with usher comment locally
        attendee.usherComments = usherComment;
        setAttendee({ ...attendee });
        setUsherComment("");
        setShowReportModal(false);
      } catch (error) {
        console.error("Error submitting report:", error);
        const errorMessage = error?.response?.data?.error?.message || 
                            error?.response?.data?.error?.details || 
                            error?.message || 
                            "Failed to submit report. Please try again.";
        alert(`Failed to submit report: ${errorMessage}`);
      }
    }
  };

  const handlePartTimeLeave = async () => {
    if (!attendee || !eventId || !attendee.cardId) return;

    try {
      if (!attendee.partTimeLeave) {
        // Create leave
        await leaveAPI.create(eventId, attendee.cardId, "Part-time leave");
        // Refresh attendee data to get updated leave status
        await handleLookup(attendee.cardId);
        alert("Customer marked as on part-time leave. They can return and scan again.");
      } else {
        // Mark as returned
        await leaveAPI.return(eventId, attendee.cardId);
        // Refresh attendee data
        await handleLookup(attendee.cardId);
        alert("Customer marked as returned. Entry allowed.");
      }
    } catch (error) {
      console.error("Error handling part-time leave:", error);
      alert(error.response?.data?.error?.message || "Failed to update part-time leave status");
    }
  };

  const handleCameBack = async () => {
    if (!attendee || !eventId || !attendee.cardId) return;

    try {
      // Mark as returned from leave
      await leaveAPI.return(eventId, attendee.cardId);
      // Process scan as valid entry
      await scanAPI.processResult(attendee.cardId, eventId, "valid", "Returned from part-time leave");
      // Refresh attendee data
      await handleLookup(attendee.cardId);
      alert("Customer marked as returned and entered successfully!");
    } catch (error) {
      console.error("Error handling return:", error);
      alert(error.response?.data?.error?.message || "Failed to mark customer as returned");
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/login");
    }
  };

  const getStatusIcon = (result) => {
    switch (result) {
      case "valid":
        return { icon: FaCheckCircle, color: "#4CAF50", bg: "#E8F5E8" };
      case "invalid":
        return { icon: FaTimesCircle, color: "#E53935", bg: "#FFEBEE" };
      case "already_scanned":
        return { icon: FaClock, color: "#FF9800", bg: "#FFF3E0" };
      case "not_found":
        return { icon: FaExclamationTriangle, color: "#9E9E9E", bg: "#F5F5F5" };
      default:
        return { icon: FaUser, color: "hsl(81.8, 38.5%, 28%)", bg: "#E3F2FD" };
    }
  };

  const renderAttendeeInfo = () => {
    if (!attendee) return null;
    const statusInfo = getStatusIcon(scanResult);
    const StatusIcon = statusInfo.icon;

    return (
      <div className="attendee-card" ref={attendeeInfoRef}>
        <div className="card-header">
          <div className="header-icon">
            <FaUser size={24} color="hsl(81.8, 38.5%, 28%)" />
          </div>
          <h2 className="card-title">Attendee Information</h2>
        </div>

        {/* Full width photo */}
        <div className="attendee-photo-full">
          {attendee.photo ? (
            <img
              src={attendee.photo}
              alt={attendee.name}
              className="attendee-photo-large"
            />
          ) : (
            <div className="photo-placeholder-large">
              <FaUser size={80} color="#fff" />
            </div>
          )}
        </div>

        {/* Name and Card ID */}
        <div className="attendee-details">
          <h3 className="attendee-name">{attendee.name}</h3>
          <p className="attendee-card-id">Card ID: {attendee.cardId}</p>
        </div>

        {/* Ticket and Scan Status - Moved to top */}
        <div className="status-section">
          <div className="status-row">
            <div className="status-icon">
              <FaQrcode size={20} color="hsl(81.8, 38.5%, 28%)" />
            </div>
            <span className="status-label">Ticket Status</span>
            <div
              className={`status-badge ${
                attendee.ticketValid ? "status-valid" : "status-invalid"
              }`}
            >
              <span className="status-badge-text">
                {attendee.ticketValid ? "Valid" : "Invalid"}
              </span>
            </div>
          </div>

          <div className="status-row">
            <div className="status-icon">
              <FaClock size={20} color="hsl(81.8, 38.5%, 28%)" />
            </div>
            <span className="status-label">Scan Status</span>
            <div
              className={`status-badge ${
                attendee.scanned ? "status-warn" : "status-valid"
              }`}
            >
              <span className="status-badge-text">
                {attendee.scanned ? "Previously Scanned" : "Not Scanned"}
              </span>
            </div>
          </div>

          {attendee.partTimeLeave && (
            <div className="status-row">
              <div className="status-icon">
                <FaSignOutAlt size={20} color="hsl(81.8, 38.5%, 28%)" />
              </div>
              <span className="status-label">Part-Time Leave</span>
              <div className="status-badge status-warn">
                <span className="status-badge-text">On Leave</span>
              </div>
            </div>
          )}

          {/* Has Child Status - Show if ticket has child */}
          {attendee.dependents && attendee.dependents.length > 0 && (() => {
            // Find child from ticket (has from_ticket flag) or any child with age
            const ticketChild = attendee.dependents.find(child => child.from_ticket === true);
            const childWithAge = ticketChild || attendee.dependents.find(child => child.age !== null && child.age !== undefined);
            // If no child with age, just use the first child
            const displayChild = childWithAge || attendee.dependents[0];
            const childAge = displayChild && displayChild.age !== null && displayChild.age !== undefined ? displayChild.age : null;
            
            console.log('EVS Card: Showing Has Child status', { 
              dependents: attendee.dependents, 
              displayChild, 
              childAge 
            });
            
            return (
              <div className="status-row">
                <div className="status-icon">
                  <FaChild size={20} color="hsl(81.8, 38.5%, 28%)" />
                </div>
                <span className="status-label">Has Child</span>
                <div className="status-badge status-valid">
                  <span className="status-badge-text">
                    {childAge !== null ? `${childAge} years old` : 'Yes'}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Ticket and Profile Labels */}
        {(attendee.ticketLabels?.length > 0 ||
          attendee.profileLabels?.length > 0) && (
          <div className="labels-section">
            {attendee.ticketLabels?.length > 0 && (
              <div className="label-group">
                <div className="label-header">
                  <FaTag size={16} color="hsl(81.8, 38.5%, 28%)" />
                  <span className="label-title">Ticket Labels</span>
                </div>
                <div className="label-container">
                  {attendee.ticketLabels.map((label, idx) => (
                    <span key={idx} className="label-badge ticket-label">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {attendee.profileLabels?.length > 0 && (
              <div className="label-group">
                <div className="label-header">
                  <FaUser size={16} color="hsl(81.8, 38.5%, 28%)" />
                  <span className="label-title">Profile Labels</span>
                </div>
                <div className="label-container">
                  {attendee.profileLabels.map((label, idx) => (
                    <span key={idx} className="label-badge profile-label">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Emergency Contact and Blood Type */}
        <div className="info-section">
          <div className="info-row">
            <div className="info-icon">
              <FaPhone size={16} color="hsl(81.8, 38.5%, 28%)" />
            </div>
            <span className="info-label">Emergency Contact</span>
            <span className="info-value">
              {attendee.emergencyContact || "Not provided"}
            </span>
          </div>

          <div className="info-row">
            <div className="info-icon">
              <FaTint size={16} color="hsl(81.8, 38.5%, 28%)" />
            </div>
            <span className="info-label">Blood Type</span>
            <span className="info-value">
              {attendee.bloodType || "Not provided"}
            </span>
          </div>
        </div>

        {/* Children Section */}
        {attendee.dependents &&
          attendee.dependents.length > 0 && (
            <div className="children-section">
              <div className="section-header">
                <FaChild size={18} color="hsl(81.8, 38.5%, 28%)" />
                <h4 className="section-title">
                  Children ({attendee.dependents.length})
                </h4>
              </div>
              <div className="children-list">
                {attendee.dependents.map((child, idx) => (
                  <div key={idx} className="child-item">
                    <div className="child-info">
                      <span className="child-name">{child.name || 'Child'}</span>
                      {child.age !== null && child.age !== undefined && (
                        <span className="child-age"> ({child.age} years old)</span>
                      )}
                    </div>
                    <div
                      className={`child-status ${
                        child.status === "Not Scanned"
                          ? "status-valid"
                          : "status-invalid"
                      }`}
                    >
                      <span className="child-status-text">{child.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            className="action-button report-button"
            onClick={handleReportUser}
          >
            <FaComment size={16} className="button-icon" />
            Report User
          </button>
          {attendee.partTimeLeave ? (
            <button
              className="action-button leave-active"
              onClick={handleCameBack}
            >
              <FaCheckCircle size={16} className="button-icon" />
              Came Back
            </button>
          ) : (
            <button
              className="action-button leave-button"
              onClick={handlePartTimeLeave}
            >
              <FaSignOutAlt size={16} className="button-icon" />
              Part-Time Leave
            </button>
          )}
        </div>

        {/* Usher Comments */}
        {attendee.usherComments && (
          <div className="comments-section">
            <div className="comments-header">
              <FaComment size={16} color="hsl(81.8, 38.5%, 28%)" />
              <span className="comments-title">Usher Comments</span>
            </div>
            <p className="comments-text">{attendee.usherComments}</p>
          </div>
        )}

        {!attendee.ticketValid && (
          <div className="alert-section">
            <div className="alert-icon">
              <FaExclamationTriangle size={20} color="#fff" />
            </div>
            <p className="alert-text">
              Access Denied: {attendee.rejectionReason || "Invalid ticket"}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="scan-container">
      {/* Header Section */}
      <div className="header">
        <div className="logo-container">
          <img
            src={ticketLogoSecondary}
            alt="TicketRunners Logo"
            className="logo"
          />
        </div>
      </div>

      <div className="content">
        {/* Header Title */}
        <h1 className="header-title">NFC Scanning System</h1>

        {/* Main Action Card */}
        <div className="main-card">
          <div className="card-icon-container">
            <div className="card-icon">
              <FaQrcode size={32} color="#fff" />
            </div>
          </div>
          <h2 className="card-title">NFC Scanning System</h2>
          <p className="card-subtitle">
            {currentEvent ? `Event: ${currentEvent.title}` : "Scan NFC cards to verify attendees"}
          </p>

          <button 
            className="primary-button" 
            onClick={handleNFCScan}
            disabled={isLoading || isScanning}
          >
            {isScanning ? (
              <>
                <FaSpinner size={20} color="#fff" className="button-icon spinning" />
                Scanning...
              </>
            ) : (
              <>
                <FaQrcode size={20} color="#fff" className="button-icon" />
                Scan NFC Card
              </>
            )}
          </button>
          
          {(isSupported || bridgeAvailable) && (
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isConnected ? '#4CAF50' : '#9E9E9E',
                animation: isConnected ? 'pulse 2s infinite' : 'none'
              }} />
              <span style={{ fontSize: '12px', color: '#666' }}>
                {isConnected ? "Reader Connected" : "Reader Offline"}
              </span>
            </div>
          )}
          
          <button
            className="secondary-button"
            onClick={handleLogout}
            style={{ marginTop: '10px' }}
          >
            <FaSignOutAlt size={16} color="hsl(81.8, 38.5%, 28%)" />
            Logout
          </button>

          <button
            className="secondary-button"
            onClick={async () => {
              // Refresh logs before navigating to ensure latest scans are shown
              if (refreshLogs) {
                await refreshLogs();
                // Wait a bit more to ensure backend has saved
                await new Promise(resolve => setTimeout(resolve, 500));
              }
              navigate("/logs");
            }}
          >
            <FaList
              size={20}
              color="hsl(81.8, 38.5%, 28%)"
              className="button-icon"
            />
            View Scan Logs
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-card">
            <FaExclamationTriangle size={24} color="#E53935" />
            <p className="error-text">
              {typeof error === 'string' ? error : 'An error occurred'}
            </p>
          </div>
        )}
        {scanResult === "not_found" && !error && (
          <div className="error-card">
            <FaExclamationTriangle size={24} color="#E53935" />
            <p className="error-text">
              Attendee not found for this card/event combination
            </p>
          </div>
        )}

        {/* Attendee Information */}
        {renderAttendeeInfo()}
      </div>

      {/* Customer Details Modal */}
      {showCustomerModal && attendee && (
        <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="modal-title">Customer Details</h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: '#666' }}
              >
                <FaTimes />
              </button>
            </div>
            
            {/* Customer Photo */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              {attendee.photo ? (
                <img
                  src={attendee.photo}
                  alt={attendee.name}
                  style={{ width: '300px', height: '300px', borderRadius: '0', objectFit: 'cover', border: '3px solid hsl(81.8, 38.5%, 28%)', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)' }}
                />
              ) : (
                <div style={{ width: '300px', height: '300px', borderRadius: '0', backgroundColor: 'hsl(81.8, 38.5%, 28%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '3px solid hsl(81.8, 38.5%, 28%)', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)' }}>
                  <FaUser size={80} color="#fff" />
                </div>
              )}
            </div>
            
            {/* Customer Name */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', color: '#333' }}>{attendee.name}</h2>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>Card ID: {attendee.cardId}</p>
            </div>
            
            {/* Status Badges */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{
                padding: '8px 16px',
                borderRadius: '20px',
                backgroundColor: attendee.ticketValid ? '#E8F5E8' : '#FFEBEE',
                color: attendee.ticketValid ? '#4CAF50' : '#E53935',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                Ticket: {attendee.ticketValid ? "Valid" : "Invalid"}
              </div>
              <div style={{
                padding: '8px 16px',
                borderRadius: '20px',
                backgroundColor: attendee.scanned ? '#FFF3E0' : '#E8F5E8',
                color: attendee.scanned ? '#FF9800' : '#4CAF50',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                {attendee.scanned ? "Already Scanned" : "Not Scanned"}
              </div>
              {attendee.partTimeLeave && (
                <div style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  backgroundColor: '#FFF3E0',
                  color: '#FF9800',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  On Part-Time Leave
                </div>
              )}
              {/* Has Child Badge - Show if any children exist */}
              {attendee.dependents && attendee.dependents.length > 0 && (() => {
                // Find child from ticket (has from_ticket flag) or any child with age, or just first child
                const ticketChild = attendee.dependents.find(child => child.from_ticket === true);
                const childWithAge = ticketChild || attendee.dependents.find(child => child.age !== null && child.age !== undefined);
                const displayChild = childWithAge || attendee.dependents[0];
                const childAge = displayChild && displayChild.age !== null && displayChild.age !== undefined ? displayChild.age : null;
                
                console.log('EVS Modal: Showing Has Child badge', { 
                  dependents: attendee.dependents, 
                  displayChild, 
                  childAge 
                });
                
                return (
                  <div style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    backgroundColor: '#E3F2FD',
                    color: '#1976D2',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    border: '1px solid #BBDEFB'
                  }}>
                    <FaChild size={14} />
                    Has Child{childAge !== null ? `: ${childAge} years old` : ''}
                  </div>
                );
              })()}
              {/* Labels Badges - Show VIP and other labels */}
              {attendee.labels && attendee.labels.length > 0 && attendee.labels.map((label, index) => (
                <div
                  key={index}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    backgroundColor: label === 'VIP' ? '#FFF3E0' : '#E8F5E8',
                    color: label === 'VIP' ? '#F59E0B' : '#10B981',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    border: label === 'VIP' ? '1px solid #FCD34D' : '1px solid #86EFAC'
                  }}
                >
                  {label === 'VIP' && <FaTag size={14} />}
                  {label}
                </div>
              ))}
            </div>
            
            {/* Additional Info */}
            {attendee.emergencyContact && (
              <div style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#F5F5F5', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                  <FaPhone size={16} color="hsl(81.8, 38.5%, 28%)" />
                  <strong>Emergency Contact:</strong>
                </div>
                <p style={{ margin: 0, marginLeft: '26px', color: '#666' }}>{attendee.emergencyContact}</p>
              </div>
            )}
            
            {attendee.bloodType && (
              <div style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#F5F5F5', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                  <FaTint size={16} color="hsl(81.8, 38.5%, 28%)" />
                  <strong>Blood Type:</strong>
                </div>
                <p style={{ margin: 0, marginLeft: '26px', color: '#666' }}>{attendee.bloodType}</p>
              </div>
            )}
            
            {attendee.ticketTier && (
              <div style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#F5F5F5', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                  <FaTag size={16} color="hsl(81.8, 38.5%, 28%)" />
                  <strong>Ticket Tier:</strong>
                </div>
                <p style={{ margin: 0, marginLeft: '26px', color: '#666' }}>{attendee.ticketTier}</p>
              </div>
            )}
            
            {/* Child Information Section - Show if customer has children */}
            {attendee.dependents && attendee.dependents.length > 0 && (
              <div style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#E3F2FD', borderRadius: '8px', border: '1px solid #BBDEFB' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <FaChild size={16} color="#1976D2" />
                  <strong style={{ color: '#1976D2' }}>Child Information:</strong>
                </div>
                <div style={{ marginLeft: '26px' }}>
                  {attendee.dependents.map((child, idx) => {
                    // Find child from ticket (has from_ticket flag) or any child with age
                    const isTicketChild = child.from_ticket === true;
                    const childAge = child.age !== null && child.age !== undefined ? child.age : null;
                    const childName = child.name || 'Child';
                    
                    return (
                      <div key={idx} style={{ marginBottom: idx < attendee.dependents.length - 1 ? '8px' : '0' }}>
                        <p style={{ margin: 0, color: '#333', fontSize: '14px' }}>
                          <strong>{childName}</strong>
                          {childAge !== null && ` - ${childAge} years old`}
                          {isTicketChild && <span style={{ color: '#1976D2', fontSize: '12px', marginLeft: '5px' }}>(Included in ticket)</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Scan Information - Show if ticket was scanned or if we have scan data */}
            {(attendee.scanned || attendee.lastScan || (scanResult && (scanResult === 'valid' || scanResult === 'already_scanned'))) && (
              <div style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#E3F2FD', borderRadius: '8px', border: '1px solid #BBDEFB' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <FaClock size={16} color="#1976D2" />
                  <strong style={{ color: '#1976D2' }}>Scan Information:</strong>
                </div>
                <div style={{ marginLeft: '26px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {attendee.lastScan ? (
                    <>
                      <p style={{ margin: 0, color: '#333', fontSize: '14px' }}>
                        <strong>Scanned by:</strong> {attendee.lastScan.operator_name || attendee.lastScan.scanned_by || 'Unknown'}
                      </p>
                      <p style={{ margin: 0, color: '#333', fontSize: '14px' }}>
                        <strong>Scan ID:</strong> {attendee.lastScan.scan_id || 'N/A'}
                      </p>
                      <p style={{ margin: 0, color: '#333', fontSize: '14px' }}>
                        <strong>Scan Time:</strong> {attendee.lastScan.scan_timestamp ? new Date(attendee.lastScan.scan_timestamp).toLocaleString() : 'N/A'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: 0, color: '#333', fontSize: '14px' }}>
                        <strong>Scanned by:</strong> {username || attendee.currentScan?.scannedBy || 'Current User'}
                      </p>
                      <p style={{ margin: 0, color: '#333', fontSize: '14px' }}>
                        <strong>Scan Time:</strong> {attendee.currentScan?.scanTime ? new Date(attendee.currentScan.scanTime).toLocaleString() : new Date().toLocaleString()}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexDirection: 'column' }}>
              {attendee.partTimeLeave ? (
                <button
                  className="modal-button submit-button"
                  onClick={async () => {
                    await handleCameBack();
                    setShowCustomerModal(false);
                  }}
                  style={{ width: '100%' }}
                >
                  <FaCheckCircle size={16} style={{ marginRight: '8px' }} />
                  Mark as Came Back
                </button>
              ) : (
                <button
                  className="modal-button"
                  onClick={async () => {
                    await handlePartTimeLeave();
                    setShowCustomerModal(false);
                  }}
                  style={{ 
                    width: '100%',
                    backgroundColor: '#FF9800',
                    color: '#fff',
                    border: 'none'
                  }}
                >
                  <FaSignOutAlt size={16} style={{ marginRight: '8px' }} />
                  Mark as Part-Time Leave
                </button>
              )}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="modal-button cancel-button"
                  onClick={() => setShowCustomerModal(false)}
                  style={{ flex: 1 }}
                >
                  Close
                </button>
                <button
                  className="modal-button submit-button"
                  onClick={() => {
                    setShowCustomerModal(false);
                  }}
                  style={{ flex: 1 }}
                >
                  Scan Another
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Report User</h3>
            <textarea
              className="modal-textarea"
              placeholder="Enter your comment about this user..."
              value={usherComment}
              onChange={(e) => setUsherComment(e.target.value)}
              rows={4}
            />
            <div className="modal-buttons">
              <button
                className="modal-button cancel-button"
                onClick={() => setShowReportModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-button submit-button"
                onClick={handleSubmitReport}
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
