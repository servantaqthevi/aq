#!/usr/bin/env node
// create-aq — Create a governed AI agent in 30 seconds
// Bismillah
'use strict';

const readline = require('node:readline');
const fs = require('node:fs');
const path = require('node:path');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GOLD = '\x1b[33m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';

function print(text) { process.stdout.write(text + '\n'); }
function blank() { print(''); }

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question, defaultVal) {
  return new Promise((resolve) => {
    const prompt = defaultVal ? `${question} ${DIM}(${defaultVal})${RESET} ` : `${question} `;
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultVal || '');
    });
  });
}

function choose(question, options) {
  return new Promise((resolve) => {
    print(question);
    options.forEach((opt, i) => {
      print(`  ${GOLD}${i + 1}${RESET} ${opt.label}${opt.desc ? ` ${DIM}— ${opt.desc}${RESET}` : ''}`);
    });
    blank();
    rl.question(`${DIM}Choose (1-${options.length}):${RESET} `, (answer) => {
      const idx = parseInt(answer) - 1;
      resolve(options[idx >= 0 && idx < options.length ? idx : 0].value);
    });
  });
}

const SOUL_TEMPLATES = {
  business: {
    values: ['honesty', 'excellence', 'warmth', 'teach over do'],
    refusals: ['Never fabricate data or metrics', 'Never create dependency — explain every decision', 'Never overpromise results'],
    personality: { warmth: 0.8, formality: 0.5, directness: 0.7, humor: 0.3 },
    enforcement: [
      { name: 'no_false_urgency', pattern: 'act now|last chance|hurry|limited time', action: 'strip', severity: 'high' },
      { name: 'no_fabrication', pattern: 'guaranteed|100% success|proven to always', action: 'block', severity: 'critical' }
    ]
  },
  healthcare: {
    values: ['patient safety', 'accuracy', 'compassion', 'transparency'],
    refusals: ['Never provide medical diagnoses', 'Never recommend treatments', 'Never minimize symptoms', 'Never share patient data'],
    personality: { warmth: 0.9, formality: 0.7, directness: 0.5, humor: 0.1 },
    enforcement: [
      { name: 'no_diagnosis', pattern: 'you have|you might have|sounds like you have|diagnosis', action: 'block', severity: 'critical' },
      { name: 'no_treatment', pattern: 'you should take|prescription|dosage|treatment plan', action: 'block', severity: 'critical' },
      { name: 'no_minimizing', pattern: "it's nothing|don't worry about|that's normal|you're fine", action: 'flag', severity: 'high' }
    ]
  },
  finance: {
    values: ['accuracy', 'transparency', 'compliance', 'clarity'],
    refusals: ['Never provide investment advice', 'Never guarantee returns', 'Never share account details', 'Never process unauthorized transactions'],
    personality: { warmth: 0.5, formality: 0.8, directness: 0.9, humor: 0.0 },
    enforcement: [
      { name: 'no_investment_advice', pattern: 'you should invest|buy this stock|guaranteed return|sure thing', action: 'block', severity: 'critical' },
      { name: 'no_false_guarantees', pattern: 'risk.?free|no risk|guaranteed profit|can.t lose', action: 'block', severity: 'critical' }
    ]
  },
  creative: {
    values: ['originality', 'brand voice', 'audience respect', 'quality over quantity'],
    refusals: ['Never plagiarize', 'Never use manipulative tactics', 'Never produce low-effort content'],
    personality: { warmth: 0.6, formality: 0.3, directness: 0.7, humor: 0.5 },
    enforcement: [
      { name: 'no_clickbait', pattern: "you won't believe|shocking|this one trick|doctors hate", action: 'strip', severity: 'high' },
      { name: 'no_manipulation', pattern: 'act now|limited time|last chance|don.t miss', action: 'strip', severity: 'medium' }
    ]
  },
  minimal: {
    values: ['honesty'],
    refusals: ['Never fabricate information'],
    personality: { warmth: 0.5, formality: 0.5, directness: 0.5, humor: 0.2 },
    enforcement: []
  }
};

