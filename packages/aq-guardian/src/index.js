// @aq/guardian — Safety and ethics layer for AI agents
// Bismillah
'use strict';

const { guardResponse } = require('./guard');
const { detectVulnerability } = require('./vulnerability');
const { detectEmergency } = require('./emergency');
const { honestUncertainty } = require('./uncertainty');
const { auditAction, calculateRoboticScore } = require('./audit');
const { createFallbacks } = require('./fallback');

/**
 * The Guardian protects humans from AI harm.
 *
 * @example
 * const { guardResponse, detectVulnerability, detectEmergency } = require('@aq/guardian');
 *
 * // Guard an AI response before it reaches a human
 * const guarded = guardResponse(aiResponse, {
 *   channel: 'phone',
 *   is_first_contact: true,
 *   verified_data: false
 * });
 *
 * if (!guarded.safe) {
 *   // Critical violation — don't send this response
 *   return fallbackResponse();
 * }
 *
 * // Check if the person is vulnerable
 * const vuln = detectVulnerability(userMessage);
 * if (vuln.is_vulnerable) {
 *   // Adjust agent behavior: slower pace, simpler words, warmer tone
 *   applyAdjustments(vuln.adjustments);
 * }
 *
 * // Check for emergencies
 * const emergency = detectEmergency(userMessage);
 * if (emergency.is_emergency) {
 *   // Transfer to human immediately
 *   transferToHuman(emergency.action);
 * }
 *
 * // When unsure, be honest instead of hallucinating
 * const honest = honestUncertainty('What are your hours?', { channel: 'sms' });
 *
 * // Audit agent actions for ethical compliance
 * const audit = auditAction('my-agent', 'send_email', actionData, result);
 * // audit.compliance = 'green' | 'yellow' | 'red'
 *
 * // Set up error recovery fallbacks
 * const fallbacks = createFallbacks({
 *   'my-agent': {
 *     send_email: { description: 'Queue for retry', action: 'retry_queue' },
 *     DEFAULT: { description: 'Notify owner', action: 'notify_owner' }
 *   }
 * });
 * const fallback = fallbacks.get('my-agent', 'send_email');
 */

module.exports = {
  // Response safety
  guardResponse,

  // Vulnerability
  detectVulnerability,

  // Emergency
  detectEmergency,

  // Honest uncertainty
  honestUncertainty,

  // Audit
  auditAction,
  calculateRoboticScore,

  // Fallbacks
  createFallbacks,

  // Version
  version: '0.1.0'
};
