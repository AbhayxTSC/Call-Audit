require("dotenv").config();
const express = require("express");
const cors = require("cors");
const transcribeRoute = require("./routes/transcribe");
const scoreRoute = require("./routes/score");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Routes
app.use("/api", transcribeRoute);
app.use("/api", scoreRoute);

// Health check
app.get("/api/health", (req, res) => {
  const hasEL =
    !!process.env.ELEVENLABS_API_KEY &&
    process.env.ELEVENLABS_API_KEY !== "your_elevenlabs_key_here";
  const hasClaude =
    !!process.env.ANTHROPIC_API_KEY &&
    process.env.ANTHROPIC_API_KEY !== "your_anthropic_key_here";
  const baseUrl =
    process.env.ELEVENLABS_API_BASE_URL || "https://api.elevenlabs.io";

  res.json({
    status: "ok",
    elevenlabs_configured: hasEL,
    claude_configured: hasClaude,
    api_base_url: baseUrl,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (!process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY === "your_elevenlabs_key_here")
    console.warn("⚠️  ELEVENLABS_API_KEY not set.");
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_anthropic_key_here")
    console.warn("⚠️  ANTHROPIC_API_KEY not set.");
});
