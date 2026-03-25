// aq-adapters — Governance adapters for popular agent frameworks
// Bismillah
'use strict';

const { createGovernance } = require('./generic');
const { createLangChainGovernance } = require('./langchain');
const { createVercelGovernance } = require('./vercel-ai');
const { createOpenAIGovernance } = require('./openai');

/**
 * Drop-in governance for any AI agent framework.
 *
 * @example
 * // Generic (any framework)
 * const { createGovernance } = require('aq-adapters');
 * const gov = createGovernance({ nerveSignals: [...] });
 * const result = await gov.wrap(() => yourLLM(prompt), { input: userMessage });
 *
 * // LangChain.js
 * const { createLangChainGovernance } = require('aq-adapters/langchain');
 * const gov = createLangChainGovernance();
 * const governed = await gov.governChain(() => chain.invoke({ input }), { input });
 *
 * // Vercel AI SDK
 * const { createVercelGovernance } = require('aq-adapters/vercel-ai');
 * const gov = createVercelGovernance();
 * const governed = gov.governText(result.text, { input: userMessage });
 *
 * // OpenAI
 * const { createOpenAIGovernance } = require('aq-adapters/openai');
 * const gov = createOpenAIGovernance();
 * const governed = gov.governResponse(completion, { input: userMessage });
 */

module.exports = {
  createGovernance,
  createLangChainGovernance,
  createVercelGovernance,
  createOpenAIGovernance,
  version: '0.1.0'
};
