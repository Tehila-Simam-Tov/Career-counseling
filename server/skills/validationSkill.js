/**
 * Validation Skill
 *
 * Encapsulates ALL business logic for the validation decision:
 *   - Builds the Gemini prompt from profession, skills, evaluation, and history
 *   - Defines the make_final_recommendation tool schema (what the Agent will call)
 *   - Interprets and validates the tool result
 *
 * The Validation Agent drives the loop; this Skill tells it what to think about
 * and what a valid result looks like. The Agent never constructs prompts directly.
 */

// ── Tool definition (passed to the Agent for the Gemini loop) ────────────

const MAKE_FINAL_RECOMMENDATION_TOOL = {
  name: 'make_final_recommendation',
  description:
    'Produces the final career recommendation after analysing all evidence: ' +
    'the originally recommended profession, the user\'s detected skills, ' +
    'the simulation evaluation report, and the full conversation history. ' +
    'Call this tool when you have enough evidence to make a confident decision.',
  parameters: {
    type: 'object',
    properties: {
      finalProfession: {
        type:        'string',
        description: 'The final recommended profession (may be the same as or different from the original)'
      },
      confidence: {
        type:        'number',
        description: 'Confidence in the final recommendation, 0-100'
      },
      explanation: {
        type:        'string',
        description: '2-3 sentences explaining why this profession is recommended and how the simulation influenced the decision'
      },
      recommendations: {
        type:  'array',
        items: { type: 'string' },
        description: '2-4 concrete, actionable improvement tips for the user'
      }
    },
    required: ['finalProfession', 'confidence', 'explanation', 'recommendations']
  }
};

// ── Prompt builder ────────────────────────────────────────────────────────

/**
 * Builds the system prompt the Agent uses to reason about the validation.
 *
 * @param {object} context
 * @param {string}   context.recommendedProfession
 * @param {Array}    context.userSkills              [{ skill, confidence }]
 * @param {object}   context.simulation              SimulationData
 * @param {object}   context.evaluation              EvaluationReport
 * @param {Array}    context.conversationHistory     last N Q&A pairs from session
 */
function buildValidationPrompt(context) {
  const {
    recommendedProfession,
    userSkills,
    simulation,
    evaluation,
    conversationHistory
  } = context;

  const skillsSummary = userSkills
    .map(s => `  • ${s.skill}: ${s.confidence}% confidence`)
    .join('\n');

  const historyContext = conversationHistory.length > 0
    ? conversationHistory
        .slice(-8)
        .map(qa => `  Q: ${qa.question}\n  A: ${qa.answer}`)
        .join('\n\n')
    : '  (no prior conversation history)';

  const strengthsList = (evaluation.strengths || []).map(s => `  • ${s}`).join('\n');
  const weaknessesList = (evaluation.weaknesses || []).map(w => `  • ${w}`).join('\n');

  return `
You are a senior career validation agent.

Your task is to make a final career recommendation for this user after reviewing ALL available evidence.

════════════════════════════════════════
ORIGINAL RECOMMENDATION
════════════════════════════════════════
Profession: ${recommendedProfession}

════════════════════════════════════════
DETECTED SKILLS
════════════════════════════════════════
${skillsSummary}

════════════════════════════════════════
SIMULATION PERFORMED
════════════════════════════════════════
Title:        ${simulation.simulationTitle}
Description:  ${simulation.description}

════════════════════════════════════════
SIMULATION EVALUATION
════════════════════════════════════════
Score:      ${evaluation.score}/100
Strengths:
${strengthsList}
Weaknesses:
${weaknessesList}
Reasoning:  ${evaluation.reasoning}

════════════════════════════════════════
CONVERSATION HISTORY
════════════════════════════════════════
${historyContext}

════════════════════════════════════════
YOUR TASK
════════════════════════════════════════
Analyse ALL the evidence above holistically. Do NOT rely on a fixed score threshold.
Consider:
  1. How well do the user's skills align with "${recommendedProfession}"?
  2. What does the simulation score reveal about real-world readiness?
  3. Do the strengths and weaknesses suggest a different career path would be a better fit?
  4. Is the conversation history consistent with the original recommendation?

When you have reached a well-reasoned conclusion, call the make_final_recommendation tool.
`.trim();
}

// ── Result validator ──────────────────────────────────────────────────────

/**
 * Validates the object returned by the make_final_recommendation tool.
 * Throws if required fields are missing or out of range.
 *
 * @param {object} result
 * @returns {object} validated result
 */
function validateFinalRecommendation(result) {
  if (!result || typeof result !== 'object') {
    throw new Error('Validation Skill: make_final_recommendation returned no result');
  }
  if (!result.finalProfession || typeof result.finalProfession !== 'string') {
    throw new Error('Validation Skill: finalProfession must be a non-empty string');
  }
  if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 100) {
    throw new Error('Validation Skill: confidence must be a number between 0 and 100');
  }
  if (!result.explanation || typeof result.explanation !== 'string') {
    throw new Error('Validation Skill: explanation must be a non-empty string');
  }
  if (!Array.isArray(result.recommendations) || result.recommendations.length === 0) {
    throw new Error('Validation Skill: recommendations must be a non-empty array');
  }
  return result;
}

module.exports = {
  MAKE_FINAL_RECOMMENDATION_TOOL,
  buildValidationPrompt,
  validateFinalRecommendation
};
