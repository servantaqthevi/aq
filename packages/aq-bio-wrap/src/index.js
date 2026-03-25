// @aq/bio-wrap — The biological wrapper that combines all organs into a living agent
// Bismillah
'use strict';

/**
 * Create a biological agent by assembling organs.
 *
 * @param {Object} config
 * @param {Object} config.soul - Soul instance from @aq/soul (createSoul())
 * @param {Object} [config.guardian] - Guardian module (guardResponse, detectVulnerability, etc.)
 * @param {Object} [config.brain] - Brain instance from @aq/brain (createBrain())
 * @param {Object} [config.nerve] - Nerve signal definitions (array of signals)
 * @param {Object} [config.voice] - Voice config { detect, buildContext, profileStore, blueprint }
 * @param {Object} [config.mirror] - Mirror module { assess }
 * @param {Function} config.llm - LLM call function: (systemPrompt, userMessage, maxTokens) => { text, usage }
 * @param {Object} [options]
 * @param {string} [options.name='agent'] - Agent name
 * @param {string} [options.namespace='default'] - Namespace for brain/voice (e.g. tenant ID)
 * @param {Function} [options.onBiological] - Callback with biological metadata after each call
 * @returns {Object} Agent with ask() and generate() methods
 *
 * @example
 * const { createSoul, buildContext, enforce } = require('@aq/soul');
 * const { guardResponse, detectVulnerability } = require('@aq/guardian');
 * const { createBrain } = require('@aq/brain');
 * const { scan, buildContext: buildNerveContext } = require('@aq/nerve');
 * const { assess } = require('@aq/mirror');
 * const { detect, buildContext: buildVoiceContext, createProfileStore } = require('@aq/voice');
 * const { createRouter } = require('@aq/router');
 * const { createAgent } = require('@aq/bio-wrap');
 *
 * const soul = createSoul({
 *   name: 'my-agent',
 *   purpose: 'Help small business owners',
 *   values: ['honesty', 'excellence'],
 *   refusals: ['Never fabricate data']
 * });
 *
 * const brain = createBrain();
 * const router = createRouter({ keys: { claude: process.env.ANTHROPIC_API_KEY } });
 * const profiles = createProfileStore();
 *
 * const agent = createAgent({
 *   soul,
 *   guardian: { guardResponse, detectVulnerability },
 *   brain,
 *   nerve: [
 *     { name: 'emergency', pattern: '(?:emergency|urgent|911)', severity: 'critical', reflex: 'escalate' }
 *   ],
 *   voice: { detect, buildContext: buildVoiceContext, profileStore: profiles, blueprint: { formal: 0.5 } },
 *   mirror: { assess },
 *   llm: (sys, msg, max) => router.route('agent_response', sys, msg, { maxTokens: max })
 * }, { name: 'my-agent', namespace: 'tenant-123' });
 *
 * const result = await agent.ask('You are a helpful assistant.', 'How do I get more reviews?');
 * // result.text = "Here's a proven approach..."
 * // result.biological = { confidence: 0.85, brainHits: 2, nerveSignals: 0, soulViolations: 0, guardFlags: 0 }
 */
