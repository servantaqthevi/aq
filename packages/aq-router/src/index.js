// @aq/router — Multi-model AI routing engine
// Bismillah
'use strict';

const { createRouter, DEFAULT_ROUTES } = require('./route');
const { COST_PER_MILLION, calculateCost, createCostTracker } = require('./cost');
const { callProvider } = require('./providers');

/**
 * Route AI tasks to the right model at the right cost.
 *
 * @example
 * const { createRouter, createCostTracker } = require('@aq/router');
 *
 * // Create a router with your API keys
 * const router = createRouter({
 *   keys: {
 *     claude: process.env.ANTHROPIC_API_KEY,
 *     deepseek: process.env.DEEPSEEK_API_KEY,
 *     google: process.env.GOOGLE_AI_API_KEY
 *   }
 * });
 *
 * // Route a task — picks the best model automatically
 * const result = await router.route('content_bulk', systemPrompt, userMessage);
 * // result = { text, usage, model: 'deepseek-chat', provider: 'deepseek', cost_usd: 0.00012 }
 *
 * // Add custom routes
 * router.addRoute('my_custom_task', 'claude-haiku-4-5-20251001', 'claude');
 *
 * // Track costs
 * const costs = createCostTracker();
 * const routerWithTracking = createRouter({
 *   keys: { claude: '...' },
 *   onRoute: (result) => costs.log(result)
 * });
 *
 * // Get cost summary
 * const summary = costs.summary(7); // last 7 days
 *
 * // Health check
 * const health = router.getHealth();
 * // health = { status: '3/7 providers configured', providers: {...}, routes: {...} }
 *
 * // Test a provider
 * const test = await router.testProvider('claude');
 * // test = { provider: 'claude', status: 'connected', latency_ms: 450 }
 *
 * // Direct provider call (advanced)
 * const direct = await callProvider('claude', 'claude-haiku-4-5-20251001', 'system', 'hello', 100);
 */

module.exports = {
  createRouter,
  DEFAULT_ROUTES,
  COST_PER_MILLION,
  calculateCost,
  createCostTracker,
  callProvider,
  version: '0.1.0'
};
