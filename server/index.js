const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { createSession, getSession, updateSession } = require('./db/sessionStore');
const simulationRoutes = require('./routes/simulationRoutes');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const port = process.env.PORT || 5001;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

// ── Simulation routes (MCP + Validation Agent) ────────────────────────────
app.use('/api/simulation', simulationRoutes);

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function buildQuestionsPrompt(profileText) {
  return `
You are a senior career counselor AI.

Based on the user's profile below, generate exactly 4 questions that will help identify the most suitable professions for them.
Each question must have exactly 3 answer options that cover a spectrum (e.g. strong agreement, neutral, disagreement — or low/medium/high — tailored to each question).

Rules:
- Output ONLY valid JSON, no markdown, no explanation
- Each question must have exactly 3 options
- Questions must be tailored to the specific profile

Output format:
{
  "questions": [
    { "id": "q1", "text": "question text here", "options": ["Option A", "Option B", "Option C"] },
    { "id": "q2", "text": "question text here", "options": ["Option A", "Option B", "Option C"] },
    { "id": "q3", "text": "question text here", "options": ["Option A", "Option B", "Option C"] },
    { "id": "q4", "text": "question text here", "options": ["Option A", "Option B", "Option C"] }
  ]
}

User profile:
${profileText}
`;
}

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

const GEMINI_TIMEOUT_MS = 30000; // 30 seconds
const GEMINI_MAX_RETRIES = 3;
const GEMINI_RETRY_DELAY_MS = 1000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGeminiOnce(prompt) {
  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, topP: 0.9, topK: 40 }
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "generativelanguage.googleapis.com",
      path: `/v1/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      timeout: GEMINI_TIMEOUT_MS
    }, (res) => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        console.log("📡 STATUS:", res.statusCode);
        try { resolve(JSON.parse(data)); }
        catch (e) { console.error("❌ RAW_RESPONSE", data); reject(e); }
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Gemini request timed out after " + GEMINI_TIMEOUT_MS + "ms"));
    });

    req.on("error", err => {
      console.error("❌ NETWORK_ERROR", err.message);
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

async function callGemini(prompt) {
  for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    console.log(`🤖 Gemini request started (attempt ${attempt}/${GEMINI_MAX_RETRIES})`);
    try {
      const response = await callGeminiOnce(prompt);
      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      console.log("📩 RAW_OUTPUT");
      console.log(text);
      return extractJSON(text);
    } catch (err) {
      console.error(`🔥 GEMINI_FAILED (attempt ${attempt}):`, err.message);
      if (attempt < GEMINI_MAX_RETRIES) {
        console.log(`⏳ Retrying in ${GEMINI_RETRY_DELAY_MS}ms...`);
        await sleep(GEMINI_RETRY_DELAY_MS);
      } else {
        console.error("❌ All Gemini retries exhausted");
        return { _error: true };
      }
    }
  }
  return { _error: true };
}

// ── /api/generate-questions ───────────────────────────────────────────────
app.post("/api/generate-questions", async (req, res) => {
  try {
    let session;
    if (req.body?.sessionId) {
      session = getSession(req.body.sessionId);
      if (!session) return res.status(404).json({ error: "Session not found" });
    } else {
      const profileText = req.body?.profileText || "";
      session = createSession(profileText);
    }

    console.log("📥 GENERATE-QUESTIONS session", session.id);
    const data = await callGemini(buildQuestionsPrompt(session.profile));

    if (data?._error || !Array.isArray(data?.questions)) {
      console.log("⚠️ QUESTIONS FALLBACK");
      return res.status(500).json({ error: "Failed to generate questions" });
    }

    updateSession(session.id, { questions: data.questions });
    return res.json({ sessionId: session.id, questions: data.questions });
  } catch (err) {
    console.error("❌ GENERATE-QUESTIONS ERROR", err);
    return res.status(500).json({ error: "Failed to generate questions" });
  }
});

// ── /api/recommend-professions ────────────────────────────────────────────
app.post("/api/recommend-professions", async (req, res) => {
  try {
    const session = getSession(req.body?.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    console.log("📥 RECOMMEND session", session.id);
    const data = await callGemini(buildRecommendationPrompt(session.profile, session.answers));

    if (data?._error || !data?.recommendations) {
      console.log("⚠️ USING FALLBACK");
      return res.json(fallbackRecommendations());
    }

    updateSession(session.id, { recommendations: data.recommendations });
    return res.json(data);
  } catch (err) {
    console.error("❌ ROUTE_ERROR", err);
    return res.json(fallbackRecommendations());
  }
});

function buildRecommendFromSkillsPrompt(profileText, allQA, skills) {
  return `
