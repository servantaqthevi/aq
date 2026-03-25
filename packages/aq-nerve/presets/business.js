// @aq/nerve — Business agent signal presets
'use strict';

/**
 * Common nerve signals for business-facing agents.
 */
const businessSignals = [
  // Emergencies
  { name: 'emergency', pattern: '(?:emergency|urgent|911|ambulance|fire|police)', severity: 'critical', reflex: 'escalate_human' },
  { name: 'medical_emergency', pattern: '(?:heart\\s+attack|stroke|choking|bleeding|seizure|unconscious)', severity: 'critical', reflex: 'escalate_human' },
  { name: 'crisis', pattern: '(?:suicide|kill\\s+myself|end\\s+(?:my|it\\s+all))', severity: 'critical', reflex: 'escalate_human' },

  // Distress
  { name: 'emotional_distress', pattern: '(?:scared|afraid|terrified|overwhelmed|can\'t cope)', severity: 'high', reflex: 'increase_care' },
  { name: 'financial_crisis', pattern: '(?:losing everything|going bankrupt|shutting down)', severity: 'high', reflex: 'increase_care' },

  // Complaints
  { name: 'complaint', pattern: '(?:complaint|frustrated|angry|terrible service|speak to manager)', severity: 'medium', reflex: 'flag_review' },
  { name: 'legal_threat', pattern: '(?:lawyer|sue|legal action|attorney|court)', severity: 'high', reflex: 'escalate_human' },

  // Cancellation
  { name: 'cancellation', pattern: '(?:cancel|unsubscribe|stop service|end my account)', severity: 'medium', reflex: 'flag_review' },

  // Positive signals
  { name: 'referral', pattern: '(?:recommend|refer|tell my friend|word of mouth)', severity: 'low', reflex: 'flag_opportunity' },
  { name: 'upsell_opportunity', pattern: '(?:additional|more services|expand|upgrade|premium)', severity: 'low', reflex: 'flag_opportunity' }
];

/**
 * Content creation agent signals.
 */
const contentSignals = [
  { name: 'brand_violation', pattern: '(?:competitor|rival|enemy|attack|slam)', severity: 'high', reflex: 'block_content' },
  { name: 'medical_claim', pattern: '(?:cure|treatment|diagnos|prescription|medical)', severity: 'high', reflex: 'block_content' },
  { name: 'financial_claim', pattern: '(?:guaranteed return|get rich|make money fast|investment advice)', severity: 'high', reflex: 'block_content' },
  { name: 'urgency_manipulation', pattern: '(?:act now|last chance|limited time|hurry|don\'t miss)', severity: 'medium', reflex: 'strip_content' },
];

module.exports = { businessSignals, contentSignals };