const NERVE_PRESETS = {
  business: [
    { name: 'emergency', pattern: '(?:emergency|urgent|911)', severity: 'critical', reflex: 'escalate_human' },
    { name: 'complaint', pattern: '(?:angry|frustrated|terrible service|speak to manager)', severity: 'medium', reflex: 'flag_review' },
    { name: 'legal_threat', pattern: '(?:lawyer|sue|legal action|attorney)', severity: 'high', reflex: 'escalate_human' },
    { name: 'cancellation', pattern: '(?:cancel|unsubscribe|stop service)', severity: 'medium', reflex: 'flag_review' }
  ],
  content: [
    { name: 'brand_violation', pattern: '(?:competitor|rival|attack|slam)', severity: 'high', reflex: 'block_content' },
    { name: 'medical_claim', pattern: '(?:cure|treatment|diagnos|prescription)', severity: 'high', reflex: 'block_content' },
    { name: 'urgency_manipulation', pattern: "(?:act now|last chance|limited time|hurry|don't miss)", severity: 'medium', reflex: 'strip_content' }
  ],
  none: []
};

const PROVIDER_EXAMPLES = {
  claude: `async (systemPrompt, userMessage, maxTokens) => {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic();
    const resp = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });
    return { text: resp.content[0].text, usage: resp.usage };
  }`,
  openai: `async (systemPrompt, userMessage, maxTokens) => {
    const OpenAI = require('openai');
    const client = new OpenAI();
    const resp = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    });
    return { text: resp.choices[0].message.content, usage: resp.usage };
  }`,
  'aq-router': `async (systemPrompt, userMessage, maxTokens) => {
    // Uses @aq/router to pick the best model for each task
    const { createRouter } = require('aq').router;
    const router = createRouter({
      keys: {
        claude: process.env.ANTHROPIC_API_KEY,
        deepseek: process.env.DEEPSEEK_API_KEY,
        google: process.env.GOOGLE_AI_API_KEY
      }
    });
    return router.route('agent_response', systemPrompt, userMessage, { maxTokens });
  }`,
  custom: `async (systemPrompt, userMessage, maxTokens) => {
    // Replace with your LLM call
    const response = await fetch('https://your-api.com/v1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.API_KEY },
      body: JSON.stringify({ system: systemPrompt, message: userMessage, max_tokens: maxTokens })
    });
    const data = await response.json();
    return { text: data.text };
  }`
};

// Non-interactive mode: npx create-aq my-agent --yes
const NON_INTERACTIVE = process.argv.includes('--yes') || process.argv.includes('-y');

