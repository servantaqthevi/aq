# aq

Governed AI agents. Nine organs. One framework.

```
npm install aq-framework
```

## The Problem

AI agents hallucinate. They overpromise. They manipulate with false urgency. They give medical advice they shouldn't. They panic vulnerable people. They sound like robots. Every agent framework helps you build agents. None of them help you govern them.

## One Line of Safety

```js
const aq = require('aq');

const result = aq.guard('I guarantee 100% results! Act now, limited time only!');

console.log(result.safe);        // true (no critical violations)
console.log(result.response);    // "I believe in strong results!" (overpromise softened, urgency removed)
console.log(result.flags);       // [{ type: 'overpromise', ... }, { type: 'manipulation', ... }]
console.log(result.corrections); // ['Softened overpromise language', 'Removed false urgency language']
```

That's the entry point. One function. Your agent dramatically reduces hallucinations, catches manipulation patterns, and softens overpromises — before the response reaches a human. Not bulletproof, but significantly safer, with no architecture change.

## Five Lines to a Governed Agent

```js
const aq = require('aq');

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

Every agent is made from the same parts. Like a human body.

| Organ | What It Does | One-Line Usage |
|-------|-------------|---------------|
| **Soul** | Values, refusals, personality, enforcement | `aq.soul.createSoul({ name, purpose, values })` |
| **Guardian** | Response safety, vulnerability detection, emergency handling | `aq.guardian.guardResponse(text)` |
| **Sacred Laws** | Governance rules with detect functions, audit trails | `aq.sacredLaws.createLaws([...])` |
| **Brain** | Memory — remember, recall, search, forget, decay | `aq.brain.createBrain()` |
| **Nerve** | Pattern detection, emergency signals, reflexes | `aq.nerve.scan(input, signals)` |
| **Mirror** | Confidence scoring, uncertainty detection, escalation | `aq.mirror.assess(input, output)` |
| **Voice** | Communication style detection, adaptation | `aq.voice.detect(text)` |
| **Router** | 7+ AI providers (e.g. Claude, GPT, DeepSeek), cost-optimized, auto-fallback | `aq.router.createRouter({ keys })` |
| **Bio-Wrap** | Assembles all organs into a living agent | `aq.bioWrap.createAgent({ soul, llm })` |

Use `aq.create()` for the quick path. Use individual organs for full control.

## What Each Organ Does

### Soul — The Conscience

```js
const { createSoul, buildContext, enforce } = aq.soul;

const soul = createSoul({
  name: 'my-agent',
  purpose: 'Help small business owners',
  values: ['honesty', 'excellence', 'teach over do'],
  refusals: ['Never fabricate data', 'Never create dependency'],
  personality: { warmth: 0.8, formality: 0.4, directness: 0.9 },
  enforcement: [
    { name: 'no_false_urgency', pattern: 'act now|last chance', action: 'strip', severity: 'high' },
    { name: 'no_fabrication', pattern: 'guaranteed|100% success', action: 'block', severity: 'critical' }
  ]
});

// Inject into system prompt
const systemPrompt = 'You are a business assistant.' + buildContext(soul);

// After AI responds, enforce the soul as a guardrail check
const { response, violations, blocked } = enforce(soul, aiResponse);
```

### Guardian — The Protector

```js
const { guardResponse, detectVulnerability, detectEmergency, honestUncertainty } = aq.guardian;

// Guard a response
const guarded = guardResponse(aiResponse, { channel: 'phone', verified_data: false });
if (!guarded.safe) dontSendThis();

// Detect likely vulnerability patterns and escalate
const vuln = detectVulnerability("I'm losing everything, I can't cope");
// vuln.care_level = 'maximum', vuln.adjustments.escalate_to_human = true

// Detect likely emergency patterns
const emergency = detectEmergency("Someone is having a heart attack");
// emergency.is_emergency = true, emergency.transfer_to_human = true

// When unsure, be honest
const honest = honestUncertainty('What are your hours?', { channel: 'sms' });
// "Great question! Let me verify and get back to you shortly."
```

### Brain — The Memory

```js
const { createBrain } = aq.brain;

const brain = createBrain();

brain.remember('my-agent', 'tenant-123', {
  type: 'preference',
  subject: 'John Smith',
  content: 'Prefers morning appointments. Allergic to peanuts.',
  importance: 8
});

const memories = brain.recall('my-agent', 'tenant-123', { subject: 'John Smith' });
const context = brain.getContext('my-agent', 'tenant-123'); // prompt-ready string
const results = brain.search('my-agent', 'tenant-123', 'morning appointments');

// Persistence
const data = brain.exportAll();
// Save to file, database, wherever
brain.importAll(JSON.parse(savedData));
```

### Nerve — The Nervous System

```js
const { scan, buildContext } = aq.nerve;

const result = scan(userMessage, [
  { name: 'emergency', pattern: '(?:emergency|911|urgent)', severity: 'critical', reflex: 'escalate' },
  { name: 'complaint', pattern: '(?:angry|frustrated|terrible)', severity: 'medium', reflex: 'flag' },
  { name: 'opportunity', pattern: '(?:recommend|upgrade)', severity: 'low', reflex: 'note' }
]);

if (result.shouldBypassBrain) {
  // Critical signal — act immediately, skip normal processing
  handleEmergency(result.reflexes[0]);
}
```

### Mirror — The Self-Awareness

```js
const { assess } = aq.mirror;

const mirror = assess(userQuestion, aiResponse, { brainHits: 3, nerveSignals: 0 });

if (mirror.escalate) transferToHuman();
if (mirror.assessment === 'uncertain_add_disclaimer') addDisclaimer();
// mirror.confidence = 0.85, mirror.gaps = [], mirror.flags = []
```

### Voice — The Communication Style

```js
const { detect, createProfileStore, buildContext } = aq.voice;

const traits = detect("Hey! Super excited about this!! Can't wait lol");
// { formal: 0.3, verbose: 0.12, emotional: 0.53 }

const profiles = createProfileStore();
profiles.detectAndUpdate('my-agent', 'contact-456', userMessage);
const voiceContext = buildContext(profiles.get('my-agent', 'contact-456'));
// "Adapt: Keep it casual and friendly. Keep responses brief and direct."
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

// Or use @aq/router for automatic model selection
const router = aq.router.createRouter({ keys: { claude: ANTHROPIC_KEY, deepseek: DEEPSEEK_KEY } });
llm: (sys, msg, max) => router.route('agent_response', sys, msg, { maxTokens: max })
```

## Tests

202 tests. Zero dependencies. All passing.

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

## Philosophy

`aq` exists because AI agents are about to handle real decisions — financial, medical, legal, personal. The industry is building agents without governance. We built the governance.

This is not a silver bullet. Pattern-based detection has false positives and false negatives. LLMs can still surprise you. What `aq` gives you is a structured safety layer that catches the common failure modes, routes edge cases to humans, and gives you an audit trail of every decision. That's significantly better than nothing — which is what most agents ship with today.

The organs are free. The architecture is open. What you build with them is yours.

## License

MIT