You are a senior career counselor AI.
Based on the user profile, Q&A history, and identified skills, produce ranked career recommendations.

Rules:
- Output ONLY valid JSON, no markdown
- Rank by match_percentage descending
- Provide 3-6 recommendations
- Use ONLY the skills listed below

Output format:
{ "recommendations": [ { "profession": "string", "match_percentage": 90, "reason": "string" } ] }

User profile:
${profileText}

Q&A history:
${JSON.stringify(allQA, null, 2)}

Identified skills:
${JSON.stringify(skills, null, 2)}
`;
}

// ── Agent with proper tool-calling loop ───────────────────────────────────

const SKILL_ANALYSIS_TOOL_DEF = {
  name: "skill_analysis",
  description: "Analyzes a list of questions with user answers and returns a list of identified skills with confidence percentages.",
  parameters: {
    type: "object",
    properties: {
      qa_pairs: {
        type: "array",
        description: "List of questions and answers collected from the user",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            answer:   { type: "string" }
          },
          required: ["question", "answer"]
        }
      }
    },
    required: ["qa_pairs"]
  }
};

async function executeSkillAnalysis(qaPairs) {
  console.log("🔧 TOOL: skill_analysis called with", qaPairs.length, "Q&A pairs");
  const prompt = `
You are a skill-extraction engine.
Analyze the following questions and answers from a user and identify their skills and competencies.

Rules:
- Output ONLY valid JSON, no markdown
- Return 4 to 8 skills
- Each percentage must reflect how strongly the answer implies that skill (0-100)

Output format:
{ "skills": [ { "skill": "Skill Name", "percentage": 85 } ] }

Questions and answers:
${JSON.stringify(qaPairs, null, 2)}
`;
  const result = await callGemini(prompt);
  if (result?._error || !Array.isArray(result?.skills)) {
    throw new Error("skill_analysis tool returned invalid data");
  }
  return result.skills;
}

async function dispatchTool(toolName, toolArgs) {
  if (toolName === "skill_analysis") {
    return executeSkillAnalysis(toolArgs.qa_pairs || []);
  }
  throw new Error(`Unknown tool: ${toolName}`);
}

async function callGeminiWithToolsOnce(messages, tools) {
  const body = JSON.stringify({
    contents: messages,
    tools: [{ function_declarations: tools }],
    generationConfig: { temperature: 0.7, topP: 0.9, topK: 40 }
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      timeout: GEMINI_TIMEOUT_MS
    }, (res) => {
      let data = "";
      res.on("data", c => { data += c; });
      res.on("end", () => {
        console.log("📡 STATUS (tools):", res.statusCode);
        try { resolve(JSON.parse(data)); }
        catch (e) { console.error("❌ RAW", data); reject(e); }
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Gemini tools request timed out after " + GEMINI_TIMEOUT_MS + "ms"));
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function callGeminiWithTools(messages, tools) {
  for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    console.log(`🤖 Gemini (tools) request, messages: ${messages.length} (attempt ${attempt}/${GEMINI_MAX_RETRIES})`);
    try {
      const raw = await callGeminiWithToolsOnce(messages, tools);
      return raw;
    } catch (err) {
      console.error(`🔥 GEMINI_TOOLS_FAILED (attempt ${attempt}):`, err.message);
      if (attempt < GEMINI_MAX_RETRIES) {
        console.log(`⏳ Retrying in ${GEMINI_RETRY_DELAY_MS}ms...`);
        await sleep(GEMINI_RETRY_DELAY_MS);
      } else {
        console.error("❌ All Gemini tools retries exhausted");
        return null;
      }
    }
  }
  return null;
}

function buildAgentSystemPrompt(profileText, allQA, round) {
  return `
You are a career-guidance AI agent with access to the skill_analysis tool.

Workflow:
1. Review the user profile and all collected Q&A.
2. If you need more information (round < ${MAX_AGENT_ROUNDS}): respond in plain JSON with:
   { "action": "ask_questions", "questions": [ { "text": "...", "options": ["A","B","C"] }, ... ] }
   - Each question MUST have exactly 3 options (not yes/no)
   - Maximum 3 questions per round
3. If you have enough information OR round >= ${MAX_AGENT_ROUNDS}: call the skill_analysis tool with ALL collected Q&A.
   After receiving the skill list, respond with plain JSON:
   { "action": "recommend_professions", "recommendations": [ { "profession": "...", "match_percentage": 90, "reason": "..." } ] }
   - Provide 3-6 recommendations ranked by match_percentage descending
   - Base recommendations ONLY on the skills returned by the tool

Current round: ${round} / max: ${MAX_AGENT_ROUNDS}

