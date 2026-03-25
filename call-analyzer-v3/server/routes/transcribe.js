const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const FormData = require("form-data");
const { franc, francAll } = require("franc");
const langs = require("langs");
const { Parser } = require("json2csv");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads")),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const fileFilter = (req, file, cb) => {
  const allowed = [".mp3", ".wav", ".m4a", ".ogg", ".webm", ".flac", ".mp4"];
  const ext = path.extname(file.originalname).toLowerCase();
  allowed.includes(ext) ? cb(null, true) : cb(new Error(`Unsupported: ${ext}`));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 100 * 1024 * 1024 } });

function detectLanguage(text) {
  if (!text || text.trim().length < 20)
    return { language: "Unknown", code: "und", confidence: 0 };

  const francResult = franc(text, { minLength: 10 });
  if (francResult === "und")
    return { language: "Unknown", code: "und", confidence: 0 };

  const langInfo = langs.where("3", francResult);
  const languageName = langInfo ? langInfo.name : francResult;
  const textLength = text.trim().split(/\s+/).length;
  let confidence = Math.min(0.95, 0.5 + textLength * 0.005);

  const allResults = francAll(text, { minLength: 10 });
  if (allResults.length >= 2) {
    const gap = allResults[0][1] - allResults[1][1];
    confidence = Math.min(0.98, confidence + gap * 0.3);
  }

  return { language: languageName, code: francResult, confidence: Math.round(confidence * 100) };
}

async function transcribeWithElevenLabs(filePath) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const baseUrl = process.env.ELEVENLABS_API_BASE_URL || "https://api.elevenlabs.io";

  if (!apiKey || apiKey === "your_elevenlabs_key_here")
    throw new Error("ELEVENLABS_API_KEY not configured.");

  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));
  formData.append("model_id", "scribe_v1");

  const response = await fetch(`${baseUrl}/v1/speech-to-text`, {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs error (${response.status}): ${err}`);
  }
  return await response.json();
}

// POST /api/transcribe
router.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file." });

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileSize = (req.file.size / (1024 * 1024)).toFixed(2);
    const leadSource = req.body.lead_source || "Not Tagged";

    console.log(`Transcribing: ${fileName} (${fileSize} MB) | ${leadSource}`);

    const result = await transcribeWithElevenLabs(filePath);
    const text = result.text || "";
    const francDet = detectLanguage(text);
    const primaryLang = result.language || francDet.language;
    const primaryCode = result.language_code || francDet.code;
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    let confidence = francDet.confidence;
    if (result.language_code && francDet.code !== "und") {
      const el2 = result.language_code.substring(0, 2);
      const fInfo = langs.where("3", francDet.code);
      if (fInfo && el2 === fInfo["1"]) confidence = Math.min(98, confidence + 10);
    }

    fs.unlink(filePath, () => {});

    return res.json({
      file: { name: fileName, size: `${fileSize} MB` },
      lead_source: leadSource,
      transcription: { text, word_count: wordCount },
      language: { detected: primaryLang, code: primaryCode, confidence },
    });
  } catch (error) {
    console.error("Transcription error:", error.message);
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/export-csv
router.post("/export-csv", (req, res) => {
  try {
    const { results } = req.body;
    if (!results?.length) return res.status(400).json({ error: "No results." });

    const csvRows = results.map((r, i) => ({
      sr_no: i + 1,
      file_name: r.file?.name || "",
      lead_source: r.lead_source || "",
      language_detected: r.language?.detected || "",
      confidence_pct: r.language?.confidence || 0,
      word_count: r.transcription?.word_count || 0,
      transcript: r.transcription?.text || "",
      processed_at: r.timestamp || "",
    }));

    const fields = [
      { label: "Sr No", value: "sr_no" },
      { label: "File Name", value: "file_name" },
      { label: "Lead Source", value: "lead_source" },
      { label: "Language", value: "language_detected" },
      { label: "Confidence %", value: "confidence_pct" },
      { label: "Word Count", value: "word_count" },
      { label: "Transcript", value: "transcript" },
      { label: "Processed At", value: "processed_at" },
    ];

    const csv = new Parser({ fields }).parse(csvRows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=transcripts-${Date.now()}.csv`);
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
