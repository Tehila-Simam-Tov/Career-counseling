# Architecture & Sequence Diagrams

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              REACT FRONTEND                                   │
│                                                                               │
│   Pages:  Home → Questions → Agent rounds → Subjects → Simulation            │
│                                                                               │
│   Components:                                                                 │
│     Home.tsx          — profile text input, start button                     │
│     Questions.tsx     — question cards with 3-option answers                 │
│     Subjects.tsx      — ranked profession results + Validate button          │
│     Simulation.tsx    — simulation task, answer form, evaluation, final rec  │
│     LoadingOverlay.tsx — animated loading overlay                            │
│                                                                               │
│   Hooks:                                                                      │
│     useSimulation.ts  — fetchSimulation(), submitSolution(), state           │
│                                                                               │
│   Types:   src/types/simulation.ts                                           │
└────────────────────────────┬─────────────────────────────────────────────────┘
                             │  HTTP POST  (JSON + sessionId)
                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND  (Node.js / Express)                          │
│                                                                               │
│  Existing routes:                                                             │
│    POST /api/generate-questions   — Gemini → 4 profile questions             │
│    POST /api/agent                — Gemini tool-calling loop → skills + recs  │
│    POST /api/recommend-professions — Gemini → ranked professions             │
│    GET  /health                                                               │
│                                                                               │
│  New routes (server/routes/simulationRoutes.js):                             │
│    POST /api/simulation/generate                                              │
│    POST /api/simulation/evaluate                                              │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  simulationController.js   — input validation, error handling         │    │
│  └──────────────────────────────┬───────────────────────────────────────┘    │
│                                 │                                             │
│  ┌──────────────────────────────▼───────────────────────────────────────┐    │
│  │  simulationService.js   — workflow orchestration                       │    │
│  │    generateSimulation()    → MCP callTool()                           │    │
│  │    evaluateAndFinalize()   → MCP callTool() → validationAgent         │    │
│  └──────────┬──────────────────────────────────────┬─────────────────── ┘    │
│             │                                      │                          │
│  ┌──────────▼──────────┐             ┌─────────────▼─────────────────────┐  │
│  │   mcpClient.js       │             │   validationAgent.js               │  │
│  │                      │             │                                    │  │
│  │  discoverTools()     │             │  runValidationAgent(context)       │  │
│  │  verifyTool()        │             │    ↓ calls validationSkill         │  │
│  │  callTool()          │             │    ↓ Gemini tool-calling loop      │  │
│  └──────────┬──────────┘             │    ↓ dispatches tool result        │  │
│             │ stdio transport         │    ↓ returns FinalRecommendation   │  │
│             │                         └────────────────┬──────────────────┘  │
│             │                                          │                      │
│             │                         ┌────────────────▼──────────────────┐  │
│             │                         │   validationSkill.js               │  │
│             │                         │                                    │  │
│             │                         │  buildValidationPrompt()           │  │
│             │                         │  MAKE_FINAL_RECOMMENDATION_TOOL    │  │
│             │                         │  validateFinalRecommendation()     │  │
│             │                         └───────────────────────────────────┘  │
│             │                                                                  │
│  ┌──────────▼──────────────────────────────────────────────────────────────┐  │
│  │  sessionStore.js  (server/db/sessions.json)                              │  │
│  │                                                                          │  │
│  │  Fields: id, profile, questions, answers, skills, recommendations,       │  │
│  │          agentRound, simulation, userSolution, evaluation,               │  │
│  │          simulationScore, finalRecommendation, createdAt                 │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │ stdio (child_process)
┌──────────────────────────────▼───────────────────────────────────────────────┐
│                         MCP SERVER  (server/mcp/mcpServer.js)                 │
│                                                                               │
│  Initialization sequence:                                                     │
│    1. Create McpServer({ name, version })                                    │
│    2. Register Tool 1 — GenerateProfessionSimulation                        │
│       • Zod schema: { profession, userSkills[], sessionId }                  │
│       • Handler: validateInput → Gemini prompt → parse JSON → return        │
│    3. Register Tool 2 — EvaluateSimulationSolution                          │
│       • Zod schema: { profession, simulation{}, userSolution }               │
│       • Handler: validateInput → Gemini prompt → parse JSON → return        │
│    4. Connect StdioServerTransport                                           │
│                                                                               │
│  Both handlers call Gemini directly (raw https, same pattern as backend)    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Sequence Diagram — Full End-to-End Workflow

