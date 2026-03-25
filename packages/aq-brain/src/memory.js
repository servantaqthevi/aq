// @aq/brain — In-memory storage engine
'use strict';

const VALID_TYPES = ['fact', 'interaction', 'preference', 'insight', 'pattern'];

/**
 * Create a brain (memory store) for an agent or group of agents.
 *
 * @param {Object} [options]
 * @param {Function} [options.onRemember] - Callback when a memory is stored: (memory) => void
 * @param {Function} [options.onRecall] - Callback when memories are recalled: (memories) => void
 * @param {number} [options.maxMemories] - Max memories to keep (default 10000)
 * @returns {Object} Brain instance with remember, recall, search, getContext, forget, decay
 */
function createBrain(options = {}) {
  const { onRemember = null, onRecall = null, maxMemories = 10000 } = options;
  const memories = new Map(); // id -> memory
  let nextId = 1;

  function _generateId() { return String(nextId++); }

  function _now() { return new Date().toISOString(); }

  /**
   * Store a memory (deduplicates same agent+subject+type within 24h).
   *
   * @param {string} agentName - e.g. 'my-agent'
   * @param {string} namespace - Grouping key (e.g. tenant ID, user ID)
   * @param {Object} opts
   * @param {string} [opts.type='fact'] - Memory type: fact, interaction, preference, insight, pattern
   * @param {string} [opts.subject] - Subject of the memory
   * @param {string} [opts.subjectType] - Category of the subject
   * @param {string} opts.content - The memory content
   * @param {Object} [opts.metadata={}] - Additional metadata
   * @param {number} [opts.importance=5] - Importance score (1-10)
   * @param {string} [opts.expiresAt] - ISO date when memory expires
   * @returns {string|null} Memory ID or null
   */
  function remember(agentName, namespace, opts) {
    const {
      type = 'fact', subject, subjectType, content,
      metadata = {}, importance = 5, expiresAt
    } = opts;

    if (!VALID_TYPES.includes(type)) return null;
    if (!content) return null;

    // Deduplicate: same agent+subject+type within 24h
    if (subject) {
      const cutoff = Date.now() - 86400000;
      for (const [id, mem] of memories) {
        if (mem.namespace === namespace && mem.agent_name === agentName &&
            mem.subject === subject && mem.memory_type === type &&
            new Date(mem.created_at).getTime() > cutoff && mem.importance > 0) {
          // Update existing
          mem.content = content;
          mem.importance = Math.max(mem.importance, importance);
          mem.metadata = { ...mem.metadata, ...metadata };
          mem.updated_at = _now();
          return id;
        }
      }
    }

    // Evict if over max
    if (memories.size >= maxMemories) {
      _evictLowest();
    }

    const id = _generateId();
    const memory = {
      id,
      namespace,
      agent_name: agentName,
      memory_type: type,
      subject: subject || null,
      subject_type: subjectType || null,
      content,
      metadata,
      importance,
      access_count: 0,
      last_accessed_at: null,
      expires_at: expiresAt || null,
      created_at: _now(),
      updated_at: _now()
    };

    memories.set(id, memory);
    if (onRemember) try { onRemember(memory); } catch (e) { /* */ }
    return id;
  }

  /**
   * Retrieve memories by filters, sorted by importance.
   *
   * @param {string} agentName
   * @param {string} namespace
   * @param {Object} [opts]
   * @param {string} [opts.type] - Filter by memory type
   * @param {string} [opts.subjectType] - Filter by subject type
   * @param {string} [opts.subject] - Filter by exact subject
   * @param {number} [opts.limit=20] - Max results
   * @param {number} [opts.minImportance=1] - Minimum importance score
   * @returns {Object[]} Array of memory objects
   */
  function recall(agentName, namespace, opts = {}) {
    const { type, subjectType, subject, limit = 20, minImportance = 1 } = opts;
    const now = Date.now();

    let results = [];
    for (const mem of memories.values()) {
      if (mem.namespace !== namespace) continue;
      if (mem.agent_name !== agentName) continue;
      if (mem.importance < minImportance) continue;
      if (mem.expires_at && new Date(mem.expires_at).getTime() < now) continue;
      if (type && mem.memory_type !== type) continue;
      if (subjectType && mem.subject_type !== subjectType) continue;
      if (subject && mem.subject !== subject) continue;
      results.push(mem);
    }

    results.sort((a, b) => b.importance - a.importance || new Date(b.created_at) - new Date(a.created_at));
    results = results.slice(0, limit);

    // Track access
    for (const mem of results) {
      mem.access_count++;
      mem.last_accessed_at = _now();
    }

    if (onRecall && results.length) try { onRecall(results); } catch (e) { /* */ }
    return results;
  }

  /**
   * Full-text search memories.
   *
   * @param {string} agentName
   * @param {string} namespace
   * @param {string} query - Search query text
   * @param {Object} [opts]
   * @param {string} [opts.type] - Filter by type
   * @param {number} [opts.limit=10] - Max results
   * @returns {Object[]} Array of matching memories with relevance scores
   */
  function search(agentName, namespace, query, opts = {}) {
    if (!query) return [];
    const { type, limit = 10 } = opts;
    const now = Date.now();
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(Boolean);

    const scored = [];
    for (const mem of memories.values()) {
      if (mem.namespace !== namespace) continue;
      if (mem.agent_name !== agentName) continue;
      if (mem.importance <= 0) continue;
      if (mem.expires_at && new Date(mem.expires_at).getTime() < now) continue;
      if (type && mem.memory_type !== type) continue;

      const contentLower = (mem.content || '').toLowerCase();
      const subjectLower = (mem.subject || '').toLowerCase();
      let relevance = 0;

      for (const term of queryTerms) {
        if (contentLower.includes(term)) relevance += 1;
        if (subjectLower.includes(term)) relevance += 2;
      }

      if (relevance > 0) {
        scored.push({ ...mem, relevance });
      }
    }

    scored.sort((a, b) => b.relevance - a.relevance || b.importance - a.importance);
    return scored.slice(0, limit);
  }

  /**
   * Build formatted context string for AI prompts.
   *
   * @param {string} agentName
   * @param {string} namespace
   * @param {Object} [opts] - Same as recall() opts
   * @returns {string} Prompt-ready context string or empty string
   */
  function getContext(agentName, namespace, opts = {}) {
    const mems = recall(agentName, namespace, opts);
    if (mems.length === 0) return '';

    const lines = mems.map(m => {
      const age = _formatAge(m.created_at);
      return `- [${m.memory_type}] ${m.subject ? m.subject + ': ' : ''}${m.content} (${age})`;
    });

    return `\n--- Agent Memory (${agentName}) ---\n${lines.join('\n')}\n--- End Memory ---`;
  }

  /**
   * Soft-delete a memory (set importance=0).
   *
   * @param {string} memoryId
   * @returns {boolean} Whether the memory was found
   */
  function forget(memoryId) {
    const mem = memories.get(String(memoryId));
    if (!mem) return false;
    mem.importance = 0;
    mem.updated_at = _now();
    return true;
  }

  /**
   * Decay stale memories: reduce importance of memories unaccessed for 30+ days.
   *
   * @param {string} namespace
   * @returns {number} Count of decayed memories
   */
  function decay(namespace) {
    const thirtyDaysAgo = Date.now() - (30 * 86400000);
    let count = 0;

    for (const mem of memories.values()) {
      if (mem.namespace !== namespace) continue;
      if (mem.importance <= 1) continue;

      const lastAccess = mem.last_accessed_at ? new Date(mem.last_accessed_at).getTime() : 0;
      const created = new Date(mem.created_at).getTime();

      if ((lastAccess === 0 || lastAccess < thirtyDaysAgo) && created < thirtyDaysAgo) {
        mem.importance = Math.max(1, mem.importance - 1);
        mem.updated_at = _now();
        count++;
      }
    }

    return count;
  }

  /**
   * Get stats about the brain's memory.
   *
   * @returns {Object} { total, by_type, by_agent }
   */
  function stats() {
    const byType = {};
    const byAgent = {};
    for (const mem of memories.values()) {
      if (mem.importance <= 0) continue;
      byType[mem.memory_type] = (byType[mem.memory_type] || 0) + 1;
      byAgent[mem.agent_name] = (byAgent[mem.agent_name] || 0) + 1;
    }
    return { total: memories.size, active: Array.from(memories.values()).filter(m => m.importance > 0).length, by_type: byType, by_agent: byAgent };
  }

  /**
   * Export all memories as an array (for persistence).
   * @returns {Object[]}
   */
  function exportAll() {
    return Array.from(memories.values());
  }

  /**
   * Import memories from an array (restore from persistence).
   * @param {Object[]} data
   */
  function importAll(data) {
    for (const mem of data) {
      const id = mem.id || _generateId();
      memories.set(String(id), { ...mem, id: String(id) });
      if (Number(id) >= nextId) nextId = Number(id) + 1;
    }
  }

  function _evictLowest() {
    let lowestId = null;
    let lowestScore = Infinity;
    for (const [id, mem] of memories) {
      if (mem.importance < lowestScore) {
        lowestScore = mem.importance;
        lowestId = id;
      }
    }
    if (lowestId) memories.delete(lowestId);
  }

  return { remember, recall, search, getContext, forget, decay, stats, exportAll, importAll };
}

function _formatAge(createdAt) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(ms / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

module.exports = { createBrain, VALID_TYPES };