User profile:
${profileText}

All collected Q&A:
${JSON.stringify(allQA, null, 2)}
`;
}

const MAX_AGENT_ROUNDS = 3;
const MAX_LOOP_ITERATIONS = 5;

// ── /api/agent ────────────────────────────────────────────────────────────
app.post("/api/agent", async (req, res) => {
  try {
    const session = getSession(req.body?.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Merge incoming new answers into session
    if (Array.isArray(req.body?.newAnswers) && req.body.newAnswers.length > 0) {
      const merged = [...(session.answers || []), ...req.body.newAnswers];
      updateSession(session.id, { answers: merged });
      session.answers = merged;
    }

    const profileText = session.profile;
    const allQA = session.answers || [];
    const round = session.agentRound || 0;
    console.log("🤖 AGENT session", session.id, "round", round, "/ max", MAX_AGENT_ROUNDS);

    if (round >= MAX_AGENT_ROUNDS) {
      console.log("⛔ MAX ROUNDS — forcing skill_analysis");
      const skills = await executeSkillAnalysis(
        allQA.map(q => ({ question: q.question, answer: q.answer }))
      );
      return await produceRecommendations(res, session, profileText, allQA, skills);
    }

    const messages = [
      { role: "user", parts: [{ text: buildAgentSystemPrompt(profileText, allQA, round) }] }
    ];

    let iterations = 0;
    let collectedSkills = null;

    while (iterations < MAX_LOOP_ITERATIONS) {
      iterations++;
      console.log("🔁 LOOP iteration", iterations);

      const raw = await callGeminiWithTools(messages, [SKILL_ANALYSIS_TOOL_DEF]);
      if (!raw) return res.status(500).json({ error: "Gemini call failed" });

      const candidate = raw?.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      const funcCallPart = parts.find(p => p.functionCall);
      if (funcCallPart) {
        const { name, args } = funcCallPart.functionCall;
        console.log("🔧 Model requested tool:", name);

        messages.push({ role: "model", parts });

        const toolResult = await dispatchTool(name, args);
        collectedSkills = toolResult;

        messages.push({
          role: "user",
          parts: [{
            functionResponse: {
              name,
              response: { skills: toolResult }
            }
          }]
        });
        continue;
      }

      const text = parts.find(p => p.text)?.text || "";
      console.log("📩 AGENT TEXT OUTPUT:", text);

      let parsed;
      try { parsed = extractJSON(text); }
      catch { return res.status(500).json({ error: "Agent returned invalid JSON" }); }

      if (parsed.action === "ask_questions") {
        const questions = (parsed.questions || []).slice(0, 3).map((q, i) => ({
          id: `aq${round}_${i}`,
          text: q.text || q,
          options: Array.isArray(q.options) && q.options.length === 3
            ? q.options
            : ["Strongly agree", "Somewhat agree", "Disagree"]
        }));
        updateSession(session.id, { agentRound: round + 1 });
        return res.json({ action: "ask_questions", questions, round });
      }

      if (parsed.action === "recommend_professions") {
        if (!collectedSkills) {
          console.log("⚠️ Model skipped tool, forcing skill_analysis");
          collectedSkills = await executeSkillAnalysis(
            allQA.map(q => ({ question: q.question, answer: q.answer }))
          );
        }
        return await produceRecommendations(res, session, profileText, allQA, collectedSkills, parsed.recommendations);
      }

      console.error("❌ Unexpected agent action:", parsed);
      break;
    }

    console.log("⛔ LOOP LIMIT reached — forcing skill_analysis");
    const skills = await executeSkillAnalysis(
      allQA.map(q => ({ question: q.question, answer: q.answer }))
    );
    return await produceRecommendations(res, session, profileText, allQA, skills);

  } catch (err) {
    console.error("❌ AGENT_ERROR", err);
    return res.status(500).json({ error: "Agent error" });
  }
});

async function produceRecommendations(res, session, profileText, allQA, skills, existingRecs) {
  let recommendations = existingRecs;
  if (!recommendations) {
    const recResult = await callGemini(
      buildRecommendFromSkillsPrompt(profileText, allQA, skills)
    );
    if (recResult?._error || !Array.isArray(recResult?.recommendations)) {
      return res.status(500).json({ error: "Recommendation generation failed" });
    }
    recommendations = recResult.recommendations;
  }
  updateSession(session.id, { skills, recommendations });
  return res.json({
    action: "recommend_professions",
    skills: skills.map(s => ({ name: s.skill ?? s.name, percentage: s.percentage })),
    recommendations
  });
}

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`🚀 SERVER_RUNNING ${port}`);
});
