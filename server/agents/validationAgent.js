/**
 * Validation Agent
 *
 * Responsibilities:
 *   - Orchestrates the final recommendation workflow
 *   - Invokes the Validation Skill to get the prompt and tool definition
 *   - Runs the Gemini tool-calling loop (same pattern as /api/agent)
 *   - Dispatches the make_final_recommendation tool call back to the Skill
 *   - Returns the validated FinalRecommendation object
 *
 * The Agent knows HOW to run the loop.
 * The Skill knows WHAT to think about and WHAT a valid result looks like.
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const https = require('https');
const {
  MAKE_FINAL_RECOMMENDATION_TOOL,
  buildValidationPrompt,
  validateFinalRecommendation
} = require('../skills/validationSkill');

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel  = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const MAX_LOOP_ITERATIONS = 6;

// ── Gemini with tool-calling (same implementation as server/index.js) ─────

async function callGeminiWithTools(messages, tools) {
  const body = JSON.stringify({
    contents: messages,
    tools: [{ function_declarations: tools }],
    generationConfig: { temperature: 0.7, topP: 0.9, topK: 40 }
  });

  const raw = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path:     `/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Validation Agent: failed to parse Gemini response')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  return raw;
}

// ── Agent entry point ─────────────────────────────────────────────────────

/**
 * Runs the validation workflow.
 *
 * @param {object} context
 * @param {string}   context.recommendedProfession
 * @param {Array}    context.userSkills              [{ skill, confidence }]
 * @param {object}   context.simulation              SimulationData
 * @param {object}   context.evaluation              EvaluationReport
 * @param {Array}    context.conversationHistory     Q&A pairs from session.answers
 *
 * @returns {Promise<{ finalProfession, confidence, explanation, recommendations }>}
 */
async function runValidationAgent(context) {
  console.log('🤖 Validation Agent: starting loop for profession:', context.recommendedProfession);

  // Ask the Skill for the prompt and tool definition
  const systemPrompt = buildValidationPrompt(context);
  const toolDef      = MAKE_FINAL_RECOMMENDATION_TOOL;

  const messages = [
    { role: 'user', parts: [{ text: systemPrompt }] }
  ];

  let iterations = 0;

  while (iterations < MAX_LOOP_ITERATIONS) {
    iterations++;
    console.log('🔁 Validation Agent: loop iteration', iterations);

    const raw = await callGeminiWithTools(messages, [toolDef]);
    if (!raw) throw new Error('Validation Agent: Gemini returned null');

    const candidate = raw?.candidates?.[0];
    const parts     = candidate?.content?.parts || [];

    // Check if the model wants to call a tool
    const funcCallPart = parts.find(p => p.functionCall);

    if (funcCallPart) {
      const { name, args } = funcCallPart.functionCall;
      console.log('🔧 Validation Agent: model called tool:', name);

      if (name !== 'make_final_recommendation') {
        throw new Error(`Validation Agent: unexpected tool call "${name}"`);
      }

      // Push the model's tool-call message into history
      messages.push({ role: 'model', parts });

      // Delegate result validation to the Skill
      const validated = validateFinalRecommendation(args);
      console.log('✅ Validation Agent: final recommendation produced:', validated.finalProfession);
      return validated;
    }

    // Model responded with text instead of a tool call — nudge it
    const text = parts.find(p => p.text)?.text || '';
    console.log('📩 Validation Agent: model responded with text, nudging for tool call');

    messages.push({ role: 'model', parts });
    messages.push({
      role:  'user',
      parts: [{
        text: 'You must call the make_final_recommendation tool now with your final decision. Do not respond with plain text.'
      }]
    });
  }

  throw new Error('Validation Agent: exceeded maximum loop iterations without a tool call');
}

module.exports = { runValidationAgent };
