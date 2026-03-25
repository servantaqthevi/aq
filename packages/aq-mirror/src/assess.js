// @aq/mirror — Self-assessment and confidence scoring
'use strict';

/**
 * Assess an agent's response quality and confidence.
 *
 * @param {string} input - The original input/question
 * @param {string} output - The agent's response
 * @param {Object} [context]
 * @param {number} [context.brainHits=0] - How many brain memories were relevant
 * @param {number} [context.nerveSignals=0] - How many nerve signals detected
 * @param {Object} [options]
 * @param {number} [options.baseConfidence=0.7] - Starting confidence level
 * @param {Function} [options.onLowConfidence] - Callback when confidence < 0.3
 * @returns {Object} { confidence, gaps, flags, assessment, escalate }
 */
function assess(input, output, context = {}, options = {}) {
  const { brainHits = 0, nerveSignals = 0 } = context;
  const { baseConfidence = 0.7, onLowConfidence = null } = options;

  let confidence = baseConfidence;
  const gaps = [];
  const flags = [];

  // Boost confidence if brain had relevant knowledge
  if (brainHits >= 3) confidence += 0.15;
  else if (brainHits >= 1) confidence += 0.05;
  else gaps.push('no_brain_knowledge');

  // Check for uncertainty markers in output
  const uncertaintyPatterns = [
    /i('m| am) not sure/i, /i don'?t know/i, /i('m| am) uncertain/i,
    /it might be/i, /possibly|perhaps|maybe/i, /i think/i,
    /you (should|may want to) (check|verify|confirm|call)/i
  ];

  let uncertaintyCount = 0;
  for (const pattern of uncertaintyPatterns) {
    if (pattern.test(output)) {
      uncertaintyCount++;
      flags.push(pattern.source.substring(0, 30));
    }
  }

  confidence -= uncertaintyCount * 0.08;

  // Response too short might indicate lack of knowledge
  if (output.length < 50) {
    confidence -= 0.1;
    gaps.push('very_short_response');
  }

  // Response too long might indicate rambling
  if (output.length > 2000) {
    confidence -= 0.05;
    flags.push('verbose_response');
  }

  // Nerve signals affect confidence
  if (nerveSignals > 0) {
    confidence -= 0.05;
    flags.push('nerve_signals_present');
  }

  // Clamp to 0-1
  confidence = Math.max(0, Math.min(1, Math.round(confidence * 100) / 100));

  const escalate = confidence < 0.3;
  const assessment = confidence < 0.3 ? 'low_confidence_escalate' :
    confidence < 0.6 ? 'uncertain_add_disclaimer' : 'confident';

  if (escalate && onLowConfidence) {
    try { onLowConfidence({ confidence, gaps, flags, assessment }); } catch (e) { /* */ }
  }

  return { confidence, gaps, flags, assessment, escalate };
}

/**
 * Quick check — is the agent confident enough to send this response?
 *
 * @param {string} input
 * @param {string} output
 * @param {number} [threshold=0.5] - Minimum confidence to pass
 * @returns {boolean}
 */
function isConfident(input, output, threshold = 0.5) {
  return assess(input, output).confidence >= threshold;
}

module.exports = { assess, isConfident };