function createAgent(config, options = {}) {
  const { soul, guardian, brain, nerve: nerveSignals, voice, mirror, llm } = config;
  const { name = 'agent', namespace = 'default', onBiological = null } = options;

  if (!soul) throw new Error('@aq/bio-wrap: soul is required');
  if (!llm) throw new Error('@aq/bio-wrap: llm function is required');

  // Try to load soul context builder
  let buildSoulContext;
  try {
    buildSoulContext = require('@aq/soul').buildContext;
  } catch (e) {
    // Fallback: simple soul context
    buildSoulContext = (s) => {
      const parts = [`\n=== SOUL: ${s.name} ===`, `PURPOSE: ${s.purpose}`];
      if (s.values?.length) parts.push(`VALUES: ${s.values.join(', ')}`);
      if (s.refusals?.length) parts.push(`NEVER: ${s.refusals.join(' | ')}`);
      parts.push('=== END SOUL ===\n');
      return parts.join('\n');
    };
  }

  // Try to load soul enforcement
  let enforceSoul;
  try {
    enforceSoul = require('@aq/soul').enforce;
  } catch (e) {
    enforceSoul = (s, response) => ({ response, violations: [], blocked: false });
  }

  // Try to load nerve scanner
  let nerveScan, buildNerveContext;
  try {
    const nerveModule = require('@aq/nerve');
    nerveScan = nerveModule.scan;
    buildNerveContext = nerveModule.buildContext;
  } catch (e) {
    nerveScan = () => ({ signals: [], reflexes: [], shouldBypassBrain: false });
    buildNerveContext = () => '';
  }

  // Try to load mirror
  let mirrorAssess;
  try {
    mirrorAssess = mirror?.assess || require('@aq/mirror').assess;
  } catch (e) {
    mirrorAssess = () => ({ confidence: 0.7, gaps: [], flags: [], assessment: 'confident', escalate: false });
  }

  /**
   * Ask the agent a question (query/response mode).
   *
   * @param {string} systemPrompt - Base system prompt
   * @param {string} userMessage - User's message
   * @param {Object} [opts]
   * @param {number} [opts.maxTokens=1500] - Max output tokens
   * @param {string} [opts.contactId] - Contact ID for voice profile tracking
   * @returns {Object} { text, biological, ...llmResult }
   */
  async function ask(systemPrompt, userMessage, opts = {}) {
    const { maxTokens = 1500, contactId = null } = opts;

    // 1. Nerve scan
    const nerveResult = nerveScan(userMessage, nerveSignals || []);

    // 2. Soul context
    const soulContext = buildSoulContext(soul);

    // 3. Brain query
    let brainContext = '';
    let brainHits = 0;
    if (brain) {
      brainContext = brain.getContext(name, namespace);
      brainHits = brain.recall(name, namespace, { limit: 5 }).length;
    }

    // 4. Voice context
    let voiceContext = '';
    if (voice?.buildContext) {
      const profile = contactId && voice.profileStore ? voice.profileStore.get(name, contactId) : null;
      voiceContext = voice.buildContext(profile, voice.blueprint);
    }

    // 5. Build enriched prompt
    const enriched = [systemPrompt, soulContext, brainContext, buildNerveContext(nerveResult), voiceContext]
      .filter(Boolean).join('\n');

    // 6. Call LLM
    const result = await llm(enriched, userMessage, maxTokens);
    let responseText = result.text || result.response || '';

    // 7. Enforce soul
    const enforcement = enforceSoul(soul, responseText);
    if (enforcement.violations.length) {
      responseText = enforcement.response;
      result.text = responseText;
    }

    // 8. Guard response
    let guardFlags = 0;
    if (guardian?.guardResponse) {
      const guarded = guardian.guardResponse(responseText);
      guardFlags = guarded.flags.length;
      if (guarded.corrections.length) {
        responseText = guarded.response;
        result.text = responseText;
      }
    }

    // 9. Mirror assessment
    const mirrorResult = mirrorAssess(userMessage, responseText, { brainHits, nerveSignals: nerveResult.signals.length });

    // 10. Update voice profile
    if (contactId && voice?.profileStore && voice?.detect) {
      const traits = voice.detect(userMessage);
      voice.profileStore.update(name, contactId, traits);
    }

    // Biological metadata
    const biological = {
      confidence: mirrorResult.confidence,
      assessment: mirrorResult.assessment,
      escalate: mirrorResult.escalate,
      brainHits,
      nerveSignals: nerveResult.signals.length,
      soulViolations: enforcement.violations.length,
      guardFlags
    };

    result.biological = biological;
    if (onBiological) try { onBiological(biological); } catch (e) { /* */ }

    return result;
  }

  /**
   * Generate content (lighter touch — skip voice profile update).
   *
   * @param {string} systemPrompt
   * @param {string} userMessage
   * @param {Object} [opts]
   * @param {number} [opts.maxTokens=2000]
   * @returns {Object} { text, biological, ...llmResult }
   */
  async function generate(systemPrompt, userMessage, opts = {}) {
    const { maxTokens = 2000 } = opts;

    const nerveResult = nerveScan(userMessage, nerveSignals || []);
    const soulContext = buildSoulContext(soul);
    let brainContext = '';
    let brainHits = 0;
    if (brain) {
      brainContext = brain.getContext(name, namespace);
      brainHits = brain.recall(name, namespace, { limit: 5 }).length;
    }

    const enriched = [systemPrompt, soulContext, brainContext, buildNerveContext(nerveResult)]
      .filter(Boolean).join('\n');

    const result = await llm(enriched, userMessage, maxTokens);
    let responseText = result.text || result.response || '';

    const enforcement = enforceSoul(soul, responseText);
    if (enforcement.violations.length) {
      responseText = enforcement.response;
      result.text = responseText;
    }

    const mirrorResult = mirrorAssess(userMessage, responseText, { brainHits, nerveSignals: nerveResult.signals.length });

    const biological = {
      confidence: mirrorResult.confidence,
      assessment: mirrorResult.assessment,
      escalate: mirrorResult.escalate,
      brainHits,
      nerveSignals: nerveResult.signals.length,
      soulViolations: enforcement.violations.length,
      guardFlags: 0
    };

    result.biological = biological;
    if (onBiological) try { onBiological(biological); } catch (e) { /* */ }

    return result;
  }

  return { ask, generate, name, soul };
}

module.exports = {
  createAgent,
  version: '0.1.0'
};