```
React          Backend           Service         mcpClient       MCP Server     validationAgent  validationSkill   Gemini
  │                │               │                │                │                │                │              │
  │ POST /api/simulation/generate  │                │                │                │                │              │
  │───────────────>│               │                │                │                │                │              │
  │                │──────────────>│                │                │                │                │              │
  │                │               │─discoverTools()>│               │                │                │              │
  │                │               │                │─list_tools────>│                │                │              │
  │                │               │                │<─[Tool1,Tool2]─│                │                │              │
  │                │               │─verifyTool()──>│                │                │                │              │
  │                │               │                │ (Tool1 found ✓)│                │                │              │
  │                │               │─callTool(GenerateProfessionSimulation)──────────>│                │              │
  │                │               │                │                │─handler()      │                │              │
  │                │               │                │                │────────────────────────────────────────────>│  │
  │                │               │                │                │<───────────────────────────── simulationJSON │  │
  │                │               │                │<───────────────│                │                │              │
  │                │               │ updateSession(simulation)       │                │                │              │
  │                │<──────────────│                │                │                │                │              │
  │<── { simulation } ────────────│                │                │                │                │              │
  │                │               │                │                │                │                │              │
  │  [user reads simulation]       │                │                │                │                │              │
  │  [user writes answer]          │                │                │                │                │              │
  │                │               │                │                │                │                │              │
  │ POST /api/simulation/evaluate  │                │                │                │                │              │
  │───────────────>│               │                │                │                │                │              │
  │                │──────────────>│                │                │                │                │              │
  │                │               │─discoverTools()>│               │                │                │              │
  │                │               │                │─list_tools────>│                │                │              │
  │                │               │                │<─[Tool1,Tool2]─│                │                │              │
  │                │               │─verifyTool()──>│                │                │                │              │
  │                │               │                │ (Tool2 found ✓)│                │                │              │
  │                │               │─callTool(EvaluateSimulationSolution)────────────>│                │              │
  │                │               │                │                │─handler()      │                │              │
  │                │               │                │                │────────────────────────────────────────────>│  │
  │                │               │                │                │<───────────────────────────── evaluationJSON │  │
  │                │               │                │<───────────────│                │                │              │
  │                │               │─runValidationAgent(context)────────────────────>│                │              │
  │                │               │                │                │                │─buildPrompt()──>│             │
  │                │               │                │                │                │<──────prompt────│             │
  │                │               │                │                │                │─getToolDef()───>│             │
  │                │               │                │                │                │<──toolSchema────│             │
  │                │               │                │                │                │─callGeminiWithTools()────────────────>│
  │                │               │                │                │                │<─ functionCall(make_final_recommendation)─│
  │                │               │                │                │                │─validateResult()>│            │
  │                │               │                │                │                │<──validated─────│            │
  │                │               │<───────────────────────────────────────────finalRecommendation    │              │
  │                │               │ updateSession(evaluation, userSolution,          │                │              │
  │                │               │              simulationScore, finalRecommendation)│               │              │
  │                │<──────────────│                │                │                │                │              │
  │<── { evaluation, finalRecommendation } ────────│                │                │                │              │
  │                │               │                │                │                │                │              │
  │  [display score, strengths,    │                │                │                │                │              │
  │   weaknesses, final profession]│                │                │                │                │              │
```

---

## Agent / Skill Separation

