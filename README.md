# AQ — Biological Governance for AI Agents

A safety and governance layer for AI agents. Nine organs — Soul, Guardian, Sacred Laws, Brain, Nerve, Mirror, Voice, Router, Bio-Wrap — that catch hallucinations, block manipulation, detect vulnerability, enforce values, and route edge cases to humans.

202 tests. 43 battle scenarios. 4 providers. 0 failures. Running on 20 agents in production.

## Quick Start

```bash
npm install aq-framework
```

```js
const aq = require('aq-framework');

const result = aq.guard('I guarantee 100% results! Act now, limited time only!');

console.log(result.safe);        // true (no critical violations)
console.log(result.response);    // "I believe in strong results!" (overpromise softened, urgency removed)
console.log(result.flags);       // [{ type: 'overpromise', ... }, { type: 'manipulation', ... }]
console.log(result.corrections); // ['Softened overpromise language', 'Removed false urgency language']
```

One function. Your agent's responses get scanned for overpromises, manipulation, false urgency, and vulnerability patterns — and corrected before they reach a human. Not bulletproof, but significantly safer than shipping raw LLM output.

## Build a Governed Agent

```js
const aq = require('aq-framework');

const agent = aq.create({
  soul: {
    name: 'my-agent',
    purpose: 'Help restaurant owners manage their business',
    values: ['honesty', 'warmth', 'teach over do'],
    refusals: ['Never fabricate reviews', 'Never invent menu items', 'Never create dependency']
  },
  brain: true,
  nerve: 'business',
  llm: async (systemPrompt, userMessage, maxTokens) => {
    // Bring your own model — Claude, GPT, Gemini, DeepSeek, local, anything
    return await yourLLMCall(systemPrompt, userMessage, maxTokens);
  }
});

const result = await agent.ask(
  'You are a helpful restaurant business assistant.',
  'How do I get more 5-star reviews?'
);

console.log(result.text);                    // The response
console.log(result.biological.confidence);   // 0.85 — how confident the agent is
console.log(result.biological.soulViolations); // 0 — soul rules enforced
console.log(result.biological.guardFlags);   // 0 — safety checks passed
console.log(result.biological.nerveSignals); // 0 — no distress detected
```

Every response comes with biological metadata. You always know: how confident was the agent? Did it violate any values? Did it detect distress? Should it escalate to a human?

## The Nine Organs

| Organ | Package | What It Does |
|-------|---------|-------------|
| **Soul** | `aq-soul` | Values, refusals, personality. The conscience. Enforces rules on every response. |
| **Guardian** | `aq-guardian` | Response safety scanning. Catches overpromises, manipulation, vulnerability, emergencies. |
| **Sacred Laws** | `aq-sacred-laws` | Governance rules with detect functions and audit trails. The constitution. |
| **Brain** | `aq-brain` | Memory — remember, recall, search, forget, decay. In-memory with export/import. |
| **Nerve** | `aq-nerve` | Pattern detection and reflexes. Emergency signals bypass normal processing. |
| **Mirror** | `aq-mirror` | Confidence scoring, uncertainty detection, escalation recommendations. |
| **Voice** | `aq-voice` | Communication style detection and adaptation. Match the human's tone. |
| **Router** | `aq-router` | Multi-model routing across 7+ providers. Cost-optimized, auto-fallback. |
| **Bio-Wrap** | `aq-bio-wrap` | Assembles all organs into a living agent. The body. |

Use `aq.create()` for the quick path. Use individual organs when you need full control:

```js
const { createSoul, enforce } = require('aq-soul');
const { guardResponse, detectVulnerability } = require('aq-guardian');
const { createBrain } = require('aq-brain');
```

## CLI — Scaffold a Governed Agent

```bash
npx create-aq my-agent
```

Interactive wizard that asks for your soul template (business, healthcare, finance, creative, minimal), nerve signals, memory, and LLM provider — then generates a complete governed agent project with tests.

```bash
npx create-aq my-agent --yes  # Non-interactive, business defaults
```

## Adapters — Drop-in Governance for Existing Frameworks

```bash
npm install aq-adapters
```

### LangChain.js

```js
const { createLangChainGovernance } = require('aq-adapters/langchain');
const gov = createLangChainGovernance();
const governed = await gov.governChain(() => chain.invoke({ input }), { input });
```

### Vercel AI SDK

```js
const { createVercelGovernance } = require('aq-adapters/vercel-ai');
const gov = createVercelGovernance();
const governed = gov.governText(result.text, { input: userMessage });
```

### OpenAI

```js
const { createOpenAIGovernance } = require('aq-adapters/openai');
const gov = createOpenAIGovernance();
const governed = gov.governResponse(completion, { input: userMessage });
```

### Generic (any framework)

```js
const { createGovernance } = require('aq-adapters');
const gov = createGovernance({ nerveSignals: [...] });
const result = await gov.wrap(() => yourLLM(prompt), { input: userMessage });
```

## Bring Your Own Model

`aq` is model-agnostic. Provide an `llm` function and use whatever you want:

