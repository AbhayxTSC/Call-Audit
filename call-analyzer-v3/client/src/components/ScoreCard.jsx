import React, { useState } from "react";

function ScoreGauge({ score }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : score >= 40 ? "#f97316" : "#ef4444";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Needs Work" : "Poor";

  return (
    <div className="score-gauge">
      <div className="gauge-ring">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="#2a2d3a" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="34"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 213.6} 213.6`}
            transform="rotate(-90 40 40)"
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <div className="gauge-text">
          <span className="gauge-score" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="gauge-label" style={{ color }}>{label}</span>
    </div>
  );
}

function ParamBar({ name, score, maxScore }) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const color = pct >= 80 ? "#22c55e" : pct >= 60 ? "#eab308" : pct >= 40 ? "#f97316" : "#ef4444";

  return (
    <div className="param-bar">
      <div className="param-header">
        <span className="param-name">{name}</span>
        <span className="param-score">{score}/{maxScore}</span>
      </div>
      <div className="param-track">
        <div className="param-fill" style={{ width: `${pct}%`, backgroundColor: color }}></div>
      </div>
    </div>
  );
}

function ScoreCard({ result }) {
  const [expanded, setExpanded] = useState(false);

  if (result.error) {
    return (
      <div className="score-card score-card-error">
        <div className="sc-header">
          <p className="sc-filename">{result.file_name}</p>
          <span className="lead-badge">{result.lead_source}</span>
        </div>
        <p className="sc-error">Scoring failed: {result.error}</p>
      </div>
    );
  }

  const s = result.scoring || {};
  const params = s.parameter_scores || [];
  const redFlags = s.red_flags_triggered || [];
  const strengths = s.strengths || [];
  const improvements = s.improvements || [];
  const excerpts = s.key_excerpts || [];

  return (
    <div className="score-card">
      {/* Header */}
      <div className="sc-header">
        <div className="sc-header-left">
          <p className="sc-filename">{result.file_name}</p>
          <div className="sc-tags">
            <span className="lead-badge">{result.lead_source}</span>
            <span className="lang-badge">{result.language}</span>
          </div>
        </div>
        <ScoreGauge score={s.final_score || 0} />
      </div>

      {/* Score breakdown */}
      <div className="sc-scores-row">
        <div className="sc-score-pill">
          <span className="sp-label">Parameters</span>
          <span className="sp-val">{s.total_parameter_score || 0}/100</span>
        </div>
        {(s.total_penalties || 0) < 0 && (
          <div className="sc-score-pill penalty">
            <span className="sp-label">Penalties</span>
            <span className="sp-val">{s.total_penalties}</span>
          </div>
        )}
      </div>

      {/* Parameter bars */}
      <div className="sc-params">
        {params.map((p, i) => (
          <ParamBar key={i} name={p.name} score={p.score} maxScore={p.max_score} />
        ))}
      </div>

      {/* Red flags */}
      {redFlags.length > 0 && (
        <div className="sc-section red-flags-section">
          <h4 className="sc-section-title red">Red Flags ({redFlags.length})</h4>
          {redFlags.map((f, i) => (
            <div key={i} className="red-flag-item">
              <span className="rf-penalty">{f.penalty}</span>
              <div>
                <p className="rf-flag">{f.flag}</p>
                {f.evidence && <p className="rf-evidence">{f.evidence}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assessment — expandable */}
      <div className="sc-section">
        <h4 className="sc-section-title">Assessment</h4>
        <p className="sc-assessment">{s.overall_assessment}</p>
      </div>

      <button className="expand-btn" onClick={() => setExpanded(!expanded)}>
        {expanded ? "Hide details" : "Show strengths, improvements & excerpts"}
      </button>

      {expanded && (
        <div className="sc-expanded">
          {/* Strengths */}
          {strengths.length > 0 && (
            <div className="sc-section">
              <h4 className="sc-section-title green">Strengths</h4>
              <div className="sc-list">
                {strengths.map((s, i) => (
                  <div key={i} className="sc-list-item green-item">✓ {s}</div>
                ))}
              </div>
            </div>
          )}

          {/* Improvements */}
          {improvements.length > 0 && (
            <div className="sc-section">
              <h4 className="sc-section-title yellow">Improvements Needed</h4>
              <div className="sc-list">
                {improvements.map((s, i) => (
                  <div key={i} className="sc-list-item yellow-item">→ {s}</div>
                ))}
              </div>
            </div>
          )}

          {/* Key excerpts */}
          {excerpts.length > 0 && (
            <div className="sc-section">
              <h4 className="sc-section-title">Key Excerpts</h4>
              {excerpts.map((ex, i) => (
                <div key={i} className="excerpt-item">
                  <p className="excerpt-text">"{ex.excerpt}"</p>
                  <p className="excerpt-context">{ex.context}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ScoreCard;
