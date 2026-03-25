// @aq/sacred-laws — Check agent actions against all laws
'use strict';

/**
 * Check an agent action/response against all laws in the collection.
 * Returns a verdict: RED (blocked), YELLOW (flagged), or GREEN (clean).
 *
 * @param {Object} laws - Laws collection from createLaws()
 * @param {Object} context - The context to check against
 * @param {string} [context.action] - The action type being performed
 * @param {string} [context.responseText] - AI-generated response text
 * @param {string} [context.outboundText] - Text being sent to a human
 * @param {Object} [context.*] - Any additional context flags your laws check for
 * @param {Object} [options]
 * @param {boolean} [options.stopOnBlock] - Stop checking after first block violation (default true)
 * @param {Function} [options.onViolation] - Callback for each violation: (law, message) => void
 * @returns {Object} { status: 'RED'|'YELLOW'|'GREEN', violations: Array, passed: number, total: number }
 *
 * @example
 * const result = check(laws, {
 *   action: 'send_email',
 *   responseText: 'Buy now — last chance! Guaranteed results!',
 *   outboundText: 'Limited time offer!'
 * });
 *
 * if (result.status === 'RED') {
 *   // At least one 'block' law was violated — do not proceed
 *   console.log('Blocked:', result.violations);
 * } else if (result.status === 'YELLOW') {
 *   // Flagged but not blocked — proceed with caution
 *   console.log('Warnings:', result.violations);
 * } else {
 *   // GREEN — all clear
 * }
 */
function check(laws, context, options = {}) {
  const { stopOnBlock = true, onViolation = null } = options;

  const allLaws = laws.all();
  const violations = [];
  let passed = 0;
  let hasBlock = false;
  let hasFlag = false;

  for (const law of allLaws) {
    try {
      const message = law.detect(context);

      if (message) {
        const violation = {
          lawId: law.id,
          pillar: law.pillar,
          description: law.description,
          severity: law.severity,
          action: law.action,
          message
        };

        violations.push(violation);

        if (law.action === 'block') hasBlock = true;
        if (law.action === 'flag') hasFlag = true;

        if (onViolation) {
          try { onViolation(law, message); } catch (e) { /* don't let callback break check */ }
        }

        if (stopOnBlock && hasBlock) break;
      } else {
        passed++;
      }
    } catch (e) {
      // Law detection function threw — treat as a flag, don't crash
      violations.push({
        lawId: law.id,
        pillar: law.pillar,
        description: law.description,
        severity: 'medium',
        action: 'flag',
        message: `Law detection error: ${e.message}`
      });
      hasFlag = true;
    }
  }

  const status = hasBlock ? 'RED' : hasFlag ? 'YELLOW' : 'GREEN';

  return {
    status,
    violations,
    passed,
    total: allLaws.length,
    checked: passed + violations.length
  };
}

/**
 * Quick check — returns true if no violations, false if any.
 *
 * @param {Object} laws
 * @param {Object} context
 * @returns {boolean}
 */
function isClean(laws, context) {
  return check(laws, context).status === 'GREEN';
}

module.exports = { check, isClean };
