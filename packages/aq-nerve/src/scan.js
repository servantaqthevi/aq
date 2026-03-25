// @aq/nerve — Signal scanning engine
'use strict';

/**
 * Scan input text for nerve signals (patterns that trigger reflexes).
 *
 * @param {string} input - Text to scan
 * @param {Object[]} signals - Array of signal definitions
 * @param {string} signals[].name - Signal name
 * @param {string} signals[].pattern - Regex pattern string
 * @param {string} [signals[].severity='medium'] - 'critical' | 'high' | 'medium' | 'low'
 * @param {string} [signals[].reflex] - Reflex action to trigger (e.g. 'escalate', 'bypass_brain')
 * @param {Object} [options]
 * @param {Function} [options.onSignal] - Callback for each detected signal: (signal) => void
 * @returns {Object} { signals, reflexes, shouldBypassBrain }
 */
function scan(input, signals = [], options = {}) {
  if (!input || !signals.length) return { signals: [], reflexes: [], shouldBypassBrain: false };

  const { onSignal = null } = options;
  const detected = [];
  const reflexes = [];
  let shouldBypassBrain = false;
  const lowerInput = input.toLowerCase();

  for (const signal of signals) {
    if (!signal.pattern) continue;
    try {
      const regex = new RegExp(signal.pattern, 'i');
      const match = lowerInput.match(regex);
      if (match) {
        const result = {
          type: signal.name || signal.type || 'unknown',
          severity: signal.severity || 'medium',
          trigger: match[0],
          reflex: signal.reflex || null
        };
        detected.push(result);

        if (signal.reflex) {
          reflexes.push({
            action: signal.reflex,
            severity: signal.severity || 'medium',
            trigger: match[0]
          });
          if (signal.severity === 'critical' || signal.reflex === 'bypass_brain') {
            shouldBypassBrain = true;
          }
        }

        if (onSignal) try { onSignal(result); } catch (e) { /* */ }
      }
    } catch (e) {
      // Invalid regex — skip
    }
  }

  return { signals: detected, reflexes, shouldBypassBrain };
}

/**
 * Build a prompt context string from scan results.
 *
 * @param {Object} scanResult - Result from scan()
 * @returns {string} Prompt-ready nerve alert context, or empty string
 */
function buildContext(scanResult) {
  if (!scanResult?.signals?.length) return '';
  return '\n=== NERVE ALERTS ===\n' +
    scanResult.signals.map(s => `[${s.severity.toUpperCase()}] ${s.type}: "${s.trigger}"`).join('\n');
}

module.exports = { scan, buildContext };
