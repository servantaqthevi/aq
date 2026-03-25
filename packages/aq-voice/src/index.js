// @aq/voice — Communication style detection and adaptation for AI agents
// Bismillah
'use strict';

const { detect } = require('./detect');
const { buildContext } = require('./context');
const { createProfileStore } = require('./profile');

/**
 * Give your AI agent the ability to adapt how it speaks.
 *
 * @example
 * const { detect, buildContext, createProfileStore } = require('@aq/voice');
 *
 * // Detect a person's communication style
 * const traits = detect("Hey! I'm super excited about this!! Can't wait to get started lol");
 * // traits = { formal: 0.3, verbose: 0.12, emotional: 0.51 }
 *
 * // Track contact styles over time
 * const profiles = createProfileStore();
 * profiles.detectAndUpdate('my-agent', 'contact-456', userMessage);
 *
 * // Get the contact's accumulated style
 * const profile = profiles.get('my-agent', 'contact-456');
 *
 * // Build voice context for AI prompt
 * const voiceContext = buildContext(profile, {
 *   formal: 0.5,    // agent's target formality
 *   verbose: 0.5,   // agent's target verbosity
 *   emotional: 0.3  // agent's target emotionality
 * });
 *
 * const enrichedPrompt = systemPrompt + voiceContext;
 * // Adds calibration instructions like:
 * // "Contact style: formal=0.3, verbose=0.12, emotional=0.51"
 * // "Adapt: Keep it casual and friendly."
 * // "Adapt: Keep responses brief and direct."
 */

module.exports = {
  detect,
  buildContext,
  createProfileStore,
  version: '0.1.0'
};
