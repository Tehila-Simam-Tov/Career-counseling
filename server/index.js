const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const port = process.env.PORT || 5001;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function buildRecommendationPrompt(profileText, answers) {
  return `
You are a senior career counselor AI.

You must analyze deeply:

1. User personality profile
2. 4 yes/no answers with questions
3. Consistency between answers and profile

Rules:
- Rank best matching professions
- Use ONLY JSON output
- First result must be the strongest match

Output format:
{
  "recommendations": [
    { "profession": "string", "score": 0, "reason": "string" }
  ]
}

User profile:
${profileText}

Answers:
${JSON.stringify(answers, null, 2)}
`;
}

function fallbackRecommendations() {
  console.log("⚠️ fallback recommendations");
  return {
    recommendations: [
      { profession: "Software Engineer", score: 80, reason: "Analytical profile match" }
    ]
  };
}

function extractJSON(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("NO_JSON");
    return JSON.parse(match[0]);
  } catch (e) {
    console.error("❌ JSON_ERROR");
    console.error(text);
    throw e;
  }
}

async function callGemini(prompt) {
  console.log("🤖 Gemini request started");

  try {
    const body = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40
      }
    });

    const response = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: "generativelanguage.googleapis.com",
        path: `/v1/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
        method: "POST",
        headers: { "Content-Type": "application/json" }
      }, (res) => {
        let data = "";

        res.on("data", chunk => data += chunk);

        res.on("end", () => {
          console.log("📡 STATUS:", res.statusCode);

          try {
            resolve(JSON.parse(data));
          } catch (e) {
            console.error("❌ RAW_RESPONSE");
            console.error(data);
            reject(e);
          }
        });
      });

      req.on("error", err => {
        console.error("❌ NETWORK_ERROR");
        console.error(err);
        reject(err);
      });

      req.write(body);
      req.end();
    });

    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("📩 RAW_OUTPUT");
    console.log(text);

    return extractJSON(text);

  } catch (err) {
    console.error("🔥 GEMINI_FAILED");
    console.error(err.message);
    console.error(err.stack);
    return { _error: true };
  }
}

app.post("/api/recommend-professions", async (req, res) => {
  try {
    const profileText = req.body?.profileText || "";
    const answers = req.body?.answers || [];

    console.log("📥 PROFILE");
    console.log(profileText);

    console.log("📥 ANSWERS");
    console.log(JSON.stringify(answers, null, 2));

    const data = await callGemini(
      buildRecommendationPrompt(profileText, answers)
    );

    if (data?._error || !data?.recommendations) {
      console.log("⚠️ USING FALLBACK");
      return res.json(fallbackRecommendations());
    }

    return res.json(data);

  } catch (err) {
    console.error("❌ ROUTE_ERROR");
    console.error(err);
    return res.json(fallbackRecommendations());
  }
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`🚀 SERVER_RUNNING ${port}`);
});