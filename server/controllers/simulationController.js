/**
 * Simulation Controller
 *
 * Handles HTTP request validation and delegates to SimulationService.
 * Follows the same pattern as the existing routes in server/index.js.
 */

const { getSession }                     = require('../db/sessionStore');
const { generateSimulation, evaluateAndFinalize } = require('../services/simulationService');

// ── POST /api/simulation/generate ────────────────────────────────────────

async function handleGenerateSimulation(req, res) {
  try {
    const { sessionId, profession, userSkills } = req.body || {};

    if (!sessionId)  return res.status(400).json({ error: 'sessionId is required' });
    if (!profession) return res.status(400).json({ error: 'profession is required' });
    if (!Array.isArray(userSkills) || userSkills.length === 0) {
      return res.status(400).json({ error: 'userSkills must be a non-empty array' });
    }

    const session = getSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    console.log('📥 SIMULATION/GENERATE session', sessionId, 'profession', profession);

    const simulation = await generateSimulation(sessionId, profession, userSkills);
    return res.json({ simulation });

  } catch (err) {
    console.error('❌ SIMULATION/GENERATE ERROR', err.message);
    return res.status(502).json({ error: err.message });
  }
}

// ── POST /api/simulation/evaluate ────────────────────────────────────────

async function handleEvaluateSolution(req, res) {
  try {
    const { sessionId, profession, simulation, userSolution, userSkills } = req.body || {};

    if (!sessionId)    return res.status(400).json({ error: 'sessionId is required' });
    if (!profession)   return res.status(400).json({ error: 'profession is required' });
    if (!simulation)   return res.status(400).json({ error: 'simulation is required' });
    if (!userSolution || userSolution.trim().length < 10) {
      return res.status(400).json({ error: 'userSolution must be at least 10 characters' });
    }
    if (!Array.isArray(userSkills) || userSkills.length === 0) {
      return res.status(400).json({ error: 'userSkills must be a non-empty array' });
    }

    const session = getSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    console.log('📥 SIMULATION/EVALUATE session', sessionId, 'profession', profession);

    const { evaluation, finalRecommendation } = await evaluateAndFinalize(
      sessionId, profession, simulation, userSolution, userSkills
    );

    return res.json({ evaluation, finalRecommendation });

  } catch (err) {
    console.error('❌ SIMULATION/EVALUATE ERROR', err.message);
    return res.status(502).json({ error: err.message });
  }
}

module.exports = { handleGenerateSimulation, handleEvaluateSolution };
