# Backend — Career Counseling API

## How to Run

```bash
# Start the backend server (port 5002)
npm run server

# Start the MCP server standalone (for testing only — normally auto-spawned)
npm run mcp-server
```

The backend auto-spawns the MCP server as a child process on first use.
You do not need to start the MCP server manually.

---

## Architecture

```
server/
├── index.js                  — Express app, existing routes + mounts simulationRoutes
├── db/
│   └── sessionStore.js       — JSON file session store (read/write sessions.json)
├── routes/
│   └── simulationRoutes.js   — POST /api/simulation/generate  /evaluate
├── controllers/
│   └── simulationController.js — Input validation, delegates to service
├── services/
│   └── simulationService.js  — Orchestrates MCP calls + Validation Agent
├── agents/
│   └── validationAgent.js    — Gemini tool-calling loop, invokes Validation Skill
├── skills/
│   └── validationSkill.js    — Prompt builder, tool schema, result validator
└── mcp/
    ├── mcpServer.js           — Standalone MCP server, registers 2 tools
    └── mcpClient.js           — discover → verify → call protocol
```

### Request flow for simulation

```
POST /api/simulation/generate
  → simulationController
    → simulationService.generateSimulation()
      → mcpClient.callTool('GenerateProfessionSimulation')
        → mcpClient.discoverTools()          [list all tools]
        → mcpClient.verifyTool()             [confirm tool exists]
        → client.callTool()                  [invoke via MCP protocol]
          → mcpServer: handleGenerateSimulation()
            → Gemini API
        → return SimulationData
      → updateSession(simulation)
  → respond { simulation }

POST /api/simulation/evaluate
  → simulationController
    → simulationService.evaluateAndFinalize()
      → mcpClient.callTool('EvaluateSimulationSolution')
        → mcpClient.discoverTools()
        → mcpClient.verifyTool()
        → client.callTool()
          → mcpServer: handleEvaluateSolution()
            → Gemini API
        → return EvaluationReport
      → validationAgent.runValidationAgent()
        → validationSkill.buildValidationPrompt()   [Skill builds context]
        → validationSkill.MAKE_FINAL_RECOMMENDATION_TOOL  [Skill defines tool]
        → Gemini tool-calling loop
          → model calls make_final_recommendation
        → validationSkill.validateFinalRecommendation()  [Skill validates result]
        → return FinalRecommendation
      → updateSession(evaluation, finalRecommendation, userSolution, simulationScore)
  → respond { evaluation, finalRecommendation }
```

---

## Session Schema

```json
{
  "id":                  "uuid",
  "profile":             "string — user profile text",
  "questions":           [],
  "answers":             [],
  "skills":              [],
  "recommendations":     [],
  "agentRound":          0,
  "simulation":          null,
  "userSolution":        null,
  "evaluation":          null,
  "simulationScore":     null,
  "finalRecommendation": null,
  "createdAt":           "ISO date"
}
```

---

## API Reference

### POST `/api/generate-questions`

Generates 4 personalised career questions from a user profile.

**Request**
```json
{ "profileText": "I love solving problems and working with data." }
```

**Response**
```json
{
  "sessionId": "uuid",
  "questions": [
    { "id": "q1", "text": "...", "options": ["A", "B", "C"] }
  ]
}
```

---

### POST `/api/agent`

Runs the career-guidance agent loop. Returns follow-up questions or final profession recommendations.

**Request**
```json
{
  "sessionId": "uuid",
  "newAnswers": [
    { "questionId": "q1", "question": "...", "selectedOption": 0, "answer": "Option A" }
  ]
}
```

**Response — more questions needed**
```json
{ "action": "ask_questions", "questions": [...], "round": 1 }
```

**Response — recommendations ready**
```json
{
  "action": "recommend_professions",
  "skills": [{ "name": "Analytical Thinking", "percentage": 87 }],
  "recommendations": [{ "profession": "Data Scientist", "match_percentage": 91, "reason": "..." }]
}
```

---

### POST `/api/simulation/generate`

Calls MCP Tool 1 via discover → verify → invoke. Generates a profession simulation task.

**Request**
```json
{
  "sessionId":  "uuid",
  "profession": "Software Engineer",
  "userSkills": [{ "skill": "Problem Solving", "confidence": 87 }]
}
```

**Response**
```json
{
  "simulation": {
    "simulationTitle":      "Debug a Production Outage",
    "description":          "Your team's API has gone down during peak hours...",
    "instructions":         "1. Identify the most likely causes\n2. Write your incident response plan\n3. Describe how you would communicate to stakeholders",
    "expectedAnswerFormat": "numbered steps"
  }
}
```

**Errors**
- `400` — missing or invalid fields
- `404` — session not found
- `502` — MCP tool not discovered or Gemini call failed

---

### POST `/api/simulation/evaluate`

Calls MCP Tool 2, then runs the Validation Agent which invokes the Validation Skill.

**Request**
```json
{
  "sessionId":    "uuid",
  "profession":   "Software Engineer",
  "simulation":   { "simulationTitle": "...", "description": "...", "instructions": "...", "expectedAnswerFormat": "..." },
  "userSolution": "1. Check logs immediately...",
  "userSkills":   [{ "skill": "Problem Solving", "confidence": 87 }]
}
```

**Response**
```json
{
  "evaluation": {
    "score":      78,
    "strengths":  ["Clear incident prioritisation", "Good stakeholder communication"],
    "weaknesses": ["Did not mention rollback strategy"],
    "reasoning":  "The response demonstrated solid on-call instincts but missed infrastructure recovery steps."
  },
  "finalRecommendation": {
    "finalProfession":  "Software Engineer",
    "confidence":       82,
    "explanation":      "The simulation confirmed strong debugging and communication skills consistent with the original recommendation.",
    "recommendations":  ["Study incident post-mortem templates", "Practice rollback procedures", "Learn SRE fundamentals"]
  }
}
```

**Errors**
- `400` — missing or invalid fields
- `404` — session not found
- `502` — MCP tool not discovered, Gemini failed, or Validation Agent loop exhausted

---

### GET `/health`

```json
{ "ok": true }
```

---

## MCP Tools

### Tool 1 — GenerateProfessionSimulation

| Field | Type | Description |
|---|---|---|
| `profession` | string | Recommended profession |
| `userSkills` | array | `[{ skill, confidence }]` |
| `sessionId` | string | Session UUID |

Returns `{ simulationTitle, description, instructions, expectedAnswerFormat }`.

### Tool 2 — EvaluateSimulationSolution

| Field | Type | Description |
|---|---|---|
| `profession` | string | Profession being evaluated |
| `simulation` | object | Full SimulationData object |
| `userSolution` | string | Min 10 chars |

Returns `{ score, strengths[], weaknesses[], reasoning }`.

Both tools use Zod schema validation before the handler executes.
If validation fails, the MCP server returns a structured error — it does not crash.
