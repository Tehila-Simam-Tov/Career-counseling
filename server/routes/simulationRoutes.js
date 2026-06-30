/**
 * Simulation Routes
 *
 * POST /api/simulation/generate  — generate a profession simulation via MCP
 * POST /api/simulation/evaluate  — evaluate solution via MCP + Validation Agent
 */

const express    = require('express');
const router     = express.Router();
const {
  handleGenerateSimulation,
  handleEvaluateSolution
} = require('../controllers/simulationController');

router.post('/generate', handleGenerateSimulation);
router.post('/evaluate', handleEvaluateSolution);

module.exports = router;
