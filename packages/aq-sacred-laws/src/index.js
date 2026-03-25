// @aq/sacred-laws — Governance engine for AI agents
// Bismillah
'use strict';

const { createLaws, addLaw, removeLaw, getLaw, getLawsByPillar } = require('./laws');
const { check } = require('./check');
const { audit } = require('./audit');
const { presets } = require('./presets');

/**
 * Give your AI agent a constitution.
 *
 * @example
 * const { createLaws, check, audit, presets } = require('@aq/sacred-laws');
 *
 * // Start with a preset or build from scratch
 * const laws = presets.aqBase();
 * // or: const laws = createLaws();
 *
 * // Add your own laws
 * laws.add({
 *   id: 'no-medical-advice',
 *   pillar: 'SAFETY',
 *   description: 'Never provide medical diagnoses or treatment recommendations',
 *   severity: 'critical',
 *   action: 'block',
 *   detect: (context) => {
 *     if (/diagnos|prescri|treatment plan|you (have|might have|probably have)/i.test(context.responseText))
 *       return 'Response contains medical advice — block and escalate';
 *     return null;
 *   }
 * });
 *
 * // Check an agent action against all laws
 * const result = check(laws, {
 *   action: 'send_email',
 *   responseText: 'Buy now before the offer expires!',
 *   outboundText: 'Limited time only — act fast!'
 * });
 *
 * // result = { status: 'RED', violations: [...], passed: [...] }
 *
 * // Audit trail
 * const entry = audit(laws, 'my-agent', 'send_email', result, { tenantId: '123' });
 */

module.exports = {
  createLaws,
  addLaw,
  removeLaw,
  getLaw,
  getLawsByPillar,
  check,
  audit,
  presets,
  version: '0.1.0'
};
