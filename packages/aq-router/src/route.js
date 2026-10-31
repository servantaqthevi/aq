// @aq/router — Core routing engine
'use strict';

const { callProvider } = require('./providers');
const { calculateCost } = require('./cost');

const DEFAULT_ROUTES = {
  agent_response:       { model: 'claude-opus-5',               provider: 'claude' },
  prompt_writing:       { model: 'claude-fable-5',              provider: 'claude' },
  content_bulk:         { model: 'deepseek-chat',               provider: 'deepseek' },
  content_multilingual: { model: 'qwen-plus',                   provider: 'qwen' },
  content_overflow:     { model: 'qwen-plus',                   provider: 'qwen' },
  heavy_testing:        { model: 'deepseek-reasoner',           provider: 'deepseek' },
  simple_template:      { model: 'claude-sonnet-4-20250514',    provider: 'claude' },
  image_quality:        { model: 'gemini-2.5-pro',              provider: 'google' },
  image_speed:          { model: 'gemini-2.5-flash',            provider: 'google' },
  copy_quality:         { model: 'claude-opus-5',               provider: 'claude' },
  copy_bulk:            { model: 'deepseek-chat',               provider: 'deepseek' },
  copy_multilingual:    { model: 'qwen-plus',                   provider: 'qwen' },
  video_script:         { model: 'claude-opus-5',               provider: 'claude' },
  graphic_prompt:       { model: 'gemini-2.5-flash',            provider: 'google' },
  audio_script:         { model: 'claude-haiku-4-5-20251001',   provider: 'claude' },
  campaign_strategy:    { model: 'claude-fable-5',              provider: 'claude' },
  content_calendar:     { model: 'deepseek-chat',               provider: 'deepseek' },
  content_review:       { model: 'claude-fable-5',              provider: 'claude' },
  general_chat:         { model: 'gpt-4o-mini',                 provider: 'openai' },
  reasoning:            { model: 'grok-3-mini',                 provider: 'grok' },
  web_research:         { model: 'sonar',                       provider: 'perplexity' },
};

/**
 * Create a router instance with configurable routes.
 *
 * @param {Object} [options]
 * @param {Object} [options.routes] - Custom routing table (merged with defaults)
 * @param {Object} [options.keys] - API keys: { claude, deepseek, qwen, google, openai, grok, perplexity }
 * @param {string} [options.fallbackProvider='claude'] - Provider to fall back to on errors
 * @param {string} [options.fallbackModel='claude-opus-5'] - Model to fall back to
 * @param {Function} [options.onRoute] - Callback for each route: (result) => void
 * @param {Function} [options.onError] - Callback for errors: (error, taskType) => void
 * @returns {Object} Router with route(), addRoute(), getHealth() methods
 */
function createRouter(options = {}) {
  const {
    routes: customRoutes = {},
    keys = {},
    fallbackProvider = 'claude',
    fallbackModel = 'claude-opus-5',
    onRoute = null,
    onError = null
  } = options;

  const routes = { ...DEFAULT_ROUTES, ...customRoutes };

  /**
   * Route a task to the right AI model.
   *
   * @param {string} taskType - Key from routing table
   * @param {string} systemPrompt - System message
   * @param {string} userMessage - User message
   * @param {Object} [opts]
   * @param {number} [opts.maxTokens=1500] - Max output tokens
   * @returns {Object} { text, usage, model, provider, cost_usd, duration_ms, task_type }
   */
  async function route(taskType, systemPrompt, userMessage, opts = {}) {
    const { maxTokens = 1500 } = opts;

    const routing = routes[taskType];
    if (!routing) {
      if (onError) onError(new Error(`Unknown task type: ${taskType}`), taskType);
      return route('agent_response', systemPrompt, userMessage, opts);
    }

    const { model, provider } = routing;
    const start = Date.now();

    let result;
    try {
      result = await callProvider(provider, model, systemPrompt, userMessage, maxTokens, keys);
    } catch (err) {
      if (onError) onError(err, taskType);
      // Fallback
      result = await callProvider(fallbackProvider, fallbackModel, systemPrompt, userMessage, maxTokens, keys);
      result.fallback_from = `${provider}/${model}`;
      result.provider = fallbackProvider;
      result.model = fallbackModel;
    }

    const duration = Date.now() - start;
    const inputTokens = result.usage?.input_tokens || result.usage?.prompt_tokens || 0;
    const outputTokens = result.usage?.output_tokens || result.usage?.completion_tokens || 0;

    result.duration_ms = duration;
    result.task_type = taskType;
    result.cost_usd = calculateCost(result.model, inputTokens, outputTokens);

    if (onRoute) try { onRoute(result); } catch (e) { /* */ }

    return result;
  }

  /**
   * Add or override a route.
   */
  function addRoute(taskType, model, provider) {
    routes[taskType] = { model, provider };
  }

  /**
   * Get health status of all configured providers.
   */
  function getHealth() {
    const providers = {
      claude: { status: (keys.claude || keys.anthropic || process.env.ANTHROPIC_API_KEY) ? 'configured' : 'missing_key' },
      deepseek: { status: (keys.deepseek || process.env.DEEPSEEK_API_KEY) ? 'configured' : 'missing_key' },
      qwen: { status: (keys.qwen || process.env.QWEN_API_KEY) ? 'configured' : 'missing_key' },
      google: { status: (keys.google || process.env.GOOGLE_AI_API_KEY) ? 'configured' : 'missing_key' },
      openai: { status: (keys.openai || process.env.OPENAI_API_KEY) ? 'configured' : 'missing_key' },
      grok: { status: (keys.grok || process.env.GROK_API_KEY) ? 'configured' : 'missing_key' },
      perplexity: { status: (keys.perplexity || process.env.PERPLEXITY_API_KEY) ? 'configured' : 'missing_key' }
    };

    const configured = Object.values(providers).filter(p => p.status === 'configured').length;
    return {
      status: `${configured}/${Object.keys(providers).length} providers configured`,
      providers,
      routes: { ...routes },
      total_task_types: Object.keys(routes).length
    };
  }

  /**
   * Test a single provider with a minimal call.
   */
  async function testProvider(provider) {
    const start = Date.now();
    try {
      const testModel = {
        claude: 'claude-haiku-4-5-20251001',
        deepseek: 'deepseek-chat',
        qwen: 'qwen-plus',
        google: 'gemini-2.5-flash',
        openai: 'gpt-4o-mini',
        grok: 'grok-3-mini',
        perplexity: 'sonar'
      }[provider];

      if (!testModel) return { provider, status: 'unknown_provider' };

      const result = await callProvider(provider, testModel, 'Reply with exactly: OK', 'Test connection', 10, keys);
      return { provider, status: 'connected', response: result.text?.substring(0, 50), latency_ms: Date.now() - start };
    } catch (err) {
      return { provider, status: 'error', error: err.message, latency_ms: Date.now() - start };
    }
  }

  return { route, addRoute, getHealth, testProvider, routes };
}

module.exports = { createRouter, DEFAULT_ROUTES };
