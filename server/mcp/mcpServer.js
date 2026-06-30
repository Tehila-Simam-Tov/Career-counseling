/**
 * MCP Server — career-simulation-mcp
 *
 * Registers two tools:
 *   1. GenerateProfessionSimulation
 *   2. EvaluateSimulationSolution
 *
 * Runs as a child process connected via stdio transport.
 * The backend spawns this process once and reuses the connection.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const https = require('https');
const { McpServer }           = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z }                   = require('zod');

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel  = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// ── Shared Gemini caller ──────────────────────────────────────────────────

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in Gemini response');
  return JSON.parse(match[0]);
}

async function callGemini(prompt) {
  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, topP: 0.9, topK: 40 }
  });

  const raw = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse Gemini response')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return extractJSON(text);
}

// ── Tool schemas (Zod) ────────────────────────────────────────────────────

const GenerateSimulationInputSchema = {
  profession: z.string().min(1, 'profession is required'),
  userSkills: z.array(
    z.object({
      skill:      z.string().min(1),
      confidence: z.number().min(0).max(100)
    })
  ).min(1, 'at least one skill is required'),
  sessionId: z.string().min(1, 'sessionId is required')
};

const EvaluateSolutionInputSchema = {
  profession: z.string().min(1, 'profession is required'),
  simulation: z.object({
    simulationTitle:      z.string().min(1),
    description:          z.string().min(1),
    instructions:         z.string().min(1),
    expectedAnswerFormat: z.string().min(1)
  }),
  userSolution: z.string().min(10, 'userSolution must be at least 10 characters')
};

// ── Tool 1 handler: GenerateProfessionSimulation ──────────────────────────

async function handleGenerateSimulation(input) {
  console.error('🔧 MCP Tool: GenerateProfessionSimulation', input.profession);

  const skillsSummary = input.userSkills
    .map(s => `${s.skill} (${s.confidence}% confidence)`)
    .join(', ');

  const prompt = `
You are an expert career simulation designer.

Create a realistic professional simulation for the profession: "${input.profession}".
The user has demonstrated the following skills: ${skillsSummary}.

Requirements:
- The simulation must be realistic, relevant, and completable via a text response in 5-10 minutes
- It must directly test one or more of the user's identified skills
- The scenario should feel like a real on-the-job situation
- Instructions must be clear and unambiguous

Return ONLY valid JSON with exactly this structure (no markdown, no explanation):
{
  "simulationTitle": "string — short title for the task",
  "description": "string — 2-3 sentences describing the realistic scenario",
  "instructions": "string — clear step-by-step instructions for what the user must do",
  "expectedAnswerFormat": "string — e.g. 'paragraph', 'bullet list', 'numbered steps', 'code snippet'"
}`;

  const result = await callGemini(prompt);

  if (!result.simulationTitle || !result.description || !result.instructions || !result.expectedAnswerFormat) {
    throw new Error('GenerateProfessionSimulation: incomplete response from Gemini');
  }

  return result;
}

// ── Tool 2 handler: EvaluateSimulationSolution ────────────────────────────

async function handleEvaluateSolution(input) {
  console.error('🔧 MCP Tool: EvaluateSimulationSolution', input.profession);

  const prompt = `
You are an expert career assessment evaluator.

Profession being evaluated: "${input.profession}"
Simulation title: "${input.simulation.simulationTitle}"
Simulation description: "${input.simulation.description}"
Instructions given to the user: "${input.simulation.instructions}"
Expected answer format: "${input.simulation.expectedAnswerFormat}"

User's submitted solution:
"${input.userSolution}"

Evaluate this solution objectively. Consider:
- How well the solution addresses the simulation task
- Quality of professional thinking demonstrated
- Practical relevance to the "${input.profession}" role
- Clarity and structure of the response
- Depth of knowledge shown

Return ONLY valid JSON with exactly this structure (no markdown, no explanation):
{
  "score": <integer 0-100>,
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1"],
  "reasoning": "string — 2-3 sentences explaining the score and overall assessment"
}`;

  const result = await callGemini(prompt);

  if (typeof result.score !== 'number' || result.score < 0 || result.score > 100) {
    throw new Error('EvaluateSimulationSolution: score must be a number between 0 and 100');
  }
  if (!Array.isArray(result.strengths) || !Array.isArray(result.weaknesses)) {
    throw new Error('EvaluateSimulationSolution: strengths and weaknesses must be arrays');
  }

  return result;
}

// ── MCP Server registration ───────────────────────────────────────────────

async function main() {
  const server = new McpServer({
    name:    'career-simulation-mcp',
    version: '1.0.0'
  });

  // Register Tool 1
  server.tool(
    'GenerateProfessionSimulation',
    'Generates a realistic professional simulation task tailored to a recommended profession and the user\'s detected skills.',
    GenerateSimulationInputSchema,
    async (input) => {
      const result = await handleGenerateSimulation(input);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }]
      };
    }
  );

  // Register Tool 2
  server.tool(
    'EvaluateSimulationSolution',
    'Evaluates the user\'s submitted solution to a professional simulation and returns a structured assessment with score, strengths, weaknesses, and reasoning.',
    EvaluateSolutionInputSchema,
    async (input) => {
      const result = await handleEvaluateSolution(input);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }]
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('✅ Career Simulation MCP Server running on stdio');
}

main().catch(err => {
  console.error('💥 MCP Server fatal error:', err);
  process.exit(1);
});
