import React, { useState, useCallback, useEffect } from "react";
import TranscribeTab from "./components/TranscribeTab";
import ScoreTab from "./components/ScoreTab";

const LEAD_SOURCES = [
  "Find Store - Store Found",
  "Arrange Call Back",
  "Website Enquiry",
  "BNPL Lead",
  "WhatsApp Lead",
  "Walk-in Follow Up",
  "Exchange Program",
  "Campaign Lead",
  "Referral",
  "Other",
];

function App() {
  const [activeTab, setActiveTab] = useState("transcribe");
  const [serverStatus, setServerStatus] = useState(null);
  const [transcriptionResults, setTranscriptionResults] = useState([]);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => setServerStatus(data))
      .catch(() => setServerStatus({ status: "offline" }));
  }, []);

  const regionLabel = serverStatus?.api_base_url?.includes("in.residency")
    ? "India"
    : serverStatus?.api_base_url?.includes("eu.residency")
    ? "EU"
    : "Global";

  // Pass transcription results to score tab
  const handleTranscriptionComplete = useCallback((results) => {
    setTranscriptionResults((prev) => [...results, ...prev]);
  }, []);

  const goToScore = () => setActiveTab("score");

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            <div>
              <h1>TSC Call Audit Pipeline</h1>
              <p className="subtitle">ElevenLabs Transcription + Claude Scoring</p>
            </div>
          </div>
        </div>
      </header>

      {/* Status */}
      {serverStatus && serverStatus.status !== "offline" && (
        <div className="status-bar status-ok">
          <span className="status-dot"></span>
          <span>
            ElevenLabs: {serverStatus.elevenlabs_configured ? `✓ (${regionLabel})` : "✗ Key missing"}
            {" · "}
            Claude: {serverStatus.claude_configured ? "✓" : "✗ Key missing"}
          </span>
        </div>
      )}
      {serverStatus?.status === "offline" && (
        <div className="status-bar status-error">
          <span className="status-dot"></span>Server offline
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === "transcribe" ? "active" : ""}`}
            onClick={() => setActiveTab("transcribe")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
            Step 1 — Transcribe
          </button>
          <button
            className={`tab ${activeTab === "score" ? "active" : ""}`}
            onClick={() => setActiveTab("score")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Step 2 — Score
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="main-content">
        {activeTab === "transcribe" && (
          <TranscribeTab
            leadSources={LEAD_SOURCES}
            onResultsReady={handleTranscriptionComplete}
            onGoToScore={goToScore}
          />
        )}
        {activeTab === "score" && (
          <ScoreTab
            transcriptionResults={transcriptionResults}
            leadSources={LEAD_SOURCES}
          />
        )}
      </main>

      <footer className="footer">
        <p>Powered by ElevenLabs Scribe v1 + Claude Sonnet — The Sleep Company</p>
      </footer>
    </div>
  );
}

export default App;
