// @aq/voice — Voice context builder for AI prompts
'use strict';

/**
 * Build a voice calibration context string for injection into agent system prompts.
 *
 * @param {Object|null} profile - Contact's voice profile (from profileStore.get())
 * @param {Object} [blueprintVoice] - Agent's target voice from blueprint
 * @param {number} [blueprintVoice.formal] - Target formality (0-1)
 * @param {number} [blueprintVoice.verbose] - Target verbosity (0-1)
 * @param {number} [blueprintVoice.emotional] - Target emotionality (0-1)
 * @returns {string} Prompt-ready context string, or empty string
 */
function buildContext(profile, blueprintVoice) {
  const parts = [];

  if (blueprintVoice) {
    parts.push(`\n=== VOICE CALIBRATION ===`);
    parts.push(`Target: formal=${blueprintVoice.formal || 0.5}, verbose=${blueprintVoice.verbose || 0.5}, emotional=${blueprintVoice.emotional || 0.3}`);
  }

  if (profile) {
    parts.push(`Contact style: formal=${profile.formal}, verbose=${profile.verbose}, emotional=${profile.emotional}`);
    if (profile.formal > 0.7) parts.push('Adapt: Use professional language, complete sentences.');
    else if (profile.formal < 0.3) parts.push('Adapt: Keep it casual and friendly.');
    if (profile.verbose > 0.7) parts.push('Adapt: Give detailed explanations.');
    else if (profile.verbose < 0.3) parts.push('Adapt: Keep responses brief and direct.');
  }

  return parts.join('\n');
}

module.exports = { buildContext };
