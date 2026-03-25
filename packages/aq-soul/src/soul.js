// @aq/soul — Soul creation, loading, and validation
'use strict';

const REQUIRED_FIELDS = ['name', 'purpose'];
const VALID_ACTIONS = ['strip', 'block', 'flag', 'log'];
const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'];

/**
 * Create a soul from a definition object.
 * A soul defines what an agent believes, what it refuses, and who it is.
 *
 * @param {Object} definition
 * @param {string} definition.name - Agent name
 * @param {string} definition.purpose - Why this agent exists (one sentence)
 * @param {string[]} [definition.values] - What the agent believes in
 * @param {string[]} [definition.refusals] - Hard boundaries — things the agent will NEVER do
 * @param {Object[]} [definition.commitments] - Sacred commitments with name and description
 * @param {Object} [definition.personality] - Personality traits (warmth, formality, directness, humor — 0 to 1)
 * @param {Object[]} [definition.enforcement] - Rules that scan and clean agent output
 * @returns {Object} A validated soul object
 */
function createSoul(definition) {
  const errors = validateSoul(definition);
  if (errors.length) {
    throw new Error(`Invalid soul definition:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }

  return {
    name: definition.name,
    purpose: definition.purpose,
    values: Array.isArray(definition.values) ? [...definition.values] : [],
    refusals: Array.isArray(definition.refusals) ? [...definition.refusals] : [],
    commitments: Array.isArray(definition.commitments)
      ? definition.commitments.map(c => ({ name: c.name, description: c.description }))
      : [],
    personality: {
      warmth: clamp(definition.personality?.warmth, 0.5),
      formality: clamp(definition.personality?.formality, 0.5),
      directness: clamp(definition.personality?.directness, 0.5),
      humor: clamp(definition.personality?.humor, 0.2)
    },
    enforcement: Array.isArray(definition.enforcement)
      ? definition.enforcement.map(normalizeRule)
      : [],
    createdAt: new Date().toISOString(),
    version: 1
  };
}

/**
 * Load a soul from a JSON file or plain object.
 * If the input has a `soul` wrapper (like base-soul.json), unwrap it.
 *
 * @param {Object|string} source - Soul definition object or path to JSON file
 * @returns {Object} A validated soul object
 */
function loadSoul(source) {
  let definition;

  if (typeof source === 'string') {
    const fs = require('fs');
    const raw = JSON.parse(fs.readFileSync(source, 'utf-8'));
    definition = raw.soul || raw;
  } else {
    definition = source.soul || source;
  }

  // Map from base-soul.json format to createSoul format
  const mapped = {
    name: definition.name || 'unnamed',
    purpose: definition.purpose || '',
    values: definition.values || definition.agent_values || [],
    refusals: definition.refusals || [],
    commitments: definition.sacred_commitments || definition.commitments || [],
    personality: definition.personality || {},
    enforcement: (definition.enforcement_rules || definition.enforcement || []).map(r => ({
      name: r.name,
      pattern: r.pattern,
      action: r.action || 'strip',
      severity: r.severity || 'medium'
    }))
  };

  // Don't throw on load — warn and fill defaults
  return createSoul({ ...mapped, purpose: mapped.purpose || 'No purpose defined' });
}

/**
 * Validate a soul definition. Returns an array of error messages.
 * Empty array = valid.
 *
 * @param {Object} definition
 * @returns {string[]} Array of validation errors
 */
function validateSoul(definition) {
  const errors = [];

  if (!definition || typeof definition !== 'object') {
    return ['Soul definition must be an object'];
  }

  for (const field of REQUIRED_FIELDS) {
    if (!definition[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (definition.values && !Array.isArray(definition.values)) {
    errors.push('values must be an array of strings');
  }

  if (definition.refusals && !Array.isArray(definition.refusals)) {
    errors.push('refusals must be an array of strings');
  }

  if (definition.personality && typeof definition.personality !== 'object') {
    errors.push('personality must be an object with numeric traits (0-1)');
  }

  if (definition.enforcement) {
    if (!Array.isArray(definition.enforcement)) {
      errors.push('enforcement must be an array of rule objects');
    } else {
      definition.enforcement.forEach((rule, i) => {
        if (!rule.pattern) errors.push(`enforcement[${i}]: missing pattern`);
        if (rule.action && !VALID_ACTIONS.includes(rule.action)) {
          errors.push(`enforcement[${i}]: invalid action "${rule.action}" — use ${VALID_ACTIONS.join(', ')}`);
        }
        if (rule.severity && !VALID_SEVERITIES.includes(rule.severity)) {
          errors.push(`enforcement[${i}]: invalid severity "${rule.severity}" — use ${VALID_SEVERITIES.join(', ')}`);
        }
        // Test regex validity
        if (rule.pattern) {
          try { new RegExp(rule.pattern, 'gi'); } catch (e) {
            errors.push(`enforcement[${i}]: invalid regex pattern "${rule.pattern}"`);
          }
        }
      });
    }
  }

  return errors;
}

function normalizeRule(rule) {
  return {
    name: rule.name || 'unnamed',
    pattern: rule.pattern,
    action: VALID_ACTIONS.includes(rule.action) ? rule.action : 'strip',
    severity: VALID_SEVERITIES.includes(rule.severity) ? rule.severity : 'medium'
  };
}

function clamp(val, fallback) {
  if (typeof val !== 'number') return fallback;
  return Math.max(0, Math.min(1, val));
}

module.exports = { createSoul, loadSoul, validateSoul };
