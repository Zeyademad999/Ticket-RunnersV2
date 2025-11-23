import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useScanLog } from "../contexts/ScanLogContext";
import { useNavigate, useLocation } from "react-router-dom";
import { logsAPI } from "../lib/api/usherApi";
import { authService } from "../services/authService";
import {
  FaSearch,
  FaTimes,
  FaUser,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaExclamationTriangle,
  FaChevronLeft,
  FaChevronRight,
  FaFileAlt,
} from "react-icons/fa";
import "./LogsScreen.css";
import ticketLogoSecondary from "../assets/ticket-logo-secondary.png";

const ITEMS_PER_PAGE = 10;

export default function LogsScreen() {
  const { logs, refreshLogs } = useScanLog();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [serverLogs, setServerLogs] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const navigate = useNavigate();
  const location = useLocation();

  // Load logs function - use useCallback to memoize it
  const loadLogs = useCallback(async () => {
    if (!authService.isAuthenticated()) {
      navigate("/login");
      return;
    }

    console.log('[LogsScreen] Loading logs...');
    setIsLoading(true);
    try {
      const event = authService.getEvent();
      const eventId = event?.id;
      console.log('[LogsScreen] Fetching logs for event:', eventId, 'page:', currentPage);
      const response = await logsAPI.list(eventId, currentPage);
      console.log('[LogsScreen] Received response:', response);
      
      // Map server logs to component format
      const mappedLogs = (response.results || []).map(log => ({
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
      
      console.log('[LogsScreen] Mapped logs:', mappedLogs.length, 'logs');
      setServerLogs(mappedLogs);
      setTotalPages(response.total_pages || 1);
      setLastRefreshTime(Date.now());
    } catch (error) {
      console.error("[LogsScreen] Error loading logs:", error);
      // Set empty logs on error to show empty state
      setServerLogs([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
      console.log('[LogsScreen] Finished loading logs');
    }
  }, [currentPage, navigate]);
  
  // Listen for context log updates and refresh server logs if context has new logs
  useEffect(() => {
    // If context logs have more entries than server logs, refresh from server
    if (logs.length > serverLogs.length) {
      console.log('[LogsScreen] Context has more logs, refreshing from server...');
      const timer = setTimeout(() => {
        loadLogs();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [logs.length, serverLogs.length, loadLogs]);

  // Load logs from server on mount and when page changes
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Refresh logs when navigating to this screen (location change)
  useEffect(() => {
    // Refresh logs when the location changes (user navigates to this screen)
    // Use a small delay to ensure any pending backend operations are complete
    const timer = setTimeout(() => {
      console.log('[LogsScreen] Location changed, refreshing logs...');
      loadLogs();
    }, 500);
    return () => clearTimeout(timer);
  }, [location.pathname, loadLogs]);
  
  // Listen for scan completion events from ScanScreen
  useEffect(() => {
    const handleScanCompleted = (event) => {
      console.log('[LogsScreen] Scan completed event received:', event.detail);
      // Refresh logs after a delay to ensure backend has saved
      setTimeout(() => {
        console.log('[LogsScreen] Refreshing logs after scan completion...');
        loadLogs();
      }, 1500);
    };
    
    window.addEventListener('scanCompleted', handleScanCompleted);
    return () => {
      window.removeEventListener('scanCompleted', handleScanCompleted);
    };
  }, [loadLogs]);

  // Refresh logs when screen becomes visible (e.g., when navigating back from scan screen)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Screen became visible, refresh logs with a delay to ensure backend is ready
        setTimeout(() => {
          loadLogs();
        }, 500);
      }
    };

    const handleFocus = () => {
      // Window gained focus, refresh logs with a delay
      setTimeout(() => {
        loadLogs();
      }, 500);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadLogs]);

  // Search logs on server
  useEffect(() => {
    let isMounted = true;
    let debounceTimer;
    
    if (searchQuery.trim()) {
      const searchLogs = async () => {
        setIsLoading(true);
        try {
          const event = authService.getEvent();
          const searchParams = {
            attendee_name: searchQuery,
            event_id: event?.id,
          };
          
          const response = await logsAPI.search(searchParams);
          
          if (!isMounted) return;
          
          const mappedLogs = (response || []).map(log => ({
            cardId: log.card_id || 'N/A',
            eventId: log.event || null,
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
          
          setServerLogs(mappedLogs);
        } catch (error) {
          if (!isMounted) return;
          console.error("Error searching logs:", error);
          setServerLogs([]);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      debounceTimer = setTimeout(searchLogs, 500);
    } else {
      // Reload all logs when search is cleared
      setCurrentPage(1);
    }
    
    return () => {
      isMounted = false;
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [searchQuery]);

  // Use server logs if available, otherwise fall back to context logs
  // Always prefer server logs as they are the source of truth
  // BUT: If context logs have newer entries (more recent timestamp), merge them
  const displayLogs = useMemo(() => {
    if (serverLogs.length === 0 && logs.length > 0) {
      return logs;
    }
    if (logs.length === 0) {
      return serverLogs;
    }
    // Merge both, prioritizing server logs but including context logs that might be newer
    const merged = [...serverLogs];
    const serverLogIds = new Set(serverLogs.map(log => log.scanId || `${log.cardId}-${log.time}`));
    logs.forEach(log => {
      const logId = log.scanId || `${log.cardId}-${log.time}`;
      if (!serverLogIds.has(logId)) {
        merged.push(log);
      }
    });
    // Sort by time, most recent first
    return merged.sort((a, b) => {
      const timeA = new Date(a.time).getTime();
      const timeB = new Date(b.time).getTime();
      return timeB - timeA;
    });
  }, [serverLogs, logs]);
  
  // Paginate logs - use displayLogs which includes merged server and context logs
  const paginatedLogs = useMemo(() => {
    // If we have a search query, use the search results (already filtered)
    if (searchQuery.trim() && serverLogs.length > 0) {
      return serverLogs;
    }
    // Use the merged display logs (includes both server and context logs)
    // For server-side pagination, use serverLogs directly if available
    // But also include any newer context logs
    if (serverLogs.length > 0) {
      // Use displayLogs which merges both, but limit to first page size for now
      // TODO: Implement proper pagination with merged logs
      return displayLogs.slice(0, ITEMS_PER_PAGE);
    }
    // Fallback to paginated context logs
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return displayLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [serverLogs, displayLogs, currentPage, searchQuery]);

  const finalTotalPages = serverLogs.length > 0 ? totalPages : Math.ceil(logs.length / ITEMS_PER_PAGE);

  const getStatusIcon = (result) => {
    switch (result) {
      case "Valid":
        return { icon: FaCheckCircle, color: "#4CAF50", bg: "#E8F5E8" };
      case "Invalid":
        return { icon: FaTimesCircle, color: "#E53935", bg: "#FFEBEE" };
      case "Already Scanned":
        return { icon: FaClock, color: "#FF9800", bg: "#FFF3E0" };
      case "Not Found":
        return { icon: FaExclamationTriangle, color: "#9E9E9E", bg: "#F5F5F5" };
      default:
        return {
          icon: FaUser,
          color: "hsl(81.8, 38.5%, 28%)",
          bg: "#E3F2FD",
        };
    }
  };

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleString();
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (page) => {
    setIsLoading(true);
    setCurrentPage(page);
    // Simulate loading delay for better UX
    setTimeout(() => setIsLoading(false), 300);
  };

  const renderLogItem = (item) => {
    const statusInfo = getStatusIcon(item.result);
    const StatusIcon = statusInfo.icon;

    return (
      <div className="log-card" key={`${item.cardId}-${item.time}`}>
        <div className="log-header">
          <div
            className="status-icon"
            style={{ backgroundColor: statusInfo.bg }}
          >
            <StatusIcon size={20} color={statusInfo.color} />
          </div>
          <div className="log-header-info">
            <p className="log-time">{formatTime(item.time)}</p>
            <p className="log-card-id">Card: {item.cardId}</p>
          </div>
          <div
            className="status-badge"
            style={{ backgroundColor: statusInfo.color }}
          >
            <span className="status-text">{item.result}</span>
          </div>
        </div>

        <div className="log-details">
          {item.attendee && (
            <div className="attendee-section">
              <div className="section-header">
                <FaUser size={16} color="hsl(81.8, 38.5%, 28%)" />
                <h4 className="section-title">Attendee Information</h4>
              </div>
              <div className="attendee-info">
                <div className="attendee-photo">
                  {item.attendee.photo ? (
                    <img
                      src={item.attendee.photo}
                      alt={item.attendee.name}
                      className="photo"
                    />
                  ) : (
                    <div className="photo-placeholder">
                      <FaUser size={20} color="#fff" />
                    </div>
                  )}
                </div>
                <div className="attendee-details">
                  <h5 className="attendee-name">{item.attendee.name}</h5>
                  <p className="attendee-status">
                    Ticket: {item.attendee.ticketValid ? "Valid" : "Invalid"}
                  </p>
                  <p className="attendee-status">
                    Scanned: {item.attendee.scanned ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="scan-info">
            <div className="info-row">
              <FaUser size={16} color="hsl(81.8, 38.5%, 28%)" />
              <span className="info-label">Scanned by: </span>
              <span className="info-value">{item.username}</span>
              {item.operatorUsername && item.operatorUsername !== item.username && (
                <span className="info-value" style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
                  ({item.operatorUsername})
                </span>
              )}
            </div>
            {item.operatorRole && (
              <div className="info-row">
                <FaUser size={16} color="hsl(81.8, 38.5%, 28%)" />
                <span className="info-label">Role: </span>
                <span className="info-value">{item.operatorRole}</span>
              </div>
            )}
            <div className="info-row">
              <FaFileAlt size={16} color="hsl(81.8, 38.5%, 28%)" />
              <span className="info-label">Scan ID: </span>
              <span className="info-value">{item.scanId || 'N/A'}</span>
            </div>
            <div className="info-row">
              <FaClock size={16} color="hsl(81.8, 38.5%, 28%)" />
              <span className="info-label">Scan Time: </span>
              <span className="info-value">{formatTime(item.time)}</span>
            </div>
            {item.scanType && (
              <div className="info-row">
                <FaFileAlt size={16} color="hsl(81.8, 38.5%, 28%)" />
                <span className="info-label">Scan Type: </span>
                <span className="info-value">{item.scanType}</span>
              </div>
            )}
            {item.deviceName && (
              <div className="info-row">
                <FaFileAlt size={16} color="hsl(81.8, 38.5%, 28%)" />
                <span className="info-label">Device: </span>
                <span className="info-value">{item.deviceName} {item.deviceType ? `(${item.deviceType})` : ''}</span>
              </div>
            )}
            {item.eventTitle && (
              <div className="info-row">
                <FaFileAlt size={16} color="hsl(81.8, 38.5%, 28%)" />
                <span className="info-label">Event: </span>
                <span className="info-value">{item.eventTitle}</span>
              </div>
            )}
            {item.notes && (
              <div className="info-row">
                <FaFileAlt size={16} color="hsl(81.8, 38.5%, 28%)" />
                <span className="info-label">Notes: </span>
                <span className="info-value">{item.notes}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPagination = () => {
    if (finalTotalPages <= 1) return null;

      const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (finalTotalPages <= maxVisible) {
          for (let i = 1; i <= finalTotalPages; i++) {
            pages.push(i);
          }
        } else {
          if (currentPage <= 3) {
            for (let i = 1; i <= 4; i++) {
              pages.push(i);
            }
            pages.push("...");
            pages.push(finalTotalPages);
          } else if (currentPage >= finalTotalPages - 2) {
            pages.push(1);
            pages.push("...");
            for (let i = finalTotalPages - 3; i <= finalTotalPages; i++) {
              pages.push(i);
            }
          } else {
            pages.push(1);
            pages.push("...");
            for (let i = currentPage - 1; i <= currentPage + 1; i++) {
              pages.push(i);
            }
            pages.push("...");
            pages.push(finalTotalPages);
          }
        }

        return pages;
      };

    return (
      <div className="pagination-container">
        <button
          className={`page-button ${
            currentPage === 1 ? "page-button-disabled" : ""
          }`}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <FaChevronLeft
            size={20}
            color={currentPage === 1 ? "#E0E0E0" : "hsl(81.8, 38.5%, 28%)"}
          />
        </button>

        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            className={`page-button ${
              page === currentPage ? "page-button-active" : ""
            } ${page === "..." ? "page-button-ellipsis" : ""}`}
            onClick={() => typeof page === "number" && handlePageChange(page)}
            disabled={page === "..."}
          >
            <span
              className={`page-button-text ${
                page === currentPage ? "page-button-text-active" : ""
              } ${page === "..." ? "page-button-text-ellipsis" : ""}`}
            >
              {page}
            </span>
          </button>
        ))}

        <button
          className={`page-button ${
            currentPage === finalTotalPages ? "page-button-disabled" : ""
          }`}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === finalTotalPages}
        >
          <FaChevronRight
            size={20}
            color={
              currentPage === finalTotalPages ? "#E0E0E0" : "hsl(81.8, 38.5%, 28%)"
            }
          />
        </button>
      </div>
    );
  };

  return (
    <div className="logs-container">
      {/* Header Section */}
      <div className="header">
        <button className="back-button" onClick={() => navigate("/scan")}>
          <FaChevronLeft size={20} style={{ marginRight: 8 }} /> Back to Scan
        </button>
        <div className="logo-container">
          <img
            src={ticketLogoSecondary}
            alt="TicketRunners Logo"
            className="logo"
          />
        </div>
      </div>

      {/* Title Section */}
      <div className="title-container">
        <h1 className="header-title">Scan Logs</h1>
        <p className="header-subtitle">
          {displayLogs.length} scan{displayLogs.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Search Bar */}
      <div className="search-container" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div className="search-box" style={{ flex: 1 }}>
          <FaSearch
            size={20}
            color="hsl(81.8, 38.5%, 28%)"
            className="search-icon"
          />
          <input
            className="search-input"
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchQuery.length > 0 && (
            <button onClick={() => handleSearch("")} className="clear-button">
              <FaTimes size={20} color="#E0E0E0" />
            </button>
          )}
        </div>
        <button
          onClick={() => loadLogs()}
          style={{
            padding: '10px 20px',
            backgroundColor: 'hsl(81.8, 38.5%, 28%)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: isLoading ? 0.6 : 1
          }}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh Logs'}
        </button>
      </div>

      {/* Results Summary */}
      {searchQuery.length > 0 && (
        <div className="results-summary">
          <p className="results-text">
            Showing {paginatedLogs.length} of {displayLogs.length} results
          </p>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      )}

      {/* Logs List */}
      <div className="logs-list">
        {paginatedLogs.length > 0 ? (
          paginatedLogs.map(renderLogItem)
        ) : (
          <div className="empty-container">
            <div className="empty-icon">
              <FaFileAlt size={48} color="#E0E0E0" />
            </div>
            <h3 className="empty-title">
              {searchQuery.length > 0
                ? "No matching logs found"
                : "No Scan Logs"}
            </h3>
            <p className="empty-subtitle">
              {searchQuery.length > 0
                ? "Try adjusting your search terms"
                : "Scan logs will appear here once you start scanning NFC cards"}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {renderPagination()}
    </div>
  );
}
