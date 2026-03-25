// aq — Unified package tests
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const aq = require('../src/index');

describe('aq — exports', () => {
  it('exports guard function', () => {
    assert.equal(typeof aq.guard, 'function');
  });

  it('exports create function', () => {
    assert.equal(typeof aq.create, 'function');
  });

  it('exports all organ modules', () => {
    assert.ok(aq.soul);
    assert.ok(aq.sacredLaws);
    assert.ok(aq.guardian);
    assert.ok(aq.brain);
    assert.ok(aq.nerve);
    assert.ok(aq.mirror);
    assert.ok(aq.voice);
    assert.ok(aq.router);
    assert.ok(aq.bioWrap);
  });

  it('exports version', () => {
    assert.equal(aq.version, '0.1.0');
  });
});

describe('aq.guard — quick safety check', () => {
  it('passes clean text', () => {
    const result = aq.guard('Hello, how can I help you today?');
    assert.equal(result.safe, true);
    assert.equal(result.flags.length, 0);
  });

  it('catches overpromise', () => {
    const result = aq.guard('I guarantee this will double your revenue');
    assert.ok(result.flags.some(f => f.type === 'overpromise'));
    assert.ok(!result.response.includes('guarantee'));
  });

  it('catches manipulation', () => {
    const result = aq.guard('Act now! Limited time only!');
    assert.ok(result.flags.some(f => f.type === 'manipulation'));
  });

  it('catches hallucination risk', () => {
    const result = aq.guard('We are open from 9:00am to 5pm', { verified_data: false });
    assert.ok(result.flags.some(f => f.type === 'potential_hallucination'));
  });
});

describe('aq.create — governed agent', () => {
  it('creates an agent with minimal config', () => {
    const agent = aq.create({
      soul: { name: 'test', purpose: 'Testing' },
      llm: async (sys, msg) => ({ text: 'Hello!' })
    });
    assert.ok(agent.ask);
    assert.ok(agent.generate);
    assert.equal(agent.name, 'test');
  });

  it('ask() returns text with biological metadata', async () => {
    const agent = aq.create({
      soul: { name: 'test', purpose: 'Testing', values: ['honesty'] },
      llm: async (sys, msg) => ({ text: 'Here is a helpful response about your question.' })
    });

    const result = await agent.ask('You are a helpful assistant.', 'How do I grow my business?');
    assert.ok(result.text);
    assert.ok(result.biological);
    assert.ok(typeof result.biological.confidence === 'number');
    assert.ok(typeof result.biological.soulViolations === 'number');
    assert.ok(typeof result.biological.guardFlags === 'number');
  });

  it('generate() returns text with biological metadata', async () => {
    const agent = aq.create({
      soul: { name: 'writer', purpose: 'Write content' },
      llm: async (sys, msg) => ({ text: 'Here is your blog post about growing a restaurant business.' })
    });

    const result = await agent.generate('Write a blog post.', 'Restaurant marketing tips');
    assert.ok(result.text);
    assert.ok(result.biological);
    assert.ok(typeof result.biological.confidence === 'number');
  });

  it('enforces soul rules on output', async () => {
    const agent = aq.create({
      soul: {
        name: 'strict',
        purpose: 'Testing enforcement',
        enforcement: [{ name: 'no_guarantee', pattern: 'guarantee', action: 'strip', severity: 'high' }]
      },
      llm: async () => ({ text: 'I guarantee this will work perfectly' })
    });

    const result = await agent.ask('system', 'question');
    assert.ok(!result.text.includes('guarantee'));
    assert.equal(result.biological.soulViolations, 1);
  });

  it('guards response for safety', async () => {
    const agent = aq.create({
      soul: { name: 'safe', purpose: 'Testing guard' },
      llm: async () => ({ text: 'Act now! Limited time only! Don\'t miss out!' })
    });

    const result = await agent.ask('system', 'question');
    assert.ok(result.biological.guardFlags > 0);
  });

  it('enables brain when brain: true', () => {
    const agent = aq.create({
      soul: { name: 'smart', purpose: 'Testing brain' },
      brain: true,
      llm: async () => ({ text: 'Response' })
    });

    const id = agent.remember({ content: 'Test memory', type: 'fact', subject: 'test' });
    assert.ok(id);

    const memories = agent.recall({ subject: 'test' });
    assert.equal(memories.length, 1);
  });

  it('throws when remembering without brain', () => {
    const agent = aq.create({
      soul: { name: 'no-brain', purpose: 'No brain test' },
      llm: async () => ({ text: 'Response' })
    });

    assert.throws(() => agent.remember({ content: 'Test', type: 'fact' }), /Brain not enabled/);
  });

  it('loads business nerve preset', async () => {
    const agent = aq.create({
      soul: { name: 'biz', purpose: 'Business agent' },
      nerve: 'business',
      llm: async () => ({ text: 'Let me help you with that.' })
    });

    // Ask with emergency input — nerve should detect it
    const result = await agent.ask('system', 'This is an emergency! Call 911!');
    assert.ok(result.biological.nerveSignals > 0);
  });

  it('accepts custom nerve signals', async () => {
    const agent = aq.create({
      soul: { name: 'custom', purpose: 'Custom nerve test' },
      nerve: [{ name: 'keyword', pattern: 'special_word', severity: 'high' }],
      llm: async () => ({ text: 'Response' })
    });

    const result = await agent.ask('system', 'This message contains special_word');
    assert.equal(result.biological.nerveSignals, 1);
  });
});

describe('aq — organ access', () => {
  it('soul.createSoul works', () => {
    const soul = aq.soul.createSoul({ name: 'test', purpose: 'Testing' });
    assert.equal(soul.name, 'test');
  });

  it('guardian.detectEmergency works', () => {
    const result = aq.guardian.detectEmergency('Call 911!');
    assert.equal(result.is_emergency, true);
  });

  it('brain.createBrain works', () => {
    const brain = aq.brain.createBrain();
    assert.ok(brain.remember);
  });

  it('nerve.scan works', () => {
    const result = aq.nerve.scan('urgent!', [{ name: 'test', pattern: 'urgent', severity: 'high' }]);
    assert.equal(result.signals.length, 1);
  });

  it('mirror.assess works', () => {
    const result = aq.mirror.assess('Q?', 'A clear answer to your question.');
    assert.ok(typeof result.confidence === 'number');
  });

  it('voice.detect works', () => {
    const traits = aq.voice.detect('Hey! Super excited!! lol');
    assert.ok(traits.emotional > 0.3);
  });

  it('router.createRouter works', () => {
    const r = aq.router.createRouter();
    assert.ok(r.route);
    assert.ok(r.getHealth);
  });

  it('sacredLaws.createLaws works', () => {
    const laws = aq.sacredLaws.createLaws();
    assert.equal(laws.count(), 0);
  });
});
