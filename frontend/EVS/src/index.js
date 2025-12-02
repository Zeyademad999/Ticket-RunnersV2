import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Function to get or create root element
function getOrCreateRootElement() {
  let rootElement = document.getElementById("root");
  
  // If root element doesn't exist, create it
  if (!rootElement) {
    console.warn("Root element not found in HTML. Creating it dynamically...");
    
    // Ensure body exists
    if (!document.body) {
      // Create body if it doesn't exist (shouldn't happen, but just in case)
      const body = document.createElement("body");
      document.documentElement.appendChild(body);
    }
    
    // Create root div
    rootElement = document.createElement("div");
    rootElement.id = "root";
    document.body.appendChild(rootElement);
    
    console.log("Root element created successfully");
  }
  
  return rootElement;
}

// Initialize the app
function initApp() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const rootElement = getOrCreateRootElement();
      const root = ReactDOM.createRoot(rootElement);
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    });
  } else {
    // DOM is already ready
    const rootElement = getOrCreateRootElement();
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}

// Start the app
initApp();
