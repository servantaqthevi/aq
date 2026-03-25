// @aq/soul — Build soul context for injection into agent system prompts
'use strict';

/**
 * Build a prompt-ready string from a soul object.
 * Inject this into your agent's system prompt to give it a conscience.
 *
 * @param {Object} soul - A soul object created by createSoul()
 * @param {Object} [options]
 * @param {boolean} [options.compact] - Use compact format (fewer tokens)
 * @param {boolean} [options.includeEnforcement] - Include enforcement rules in context (default false — enforcement happens post-generation)
 * @returns {string} Prompt-ready soul context
 */
function buildContext(soul, options = {}) {
  if (!soul) return '';
  const { compact = false, includeEnforcement = false } = options;

  if (compact) return buildCompact(soul, includeEnforcement);
  return buildFull(soul, includeEnforcement);
}

function buildFull(soul, includeEnforcement) {
  const parts = [];

  parts.push(`\n=== SOUL: ${soul.name} ===`);

  if (soul.purpose) {
    parts.push(`PURPOSE: ${soul.purpose}`);
  }

  if (soul.values.length) {
    parts.push(`\nVALUES (what you believe):`);
    soul.values.forEach(v => parts.push(`- ${v}`));
  }

  if (soul.refusals.length) {
    parts.push(`\nREFUSALS (hard boundaries — you will NEVER do these):`);
    soul.refusals.forEach(r => parts.push(`- NEVER: ${r}`));
  }

  if (soul.commitments.length) {
    parts.push(`\nCOMMITMENTS:`);
    soul.commitments.forEach(c => parts.push(`- ${c.name}: ${c.description}`));
  }

  const p = soul.personality;
  if (p) {
    const traits = [];
    if (p.warmth >= 0.7) traits.push('warm and caring');
    else if (p.warmth <= 0.3) traits.push('professional and measured');

    if (p.formality >= 0.7) traits.push('formal and precise');
    else if (p.formality <= 0.3) traits.push('casual and approachable');

    if (p.directness >= 0.7) traits.push('direct and honest');
    else if (p.directness <= 0.3) traits.push('gentle and diplomatic');

    if (p.humor >= 0.7) traits.push('uses humor naturally');
    else if (p.humor <= 0.2) traits.push('serious and focused');

    if (traits.length) {
      parts.push(`\nPERSONALITY: ${traits.join(', ')}`);
    }
  }

  if (includeEnforcement && soul.enforcement.length) {
    parts.push(`\nENFORCEMENT (never produce content matching these patterns):`);
    soul.enforcement.forEach(r => parts.push(`- [${r.severity}] ${r.name}: avoid language matching /${r.pattern}/`));
  }

  parts.push(`=== END SOUL ===\n`);
  return parts.join('\n');
}

function buildCompact(soul, includeEnforcement) {
  const parts = [`[SOUL:${soul.name}]`];

  if (soul.purpose) parts.push(`Purpose:${soul.purpose}`);
  if (soul.values.length) parts.push(`Values:${soul.values.join('|')}`);
  if (soul.refusals.length) parts.push(`Never:${soul.refusals.join('|')}`);

  if (includeEnforcement && soul.enforcement.length) {
    parts.push(`Block:${soul.enforcement.map(r => r.name).join('|')}`);
  }

  parts.push(`[/SOUL]`);
  return parts.join('\n');
}

module.exports = { buildContext };
