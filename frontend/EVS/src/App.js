import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ScanLogProvider } from "./contexts/ScanLogContext";
import LoginScreen from "./components/LoginScreen";
import ScanScreen from "./components/ScanScreen";
import LogsScreen from "./components/LogsScreen";
import "./App.css";

function App() {
  return (
    <ScanLogProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/scan" element={<ScanScreen />} />
            <Route path="/logs" element={<LogsScreen />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </ScanLogProvider>
  );
}

export default App;
