// aq-adapters — Tests
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createGovernance } = require('../src/generic');
const { createLangChainGovernance } = require('../src/langchain');
const { createVercelGovernance } = require('../src/vercel-ai');
const { createOpenAIGovernance } = require('../src/openai');

// ─── Generic Adapter ─────────────────────────────────

describe('aq-adapters/generic — createGovernance', () => {
  it('creates a governance instance', () => {
    const gov = createGovernance();
    assert.ok(gov.wrap);
    assert.ok(gov.scanInput);
    assert.ok(gov.guardOutput);
  });

  it('guardOutput catches overpromises', () => {
    const gov = createGovernance();
    const result = gov.guardOutput('I guarantee 100% results!');
    assert.ok(result.guard.flags.some(f => f.type === 'overpromise'));
    assert.ok(!result.text.includes('guarantee'));
  });

  it('guardOutput passes clean text', () => {
    const gov = createGovernance();
    const result = gov.guardOutput('Hello, how can I help you today?');
    assert.equal(result.guard.flags.length, 0);
  });

  it('scanInput detects emergencies', () => {
    const gov = createGovernance();
    const result = gov.scanInput('This is an emergency! Call 911!');
    assert.equal(result.emergency.is_emergency, true);
  });

  it('scanInput detects vulnerability', () => {
    const gov = createGovernance();
    const result = gov.scanInput("I'm losing everything, I can't cope");
    assert.equal(result.vulnerability.is_vulnerable, true);
  });

  it('scanInput detects nerve signals', () => {
    const gov = createGovernance({
      nerveSignals: [
        { name: 'complaint', pattern: '(?:angry|frustrated)', severity: 'medium' }
      ]
    });
    const result = gov.scanInput('I am so frustrated with this service');
    assert.equal(result.nerve.signals.length, 1);
  });

  it('wrap() governs LLM output', async () => {
    const gov = createGovernance();
    const result = await gov.wrap(
      async () => ({ text: 'I guarantee this will double your revenue! Act now!' }),
      { input: 'How do I grow?' }
    );
    assert.ok(!result.text.includes('guarantee'));
    assert.ok(result.governance.guard);
    assert.equal(result.safe, true); // no critical flags
  });

  it('wrap() bypasses on emergency', async () => {
    const gov = createGovernance();
    const result = await gov.wrap(
      async () => ({ text: 'Some response' }),
      { input: 'Call 911! This is an emergency!' }
    );
    assert.equal(result.bypassed, true);
    assert.equal(result.reason, 'emergency_detected');
  });

  it('fires onGuard callback', () => {
    let called = false;
    const gov = createGovernance({
      onGuard: () => { called = true; }
    });
    gov.guardOutput('I guarantee results!');
    assert.equal(called, true);
  });

  it('fires onEmergency callback', () => {
    let emergencyType = null;
    const gov = createGovernance({
      onEmergency: (e) => { emergencyType = e.type; }
    });
    gov.scanInput('Someone is having a heart attack');
    assert.equal(emergencyType, 'medical_emergency');
  });

  it('fires onVulnerability callback', () => {
    let careLevel = null;
    const gov = createGovernance({
      onVulnerability: (v) => { careLevel = v.care_level; }
    });
    gov.scanInput("I'm going out of business, losing everything");
    assert.ok(careLevel === 'maximum' || careLevel === 'elevated');
  });

  it('applies custom guard rules', () => {
    const gov = createGovernance({
      guardRules: [
        { name: 'no_internal', pattern: 'internal\\.com', severity: 'high', action: 'strip' }
      ]
    });
    const result = gov.guardOutput('Contact us at admin@internal.com');
    assert.ok(!result.text.includes('internal.com'));
  });
});

// ─── LangChain Adapter ──────────────────────────────

describe('aq-adapters/langchain — createLangChainGovernance', () => {
  it('creates a LangChain governance instance', () => {
    const gov = createLangChainGovernance();
    assert.ok(gov.processOutput);
    assert.ok(gov.governChain);
    assert.ok(gov.asRunnable);
  });

  it('processOutput handles string output', () => {
    const gov = createLangChainGovernance();
    const result = gov.processOutput('I guarantee results!');
    assert.ok(!result.text.includes('guarantee'));
  });

  it('processOutput handles AIMessage-like object', () => {
    const gov = createLangChainGovernance();
    const result = gov.processOutput({ content: 'I guarantee results!' });
    assert.ok(!result.text.includes('guarantee'));
  });

  it('processOutput handles { text } object', () => {
    const gov = createLangChainGovernance();
    const result = gov.processOutput({ text: 'I guarantee results!' });
    assert.ok(!result.text.includes('guarantee'));
  });

  it('processOutput handles { output } object', () => {
    const gov = createLangChainGovernance();
    const result = gov.processOutput({ output: 'Clean response here.' });
    assert.equal(result.text, 'Clean response here.');
  });

  it('governChain wraps chain invocation', async () => {
    const gov = createLangChainGovernance();
    const result = await gov.governChain(
      async () => ({ content: 'Act now! Limited time only!' }),
      { input: 'Question' }
    );
    assert.ok(result.governance.guard);
    assert.ok(result.safe !== undefined);
  });

  it('asRunnable returns a function', async () => {
    const gov = createLangChainGovernance();
    const transform = gov.asRunnable();
    const result = await transform('I guarantee results!');
    assert.ok(!result.includes('guarantee'));
  });
});

