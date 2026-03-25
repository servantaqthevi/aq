// @aq/guardian — Response guarding: scan and clean AI output before it reaches humans
'use strict';

/**
 * Validate any AI-generated response before it reaches a client.
 * Checks for hallucinations, overpromises, manipulation, AI disclosure, slander, and robotic language.
 *
 * @param {string} response - The AI-generated response text
 * @param {Object} [context] - Context about the interaction
 * @param {string} [context.agent] - Agent name
 * @param {string} [context.channel] - 'phone' | 'sms' | 'email' | 'chat'
 * @param {string} [context.client_name] - Client's name
 * @param {boolean} [context.verified_data] - Whether agent has verified business data
 * @param {boolean} [context.is_first_contact] - First contact with this person
 * @param {boolean} [context.ai_disclosed] - Whether AI disclosure has already been made
 * @param {Object[]} [rules] - Additional custom rules: { name, pattern, action, severity, law }
 * @returns {Object} { safe, needs_review, response, original_response, flags, corrections, flag_count }
 */
function guardResponse(response, context = {}, rules = []) {
  const flags = [];
  const corrections = [];
  let cleanResponse = response;

  // ── RULE 1: Never hallucinate business information ──
  const hallucination_patterns = [
    /\$\d[\d.,]* (?:per|for|each|a|to) /i,
    /(?:cost|price|charge|fee|start)s?\s+(?:at|from|around|about|between)\s+\$\d/i,
    /\$\d[\d,]*\s*(?:to|-)\s*\$\d/i,
    /(?:open|close|available|hours?\s+are) (?:at|from|until) \d[\d:]* ?(?:am|pm)/i,
    /\d+\s+\w+\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd)\b/i,
    /(?:takes?|around|approximately|about|usually)\s+\d+\s+(?:minutes?|hours?|days?|weeks?)\b/i,
  ];

  if (!context.verified_data) {
    for (const pattern of hallucination_patterns) {
      if (pattern.test(cleanResponse)) {
        flags.push({
          type: 'potential_hallucination',
          severity: 'high',
          detail: `Response contains specific details that may not be verified: ${cleanResponse.match(pattern)?.[0]}`,
          law: 'Truth — never hallucinate'
        });
      }
    }
  }

  // ── RULE 2: Never overpromise ──
  const overpromise_phrases = [
    /guarantee/i, /100%\s*(?:sure|certain|guaranteed)/i,
    /absolutely\s+(?:will|can|no)\s/i, /promise\s+(?:you|that)/i,
    /(?:always|never)\s+(?:will|happens|works)/i,
    /risk[- ]free/i, /no\s+(?:risk|chance\s+of)/i
  ];

  for (const pattern of overpromise_phrases) {
    if (pattern.test(cleanResponse)) {
      flags.push({
        type: 'overpromise',
        severity: 'medium',
        detail: `Response may overpromise: "${cleanResponse.match(pattern)?.[0]}"`,
        law: 'Never overpromise'
      });
      cleanResponse = cleanResponse
        .replace(/I guarantee/gi, 'I believe')
        .replace(/100% guaranteed/gi, 'highly likely')
        .replace(/absolutely will/gi, 'should')
        .replace(/promise you/gi, 'want to assure you');
      corrections.push('Softened overpromise language');
    }
  }

  // ── RULE 3: Never manipulate ──
  const manipulation_phrases = [
    /limited\s+time\s+(?:only|offer)/i, /act\s+now/i,
    /don'?t\s+miss\s+(?:out|this)/i, /last\s+chance/i,
    /only\s+\d+\s+(?:spots?|slots?|left)/i,
    /exclusive\s+(?:deal|offer|discount)/i,
    /this\s+won'?t\s+last/i, /hurry/i
  ];

  for (const pattern of manipulation_phrases) {
    if (pattern.test(cleanResponse)) {
      flags.push({
        type: 'manipulation',
        severity: 'high',
        detail: `Response contains manipulative urgency: "${cleanResponse.match(pattern)?.[0]}"`,
        law: 'Never manipulate with false urgency'
      });
      cleanResponse = cleanResponse.replace(pattern, '');
      corrections.push('Removed false urgency language');
    }
  }

  // ── RULE 4: AI Disclosure on first contact ──
  if (context.is_first_contact && !context.ai_disclosed) {
    if (context.channel === 'phone') {
      if (!/ai|artificial|automated|virtual|digital/i.test(cleanResponse)) {
        flags.push({
          type: 'missing_ai_disclosure',
          severity: 'critical',
          detail: 'First contact without AI disclosure',
          law: 'Honest about AI limitations'
        });
      }
    }
  }

  // ── RULE 5: Never slander competitors ──
  const slander_patterns = [
    /(?:unlike|better\s+than|compared\s+to)\s+(?:other|competitor|their)/i,
    /(?:they|others)\s+(?:can'?t|don'?t|won'?t|fail)/i,
    /(?:worst|terrible|awful)\s+(?:service|company|provider)/i
  ];

  for (const pattern of slander_patterns) {
    if (pattern.test(cleanResponse)) {
      flags.push({
        type: 'competitor_slander',
        severity: 'medium',
        detail: 'Response references competitors negatively',
        law: 'Never slander — only outperform'
      });
    }
  }

  // ── RULE 6: Warmth check — does it feel human? ──
  if (cleanResponse.length > 50) {
    const roboticPatterns = [
      /^(?:Sure|Certainly|Of course|Absolutely)[.!]\s/,
      /I(?:'m| am) (?:an |a )?AI/i,
      /(?:As an AI|Being an AI|Since I'm an AI)/i,
      /I don'?t have (?:feelings|emotions)/i
    ];

    for (const pattern of roboticPatterns) {
      if (pattern.test(cleanResponse)) {
        flags.push({
          type: 'robotic_language',
          severity: 'low',
          detail: 'Response sounds robotic rather than natural',
          law: 'If it feels like AI, it\'s not ready'
        });
      }
    }
  }

  // ── RULE 7: Appropriate length for channel ──
  if (context.channel === 'phone' && cleanResponse.length > 300) {
    flags.push({
      type: 'too_long_for_channel',
      severity: 'low',
      detail: `Phone response is ${cleanResponse.length} chars — should be under 300 for natural speech`,
      law: 'Excellence — channel-appropriate'
    });
  }

  if (context.channel === 'sms' && cleanResponse.length > 320) {
    flags.push({
      type: 'too_long_for_channel',
      severity: 'low',
      detail: `SMS is ${cleanResponse.length} chars — should be under 320`,
      law: 'Excellence — channel-appropriate'
    });
  }

  // ── CUSTOM RULES ──
  for (const rule of rules) {
    if (!rule.pattern) continue;
    try {
      const regex = typeof rule.pattern === 'string' ? new RegExp(rule.pattern, 'gi') : rule.pattern;
      if (regex.test(cleanResponse)) {
        flags.push({
          type: rule.name || 'custom_rule',
          severity: rule.severity || 'medium',
          detail: rule.detail || `Custom rule "${rule.name}" triggered`,
          law: rule.law || 'Custom'
        });
        if (rule.action === 'strip') {
          cleanResponse = cleanResponse.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
          corrections.push(`Stripped match for rule: ${rule.name}`);
        }
      }
    } catch (e) { /* invalid regex — skip */ }
  }

  // Determine safety
  const criticalFlags = flags.filter(f => f.severity === 'critical');
  const highFlags = flags.filter(f => f.severity === 'high');

  return {
    safe: criticalFlags.length === 0,
    needs_review: highFlags.length > 0,
    response: cleanResponse.trim(),
    original_response: response,
    flags,
    corrections,
    flag_count: {
      critical: criticalFlags.length,
      high: highFlags.length,
      medium: flags.filter(f => f.severity === 'medium').length,
      low: flags.filter(f => f.severity === 'low').length
    }
  };
}

module.exports = { guardResponse };
