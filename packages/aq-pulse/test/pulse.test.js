// @aq/pulse — Tests
// Bismillah
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { startPulse } = require('../src/index');
const { recordVitals } = require('../src/vitals');

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

describe('@aq/pulse — vitals', () => {
  it('healthy vitals produce healthy status', () => {
    const v = recordVitals('a', { latencyMs: 300, errorRate: 0.01, confidence: 0.9 });
    assert.equal(v.status, 'healthy');
    assert.equal(v.score, 1);
    assert.equal(v.alerts.length, 0);
  });

  it('high latency degrades then goes critical', () => {
    const degraded = recordVitals('a', { latencyMs: 2500 });
    assert.equal(degraded.status, 'degraded');
    const critical = recordVitals('a', { latencyMs: 6000 });
    assert.equal(critical.status, 'critical');
  });

  it('low confidence is judged low, not high', () => {
    const v = recordVitals('a', { confidence: 0.2 });
    assert.equal(v.status, 'critical');
    assert.ok(v.alerts[0].startsWith('confidence'));
  });

  it('vitals collection failure yields unknown, never healthy-by-default', () => {
    const v = recordVitals('a', { vitalsError: 'sensor down' });
    assert.equal(v.status, 'unknown');
  });
});

describe('@aq/pulse — heartbeat', () => {
  it('first beat happens immediately on start', async () => {
    const pulse = startPulse({ agentId: 't1', intervalMs: 60_000 });
    await pulse.start();
    assert.equal(pulse.beats, 1);
    pulse.stop();
  });

  it('beats accrue over time and streak counts healthy runs', async () => {
    const pulse = startPulse({
      agentId: 't2',
      intervalMs: 1000,
      vitals: { async onBeat() { return { latencyMs: 100 }; } }
    });
    await pulse.start();
    await sleep(2300);
    pulse.stop();
    assert.ok(pulse.beats >= 3, `expected >= 3 beats, got ${pulse.beats}`);
    assert.ok(pulse.streak >= 3, `expected streak >= 3, got ${pulse.streak}`);
  });

  it('a bad beat breaks the streak and is recorded', async () => {
    let latency = 100;
    const pulse = startPulse({
      agentId: 't3',
      intervalMs: 1000,
      vitals: { async onBeat() { return { latencyMs: latency }; } }
    });
    await pulse.start();
    latency = 6000;
    await pulse.beat();
    assert.equal(pulse.streak, 0);
    const beats = pulse.history().filter((e) => e.type === 'beat');
    assert.ok(beats.some((e) => e.health === 'critical'));
    pulse.stop();
  });

  it('rejected intervalMs below 1s (protection from accidental hammering)', () => {
    assert.throws(() => startPulse({ agentId: 't4', intervalMs: 500 }), /intervalMs/);
  });

  it('onBeat callback failure never stops the heart', async () => {
    let beats = 0;
    const pulse = startPulse({
      agentId: 't5',
      intervalMs: 60_000,
      onBeat: () => { beats++; throw new Error('user callback bug'); }
    });
    await pulse.start();
    assert.equal(beats, 1); // callback threw, beat still completed
    await pulse.beat();
    assert.equal(beats, 2);
    pulse.stop();
  });
});

describe('@aq/pulse — trials (proof, not claims)', () => {
  it('a passing trial counts as proven; rating reflects evidence', async () => {
    const pulse = startPulse({
      agentId: 'p1',
      intervalMs: 60_000,
      trials: [{ name: 'grounded_answers', async run() { return { passed: true, evidence: 'src-1' }; } }]
    });
    await pulse.start();
    const r = pulse.rating();
    assert.equal(r.proven, 1);
    assert.equal(r.unproven, 0);
    assert.ok(r.score > 0);
    pulse.stop();
  });

  it('a failing trial is never proven, even after retries', async () => {
    let attempts = 0;
    const pulse = startPulse({
      agentId: 'p2',
      intervalMs: 60_000,
      trials: [{
        name: 'failing',
        async run() { attempts++; return { passed: false }; }
      }]
    });
    await pulse.start();
    await pulse.beat();
    const r = pulse.rating();
    assert.equal(r.proven, 0);
    assert.equal(r.failed, 1);
    assert.ok(attempts >= 2);
    assert.ok(r.score < 1);
    pulse.stop();
  });

  it('cadence: a trial with everyBeats runs only when due', async () => {
    let runs = 0;
    const pulse = startPulse({
      agentId: 'p3',
      intervalMs: 60_000,
      trials: [{ name: 'slow', cadence: { everyBeats: 3 }, async run() { runs++; return { passed: true }; } }]
    });
    await pulse.start();        // beat 1 — trial due (first time)
    await pulse.beat();         // beat 2 — not due
    await pulse.beat();         // beat 3 — not due
    await pulse.beat();         // beat 4 — due again
    assert.equal(runs, 2);
    pulse.stop();
  });

  it('a throwing trial is recorded as failed, not swallowed', async () => {
    const pulse = startPulse({
      agentId: 'p4',
      intervalMs: 60_000,
      trials: [{ name: 'throws', async run() { throw new Error('checker crashed'); } }]
    });
    await pulse.start();
    const r = pulse.rating();
    assert.equal(r.failed, 1);
    assert.equal(r.proven, 0);
    const entry = pulse.history().find((e) => e.type === 'trial' && e.name === 'throws');
    assert.ok(entry.error.includes('checker crashed'));
    pulse.stop();
  });
});

describe('@aq/pulse — tamper-evident ledger', () => {
  it('ledger verifies clean', async () => {
    const pulse = startPulse({ agentId: 'l1', intervalMs: 60_000 });
    await pulse.start();
    const check = pulse.verifyIntegrity();
    assert.equal(check.valid, true);
    pulse.stop();
  });

  it('mutating history breaks the chain and is detected', async () => {
    const pulse = startPulse({
      agentId: 'l2',
      intervalMs: 60_000,
      trials: [{ name: 'x', async run() { return { passed: true }; } }]
    });
    await pulse.start();
    // reach in and lie to the ledger
    const entry = pulse.history().find((e) => e.type === 'trial');
    entry.passed = false;
    const check = pulse.verifyIntegrity();
    assert.equal(check.valid, false);
    pulse.stop();
  });
});