async function main() {
  const projectDir = process.argv.filter(a => !a.startsWith('-'))[2];

  blank();
  print(`${GOLD}${BOLD}  aq${RESET} ${DIM}— Create a governed AI agent${RESET}`);
  print(`${DIM}  The biological architecture that makes agents safe.${RESET}`);
  blank();

  let name, purpose, soulType, nerveType, useBrain, provider;

  if (NON_INTERACTIVE) {
    name = projectDir || 'my-agent';
    purpose = 'AI agent built with aq';
    soulType = 'business';
    nerveType = 'business';
    useBrain = true;
    provider = 'claude';
    rl.close();
  } else {
    // 1. Project name
    name = await ask(`${CYAN}?${RESET} Agent name:`, projectDir || 'my-agent');

    // 2. Purpose
    purpose = await ask(`${CYAN}?${RESET} What does this agent do? ${DIM}(one sentence)${RESET}:`, 'Help users with their questions');

    // 3. Soul template
    blank();
    soulType = await choose(`${CYAN}?${RESET} Soul template:`, [
      { label: 'Business', desc: 'honesty, warmth, teach over do', value: 'business' },
      { label: 'Healthcare', desc: 'patient safety, no diagnoses, compassion', value: 'healthcare' },
      { label: 'Finance', desc: 'compliance, no investment advice, accuracy', value: 'finance' },
      { label: 'Creative', desc: 'originality, no clickbait, brand voice', value: 'creative' },
      { label: 'Minimal', desc: 'just honesty — build from scratch', value: 'minimal' }
    ]);

    // 4. Nerve signals
    blank();
    nerveType = await choose(`${CYAN}?${RESET} Nerve signals ${DIM}(pattern detection)${RESET}:`, [
      { label: 'Business', desc: 'emergencies, complaints, legal threats, cancellations', value: 'business' },
      { label: 'Content', desc: 'brand violations, medical claims, urgency manipulation', value: 'content' },
      { label: 'None', desc: 'no automatic signal detection', value: 'none' }
    ]);

    // 5. Brain (memory)
    blank();
    useBrain = await choose(`${CYAN}?${RESET} Enable memory ${DIM}(brain)${RESET}?`, [
      { label: 'Yes', desc: 'agent remembers across conversations', value: true },
      { label: 'No', desc: 'stateless — no memory', value: false }
    ]);

    // 6. LLM provider
    blank();
    provider = await choose(`${CYAN}?${RESET} LLM provider:`, [
      { label: 'Claude (Anthropic)', desc: '@anthropic-ai/sdk', value: 'claude' },
      { label: 'OpenAI (GPT)', desc: 'openai', value: 'openai' },
      { label: 'AQ Router', desc: 'auto-picks best model from 7 providers', value: 'aq-router' },
      { label: 'Custom', desc: 'bring your own API', value: 'custom' }
    ]);

    rl.close();
  }

  // Build the project
  blank();
  print(`${GOLD}${BOLD}  Building ${name}...${RESET}`);
  blank();

  const dir = path.resolve(process.cwd(), name);

  // Create directory structure
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });

  // package.json
  const pkg = {
    name,
    version: '0.1.0',
    description: purpose,
    main: 'src/index.js',
    scripts: {
      start: 'node src/index.js',
      test: 'node --test test/agent.test.js'
    },
    dependencies: {
      aq: '^0.1.0'
    },
    license: 'MIT'
  };

  if (provider === 'claude') pkg.dependencies['@anthropic-ai/sdk'] = '^0.39.0';
  if (provider === 'openai') pkg.dependencies['openai'] = '^4.0.0';

  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  print(`  ${GREEN}+${RESET} package.json`);

  // .env
  const envVars = {
    claude: 'ANTHROPIC_API_KEY=your-key-here',
    openai: 'OPENAI_API_KEY=your-key-here',
    'aq-router': 'ANTHROPIC_API_KEY=your-key-here\nDEEPSEEK_API_KEY=your-key-here\nGOOGLE_AI_API_KEY=your-key-here',
    custom: 'API_KEY=your-key-here'
  };

  fs.writeFileSync(path.join(dir, '.env'), envVars[provider] + '\n');
  print(`  ${GREEN}+${RESET} .env`);

  // .gitignore
  fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\n.env\n');
  print(`  ${GREEN}+${RESET} .gitignore`);

  // Soul config
  const soulTemplate = SOUL_TEMPLATES[soulType];
  const soulConfig = {
    name,
    purpose,
    values: soulTemplate.values,
    refusals: soulTemplate.refusals,
    personality: soulTemplate.personality,
    enforcement: soulTemplate.enforcement
  };

  fs.writeFileSync(path.join(dir, 'soul.json'), JSON.stringify(soulConfig, null, 2) + '\n');
  print(`  ${GREEN}+${RESET} soul.json`);

  // Nerve config
  if (nerveType !== 'none') {
    fs.writeFileSync(path.join(dir, 'nerve.json'), JSON.stringify(NERVE_PRESETS[nerveType], null, 2) + '\n');
    print(`  ${GREEN}+${RESET} nerve.json`);
  }

  // Main agent file
  const nerveLoad = nerveType !== 'none'
    ? "const nerveSignals = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'nerve.json'), 'utf-8'));"
    : 'const nerveSignals = [];';

  const mainFile = `// ${name} — Governed AI Agent
// Built with aq (https://github.com/aqthevision/aq)
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const aq = require('aq');

// Load soul configuration
const soulConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'soul.json'), 'utf-8'));

// Load nerve signals
${nerveLoad}

// Your LLM function — this is where you connect to your AI provider
const llm = ${PROVIDER_EXAMPLES[provider]};

// Create the governed agent
const agent = aq.create({
  soul: soulConfig,
  brain: ${useBrain},
  nerve: nerveSignals,
  llm
}, {
  name: '${name}',
  namespace: 'default'
});

// Example: ask the agent a question
async function main() {
  const question = process.argv[2] || 'Hello, what can you help me with?';

  console.log('Asking: ' + question);
  console.log('');

  const result = await agent.ask(
    'You are ${name}. ' + soulConfig.purpose + '.',
    question
  );

  console.log('Response:');
  console.log(result.text);
  console.log('');
  console.log('Biological:');
  console.log('  Confidence:', result.biological.confidence);
  console.log('  Soul violations:', result.biological.soulViolations);
  console.log('  Guard flags:', result.biological.guardFlags);
  console.log('  Nerve signals:', result.biological.nerveSignals);
${useBrain ? "  console.log('  Brain hits:', result.biological.brainHits);" : ''}
}

main().catch(console.error);

module.exports = agent;
`;

  fs.writeFileSync(path.join(dir, 'src', 'index.js'), mainFile);
  print(`  ${GREEN}+${RESET} src/index.js`);

  // Test file
  fs.mkdirSync(path.join(dir, 'test'), { recursive: true });
  const testFile = `// ${name} — Tests
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const aq = require('aq');

describe('${name} — soul', () => {
  const soulConfig = require('../soul.json');

  it('has a valid soul configuration', () => {
    const errors = aq.soul.validateSoul(soulConfig);
    assert.equal(errors.length, 0, 'Soul validation errors: ' + errors.join(', '));
  });

  it('creates a soul without errors', () => {
    const soul = aq.soul.createSoul(soulConfig);
    assert.equal(soul.name, '${name}');
    assert.ok(soul.values.length > 0);
  });
});

describe('${name} — guard', () => {
  it('passes clean responses', () => {
    const result = aq.guard('Hello, how can I help you today?');
    assert.equal(result.safe, true);
  });

  it('catches overpromises', () => {
    const result = aq.guard('I guarantee this will work perfectly');
    assert.ok(result.flags.some(f => f.type === 'overpromise'));
  });

  it('catches manipulation', () => {
    const result = aq.guard('Act now! Limited time only!');
    assert.ok(result.flags.some(f => f.type === 'manipulation'));
  });
});
${useBrain ? `
describe('${name} — brain', () => {
  it('remembers and recalls', () => {
    const brain = aq.brain.createBrain();
    const id = brain.remember('${name}', 'default', {
      type: 'fact', subject: 'test', content: 'Test memory', importance: 5
    });
    assert.ok(id);
    const memories = brain.recall('${name}', 'default', { subject: 'test' });
    assert.equal(memories.length, 1);
  });
});` : ''}
`;

  fs.writeFileSync(path.join(dir, 'test', 'agent.test.js'), testFile);
  print(`  ${GREEN}+${RESET} test/agent.test.js`);

  // Done
  blank();
  print(`${GREEN}${BOLD}  Done.${RESET} Agent created at ${DIM}./${name}${RESET}`);
  blank();
  print(`  Next steps:`);
  print(`  ${DIM}$${RESET} cd ${name}`);
  print(`  ${DIM}$${RESET} npm install`);
  print(`  ${DIM}$${RESET} ${DIM}# Add your API key to .env${RESET}`);
  print(`  ${DIM}$${RESET} npm test`);
  print(`  ${DIM}$${RESET} node src/index.js "How do I grow my business?"`);
  blank();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
