import React, { useState, useCallback } from "react";
import Papa from "papaparse";
import ScoreCard from "./ScoreCard";

function ScoreTab({ transcriptionResults, leadSources }) {
  const [items, setItems] = useState([]); // items to score
  const [scoredResults, setScoredResults] = useState([]);
  const [scoring, setScoring] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState(null);

  // Load from transcription results
  const loadFromTranscriptions = useCallback(() => {
    if (!transcriptionResults.length) return;
    const mapped = transcriptionResults.map((r, i) => ({
      id: `tr-${i}-${Date.now()}`,
      file_name: r.file?.name || `Recording ${i + 1}`,
      lead_source: r.lead_source || "Other",
      language: r.language?.detected || "Unknown",
      transcript: r.transcription?.text || "",
      word_count: r.transcription?.word_count || 0,
    }));
    setItems(mapped);
  }, [transcriptionResults]);

  // Upload CSV
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const mapped = result.data
          .filter((row) => row["Transcript"] && row["Transcript"].trim().length > 0)
          .map((row, i) => ({
            id: `csv-${i}-${Date.now()}`,
            file_name: row["File Name"] || `Row ${i + 1}`,
            lead_source: row["Lead Source"] || "Other",
            language: row["Language"] || row["Language Detected"] || "Unknown",
            transcript: row["Transcript"] || "",
            word_count: parseInt(row["Word Count"] || "0", 10),
          }));

        if (!mapped.length) {
          setError("No valid transcripts found in CSV. Ensure it has a 'Transcript' column.");
          return;
        }
        setItems(mapped);
        setError(null);
      },
      error: (err) => setError("CSV parse error: " + err.message),
    });

    e.target.value = "";
  };

  // Score all items with Claude
  const scoreAll = async () => {
    if (!items.length) return;

    setError(null);
    setScoring(true);
    setProgress({ done: 0, total: items.length });

    const scored = [];

    for (let i = 0; i < items.length; i++) {
      setProgress({ done: i, total: items.length });

      try {
        const res = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: items[i].transcript,
            lead_source: items[i].lead_source,
            language: items[i].language,
            file_name: items[i].file_name,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        scored.push({ ...data, id: items[i].id });
      } catch (err) {
        scored.push({
          id: items[i].id,
          file_name: items[i].file_name,
          lead_source: items[i].lead_source,
          language: items[i].language,
          error: err.message,
        });
      }
    }

    setScoredResults(scored);
    setScoring(false);
    setProgress({ done: 0, total: 0 });
  };

  // Export scored CSV
  const exportScoredCSV = async () => {
    const valid = scoredResults.filter((r) => !r.error);
    if (!valid.length) return;

    try {
      const res = await fetch("/api/export-scored-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: valid }),
      });

      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `call-audit-scores-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError("Export failed: " + err.message);
    }
  };

  const scoredCount = scoredResults.filter((r) => !r.error).length;
  const avgScore = scoredCount > 0
    ? Math.round(scoredResults.filter((r) => !r.error).reduce((sum, r) => sum + (r.scoring?.final_score || 0), 0) / scoredCount)
    : 0;

  return (
    <div>
      {/* Source selection */}
      {items.length === 0 && scoredResults.length === 0 && (
        <div className="score-source-section">
          <h2>Load Transcripts for Scoring</h2>
          <p className="score-source-sub">Choose how to load the transcripts that Claude will audit.</p>

          <div className="source-options">
            {/* From transcription */}
            <div className={`source-card ${transcriptionResults.length === 0 ? "disabled" : ""}`}>
              <div className="source-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                </svg>
              </div>
              <h3>From Step 1</h3>
              <p>{transcriptionResults.length} transcripts available from the Transcribe tab</p>
              <button
                onClick={loadFromTranscriptions}
                disabled={transcriptionResults.length === 0}
                className="source-btn"
              >
                Load {transcriptionResults.length} Transcript{transcriptionResults.length !== 1 ? "s" : ""}
              </button>
            </div>

            {/* From CSV */}
            <div className="source-card">
              <div className="source-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <h3>Upload CSV</h3>
              <p>Upload the CSV exported from Step 1 (must have Transcript and Lead Source columns)</p>
              <label className="source-btn upload-label">
                Choose CSV File
                <input type="file" accept=".csv" onChange={handleCSVUpload} hidden />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Items loaded — ready to score */}
      {items.length > 0 && scoredResults.length === 0 && !scoring && (
        <div className="score-ready-section">
          <div className="score-ready-header">
            <div>
              <h2>{items.length} Transcript{items.length !== 1 ? "s" : ""} Ready</h2>
              <p className="score-ready-sub">Claude will score each call based on the Lead Source rubric.</p>
            </div>
            <div className="score-ready-actions">
              <button onClick={() => setItems([])} className="clear-btn">Back</button>
              <button onClick={scoreAll} className="process-btn ready">
                Score All with Claude
              </button>
            </div>
          </div>
          <div className="score-preview-list">
            {items.map((item) => (
              <div key={item.id} className="score-preview-item">
                <span className="sp-name">{item.file_name}</span>
                <span className="lead-badge">{item.lead_source}</span>
                <span className="lang-badge">{item.language}</span>
                <span className="sp-words">{item.word_count} words</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scoring in progress */}
      {scoring && (
        <div className="processing-banner">
          <div className="spinner"></div>
          <div className="processing-info">
            <p className="processing-title">Claude is scoring {progress.done + 1} of {progress.total}</p>
            <p className="processing-sub">{items[progress.done]?.file_name}</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${((progress.done + 1) / progress.total) * 100}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-banner">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} className="error-dismiss">✕</button>
        </div>
      )}

      {/* Scored Results */}
      {scoredResults.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <div>
              <h2>Audit Results</h2>
              <p className="results-summary">
                {scoredCount} scored · Average: {avgScore}/100
              </p>
            </div>
            <div className="results-actions">
              <button onClick={exportScoredCSV} className="export-btn" disabled={scoredCount === 0}>
                Export Scored CSV
              </button>
              <button onClick={() => { setScoredResults([]); setItems([]); }} className="clear-btn">
                New Batch
              </button>
            </div>
          </div>

          {/* Summary stats */}
          <div className="score-summary-bar">
            <div className="ss-stat">
              <span className="ss-value">{scoredCount}</span>
              <span className="ss-label">Calls Scored</span>
            </div>
            <div className="ss-stat">
              <span className={`ss-value ${avgScore >= 70 ? "green" : avgScore >= 50 ? "yellow" : "red"}`}>{avgScore}/100</span>
              <span className="ss-label">Avg Score</span>
            </div>
            <div className="ss-stat">
              <span className="ss-value">
                {scoredResults.filter((r) => !r.error && r.scoring?.final_score >= 70).length}
              </span>
              <span className="ss-label">Passing (≥70)</span>
            </div>
            <div className="ss-stat">
              <span className="ss-value red">
                {scoredResults.filter((r) => !r.error && (r.scoring?.red_flags_triggered?.length || 0) > 0).length}
              </span>
              <span className="ss-label">Red Flags Found</span>
            </div>
          </div>

          {/* Individual score cards */}
          <div className="results-grid">
            {scoredResults.map((r) => (
              <ScoreCard key={r.id} result={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ScoreTab;
