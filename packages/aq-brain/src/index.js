// @aq/brain — Persistent memory for AI agents
// Bismillah
'use strict';

const { createBrain, VALID_TYPES } = require('./memory');

/**
 * Give your AI agent a memory.
 *
 * @example
 * const { createBrain } = require('@aq/brain');
 *
 * const brain = createBrain();
 *
 * // Remember something
 * brain.remember('my-agent', 'tenant-123', {
 *   type: 'fact',
 *   subject: 'John Smith',
 *   subjectType: 'contact',
 *   content: 'Prefers morning appointments, allergic to peanuts',
 *   importance: 8
 * });
 *
 * // Remember a pattern
 * brain.remember('my-agent', 'tenant-123', {
 *   type: 'pattern',
 *   subject: 'lead_conversion',
 *   content: 'Leads from Instagram convert 3x better than Facebook',
 *   importance: 9
 * });
 *
 * // Recall memories for context
 * const memories = brain.recall('my-agent', 'tenant-123', {
 *   subjectType: 'contact',
 *   limit: 10
 * });
 *
 * // Search across all memories
 * const results = brain.search('my-agent', 'tenant-123', 'morning appointments');
 *
 * // Get formatted context for AI prompts
 * const context = brain.getContext('my-agent', 'tenant-123');
 * // Returns: "\n--- Agent Memory (my-agent) ---\n- [fact] John Smith: Prefers morning...\n--- End Memory ---"
 *
 * // Forget a memory
 * brain.forget(memoryId);
 *
 * // Decay stale memories (run daily)
 * brain.decay('tenant-123');
 *
 * // Export for persistence (save to file/DB)
 * const data = brain.exportAll();
 * fs.writeFileSync('brain.json', JSON.stringify(data));
 *
 * // Import from persistence
 * const restored = createBrain();
 * restored.importAll(JSON.parse(fs.readFileSync('brain.json')));
 */

module.exports = {
  createBrain,
  VALID_TYPES,
  version: '0.1.0'
};
