// @aq/nerve — Real-time signal detection for AI agents
// Bismillah
'use strict';

const { scan, buildContext } = require('./scan');

/**
 * Give your AI agent a nervous system.
 *
 * @example
 * const { scan, buildContext } = require('@aq/nerve');
 *
 * // Define signals your agent should watch for
 * const signals = [
 *   { name: 'emergency', pattern: '(?:emergency|urgent|911)', severity: 'critical', reflex: 'escalate_human' },
 *   { name: 'complaint', pattern: '(?:angry|frustrated|terrible)', severity: 'medium', reflex: 'flag_review' },
 *   { name: 'opportunity', pattern: '(?:recommend|refer|upgrade)', severity: 'low', reflex: 'flag_opportunity' }
 * ];
 *
 * // Scan incoming message
 * const result = scan(userMessage, signals, {
 *   onSignal: (s) => console.log(`Detected: ${s.type} [${s.severity}]`)
 * });
 *
 * if (result.shouldBypassBrain) {
 *   // Critical signal — skip normal processing, act immediately
 *   handleReflex(result.reflexes[0]);
 * }
 *
 * // Add nerve alerts to agent's context
 * const nerveContext = buildContext(result);
 * const enrichedPrompt = systemPrompt + nerveContext;
 */

module.exports = {
  scan,
  buildContext,
  version: '0.1.0'
};
