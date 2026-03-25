// aq-adapters/openai — Governance layer for OpenAI API and Agents SDK
// Drop-in: govern any chat.completions.create or Responses API call.
'use strict';

const { createGovernance } = require('./generic');

/**
 * Create an OpenAI-compatible governance wrapper.
 *
 * @param {Object} [config] - Same config as createGovernance()
 * @returns {Object} { governResponse, wrapCompletion, createToolGuard }
 *
 * @example
 * const OpenAI = require('openai');
 * const { createOpenAIGovernance } = require('aq-adapters/openai');
 *
 * const client = new OpenAI();
 * const gov = createOpenAIGovernance({
 *   nerveSignals: [
 *     { name: 'emergency', pattern: '(?:emergency|911)', severity: 'critical', reflex: 'escalate' }
 *   ]
 * });
 *
 * // Option 1: Govern a completion response
 * const completion = await client.chat.completions.create({
 *   model: 'gpt-4o',
 *   messages: [{ role: 'user', content: userMessage }]
 * });
 * const result = gov.governResponse(completion, { input: userMessage });
 * // result.text — governed output
 *
 * @example
 * // Option 2: Wrap the entire call
 * const result = await gov.wrapCompletion(
 *   () => client.chat.completions.create({
 *     model: 'gpt-4o',
 *     messages: [{ role: 'user', content: userMessage }]
 *   }),
 *   { input: userMessage }
 * );
 *
 * @example
 * // Option 3: Guard tool calls (prevent dangerous function calls)
 * const toolGuard = gov.createToolGuard({
 *   blocked: ['delete_account', 'send_payment'],
 *   requireApproval: ['update_billing', 'cancel_subscription'],
 *   onBlocked: (toolName, args) => logBlockedAction(toolName, args)
 * });
 *
 * // Before executing a tool call from the model:
 * const allowed = toolGuard.check('send_payment', { amount: 500 });
 * if (!allowed.permitted) {
 *   console.log('Blocked:', allowed.reason);
 * }
 */
function createOpenAIGovernance(config = {}) {
  const gov = createGovernance(config);

  /**
   * Govern an OpenAI chat completion response.
   *
   * @param {Object} completion - Response from chat.completions.create()
   * @param {Object} [opts] - { input, context }
   * @returns {Object} { text, guard, soul, mirror, original }
   */
  function governResponse(completion, opts = {}) {
    const text = completion?.choices?.[0]?.message?.content || '';
    const result = gov.guardOutput(text, opts);
    result.original = text;
    return result;
  }

  /**
   * Wrap a chat.completions.create call with full governance.
   *
   * @param {Function} completionCall - () => client.chat.completions.create({...})
   * @param {Object} [opts] - { input, context }
   * @returns {Object} Full governed result
   */
  async function wrapCompletion(completionCall, opts = {}) {
    return gov.wrap(async () => {
      const completion = await completionCall();
      const text = completion?.choices?.[0]?.message?.content || '';
      return { text, usage: completion?.usage, model: completion?.model };
    }, opts);
  }

  /**
   * Create a tool call guard — blocks or flags dangerous function calls.
   *
   * @param {Object} toolConfig
   * @param {string[]} [toolConfig.blocked] - Tool names that are always blocked
   * @param {string[]} [toolConfig.requireApproval] - Tool names that need human approval
   * @param {Object} [toolConfig.rules] - Custom rules: { toolName: (args) => { permitted, reason } }
   * @param {Function} [toolConfig.onBlocked] - Callback: (toolName, args) => void
   * @returns {Object} { check(toolName, args) }
   */
  function createToolGuard(toolConfig = {}) {
    const {
      blocked = [],
      requireApproval = [],
      rules = {},
      onBlocked = null
    } = toolConfig;

    return {
      /**
       * Check if a tool call is permitted.
       *
       * @param {string} toolName - Function/tool name
       * @param {Object} args - Tool arguments
       * @returns {Object} { permitted, reason, action }
       */
      check(toolName, args = {}) {
        // Blocked list
        if (blocked.includes(toolName)) {
          if (onBlocked) try { onBlocked(toolName, args); } catch (e) { /* */ }
          return { permitted: false, reason: `Tool "${toolName}" is blocked by policy`, action: 'block' };
        }

        // Approval required
        if (requireApproval.includes(toolName)) {
          return { permitted: false, reason: `Tool "${toolName}" requires human approval`, action: 'require_approval' };
        }

        // Custom rules
        if (rules[toolName]) {
          try {
            const result = rules[toolName](args);
            if (result && !result.permitted) {
              if (onBlocked) try { onBlocked(toolName, args); } catch (e) { /* */ }
              return result;
            }
          } catch (e) {
            return { permitted: false, reason: `Rule check error: ${e.message}`, action: 'block' };
          }
        }

        return { permitted: true, reason: null, action: 'allow' };
      }
    };
  }

  return { governResponse, wrapCompletion, createToolGuard, ...gov };
}

module.exports = { createOpenAIGovernance };
