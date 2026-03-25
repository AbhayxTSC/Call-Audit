import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";

function TranscribeTab({ leadSources, onResultsReady, onGoToScore }) {
  const [queue, setQueue] = useState([]);
  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState(null);
  const [bulkSource, setBulkSource] = useState("");

  const handleDrop = useCallback((files) => {
    const items = files.map((f, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
      file: f,
      leadSource: "",
    }));
    setQueue((prev) => [...prev, ...items]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDropAccepted: handleDrop,
    accept: { "audio/mpeg": [".mp3"], "audio/wav": [".wav"], "audio/x-m4a": [".m4a"], "audio/ogg": [".ogg"], "audio/flac": [".flac"], "video/mp4": [".mp4"] },
    multiple: true,
    disabled: processing,
  });

  const updateLeadSource = (id, ls) => setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, leadSource: ls } : q)));
  const removeItem = (id) => setQueue((prev) => prev.filter((q) => q.id !== id));
  const applyBulk = () => { if (bulkSource) { setQueue((prev) => prev.map((q) => (q.leadSource === "" ? { ...q, leadSource: bulkSource } : q))); setBulkSource(""); } };

  const processQueue = async () => {
    const untagged = queue.filter((q) => !q.leadSource);
    if (untagged.length) { setError(`${untagged.length} file(s) need a Lead Source.`); return; }

    setError(null);
    setProcessing(true);
    setProgress({ done: 0, total: queue.length });

    const newResults = [];
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      setCurrentFile(item.file.name);
      setProgress({ done: i, total: queue.length });

      const fd = new FormData();
      fd.append("audio", item.file);
      fd.append("lead_source", item.leadSource);

      try {
        const res = await fetch("/api/transcribe", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        newResults.push({ id: item.id, ...data, timestamp: new Date().toLocaleString("en-IN") });
      } catch (err) {
        newResults.push({ id: item.id, file: { name: item.file.name }, lead_source: item.leadSource, error: err.message, timestamp: new Date().toLocaleString("en-IN") });
      }
    }

    setResults((prev) => [...newResults, ...prev]);
    onResultsReady(newResults.filter((r) => !r.error));
    setQueue([]);
    setProcessing(false);
    setCurrentFile(null);
  };

  const exportCSV = async () => {
    const valid = results.filter((r) => !r.error);
    if (!valid.length) return;
    try {
      const res = await fetch("/api/export-csv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ results: valid }) });
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `transcripts-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError("Export failed: " + err.message);
    }
  };

  const allTagged = queue.length > 0 && queue.every((q) => q.leadSource);
  const successCount = results.filter((r) => !r.error).length;

  return (
    <div>
      {/* Dropzone */}
      <div {...getRootProps()} className={`dropzone ${isDragActive ? "dropzone-active" : ""} ${processing ? "dropzone-processing" : ""}`}>
        <input {...getInputProps()} />
        <div className="dropzone-content">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="upload-icon-svg">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="dropzone-title">{isDragActive ? "Drop recordings here" : "Drag & drop call recordings"}</p>
          <p className="dropzone-sub">MP3, WAV, M4A, OGG, FLAC · Up to 100 MB</p>
        </div>
      </div>

      {/* Queue */}
      {queue.length > 0 && !processing && (
        <div className="queue-section">
          <div className="queue-header">
            <h2>Tag Lead Source ({queue.length} files)</h2>
          </div>
          <div className="bulk-apply">
            <span className="bulk-label">Apply to all untagged:</span>
            <select value={bulkSource} onChange={(e) => setBulkSource(e.target.value)} className="lead-select bulk-select">
              <option value="">Select</option>
              {leadSources.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={applyBulk} disabled={!bulkSource} className="bulk-btn">Apply</button>
          </div>
          <div className="queue-list">
            {queue.map((item) => (
              <div key={item.id} className={`queue-item ${item.leadSource ? "tagged" : "untagged"}`}>
                <div className="queue-file-info">
                  <p className="queue-file-name">{item.file.name}</p>
                  <p className="queue-file-size">{(item.file.size / (1024 * 1024)).toFixed(1)} MB</p>
                </div>
                <div className="queue-controls">
                  <select value={item.leadSource} onChange={(e) => updateLeadSource(item.id, e.target.value)} className={`lead-select ${item.leadSource ? "selected" : ""}`}>
                    <option value="">Select Lead Source</option>
                    {leadSources.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => removeItem(item.id)} className="remove-btn">✕</button>
                </div>
              </div>
            ))}
          </div>
          <div className="queue-footer">
            <button onClick={processQueue} className={`process-btn ${allTagged ? "ready" : "disabled"}`} disabled={!allTagged}>
              {allTagged ? `Transcribe ${queue.length} Recording${queue.length > 1 ? "s" : ""}` : "Tag all files first"}
            </button>
          </div>
        </div>
      )}

      {/* Processing */}
      {processing && (
        <div className="processing-banner">
          <div className="spinner"></div>
          <div className="processing-info">
            <p className="processing-title">Transcribing {progress.done + 1} of {progress.total}</p>
            <p className="processing-sub">{currentFile}</p>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${((progress.done + 1) / progress.total) * 100}%` }}></div></div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-banner">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} className="error-dismiss">✕</button>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <h2>Transcription Results ({successCount})</h2>
            <div className="results-actions">
              {successCount > 0 && (
                <>
                  <button onClick={onGoToScore} className="score-btn">
                    Score with Claude →
                  </button>
                  <button onClick={exportCSV} className="export-btn">Export CSV</button>
                </>
              )}
              <button onClick={() => setResults([])} className="clear-btn">Clear</button>
            </div>
          </div>
          <div className="results-grid">
            {results.map((r) => (
              <div key={r.id} className={`result-card-mini ${r.error ? "result-error" : ""}`}>
                <div className="rcm-left">
                  <p className="rcm-name">{r.file?.name}</p>
                  <div className="rcm-tags">
                    <span className="lead-badge">{r.lead_source}</span>
                    {!r.error && <span className="lang-badge">{r.language?.detected}</span>}
                  </div>
                </div>
                {r.error ? (
                  <span className="rcm-error">{r.error}</span>
                ) : (
                  <div className="rcm-right">
                    <span className="rcm-words">{r.transcription?.word_count} words</span>
                    <span className="rcm-conf">{r.language?.confidence}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TranscribeTab;
