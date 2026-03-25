// aq-adapters/langchain — Governance layer for LangChain.js agents
// Drop-in: add AQ governance to any LangChain.js chain or agent.
'use strict';

const { createGovernance } = require('./generic');

/**
 * Create a LangChain.js-compatible output processor that governs agent responses.
 * Use with RunnableSequence or as a post-processing step.
 *
 * @param {Object} [config] - Same config as createGovernance()
 * @returns {Object} { processOutput, governChain, createCallbackHandler }
 *
 * @example
 * // Option 1: Process output after chain execution
 * const { processOutput } = require('aq-adapters/langchain').createLangChainGovernance();
 *
 * const chain = prompt.pipe(model).pipe(outputParser);
 * const raw = await chain.invoke({ input: userMessage });
 * const governed = processOutput(raw, { input: userMessage });
 * // governed.text — safe output
 * // governed.governance — audit trail
 *
 * @example
 * // Option 2: Wrap the entire chain
 * const { governChain } = require('aq-adapters/langchain').createLangChainGovernance({
 *   nerveSignals: [
 *     { name: 'emergency', pattern: '(?:emergency|911)', severity: 'critical', reflex: 'escalate' }
 *   ],
 *   onEmergency: (e) => console.log('EMERGENCY:', e.type)
 * });
 *
 * const result = await governChain(
 *   () => chain.invoke({ input: userMessage }),
 *   { input: userMessage }
 * );
 *
 * @example
 * // Option 3: As a Runnable-compatible transform
 * const { asRunnable } = require('aq-adapters/langchain').createLangChainGovernance();
 *
 * const governedChain = prompt
 *   .pipe(model)
 *   .pipe(outputParser)
 *   .pipe(asRunnable());
 */
function createLangChainGovernance(config = {}) {
  const gov = createGovernance(config);

  /**
   * Process a LangChain output through the governance pipeline.
   * Handles string outputs, AIMessage objects, and BaseMessage objects.
   *
   * @param {string|Object} output - Chain output (string, AIMessage, or { content })
   * @param {Object} [opts] - { input, context }
   * @returns {Object} { text, governance, safe, confidence, escalate }
   */
  function processOutput(output, opts = {}) {
    const text = _extractText(output);
    return gov.guardOutput(text, opts);
  }

  /**
   * Wrap a chain invocation with full governance (input scan + output guard).
   *
   * @param {Function} chainInvoke - () => chain.invoke(...)
   * @param {Object} [opts] - { input, context }
   * @returns {Object} Governed result
   */
  async function governChain(chainInvoke, opts = {}) {
    return gov.wrap(async () => {
      const result = await chainInvoke();
      return { text: _extractText(result) };
    }, opts);
  }

  /**
   * Create a function compatible with LangChain's RunnableSequence.
   * Use with .pipe(): chain.pipe(asRunnable())
   *
   * @param {Object} [opts] - Default options for governance
   * @returns {Function} (input) => governed output
   */
  function asRunnable(opts = {}) {
    return async (input) => {
      const text = _extractText(input);
      const result = gov.guardOutput(text, opts);
      return result.text;
    };
  }

  return { processOutput, governChain, asRunnable, ...gov };
}

function _extractText(output) {
  if (typeof output === 'string') return output;
  if (output?.content) return typeof output.content === 'string' ? output.content : JSON.stringify(output.content);
  if (output?.text) return output.text;
  if (output?.output) return output.output;
  return String(output || '');
}

module.exports = { createLangChainGovernance };
