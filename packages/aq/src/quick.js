// aq — Quick helpers for the most common operations
'use strict';

const { guardResponse } = require('../../aq-guardian/src/guard');
const { detectVulnerability } = require('../../aq-guardian/src/vulnerability');
const { detectEmergency } = require('../../aq-guardian/src/emergency');
const { honestUncertainty } = require('../../aq-guardian/src/uncertainty');
const { createSoul } = require('../../aq-soul/src/soul');
const { buildContext: buildSoulContext } = require('../../aq-soul/src/context');
const { enforce: enforceSoul } = require('../../aq-soul/src/enforce');
const { createBrain } = require('../../aq-brain/src/memory');
const { scan: nerveScan, buildContext: buildNerveContext } = require('../../aq-nerve/src/scan');
const { assess: mirrorAssess } = require('../../aq-mirror/src/assess');
const { detect: detectVoice, buildContext: buildVoiceContext } = require('../../aq-voice/src/detect');
const { createProfileStore } = require('../../aq-voice/src/profile');

/**
 * Guard an AI response. One function, immediate safety.
 *
 * @param {string} text - AI-generated response
 * @param {Object} [context] - { channel, is_first_contact, verified_data, ... }
 * @param {Object[]} [rules] - Custom rules
 * @returns {Object} { safe, response, flags, corrections }
 */
function guard(text, context, rules) {
  return guardResponse(text, context, rules);
}

/**
 * Create a governed agent with minimal configuration.
 *
 * @param {Object} config
 * @param {Object|string} config.soul - Soul definition or { name, purpose, values, refusals }
 * @param {string|Object} [config.laws] - Preset name or laws config (future)
 * @param {boolean|Object} [config.brain] - true for default brain, or brain instance
 * @param {string|Object[]} [config.nerve] - Preset name or signal array
 * @param {Function} config.llm - (systemPrompt, userMessage, maxTokens) => { text, usage }
 * @param {Object} [options]
 * @param {string} [options.name] - Agent name
 * @param {string} [options.namespace] - Namespace (tenant ID)
 * @returns {Object} Agent with ask() and generate()
 */
function create(config, options = {}) {
  const { llm } = config;
  if (!llm) throw new Error('aq.create: llm function is required');

  const name = options.name || config.soul?.name || 'agent';
  const namespace = options.namespace || 'default';

  // Build soul
  const soul = typeof config.soul === 'object' && config.soul.name
    ? createSoul(config.soul)
    : createSoul({ name, purpose: 'AI agent', ...config.soul });

  // Build brain
  let brain = null;
  if (config.brain === true) brain = createBrain();
  else if (config.brain && typeof config.brain === 'object') brain = config.brain;

  // Build nerve signals
  let nerveSignals = [];
  if (config.nerve === 'business') {
    try { nerveSignals = require('../../aq-nerve/presets/business').businessSignals; } catch (e) { /* */ }
  } else if (config.nerve === 'content') {
    try { nerveSignals = require('../../aq-nerve/presets/business').contentSignals; } catch (e) { /* */ }
  } else if (Array.isArray(config.nerve)) {
    nerveSignals = config.nerve;
  }

  // Voice profile store
  const profileStore = createProfileStore();

  async function ask(systemPrompt, userMessage, opts = {}) {
    const { maxTokens = 1500, contactId = null } = opts;

    const nerveResult = nerveScan(userMessage, nerveSignals);
    const soulContext = buildSoulContext(soul);
    const brainContext = brain ? brain.getContext(name, namespace) : '';
    const brainHits = brain ? brain.recall(name, namespace, { limit: 5 }).length : 0;

    let voiceContext = '';
    if (contactId) {
      const profile = profileStore.get(name, contactId);
      voiceContext = buildVoiceContext(profile);
    }

    const enriched = [systemPrompt, soulContext, brainContext, buildNerveContext(nerveResult), voiceContext]
      .filter(Boolean).join('\n');

    const result = await llm(enriched, userMessage, maxTokens);
    let text = result.text || result.response || '';

    // Enforce soul
    const enforcement = enforceSoul(soul, text);
    if (enforcement.violations.length) text = enforcement.response;

    // Guard response
    const guarded = guardResponse(text);
    if (guarded.corrections.length) text = guarded.response;

    // Mirror
    const mirror = mirrorAssess(userMessage, text, { brainHits, nerveSignals: nerveResult.signals.length });

    // Update voice profile
    if (contactId) {
      const traits = detectVoice(userMessage);
      profileStore.update(name, contactId, traits);
    }

    return {
      text,
      biological: {
        confidence: mirror.confidence,
        assessment: mirror.assessment,
        escalate: mirror.escalate,
        brainHits,
        nerveSignals: nerveResult.signals.length,
        soulViolations: enforcement.violations.length,
        guardFlags: guarded.flags.length
      },
      usage: result.usage,
      model: result.model,
      provider: result.provider
    };
  }

  async function generate(systemPrompt, userMessage, opts = {}) {
    const { maxTokens = 2000 } = opts;

    const nerveResult = nerveScan(userMessage, nerveSignals);
    const soulContext = buildSoulContext(soul);
    const brainContext = brain ? brain.getContext(name, namespace) : '';
    const brainHits = brain ? brain.recall(name, namespace, { limit: 5 }).length : 0;

    const enriched = [systemPrompt, soulContext, brainContext, buildNerveContext(nerveResult)]
      .filter(Boolean).join('\n');

    const result = await llm(enriched, userMessage, maxTokens);
    let text = result.text || result.response || '';

    const enforcement = enforceSoul(soul, text);
    if (enforcement.violations.length) text = enforcement.response;

    const mirror = mirrorAssess(userMessage, text, { brainHits, nerveSignals: nerveResult.signals.length });

    return {
      text,
      biological: {
        confidence: mirror.confidence,
        assessment: mirror.assessment,
        brainHits,
        nerveSignals: nerveResult.signals.length,
        soulViolations: enforcement.violations.length
      },
      usage: result.usage,
      model: result.model,
      provider: result.provider
    };
  }

  function remember(opts) {
    if (!brain) throw new Error('Brain not enabled. Pass brain: true to aq.create()');
    return brain.remember(name, namespace, opts);
  }

  function recall(opts) {
    if (!brain) return [];
    return brain.recall(name, namespace, opts);
  }

  return { ask, generate, remember, recall, soul, brain, name };
}

module.exports = { guard, create };
