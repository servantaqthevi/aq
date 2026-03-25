// @aq/sacred-laws — Law creation and management
'use strict';

const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'];
const VALID_ACTIONS = ['block', 'flag', 'log'];

/**
 * Create a new laws collection. Laws are organized by pillars (categories).
 *
 * @param {Object[]} [initialLaws] - Array of law definitions to start with
 * @returns {Object} Laws collection with add/remove/get methods
 */
function createLaws(initialLaws = []) {
  const laws = new Map();

  const collection = {
    add(law) { return addLaw(collection, law); },
    remove(id) { return removeLaw(collection, id); },
    get(id) { return getLaw(collection, id); },
    byPillar(pillar) { return getLawsByPillar(collection, pillar); },
    all() { return Array.from(laws.values()); },
    count() { return laws.size; },
    pillars() { return [...new Set(Array.from(laws.values()).map(l => l.pillar))]; },
    _laws: laws
  };

  for (const law of initialLaws) {
    addLaw(collection, law);
  }

  return collection;
}

/**
 * Add a law to a collection.
 *
 * @param {Object} collection - Laws collection from createLaws()
 * @param {Object} law
 * @param {string|number} law.id - Unique identifier
 * @param {string} law.pillar - Category (e.g., 'TRUST', 'TRUTH', 'SAFETY')
 * @param {string} law.description - What this law protects
 * @param {string} law.severity - 'critical' | 'high' | 'medium' | 'low'
 * @param {string} law.action - 'block' (stop the action) | 'flag' (warn but allow) | 'log' (record only)
 * @param {Function} law.detect - (context) => string|null — returns violation message or null if clean
 * @returns {Object} The collection (for chaining)
 */
function addLaw(collection, law) {
  const errors = validateLaw(law);
  if (errors.length) {
    throw new Error(`Invalid law "${law.id}":\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }

  collection._laws.set(String(law.id), {
    id: String(law.id),
    pillar: law.pillar.toUpperCase(),
    description: law.description,
    severity: law.severity,
    action: law.action,
    detect: law.detect
  });

  return collection;
}

/**
 * Remove a law by ID.
 */
function removeLaw(collection, id) {
  collection._laws.delete(String(id));
  return collection;
}

/**
 * Get a single law by ID.
 */
function getLaw(collection, id) {
  return collection._laws.get(String(id)) || null;
}

/**
 * Get all laws in a pillar.
 */
function getLawsByPillar(collection, pillar) {
  return Array.from(collection._laws.values()).filter(l => l.pillar === pillar.toUpperCase());
}

function validateLaw(law) {
  const errors = [];
  if (!law.id) errors.push('Missing id');
  if (!law.pillar) errors.push('Missing pillar');
  if (!law.description) errors.push('Missing description');
  if (!law.severity || !VALID_SEVERITIES.includes(law.severity)) {
    errors.push(`Invalid severity "${law.severity}" — use ${VALID_SEVERITIES.join(', ')}`);
  }
  if (!law.action || !VALID_ACTIONS.includes(law.action)) {
    errors.push(`Invalid action "${law.action}" — use ${VALID_ACTIONS.join(', ')}`);
  }
  if (typeof law.detect !== 'function') {
    errors.push('detect must be a function: (context) => string|null');
  }
  return errors;
}

module.exports = { createLaws, addLaw, removeLaw, getLaw, getLawsByPillar };
