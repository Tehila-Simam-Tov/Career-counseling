/**
 * Simulation Service
 *
 * Orchestrates the complete simulation workflow:
 *
 *   generateSimulation()
 *     1. Discover MCP tools
 *     2. Verify GenerateProfessionSimulation exists
 *     3. Call the tool
 *     4. Persist simulation to session
 *
 *   evaluateAndFinalize()
 *     1. Discover MCP tools
 *     2. Verify EvaluateSimulationSolution exists
 *     3. Call the tool
 *     4. Run the Validation Agent (which invokes the Validation Skill)
 *     5. Persist evaluation + final recommendation to session
 */

const { callTool }          = require('../mcp/mcpClient');
const { runValidationAgent } = require('../agents/validationAgent');
const { getSession, updateSession } = require('../db/sessionStore');

// ── generateSimulation ────────────────────────────────────────────────────

/**
 * @param {string} sessionId
 * @param {string} profession
 * @param {Array}  userSkills  [{ skill, confidence }]
 * @returns {Promise<SimulationData>}
 */
async function generateSimulation(sessionId, profession, userSkills) {
  console.log('🎯 SimulationService: generating simulation for', profession);

  // MCP: discover → verify → call (all inside callTool)
  const simulation = await callTool('GenerateProfessionSimulation', {
    profession,
    userSkills,
    sessionId
  });

  // Persist to session
  updateSession(sessionId, { simulation });

  console.log('✅ SimulationService: simulation generated:', simulation.simulationTitle);
  return simulation;
}

// ── evaluateAndFinalize ───────────────────────────────────────────────────

/**
 * @param {string} sessionId
 * @param {string} profession
 * @param {object} simulation     SimulationData from previous step
 * @param {string} userSolution   Raw text submitted by the user
 * @param {Array}  userSkills     [{ skill, confidence }]
 * @returns {Promise<{ evaluation: EvaluationReport, finalRecommendation: FinalRecommendation }>}
 */
async function evaluateAndFinalize(sessionId, profession, simulation, userSolution, userSkills) {
  console.log('🎯 SimulationService: evaluating solution for', profession);

  // MCP: discover → verify → call (all inside callTool)
  const evaluation = await callTool('EvaluateSimulationSolution', {
    profession,
    simulation,
    userSolution
  });

  console.log('📊 SimulationService: evaluation score:', evaluation.score);

  // Load conversation history from session for the Agent's context
  const session = getSession(sessionId);
  const conversationHistory = (session?.answers || []).map(qa => ({
    question: qa.question,
    answer:   qa.answer
  }));

  // Run the Validation Agent — it invokes the Validation Skill internally
  const finalRecommendation = await runValidationAgent({
    recommendedProfession: profession,
    userSkills,
    simulation,
    evaluation,
    conversationHistory
  });

  // Persist everything to session
  updateSession(sessionId, {
    userSolution,
    evaluation,
    simulationScore:     evaluation.score,
    finalRecommendation
  });

  console.log('✅ SimulationService: finalized profession:', finalRecommendation.finalProfession);
  return { evaluation, finalRecommendation };
}

module.exports = { generateSimulation, evaluateAndFinalize };
