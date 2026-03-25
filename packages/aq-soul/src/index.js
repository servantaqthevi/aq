// @aq/soul — Give your AI agent a conscience
// Bismillah
'use strict';

const { createSoul, loadSoul, validateSoul } = require('./soul');
const { buildContext } = require('./context');
const { enforce } = require('./enforce');
const { templates } = require('./templates');

/**
 * Create a soul from a definition object.
 *
 * @example
 * const { createSoul, buildContext, enforce } = require('@aq/soul');
 *
 * const soul = createSoul({
 *   name: 'my-agent',
 *   purpose: 'Help small business owners manage their social media',
 *   values: ['honesty', 'excellence', 'teach over do'],
 *   refusals: [
 *     'Never fabricate metrics or data',
 *     'Never post without owner approval',
 *     'Never create dependency — explain every decision'
 *   ],
 *   personality: { warmth: 0.8, formality: 0.4, directness: 0.9 },
 *   enforcement: [
 *     { name: 'no_false_urgency', pattern: 'act now|last chance|hurry', action: 'strip', severity: 'high' },
 *     { name: 'no_fabrication', pattern: 'guaranteed|100% success|proven to', action: 'block', severity: 'critical' }
 *   ]
 * });
 *
 * // Inject soul into your agent's system prompt
 * const systemPrompt = 'You are a social media agent.' + buildContext(soul);
 *
 * // After AI generates a response, enforce the soul
 * const { response, violations } = enforce(soul, aiResponse);
 */

module.exports = {
  // Core
  createSoul,
  loadSoul,
  validateSoul,

  // Context building
  buildContext,

  // Enforcement
  enforce,

  // Templates
  templates,

  // Version
  version: '0.1.0'
};
