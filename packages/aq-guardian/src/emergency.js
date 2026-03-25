// @aq/guardian — Emergency detection
'use strict';

/**
 * Detect if someone needs immediate human help.
 *
 * @param {string} input - The person's message
 * @returns {Object} { is_emergency, type, action, transfer_to_human }
 */
function detectEmergency(input) {
  const text = (input || '').toLowerCase();

  const emergencyPatterns = [
    { pattern: /(?:911|ambulance|fire department|call.+police)/i, type: 'general_emergency' },
    { pattern: /(?:heart\s+attack|stroke|choking|bleeding|seizure|unconscious|not\s+breathing)/i, type: 'medical_emergency' },
    { pattern: /(?:break[- ]?in|robbery|assault|being\s+attacked|intruder)/i, type: 'safety_emergency' },
    { pattern: /(?:suicide|kill\s+myself|end(?:ing)?\s+(?:my\s+life|it\s+all)|want\s+to\s+die|don'?t\s+(?:see\s+a\s+point|want\s+to\s+live))/i, type: 'crisis_emergency' },
  ];

  for (const ep of emergencyPatterns) {
    if (ep.pattern.test(text)) {
      return {
        is_emergency: true,
        type: ep.type,
        action: ep.type === 'crisis_emergency'
          ? 'IMMEDIATELY provide crisis hotline number and express care. Do NOT hang up first.'
          : 'IMMEDIATELY transfer to emergency contact or advise to call 911. Stay on line until help arrives.',
        transfer_to_human: true
      };
    }
  }

  return { is_emergency: false };
}

module.exports = { detectEmergency };
