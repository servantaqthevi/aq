// @aq/router — Provider implementations
'use strict';

function fetchWithTimeout(url, options, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function getOpenAICompatibleClient(apiKey, baseURL) {
  if (!apiKey) return null;
  // Lazy-load OpenAI SDK — only required if using OpenAI-compatible providers
  try {
    const OpenAI = require('openai');
    return new OpenAI({ apiKey, baseURL });
  } catch (e) {
    return null;
  }
}

async function callClaude(model, systemPrompt, userMessage, maxTokens, apiKey) {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');

  const resp = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: maxTokens, system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }] })
  }, 45000);
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);

  const text = data.content?.map(b => b.text || '').join('\n') || '';
  return { text, usage: data.usage, model, provider: 'claude' };
}

async function callOpenAICompatible(provider, model, systemPrompt, userMessage, maxTokens, apiKey, baseURL) {
  const key = apiKey || process.env[`${provider.toUpperCase()}_API_KEY`];
  const client = getOpenAICompatibleClient(key, baseURL);
  if (!client) throw new Error(`${provider.toUpperCase()}_API_KEY not set or openai package not installed`);

  const resp = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]
  });

  const text = resp.choices?.[0]?.message?.content || '';
  return {
    text,
    usage: { input_tokens: resp.usage?.prompt_tokens || 0, output_tokens: resp.usage?.completion_tokens || 0 },
    model,
    provider
  };
}

async function callGemini(model, systemPrompt, userMessage, maxTokens, apiKey) {
  const key = apiKey || process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error('GOOGLE_AI_API_KEY not set');

  const resp = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: maxTokens }
    })
  }, 45000);
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n') || '';
  const usage = data.usageMetadata || {};
  return {
    text,
    usage: { input_tokens: usage.promptTokenCount || 0, output_tokens: usage.candidatesTokenCount || 0 },
    model,
    provider: 'google'
  };
}

const PROVIDER_CONFIGS = {
  deepseek: { baseURL: 'https://api.deepseek.com', envKey: 'DEEPSEEK_API_KEY' },
  qwen: { baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', envKey: 'QWEN_API_KEY' },
  openai: { baseURL: undefined, envKey: 'OPENAI_API_KEY' },
  grok: { baseURL: 'https://api.x.ai/v1', envKey: 'GROK_API_KEY' },
  perplexity: { baseURL: 'https://api.perplexity.ai', envKey: 'PERPLEXITY_API_KEY' }
};

/**
 * Call any supported provider.
 *
 * @param {string} provider - Provider name
 * @param {string} model - Model ID
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {number} maxTokens
 * @param {Object} [keys] - API keys override
 * @returns {Object} { text, usage, model, provider }
 */
async function callProvider(provider, model, systemPrompt, userMessage, maxTokens, keys = {}) {
  if (provider === 'claude') {
    return callClaude(model, systemPrompt, userMessage, maxTokens, keys.claude || keys.anthropic);
  }

  if (provider === 'google') {
    return callGemini(model, systemPrompt, userMessage, maxTokens, keys.google);
  }

  const config = PROVIDER_CONFIGS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  return callOpenAICompatible(
    provider, model, systemPrompt, userMessage, maxTokens,
    keys[provider] || process.env[config.envKey],
    config.baseURL
  );
}

module.exports = { callProvider, callClaude, callGemini, callOpenAICompatible, PROVIDER_CONFIGS };
