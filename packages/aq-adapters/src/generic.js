// aq-adapters/generic — Framework-agnostic governance middleware
// Works with any agent framework, any LLM, any stack.
'use strict';

const { guardResponse } = require('../../aq-guardian/src/guard');
const { detectVulnerability } = require('../../aq-guardian/src/vulnerability');
const { detectEmergency } = require('../../aq-guardian/src/emergency');

let scanFn, assessFn, enforceFn;
try { scanFn = require('../../aq-nerve/src/scan').scan; } catch (e) { scanFn = null; }
try { assessFn = require('../../aq-mirror/src/assess').assess; } catch (e) { assessFn = null; }
try {
  const soulMod = require('../../aq-soul/src/enforce');
  enforceFn = soulMod.enforce;
} catch (e) { enforceFn = null; }

/**
 * Create a governance middleware that wraps any LLM call.
 *
 * @param {Object} [config]
 * @param {Object} [config.soul] - Soul instance for enforcement
 * @param {Object[]} [config.nerveSignals] - Nerve signal definitions
 * @param {Object[]} [config.guardRules] - Additional guardian rules
 * @param {Object} [config.guardContext] - Default guardian context (channel, verified_data, etc.)
 * @param {Function} [config.onGuard] - Callback when guardian flags something: (guardResult) => void
 * @param {Function} [config.onVulnerability] - Callback when vulnerability detected: (vulnResult) => void
 * @param {Function} [config.onEmergency] - Callback when emergency detected: (emergencyResult) => void
 * @param {Function} [config.onLowConfidence] - Callback when mirror confidence is low: (mirrorResult) => void
 * @returns {Object} Middleware with wrap(), guardOutput(), scanInput(), and assessResponse()
 *
 * @example
 * const { createGovernance } = require('aq-adapters/generic');
 *
 * const gov = createGovernance({
 *   nerveSignals: [
 *     { name: 'emergency', pattern: '(?:emergency|911)', severity: 'critical', reflex: 'escalate' }
 *   ],
 *   onEmergency: (e) => transferToHuman(e),
 *   onGuard: (g) => logToAuditTrail(g)
 * });
 *
 * // Wrap any LLM call
 * const result = await gov.wrap(async () => {
 *   return await yourLLM.call(systemPrompt, userMessage);
 * }, { input: userMessage });
 *
 * // result.text — governed output
 * // result.governance — { guard, nerve, mirror, vulnerability, emergency }
 */
function createGovernance(config = {}) {
  const {
    soul = null,
    nerveSignals = [],
    guardRules = [],
    guardContext = {},
    onGuard = null,
    onVulnerability = null,
    onEmergency = null,
    onLowConfidence = null
  } = config;

  /**
   * Scan input for nerve signals, vulnerability, and emergencies.
   */
  function scanInput(input) {
    const result = { nerve: null, vulnerability: null, emergency: null };

    // Nerve scan
    if (scanFn && nerveSignals.length) {
      result.nerve = scanFn(input, nerveSignals);
    }

    // Vulnerability detection
    result.vulnerability = detectVulnerability(input);
    if (result.vulnerability.is_vulnerable && onVulnerability) {
      try { onVulnerability(result.vulnerability); } catch (e) { /* */ }
    }

    // Emergency detection
    result.emergency = detectEmergency(input);
    if (result.emergency.is_emergency && onEmergency) {
      try { onEmergency(result.emergency); } catch (e) { /* */ }
    }

    return result;
  }

  /**
   * Guard an LLM output — scan, enforce soul, check safety.
   */
  function guardOutput(text, context = {}) {
    let governed = text;
    const result = { guard: null, soul: null, mirror: null };

    // Soul enforcement
    if (enforceFn && soul) {
      result.soul = enforceFn(soul, governed);
      if (result.soul.violations.length) {
        governed = result.soul.response;
      }
    }

    // Guardian scan
    result.guard = guardResponse(governed, { ...guardContext, ...context }, guardRules);
    if (result.guard.corrections.length) {
      governed = result.guard.response;
    }

    if (onGuard && result.guard.flags.length) {
      try { onGuard(result.guard); } catch (e) { /* */ }
    }

    // Mirror assessment
    if (assessFn) {
      result.mirror = assessFn(context.input || '', governed, {
        brainHits: context.brainHits || 0,
        nerveSignals: context.nerveSignals || 0
      });
      if (result.mirror.escalate && onLowConfidence) {
        try { onLowConfidence(result.mirror); } catch (e) { /* */ }
      }
    }

    return { text: governed, ...result };
  }

  /**
   * Wrap any LLM call with full governance pipeline.
   *
   * @param {Function} llmCall - Async function that returns { text } or a string
   * @param {Object} [opts]
   * @param {string} [opts.input] - The user's input (for nerve/vulnerability scanning)
   * @param {Object} [opts.context] - Additional guardian context
   * @returns {Object} { text, governance: { inputScan, guard, soul, mirror } }
   */
  async function wrap(llmCall, opts = {}) {
    const { input = '', context = {} } = opts;

    // 1. Pre-LLM: scan input
    const inputScan = scanInput(input);

    // 2. Check for emergency bypass
    if (inputScan.emergency?.is_emergency) {
      return {
        text: null,
        bypassed: true,
        reason: 'emergency_detected',
        governance: { inputScan, guard: null, soul: null, mirror: null }
      };
    }

    // 3. Execute LLM
    const llmResult = await llmCall();
    const rawText = typeof llmResult === 'string' ? llmResult : (llmResult?.text || llmResult?.content || '');

    // 4. Post-LLM: guard output
    const outputResult = guardOutput(rawText, {
      ...context,
      input,
      nerveSignals: inputScan.nerve?.signals?.length || 0
    });

    return {
      text: outputResult.text,
      raw: rawText,
      governance: {
        inputScan,
        guard: outputResult.guard,
        soul: outputResult.soul,
        mirror: outputResult.mirror
      },
      // Convenience flags
      safe: outputResult.guard?.safe !== false,
      confidence: outputResult.mirror?.confidence || null,
      escalate: outputResult.mirror?.escalate || inputScan.vulnerability?.adjustments?.escalate_to_human || false
    };
  }

  return { wrap, scanInput, guardOutput };
}

module.exports = { createGovernance };
