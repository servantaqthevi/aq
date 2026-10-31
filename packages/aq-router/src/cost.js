// @aq/router — Cost tracking
'use strict';

const COST_PER_MILLION = {
  // Claude
  'claude-fable-5':             { input: 10.00, output: 50.00 },
  'claude-opus-5':              { input: 5.00,  output: 25.00 },
  'claude-sonnet-4-20250514':   { input: 3.00,  output: 15.00 },
  'claude-haiku-4-5-20251001':  { input: 0.80,  output: 4.00 },
  // DeepSeek
  'deepseek-chat':              { input: 0.27,  output: 1.10 },
  'deepseek-reasoner':          { input: 0.55,  output: 2.19 },
  // Qwen
  'qwen-plus':                  { input: 0.80,  output: 2.00 },
  // Google Gemini
  'gemini-2.5-pro':             { input: 1.25,  output: 10.00 },
  'gemini-2.5-flash':           { input: 0.15,  output: 0.60 },
  // OpenAI
  'gpt-4o-mini':                { input: 0.15,  output: 0.60 },
  'gpt-4o':                     { input: 2.50,  output: 10.00 },
  // Grok
  'grok-3-mini':                { input: 0.30,  output: 0.50 },
  'grok-3':                     { input: 3.00,  output: 15.00 },
  // Perplexity
  'sonar':                      { input: 1.00,  output: 1.00 },
};

/**
 * Calculate cost for a completed API call.
 *
 * @param {string} model - Model ID
 * @param {number} inputTokens - Input/prompt tokens used
 * @param {number} outputTokens - Output/completion tokens used
 * @returns {number} Cost in USD
 */
function calculateCost(model, inputTokens, outputTokens) {
  const rates = COST_PER_MILLION[model] || { input: 0, output: 0 };
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

/**
 * Create an in-memory cost tracker.
 *
 * @returns {Object} Tracker with log(), summary(), and byTaskType() methods
 */
function createCostTracker() {
  const entries = [];

  return {
    /**
     * Log a cost entry.
     */
    log(entry) {
      entries.push({
        ...entry,
        cost_usd: entry.cost_usd || calculateCost(entry.model, entry.input_tokens || 0, entry.output_tokens || 0),
        timestamp: new Date().toISOString()
      });
    },

    /**
     * Get cost summary for a time period.
     *
     * @param {number} [days=7] - Number of days to look back
     * @returns {Object} Summary grouped by provider and model
     */
    summary(days = 7) {
      const cutoff = Date.now() - (days * 86400000);
      const recent = entries.filter(e => new Date(e.timestamp).getTime() > cutoff);

      const byProvider = {};
      const byModel = {};
      let totalCost = 0;
      let totalInput = 0;
      let totalOutput = 0;

      for (const e of recent) {
        totalCost += e.cost_usd || 0;
        totalInput += e.input_tokens || 0;
        totalOutput += e.output_tokens || 0;

        byProvider[e.provider] = (byProvider[e.provider] || 0) + (e.cost_usd || 0);
        byModel[e.model] = (byModel[e.model] || 0) + (e.cost_usd || 0);
      }

      return {
        period_days: days,
        total_calls: recent.length,
        total_cost_usd: totalCost,
        total_input_tokens: totalInput,
        total_output_tokens: totalOutput,
        by_provider: byProvider,
        by_model: byModel
      };
    },

    /**
     * Get cost breakdown by task type.
     */
    byTaskType(days = 7) {
      const cutoff = Date.now() - (days * 86400000);
      const recent = entries.filter(e => new Date(e.timestamp).getTime() > cutoff);

      const byTask = {};
      for (const e of recent) {
        const key = e.task_type || 'unknown';
        if (!byTask[key]) byTask[key] = { calls: 0, cost_usd: 0 };
        byTask[key].calls++;
        byTask[key].cost_usd += e.cost_usd || 0;
      }
      return byTask;
    },

    /**
     * Export all entries.
     */
    exportAll() { return [...entries]; },

    /**
     * Import entries.
     */
    importAll(data) { entries.push(...data); }
  };
}

module.exports = { COST_PER_MILLION, calculateCost, createCostTracker };
