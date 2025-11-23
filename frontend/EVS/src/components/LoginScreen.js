import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, eventsAPI } from "../lib/api/usherApi";
import { authService } from "../services/authService";
import {
  colors,
  fontSizes,
  borderRadius,
  shadows,
  transitions,
} from "../theme";
import { FaUser, FaLock, FaCalendarAlt } from "react-icons/fa";
import "./LoginScreen.css";
import ticketLogoSecondary from "../assets/ticket-logo-secondary.png";

export default function LoginScreen() {
  const navigate = useNavigate();
  const [eventId, setEventId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [availableEvents, setAvailableEvents] = useState([]);

  // Check if already authenticated
  useEffect(() => {
    if (authService.isAuthenticated()) {
      const event = authService.getEvent();
      const usher = authService.getUsher();
      if (event && usher) {
        navigate("/scan", { state: { eventId: event.id, username: usher.name } });
      }
    }
  }, [navigate]);

  // Load available events on mount (optional - for dropdown)
  useEffect(() => {
    // This could be used to show a dropdown of available events
    // For now, we'll let users enter event ID manually
  }, []);

  const handleLogin = async () => {
    setError("");
    setIsLoading(true);

    if (!eventId || !username || !password) {
      setError("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    try {
      // Validate event ID format (integer)
      const eventIdNum = parseInt(eventId, 10);
      if (isNaN(eventIdNum) || eventIdNum <= 0) {
        setError("Invalid Event ID format. Please enter a valid event number.");
        setIsLoading(false);
        return;
      }

      // Call login API
      const response = await authAPI.login(username, password, eventIdNum);
      
      if (response.usher && response.event) {
        // Navigate to scan screen
        navigate("/scan", { 
          state: { 
            eventId: response.event.id, 
            username: response.usher.name || username 
          } 
        });
      } else {
        setError("Login successful but missing user/event data");
      }
    } catch (err) {
      console.error("Login error:", err);
      let errorMessage = "Login failed. Please check your credentials and try again.";
      
      if (err.response?.data?.error) {
        const errorData = err.response.data.error;
        // Handle both string and object error formats
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData && typeof errorData === 'object') {
          errorMessage = errorData.message || errorData.detail || errorMessage;
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="login-container">
      {/* Background gradient effect */}
      <div className="background-gradient"></div>

      {/* Logo/Brand */}
      <div className="logo-box">
        <img
          src={ticketLogoSecondary}
          alt="TicketRunners Logo"
          className="logo"
        />
      </div>

      <div className="login-card">
        <div className="card-header">
          <h1 className="welcome-text">Welcome Back</h1>
          <p className="subtitle-text">Sign in to your account</p>
        </div>

        <div className="input-container">
          <label className="input-label">
            <FaCalendarAlt className="input-icon" />
            Event ID
          </label>
          <input
            className="input-field"
            type="text"
            placeholder="Enter Event ID"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            onKeyPress={handleKeyPress}
            autoCapitalize="none"
          />
        </div>

        <div className="input-container">
          <label className="input-label">
            <FaUser className="input-icon" />
            Username
          </label>
          <input
            className="input-field"
            type="text"
            placeholder="Enter Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            autoCapitalize="none"
          />
        </div>

        <div className="input-container">
          <label className="input-label">
            <FaLock className="input-icon" />
            Password
          </label>
          <input
            className="input-field"
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>

        {error && (
          <div className="error-container">
            <p className="error-text">
              {typeof error === 'string' ? error : 'An error occurred'}
            </p>
          </div>
        )}

        <button 
          className="login-button" 
          onClick={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? "Signing In..." : "Sign In"}
        </button>

        <div className="footer">
          <p className="footer-text">TicketRunners NFC Scanner</p>
        </div>
      </div>
    </div>
  );
}
