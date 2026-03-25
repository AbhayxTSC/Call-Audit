# TSC Call Audit Pipeline v3

End-to-end call quality audit tool for The Sleep Company.

**Step 1 (ElevenLabs):** Upload recordings → Transcription + Language Detection → Export CSV
**Step 2 (Claude):** Load transcripts → AI scoring against lead-source-specific rubrics → Export scored CSV

## Quick Start

### Server
```bash
cd server
cp .env.example .env
# Add both API keys in .env
npm install
npm start
```

### Client
```bash
cd client
npm install
npm start
```

## Environment Variables

| Variable                  | Required | Description                                    |
|--------------------------|----------|------------------------------------------------|
| `ELEVENLABS_API_KEY`      | For Step 1 | ElevenLabs API key                          |
| `ELEVENLABS_API_BASE_URL` | For Step 1 | `https://api.in.residency.elevenlabs.io`    |
| `ANTHROPIC_API_KEY`       | For Step 2 | Claude API key from console.anthropic.com   |
| `PORT`                    | Optional   | Server port (default: 5000)                 |

## Scoring Rubrics

Each lead source has a custom rubric. See `server/rubrics/index.js` for the full definitions.

- **Find Store - Store Found** — Weighted toward store visit confirmation, visit date locking, urgency. Penalizes online purchase push.
- **Arrange Call Back** — Weighted toward need identification, product recommendation, conversion push.
- **BNPL Lead** — Weighted toward BNPL explanation, payment friction removal.
- **Walk-in Follow Up** — Weighted toward objection handling, feedback collection.
- And 6 more rubrics covering all lead sources.

## Scored CSV Output

The exported CSV includes per-parameter scores, red flags triggered, strengths, improvements, and overall assessment for each call.
