// @aq/voice — In-memory voice profile management
'use strict';

const { detect } = require('./detect');

/**
 * Create a voice profile store for tracking contact communication styles.
 *
 * @returns {Object} Store with get, update, detect, and buildContext methods
 */
function createProfileStore() {
  const profiles = new Map(); // key: `${agentName}:${contactId}` -> profile

  function _key(agentName, contactId) { return `${agentName}:${contactId}`; }

  /**
   * Get a contact's voice profile.
   *
   * @param {string} agentName
   * @param {string} contactId
   * @returns {Object|null} Profile with formal, verbose, emotional scores
   */
  function get(agentName, contactId) {
    return profiles.get(_key(agentName, contactId)) || null;
  }

  /**
   * Update a contact's voice profile based on new interaction traits.
   * Uses rolling average for natural adaptation.
   *
   * @param {string} agentName
   * @param {string} contactId
   * @param {Object} traits - { formal, verbose, emotional }
   */
  function update(agentName, contactId, traits) {
    const key = _key(agentName, contactId);
    const existing = profiles.get(key);

    if (existing) {
      profiles.set(key, {
        formal: (existing.formal + traits.formal) / 2,
        verbose: (existing.verbose + traits.verbose) / 2,
        emotional: (existing.emotional + traits.emotional) / 2,
        interactions: existing.interactions + 1,
        updated_at: new Date().toISOString()
      });
    } else {
      profiles.set(key, {
        ...traits,
        interactions: 1,
        updated_at: new Date().toISOString()
      });
    }
  }

  /**
   * Detect traits from text and update profile in one step.
   *
   * @param {string} agentName
   * @param {string} contactId
   * @param {string} text - Contact's message
   * @returns {Object} Detected traits
   */
  function detectAndUpdate(agentName, contactId, text) {
    const traits = detect(text);
    update(agentName, contactId, traits);
    return traits;
  }

  /**
   * Export all profiles (for persistence).
   * @returns {Object[]}
   */
  function exportAll() {
    const result = [];
    for (const [key, profile] of profiles) {
      const [agentName, contactId] = key.split(':');
      result.push({ agentName, contactId, ...profile });
    }
    return result;
  }

  /**
   * Import profiles from array.
   * @param {Object[]} data
   */
  function importAll(data) {
    for (const item of data) {
      profiles.set(_key(item.agentName, item.contactId), {
        formal: item.formal,
        verbose: item.verbose,
        emotional: item.emotional,
        interactions: item.interactions || 1,
        updated_at: item.updated_at || new Date().toISOString()
      });
    }
  }

  return { get, update, detectAndUpdate, exportAll, importAll };
}

module.exports = { createProfileStore };
