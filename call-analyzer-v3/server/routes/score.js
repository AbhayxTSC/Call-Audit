const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const { Parser } = require("json2csv");
const RUBRICS = require("../rubrics");

// Build the Claude prompt for scoring a single call
function buildScoringPrompt(transcript, leadSource, language) {
  const rubric = RUBRICS[leadSource] || RUBRICS["Other"];

  const parametersBlock = rubric.parameters
    .map(
      (p, i) =>
        `${i + 1}. ${p.name} (Weight: ${p.weight}/100)\n   Description: ${p.description}\n   Scoring guide: ${p.scoring}`
    )
    .join("\n\n");

  const redFlagsBlock = rubric.red_flags
    .map((f) => `- ${f.flag} (Penalty: ${f.penalty} points)\n  ${f.description || ""}`)
    .join("\n");

  return `You are a call quality auditor for The Sleep Company (TSC), a D2C mattress brand in India. You are scoring a call recording transcript.

LEAD SOURCE: ${leadSource}
CONTEXT: ${rubric.context}
PRIMARY GOAL: ${rubric.goal}
IDEAL CALL: ${rubric.ideal_call}
LANGUAGE DETECTED: ${language}

SCORING PARAMETERS:
${parametersBlock}

RED FLAGS (deduct from total score):
${redFlagsBlock}

TRANSCRIPT:
"""
${transcript}
"""

INSTRUCTIONS:
1. Score each parameter on its defined scale (the weight IS the max score for that parameter).
2. Check for each red flag — if triggered, note it and apply the penalty.
3. Calculate: Total Score = Sum of parameter scores + Sum of red flag penalties (penalties are negative).
4. Clamp the final score between 0 and 100.
5. Provide 2-3 specific excerpts from the transcript as evidence for your scoring.
6. Write a brief overall assessment (3-4 sentences) and 2-3 actionable improvement suggestions.

IMPORTANT: The transcript may be in Hindi, Hinglish, or other Indian languages. Score based on content quality regardless of language. If the transcript is in Hindi/Hinglish, you still evaluate the same parameters — did the agent do their job?

Respond ONLY with valid JSON in this exact format, no markdown backticks, no preamble:
{
  "lead_source": "${leadSource}",
  "parameter_scores": [
    {
      "name": "Parameter Name",
      "max_score": 25,
      "score": 20,
      "reasoning": "Brief reason for this score"
    }
  ],
  "red_flags_triggered": [
    {
      "flag": "Flag description",
      "penalty": -15,
      "evidence": "Excerpt or reason"
    }
  ],
  "total_parameter_score": 85,
  "total_penalties": -15,
  "final_score": 70,
  "overall_assessment": "3-4 sentence assessment of the call",
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Improvement 1", "Improvement 2", "Improvement 3"],
  "key_excerpts": [
    {
      "excerpt": "Relevant quote from transcript",
      "context": "Why this excerpt matters"
    }
  ]
}`;
}

// Call Claude API
async function scoreWithClaude(transcript, leadSource, language) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === "your_anthropic_key_here") {
    throw new Error("ANTHROPIC_API_KEY not configured. Add it to your .env file.");
  }

  const prompt = buildScoringPrompt(transcript, leadSource, language);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const text = data.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");

  // Parse JSON response — strip any accidental markdown fencing
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse Claude response:", cleaned.substring(0, 500));
    throw new Error("Claude returned invalid JSON. Please retry.");
  }
}

// POST /api/score — Score a single transcript
router.post("/score", async (req, res) => {
  try {
    const { transcript, lead_source, language, file_name } = req.body;

    if (!transcript) return res.status(400).json({ error: "No transcript provided." });
    if (!lead_source) return res.status(400).json({ error: "No lead source provided." });

    console.log(`Scoring: ${file_name || "unknown"} | ${lead_source} | ${language || "unknown"}`);

    const scoreResult = await scoreWithClaude(
      transcript,
      lead_source,
      language || "Unknown"
    );

    return res.json({
      file_name: file_name || "unknown",
      lead_source,
      language: language || "Unknown",
      scoring: scoreResult,
    });
  } catch (error) {
    console.error("Scoring error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/score-batch — Score multiple transcripts
router.post("/score-batch", async (req, res) => {
  try {
    const { items } = req.body;

    if (!items?.length) return res.status(400).json({ error: "No items to score." });

    console.log(`Batch scoring: ${items.length} calls`);

    const results = [];
    for (const item of items) {
      try {
        const scoreResult = await scoreWithClaude(
          item.transcript,
          item.lead_source,
          item.language || "Unknown"
        );

        results.push({
          file_name: item.file_name || "unknown",
          lead_source: item.lead_source,
          language: item.language || "Unknown",
          status: "scored",
          scoring: scoreResult,
        });

        console.log(
          `  ✓ ${item.file_name}: ${scoreResult.final_score}/100`
        );
      } catch (err) {
        results.push({
          file_name: item.file_name || "unknown",
          lead_source: item.lead_source,
          status: "error",
          error: err.message,
        });
        console.log(`  ✗ ${item.file_name}: ${err.message}`);
      }
    }

    return res.json({ results });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/export-scored-csv — Export scored results as CSV
router.post("/export-scored-csv", (req, res) => {
  try {
    const { results } = req.body;
    if (!results?.length) return res.status(400).json({ error: "No results." });

    const csvRows = results.map((r, i) => {
      const s = r.scoring || {};
      const paramScores = {};

      // Flatten parameter scores into columns
      (s.parameter_scores || []).forEach((p) => {
        const key = p.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
        paramScores[`param_${key}`] = `${p.score}/${p.max_score}`;
      });

      const redFlagNames = (s.red_flags_triggered || []).map((f) => f.flag).join("; ");

      return {
        sr_no: i + 1,
        file_name: r.file_name || "",
        lead_source: r.lead_source || "",
        language: r.language || "",
        final_score: s.final_score ?? "—",
        total_parameter_score: s.total_parameter_score ?? "—",
        total_penalties: s.total_penalties ?? 0,
        ...paramScores,
        red_flags: redFlagNames || "None",
        strengths: (s.strengths || []).join("; "),
        improvements: (s.improvements || []).join("; "),
        overall_assessment: s.overall_assessment || "",
      };
    });

    // Build field list dynamically
    const allKeys = new Set();
    csvRows.forEach((row) => Object.keys(row).forEach((k) => allKeys.add(k)));

    const fields = Array.from(allKeys).map((k) => ({
      label: k
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      value: k,
    }));

    const csv = new Parser({ fields }).parse(csvRows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=call-audit-scores-${Date.now()}.csv`
    );
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