```
┌──────────────────────────────────────────────────────────────┐
│  validationAgent.js  — KNOWS HOW                             │
│                                                              │
│  • Owns the Gemini tool-calling loop                         │
│  • Drives iterations (max 6)                                 │
│  • Handles nudge logic when model responds with text         │
│  • Dispatches tool call results                              │
│  • Does NOT know what profession to recommend                │
│  • Does NOT know what prompt to build                        │
└────────────────────────────┬─────────────────────────────────┘
                             │ invokes
┌────────────────────────────▼─────────────────────────────────┐
│  validationSkill.js  — KNOWS WHAT                            │
│                                                              │
│  • buildValidationPrompt(context)                            │
│    Builds the full Gemini context: profession, skills,       │
│    simulation, evaluation, conversation history              │
│                                                              │
│  • MAKE_FINAL_RECOMMENDATION_TOOL                            │
│    Defines the tool schema the Agent passes to Gemini:       │
│    finalProfession, confidence, explanation, recommendations  │
│                                                              │
│  • validateFinalRecommendation(result)                       │
│    Validates all fields before the result is returned        │
│    (not the Agent's job to know what valid looks like)       │
└──────────────────────────────────────────────────────────────┘
```

---

## MCP Tool Discovery Protocol

Every MCP tool call, without exception, follows this 3-step sequence:

```
Step 1: discoverTools()
         client.listTools() → [{ name, description, inputSchema }, ...]

Step 2: verifyTool(toolName, discoveredTools)
         find(t => t.name === toolName)
         throw if not found — prevents silent wrong-tool calls

Step 3: callTool(toolName, args)
         client.callTool({ name, arguments })
         parse text content → return JSON object
```

This runs independently before `/api/simulation/generate` AND before `/api/simulation/evaluate`.
The MCP client is a lazy singleton — the child process is spawned once and reused.

---

## Session Persistence — Simulation Fields

```
After /api/simulation/generate:
  session.simulation = SimulationData

After /api/simulation/evaluate:
  session.userSolution        = string (raw user answer)
  session.evaluation          = EvaluationReport
  session.simulationScore     = number (copy of evaluation.score)
  session.finalRecommendation = FinalRecommendation
```

All fields written atomically via `updateSession(id, patch)` which
does a full read → merge → write of `sessions.json`.

---

## Error Handling Strategy

| Layer | Strategy |
|---|---|
| MCP Server tool handlers | Zod validates input before handler runs. Returns structured error text if Gemini fails. Never crashes the process. |
| MCP Client | Throws with descriptive message if tool not found or content is empty/non-JSON |
| Validation Agent | Throws if Gemini returns null, unknown tool called, or max iterations exceeded |
| Validation Skill | Throws if any required field missing or out of range |
| Simulation Service | Propagates errors up to controller |
| Simulation Controller | Catches all errors, returns `502` with `{ error: message }` |
| React hook | Catches fetch errors, sets `error` state for display |
| Simulation component | Shows error panel with Start Over button |

---

## Scalability Notes

- The MCP client singleton works well for a single server process. For horizontal scaling, replace `StdioClientTransport` with an HTTP/SSE MCP transport so the MCP server runs as a separate service.
- `sessions.json` is suitable for development. Replace with Redis or PostgreSQL for production. `sessionStore.js` is the only file that needs changing — the interface (`createSession`, `getSession`, `updateSession`) stays the same.
- The Validation Agent loop is capped at 6 iterations to prevent runaway Gemini usage.
- Zod validation in the MCP server prevents malformed data from ever reaching the Gemini API.

---

## Future Improvements

1. Add a second simulation round — if the final recommendation differs from the original, generate a second simulation for the new profession
2. Persist MCP client across requests using an HTTP transport (removes child process overhead)
3. Add streaming responses from Gemini so the frontend shows incremental output
4. Replace `sessions.json` with Redis for concurrent access safety
5. Add rate limiting per sessionId on the simulation endpoints
6. Expose MCP tool discovery result to the frontend so users can see which tools are available