// ─── Vercel AI Adapter ──────────────────────────────

describe('aq-adapters/vercel-ai — createVercelGovernance', () => {
  it('creates a Vercel governance instance', () => {
    const gov = createVercelGovernance();
    assert.ok(gov.governText);
    assert.ok(gov.wrapGenerate);
    assert.ok(gov.createStreamTransform);
  });

  it('governText catches manipulation', () => {
    const gov = createVercelGovernance();
    const result = gov.governText('Act now! Limited time only!', { input: 'Question' });
    assert.ok(result.guard.flags.some(f => f.type === 'manipulation'));
  });

  it('wrapGenerate governs full call', async () => {
    const gov = createVercelGovernance();
    const result = await gov.wrapGenerate(
      async () => ({ text: 'I guarantee success!' }),
      { input: 'How to grow?' }
    );
    assert.ok(!result.text.includes('guarantee'));
    assert.ok(result.governance);
  });

  it('createStreamTransform returns a transform function', () => {
    const gov = createVercelGovernance();
    const transform = gov.createStreamTransform();
    const result = transform('I guarantee results!', 'Question');
    assert.ok(!result.includes('guarantee'));
  });
});

// ─── OpenAI Adapter ─────────────────────────────────

describe('aq-adapters/openai — createOpenAIGovernance', () => {
  it('creates an OpenAI governance instance', () => {
    const gov = createOpenAIGovernance();
    assert.ok(gov.governResponse);
    assert.ok(gov.wrapCompletion);
    assert.ok(gov.createToolGuard);
  });

  it('governResponse handles completion format', () => {
    const gov = createOpenAIGovernance();
    const completion = {
      choices: [{ message: { content: 'I guarantee results!' } }]
    };
    const result = gov.governResponse(completion, { input: 'Question' });
    assert.ok(!result.text.includes('guarantee'));
    assert.equal(result.original, 'I guarantee results!');
  });

  it('governResponse handles empty completion', () => {
    const gov = createOpenAIGovernance();
    const result = gov.governResponse({ choices: [] });
    assert.equal(result.text, '');
  });

  it('wrapCompletion governs full call', async () => {
    const gov = createOpenAIGovernance();
    const result = await gov.wrapCompletion(
      async () => ({ choices: [{ message: { content: 'Act now! Hurry!' } }], model: 'gpt-4o' }),
      { input: 'Question' }
    );
    assert.ok(result.governance);
  });

  it('createToolGuard blocks listed tools', () => {
    const gov = createOpenAIGovernance();
    const guard = gov.createToolGuard({
      blocked: ['delete_account', 'send_payment']
    });
    const result = guard.check('delete_account', {});
    assert.equal(result.permitted, false);
    assert.equal(result.action, 'block');
  });

  it('createToolGuard requires approval for listed tools', () => {
    const gov = createOpenAIGovernance();
    const guard = gov.createToolGuard({
      requireApproval: ['update_billing']
    });
    const result = guard.check('update_billing', { amount: 500 });
    assert.equal(result.permitted, false);
    assert.equal(result.action, 'require_approval');
  });

  it('createToolGuard allows unlisted tools', () => {
    const gov = createOpenAIGovernance();
    const guard = gov.createToolGuard({
      blocked: ['delete_account']
    });
    const result = guard.check('get_weather', { city: 'NYC' });
    assert.equal(result.permitted, true);
  });

  it('createToolGuard applies custom rules', () => {
    const gov = createOpenAIGovernance();
    const guard = gov.createToolGuard({
      rules: {
        send_payment: (args) => {
          if (args.amount > 1000) return { permitted: false, reason: 'Amount exceeds limit', action: 'block' };
          return { permitted: true };
        }
      }
    });
    assert.equal(guard.check('send_payment', { amount: 500 }).permitted, true);
    assert.equal(guard.check('send_payment', { amount: 5000 }).permitted, false);
  });

  it('createToolGuard fires onBlocked callback', () => {
    let blockedTool = null;
    const gov = createOpenAIGovernance();
    const guard = gov.createToolGuard({
      blocked: ['danger'],
      onBlocked: (name) => { blockedTool = name; }
    });
    guard.check('danger', {});
    assert.equal(blockedTool, 'danger');
  });
});
