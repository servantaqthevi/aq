// @aq/guardian — Fallback action registry
'use strict';

const DEFAULT_FALLBACKS = {
  DEFAULT: {
    DEFAULT: { description: 'Log error, do nothing rather than harm', action: 'safe_stop' }
  }
};

/**
 * Create a fallback registry with agent-specific error recovery strategies.
 *
 * @param {Object} [config] - Agent fallback definitions keyed by agent name
 * @returns {Object} Registry with get() and register() methods
 */
function createFallbacks(config = {}) {
  const fallbacks = { ...DEFAULT_FALLBACKS, ...config };

  return {
    /**
     * Get the appropriate fallback for a failed action.
     *
     * @param {string} agentName - Agent that failed
     * @param {string} actionName - Action that failed
     * @returns {Object} { description, action }
     */
    get(agentName, actionName) {
      const agentFallbacks = fallbacks[agentName] || fallbacks.DEFAULT;
      return agentFallbacks[actionName] || agentFallbacks.DEFAULT || fallbacks.DEFAULT.DEFAULT;
    },

    /**
     * Register fallback strategies for an agent.
     *
     * @param {string} agentName - Agent name
     * @param {Object} actions - Map of actionName to { description, action }
     */
    register(agentName, actions) {
      fallbacks[agentName] = { ...fallbacks[agentName], ...actions };
    }
  };
}

module.exports = { createFallbacks };
