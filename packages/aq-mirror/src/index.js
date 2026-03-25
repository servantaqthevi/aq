// @aq/mirror — Self-assessment and confidence scoring for AI agents
// Bismillah
'use strict';

const { assess, isConfident } = require('./assess');

/**
 * Give your AI agent self-awareness.
 *
 * @example
 * const { assess, isConfident } = require('@aq/mirror');
 *
 * // After AI generates a response, assess its quality
 * const mirror = assess(userQuestion, aiResponse, {
 *   brainHits: 3,       // How many memories were relevant
 *   nerveSignals: 0     // How many alerts were triggered
 * });
 *
 * // mirror.confidence = 0.85 (0 to 1)
 * // mirror.assessment = 'confident' | 'uncertain_add_disclaimer' | 'low_confidence_escalate'
 * // mirror.gaps = ['no_brain_knowledge'] — what was missing
 * // mirror.flags = ['verbose_response'] — quality warnings
 * // mirror.escalate = false — should this go to a human?
 *
 * if (mirror.escalate) {
 *   // Confidence too low — transfer to human
 *   transferToHuman(aiResponse);
 * } else if (mirror.assessment === 'uncertain_add_disclaimer') {
 *   // Add a disclaimer to the response
 *   aiResponse += '\n\n(I want to be upfront — I may not have complete information on this.)';
 * }
 *
 * // Quick check
 * if (!isConfident(question, response, 0.5)) {
 *   // Don't send — not confident enough
 * }
 */

module.exports = {
  assess,
  isConfident,
  version: '0.1.0'
};
