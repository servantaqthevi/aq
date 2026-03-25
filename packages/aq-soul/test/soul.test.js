// @aq/soul — Tests
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createSoul, loadSoul, validateSoul } = require('../src/soul');
const { buildContext } = require('../src/context');
const { enforce, check } = require('../src/enforce');

describe('@aq/soul — createSoul', () => {
  it('creates a valid soul with required fields', () => {
    const soul = createSoul({ name: 'test', purpose: 'Testing' });
    assert.equal(soul.name, 'test');
    assert.equal(soul.purpose, 'Testing');
    assert.equal(soul.version, 1);
    assert.ok(soul.createdAt);
  });

  it('includes values, refusals, commitments, personality', () => {
    const soul = createSoul({
      name: 'full',
      purpose: 'Full test',
      values: ['honesty', 'excellence'],
      refusals: ['Never lie'],
      commitments: [{ name: 'truth', description: 'Always tell truth' }],
      personality: { warmth: 0.9, formality: 0.2, directness: 0.8, humor: 0.5 }
    });
    assert.deepEqual(soul.values, ['honesty', 'excellence']);
    assert.deepEqual(soul.refusals, ['Never lie']);
    assert.equal(soul.commitments[0].name, 'truth');
    assert.equal(soul.personality.warmth, 0.9);
  });

  it('clamps personality values to 0-1', () => {
    const soul = createSoul({
      name: 'clamp', purpose: 'Test clamping',
      personality: { warmth: 5.0, formality: -2.0 }
    });
    assert.equal(soul.personality.warmth, 1);
    assert.equal(soul.personality.formality, 0);
  });

  it('throws on missing required fields', () => {
    assert.throws(() => createSoul({}), /Missing required field: name/);
    assert.throws(() => createSoul({ name: 'x' }), /Missing required field: purpose/);
  });

  it('throws on invalid enforcement rules', () => {
    assert.throws(() => createSoul({
      name: 'x', purpose: 'x',
      enforcement: [{ action: 'explode' }]
    }), /missing pattern/);
  });

  it('validates enforcement regex', () => {
    assert.throws(() => createSoul({
      name: 'x', purpose: 'x',
      enforcement: [{ pattern: '[invalid', action: 'strip' }]
    }), /invalid regex/);
  });
});

describe('@aq/soul — validateSoul', () => {
  it('returns empty array for valid soul', () => {
    const errors = validateSoul({ name: 'test', purpose: 'test' });
    assert.equal(errors.length, 0);
  });

  it('returns errors for non-object', () => {
    const errors = validateSoul(null);
    assert.ok(errors.length > 0);
  });

  it('catches invalid values type', () => {
    const errors = validateSoul({ name: 'x', purpose: 'x', values: 'not array' });
    assert.ok(errors.some(e => e.includes('values must be an array')));
  });
});

describe('@aq/soul — loadSoul', () => {
  it('loads from plain object', () => {
    const soul = loadSoul({ name: 'loaded', purpose: 'From object' });
    assert.equal(soul.name, 'loaded');
  });

  it('unwraps { soul: {...} } wrapper', () => {
    const soul = loadSoul({ soul: { name: 'wrapped', purpose: 'Unwrap test' } });
    assert.equal(soul.name, 'wrapped');
  });

  it('maps base-soul.json format', () => {
    const soul = loadSoul({
      name: 'mapped',
      purpose: 'Map test',
      agent_values: ['honesty'],
      sacred_commitments: [{ name: 'truth', description: 'Always' }],
      enforcement_rules: [{ name: 'no_lies', pattern: 'guaranteed', action: 'strip' }]
    });
    assert.deepEqual(soul.values, ['honesty']);
    assert.equal(soul.commitments[0].name, 'truth');
    assert.equal(soul.enforcement[0].name, 'no_lies');
  });
});

describe('@aq/soul — buildContext', () => {
  const soul = createSoul({
    name: 'ctx-test',
    purpose: 'Context building test',
    values: ['honesty', 'courage'],
    refusals: ['Never fabricate'],
    personality: { warmth: 0.9, directness: 0.8 }
  });

  it('builds full context with all sections', () => {
    const ctx = buildContext(soul);
    assert.ok(ctx.includes('SOUL: ctx-test'));
    assert.ok(ctx.includes('PURPOSE:'));
    assert.ok(ctx.includes('honesty'));
    assert.ok(ctx.includes('NEVER: Never fabricate'));
    assert.ok(ctx.includes('warm and caring'));
    assert.ok(ctx.includes('direct and honest'));
  });

  it('builds compact context', () => {
    const ctx = buildContext(soul, { compact: true });
    assert.ok(ctx.includes('[SOUL:ctx-test]'));
    assert.ok(ctx.includes('Values:'));
    assert.ok(ctx.includes('[/SOUL]'));
  });

  it('returns empty string for null soul', () => {
    assert.equal(buildContext(null), '');
  });
});

describe('@aq/soul — enforce', () => {
  const soul = createSoul({
    name: 'enforce-test',
    purpose: 'Enforcement test',
    enforcement: [
      { name: 'no_guarantee', pattern: 'guarantee|guaranteed', action: 'strip', severity: 'high' },
      { name: 'no_profanity', pattern: 'damn|hell', action: 'block', severity: 'critical' }
    ]
  });

  it('strips matching patterns', () => {
    const result = enforce(soul, 'I guarantee this will work');
    assert.ok(!result.response.includes('guarantee'));
    assert.equal(result.violations.length, 1);
    assert.equal(result.violations[0].rule, 'no_guarantee');
  });

  it('blocks on block rules', () => {
    const result = enforce(soul, 'What the hell is going on');
    assert.equal(result.blocked, true);
  });

  it('returns empty string in strict mode on block', () => {
    const result = enforce(soul, 'What the hell', { strict: true });
    assert.equal(result.response, '');
    assert.equal(result.blocked, true);
  });

  it('fires onViolation callback', () => {
    const violations = [];
    enforce(soul, 'I guarantee it', { onViolation: (v) => violations.push(v) });
    assert.equal(violations.length, 1);
  });

  it('returns clean result for clean text', () => {
    const result = enforce(soul, 'This is a perfectly fine response');
    assert.equal(result.violations.length, 0);
    assert.equal(result.blocked, false);
  });

  it('handles null inputs gracefully', () => {
    const result = enforce(null, 'text');
    assert.equal(result.violations.length, 0);
    const result2 = enforce(soul, null);
    assert.equal(result2.response, '');
  });
});

describe('@aq/soul — check', () => {
  const soul = createSoul({
    name: 'check-test', purpose: 'Check test',
    enforcement: [{ name: 'no_spam', pattern: 'buy now', action: 'flag', severity: 'low' }]
  });

  it('returns clean:true for clean text', () => {
    const result = check(soul, 'Hello there');
    assert.equal(result.clean, true);
  });

  it('returns clean:false for flagged text', () => {
    const result = check(soul, 'You should buy now');
    assert.equal(result.clean, false);
  });
});
