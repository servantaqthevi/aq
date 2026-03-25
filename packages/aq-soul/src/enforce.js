// @aq/soul — Post-generation enforcement. Scan agent output against soul rules.
'use strict';

/**
 * Enforce a soul's rules on an agent's response.
 * Call this AFTER the AI generates output but BEFORE it reaches the user.
 *
 * @param {Object} soul - A soul object created by createSoul()
 * @param {string} response - The AI-generated response text
 * @param {Object} [options]
 * @param {boolean} [options.strict] - In strict mode, 'block' violations return empty string instead of stripped version
 * @param {Function} [options.onViolation] - Callback fired for each violation: (violation) => void
 * @returns {Object} { response: string, violations: Array, blocked: boolean }
 *
 * @example
 * const result = enforce(soul, aiResponse, {
 *   strict: true,
 *   onViolation: (v) => console.warn(`Soul violation: ${v.rule} [${v.severity}]`)
 * });
 *
 * if (result.blocked) {
 *   // Response violated a 'block' rule — don't send it
 *   return fallbackResponse();
 * }
 *
 * // result.response is cleaned of 'strip' violations
 * sendToUser(result.response);
 */
function enforce(soul, response, options = {}) {
  const { strict = false, onViolation = null } = options;

  if (!soul || !response) {
    return { response: response || '', violations: [], blocked: false };
  }

  const rules = soul.enforcement || [];
  const violations = [];
  let cleaned = response;
  let blocked = false;

  for (const rule of rules) {
    if (!rule.pattern) continue;

    try {
      const regex = new RegExp(rule.pattern, 'gi');
      const matches = cleaned.match(regex);

      if (matches) {
        const violation = {
          rule: rule.name,
          severity: rule.severity,
          action: rule.action,
          matches: matches.slice(0, 5),
          count: matches.length
        };

        violations.push(violation);

        if (onViolation) {
          try { onViolation(violation); } catch (e) { /* don't let callback errors break enforcement */ }
        }

        switch (rule.action) {
          case 'block':
            blocked = true;
            if (strict) {
              return { response: '', violations, blocked: true };
            }
            // In non-strict mode, strip instead of blocking entirely
            cleaned = cleaned.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
            break;

          case 'strip':
            cleaned = cleaned.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
            break;

          case 'flag':
            // Don't modify response — just record the violation
            break;

          case 'log':
            // Don't modify response — just record for analytics
            break;
        }
      }
    } catch (e) {
      // Invalid regex — skip silently, don't break the response
    }
  }

  return { response: cleaned, violations, blocked };
}

/**
 * Check if a response would pass enforcement without modifying it.
 * Useful for pre-checks or testing.
 *
 * @param {Object} soul
 * @param {string} response
 * @returns {Object} { clean: boolean, violations: Array }
 */
function check(soul, response) {
  const result = enforce(soul, response);
  return {
    clean: result.violations.length === 0,
    violations: result.violations
  };
}

module.exports = { enforce, check };