```js
// Claude
const agent = aq.create({
  soul: { name: 'test', purpose: 'Testing' },
  llm: async (sys, msg, max) => {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', max_tokens: max,
      system: sys, messages: [{ role: 'user', content: msg }]
    });
    return { text: resp.content[0].text, usage: resp.usage };
  }
});

// OpenAI
llm: async (sys, msg, max) => {
  const resp = await openai.chat.completions.create({
    model: 'gpt-4o', max_tokens: max,
    messages: [{ role: 'system', content: sys }, { role: 'user', content: msg }]
  });
  return { text: resp.choices[0].message.content };
}

// Or use aq-router for automatic model selection across 7 providers
const router = aq.router.createRouter({
  keys: { claude: ANTHROPIC_KEY, deepseek: DEEPSEEK_KEY }
});
llm: (sys, msg, max) => router.route('agent_response', sys, msg, { maxTokens: max })
```

## Tests

202 tests. Zero external dependencies. All passing.

```
npm test
```

```
aq             25 tests — unified API, guard, create, organ access
soul           23 tests — creation, validation, context, enforcement
sacred-laws    22 tests — laws, check, audit, presets
guardian       41 tests — guard, vulnerability, emergency, uncertainty, audit, fallbacks
brain          27 tests — remember, recall, search, forget, decay, export/import
nerve          15 tests — scan, signals, reflexes, context
mirror         13 tests — assess, confidence, escalation
voice          19 tests — detect, profiles, context, adaptation
```

Includes 43 battle scenarios: manipulation attempts, vulnerability exploitation, emergency detection, hallucination patterns, boundary testing.

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| `aq-framework` | [![npm](https://img.shields.io/npm/v/aq-framework)](https://www.npmjs.com/package/aq-framework) | Unified framework — all 9 organs in one import |
| `aq-soul` | [![npm](https://img.shields.io/npm/v/aq-soul)](https://www.npmjs.com/package/aq-soul) | Values, refusals, personality, enforcement |
| `aq-guardian` | [![npm](https://img.shields.io/npm/v/aq-guardian)](https://www.npmjs.com/package/aq-guardian) | Response safety, vulnerability detection |
| `aq-sacred-laws` | [![npm](https://img.shields.io/npm/v/aq-sacred-laws)](https://www.npmjs.com/package/aq-sacred-laws) | Governance rules, audit trails |
| `aq-brain` | [![npm](https://img.shields.io/npm/v/aq-brain)](https://www.npmjs.com/package/aq-brain) | Memory — remember, recall, search, forget |
| `aq-nerve` | [![npm](https://img.shields.io/npm/v/aq-nerve)](https://www.npmjs.com/package/aq-nerve) | Pattern detection, emergency reflexes |
| `aq-mirror` | [![npm](https://img.shields.io/npm/v/aq-mirror)](https://www.npmjs.com/package/aq-mirror) | Confidence scoring, escalation |
| `aq-voice` | [![npm](https://img.shields.io/npm/v/aq-voice)](https://www.npmjs.com/package/aq-voice) | Communication style adaptation |
| `aq-router` | [![npm](https://img.shields.io/npm/v/aq-router)](https://www.npmjs.com/package/aq-router) | Multi-model routing, 7+ providers |
| `aq-bio-wrap` | [![npm](https://img.shields.io/npm/v/aq-bio-wrap)](https://www.npmjs.com/package/aq-bio-wrap) | Agent assembly — all organs wired together |
| `aq-adapters` | [![npm](https://img.shields.io/npm/v/aq-adapters)](https://www.npmjs.com/package/aq-adapters) | Drop-in adapters for LangChain, Vercel AI, OpenAI |
| `create-aq` | [![npm](https://img.shields.io/npm/v/create-aq)](https://www.npmjs.com/package/create-aq) | CLI scaffold — `npx create-aq my-agent` |

## Philosophy

This framework exists because AI agents are handling real decisions — financial, medical, legal, personal — and most ship with zero governance.

**What it catches:** Overpromises, false urgency, manipulation language, vulnerability signals, emergency patterns, hallucination indicators, soul/value violations.

**What it is:** A structured safety layer. Regex-based pattern detection plus rule enforcement plus confidence scoring. It catches the common failure modes, routes edge cases to humans, and gives you an audit trail.

**What it is not:** A silver bullet. Here are the honest limitations:

- **Pattern detection is regex-based.** It catches "I guarantee 100% results" but a sufficiently creative LLM can rephrase around the patterns. This is a first line of defense, not a proof system.
- **Brain is in-memory only.** Export/import works, but there's no built-in persistence to disk or database. You need to wire that yourself.
- **Node.js only.** No Python SDK yet.
- **No streaming support.** Guard and enforce run on complete responses, not token streams.
- **Battle-tested on 20 agents, not 20,000.** Production-proven at our scale. We haven't seen every edge case.

If you need stronger guarantees, layer this with model-level safety (system prompts, fine-tuning) and human review. AQ is the governance layer between your LLM and your users — not a replacement for thoughtful system design.

## Production

AQ runs 20 AI agents in production at [AQTheVision](https://aqthevision.ai) — an AI workforce platform for small businesses. Every agent response passes through Soul enforcement, Guardian scanning, Nerve detection, and Mirror confidence scoring before reaching a human.

## License

MIT
