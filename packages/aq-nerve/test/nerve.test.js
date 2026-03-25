// @aq/nerve — Tests
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { scan, buildContext } = require('../src/scan');

describe('@aq/nerve — scan', () => {
  const signals = [
    { name: 'emergency', pattern: '(?:emergency|urgent|911)', severity: 'critical', reflex: 'escalate_human' },
    { name: 'complaint', pattern: '(?:angry|frustrated|terrible)', severity: 'medium', reflex: 'flag_review' },
    { name: 'opportunity', pattern: '(?:recommend|refer|upgrade)', severity: 'low', reflex: 'flag_opportunity' }
  ];

  it('detects matching signals', () => {
    const result = scan('This is an emergency!', signals);
    assert.equal(result.signals.length, 1);
    assert.equal(result.signals[0].type, 'emergency');
    assert.equal(result.signals[0].severity, 'critical');
  });

  it('detects multiple signals', () => {
    const result = scan('I am angry about this emergency!', signals);
    assert.equal(result.signals.length, 2);
  });

  it('triggers reflexes', () => {
    const result = scan('This is urgent!', signals);
    assert.equal(result.reflexes.length, 1);
    assert.equal(result.reflexes[0].action, 'escalate_human');
  });

  it('sets shouldBypassBrain for critical signals', () => {
    const result = scan('Call 911 now!', signals);
    assert.equal(result.shouldBypassBrain, true);
  });

  it('does not bypass brain for non-critical signals', () => {
    const result = scan('I am frustrated with the service', signals);
    assert.equal(result.shouldBypassBrain, false);
  });

  it('returns empty for no matches', () => {
    const result = scan('Hello, I would like to book an appointment', signals);
    assert.equal(result.signals.length, 0);
    assert.equal(result.reflexes.length, 0);
  });

  it('handles empty input', () => {
    const result = scan('', signals);
    assert.equal(result.signals.length, 0);
  });

  it('handles null input', () => {
    const result = scan(null, signals);
    assert.equal(result.signals.length, 0);
  });

  it('handles empty signals array', () => {
    const result = scan('Emergency!', []);
    assert.equal(result.signals.length, 0);
  });

  it('skips signals without patterns', () => {
    const result = scan('Hello', [{ name: 'no-pattern' }]);
    assert.equal(result.signals.length, 0);
  });

  it('skips invalid regex patterns', () => {
    const result = scan('Hello', [{ name: 'bad', pattern: '[invalid' }]);
    assert.equal(result.signals.length, 0);
  });

  it('fires onSignal callback', () => {
    const detected = [];
    scan('This is urgent!', signals, { onSignal: (s) => detected.push(s) });
    assert.equal(detected.length, 1);
    assert.equal(detected[0].type, 'emergency');
  });

  it('captures trigger text', () => {
    const result = scan('I want to recommend your service', signals);
    assert.ok(result.signals[0].trigger.includes('recommend'));
  });
});

describe('@aq/nerve — buildContext', () => {
  it('builds context from scan results', () => {
    const scanResult = {
      signals: [
        { type: 'emergency', severity: 'critical', trigger: 'urgent' },
        { type: 'complaint', severity: 'medium', trigger: 'frustrated' }
      ]
    };
    const ctx = buildContext(scanResult);
    assert.ok(ctx.includes('NERVE ALERTS'));
    assert.ok(ctx.includes('[CRITICAL]'));
    assert.ok(ctx.includes('[MEDIUM]'));
  });

  it('returns empty for no signals', () => {
    assert.equal(buildContext({ signals: [] }), '');
    assert.equal(buildContext(null), '');
    assert.equal(buildContext(undefined), '');
  });
});
