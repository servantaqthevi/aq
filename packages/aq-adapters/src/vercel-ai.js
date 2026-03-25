// aq-adapters/vercel-ai — Governance layer for Vercel AI SDK
// Drop-in: govern any generateText / streamText / generateObject call.
'use strict';

const { createGovernance } = require('./generic');

/**
 * Create a Vercel AI SDK governance wrapper.
 *
 * @param {Object} [config] - Same config as createGovernance()
 * @returns {Object} { governText, governStream, wrapModel }
 *
 * @example
 * const { generateText } = require('ai');
 * const { createVercelGovernance } = require('aq-adapters/vercel-ai');
 *
 * const gov = createVercelGovernance({
 *   nerveSignals: [
 *     { name: 'emergency', pattern: '(?:emergency|911)', severity: 'critical', reflex: 'escalate' }
 *   ]
 * });
 *
 * // Option 1: Govern a generateText result
 * const raw = await generateText({
 *   model: openai('gpt-4o'),
 *   prompt: userMessage
 * });
 * const result = gov.governText(raw.text, { input: userMessage });
 * // result.text — governed output
 *
 * @example
 * // Option 2: Wrap the entire call
 * const result = await gov.wrap(
 *   () => generateText({ model: openai('gpt-4o'), prompt: userMessage }),
 *   { input: userMessage }
 * );
 *
 * @example
 * // Option 3: As middleware for API routes (Next.js)
 * // app/api/chat/route.ts
 * const gov = createVercelGovernance();
 *
 * export async function POST(req) {
 *   const { messages } = await req.json();
 *   const lastMessage = messages[messages.length - 1].content;
 *
 *   // Pre-check: scan for emergencies
 *   const scan = gov.scanInput(lastMessage);
 *   if (scan.emergency?.is_emergency) {
 *     return Response.json({ error: 'Emergency detected', action: scan.emergency.action });
 *   }
 *
 *   const result = await generateText({
 *     model: openai('gpt-4o'),
 *     messages
 *   });
 *
 *   const governed = gov.governText(result.text, { input: lastMessage });
 *   return Response.json({ text: governed.text, governance: governed });
 * }
 */
function createVercelGovernance(config = {}) {
  const gov = createGovernance(config);

  /**
   * Govern a text result from generateText().
   *
   * @param {string} text - The generated text
   * @param {Object} [opts] - { input, context }
   * @returns {Object} { text, guard, soul, mirror }
   */
  function governText(text, opts = {}) {
    return gov.guardOutput(text, opts);
  }

  /**
   * Wrap a generateText call with full governance pipeline.
   *
   * @param {Function} generateCall - () => generateText({...})
   * @param {Object} [opts] - { input, context }
   * @returns {Object} Full governed result
   */
  async function wrapGenerate(generateCall, opts = {}) {
    return gov.wrap(async () => {
      const result = await generateCall();
      return { text: result.text || result.content || '' };
    }, opts);
  }

  /**
   * Create a text transform function for streaming.
   * Apply after collecting stream chunks.
   *
   * @param {Object} [opts] - Default governance options
   * @returns {Function} (fullText, input) => governed text
   */
  function createStreamTransform(opts = {}) {
    return (fullText, input = '') => {
      const result = gov.guardOutput(fullText, { ...opts, input });
      return result.text;
    };
  }

  return { governText, wrapGenerate, createStreamTransform, ...gov };
}

module.exports = { createVercelGovernance };
