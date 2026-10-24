// @aq/pulse — The heartbeat organ. A living AI agent continuously proves itself.
// Claims never count. Only verified trials do.
// Bismillah
'use strict';

const crypto = require('node:crypto');
const { recordVitals } = require('./vitals');

module.exports = { startPulse, version: '0.1.0' };

/**
 * Give your AI agent a heartbeat.
 *
 * Every beat the agent takes its vitals and seals them into a hash-chained
 * ledger. Every capability is a TRIAL that must pass its checker to count as
 * proven — the rating is computed from evidence alone, never from claims.
 *
 * @example
 * const { startPulse } = require('@aqthevisionnow/pulse');
 * const pulse = startPulse({
 *   agentId: 'agent-bilal-01',
 *   intervalMs: 30_000,
 *   vitals: { async onBeat() { return { latencyMs: 340, errorRate: 0.01 }; } },
 *   trials: [{
 *     name: 'answers_are_grounded',
 *     cadence: { everyBeats: 10 },
 *     async run() {
 *       const answer = await agent.answer(pickQuestion());
 *       return { passed: await brain.verifySources(answer), evidence: answer.id };
 *     }
 *   }],
 *   onBeat: (b) => console.log(b.beat, b.health, b.streak)
 * });
 * pulse.rating();
 */
function startPulse(config = {}) {
  const {
    agentId = 'anonymous-agent',
    intervalMs = 60_000,
    vitals = null,
    trials = [],
    onBeat = null,
    persistence = null
  } = config;

  validateConfig({ agentId, intervalMs, trials });

  const state = {
    agentId,
    beats: 0,
    streak: 0,
    ledger: [],
    trialState: new Map(),
    lastHealth: { status: 'unknown', score: 0 }
  };

  let timer = null;
  let beating = false;
  let stopped = false;

  function append(entry) {
    const previousHash = state.ledger.length
      ? state.ledger[state.ledger.length - 1].hash
      : null;
    const sealed = { ...entry, seq: state.ledger.length, previousHash };
    sealed.hash = crypto.createHash('sha256').update(JSON.stringify(sealed)).digest('hex');
    state.ledger.push(sealed);
    if (persistence && typeof persistence.append === 'function') {
      try { persistence.append(sealed); } catch { /* memory stays authoritative */ }
    }
  }

  async function collectVitals() {
    if (!vitals || typeof vitals.onBeat !== 'function') return {};
    try {
      return (await vitals.onBeat()) || {};
    } catch (err) {
      return { vitalsError: String((err && err.message) || err) };
    }
  }

  function trialDue(trial) {
    const info = state.trialState.get(trial.name);
    if (!info) return true;
    return state.beats >= info.nextDueBeat;
  }

  async function runTrial(trial) {
    if (!state.trialState.has(trial.name)) {
      state.trialState.set(trial.name, { lastRunBeat: null, lastResult: null, nextDueBeat: 0 });
    }
    const entry = { type: 'trial', name: trial.name, beat: state.beats, at: new Date().toISOString() };
    let result;
    try {
      result = await trial.run();
    } catch (err) {
      entry.failed = true;
      entry.error = String((err && err.message) || err);
      append(entry);
      return { ...entry, passed: false, proven: false };
    }
    entry.passed = Boolean(result && result.passed);
    entry.proven = entry.passed; // a passed trial is proof; a claim never is
    if (result && result.evidence !== undefined) entry.evidence = result.evidence;
    append(entry);
    return entry;
  }

  function buildSummary() {
    return {
      beat: state.beats,
      at: new Date().toISOString(),
      health: state.lastHealth.status,
      healthScore: state.lastHealth.score,
      healthy: state.lastHealth.status === 'healthy',
      trials: trials.map((t) => {
        const info = state.trialState.get(t.name);
        return {
          name: t.name,
          proven: Boolean(info && info.lastResult && info.lastResult.proven),
          lastRunBeat: info ? info.lastRunBeat : null
        };
      }),
      provenCount: state.ledger.filter((e) => e.type === 'trial' && e.proven).length,
      streak: state.streak
    };
  }

  async function beat() {
    if (beating || stopped) return;
    beating = true;
    try {
      state.beats++;
      const live = await collectVitals();
      const health = recordVitals(state.agentId, live, (vitals && vitals.thresholds) || {});
      state.lastHealth = health;

      const trialResults = [];
      for (const trial of trials) {
        if (!trialDue(trial)) continue;
        const result = await runTrial(trial);
        trialResults.push(result);
        const info = state.trialState.get(trial.name);
        info.lastRunBeat = state.beats;
        info.lastResult = result;
        const every = (trial.cadence && trial.cadence.everyBeats) || 1;
        info.nextDueBeat = state.beats + every;
      }

      append({
        type: 'beat',
        beat: state.beats,
        at: new Date().toISOString(),
        vitals: live,
        health: health.status,
        healthScore: health.score,
        trialsRun: trialResults.length,
        trialsPassed: trialResults.filter((r) => r.passed).length
      });

      if (health.status === 'healthy') state.streak++;
      else state.streak = 0;

      if (typeof onBeat === 'function') {
        try { onBeat(buildSummary()); } catch { /* user callbacks never stop the heart */ }
      }
    } finally {
      beating = false;
    }
  }

  function rating() {
    const trialEntries = state.ledger.filter((e) => e.type === 'trial');
    const proven = trialEntries.filter((e) => e.proven);
    const failed = trialEntries.filter((e) => e.failed || e.passed === false);
    const total = trialEntries.length;
    const passRate = total ? proven.length / total : 0;
    const streakBonus = Math.min(state.streak * 0.01, 0.1);
    const score = Math.min(1, Math.round((passRate + streakBonus) * 100) / 100);
    const grade =
      score >= 0.95 ? 'A+' :
      score >= 0.90 ? 'A' :
      score >= 0.80 ? 'B' :
      score >= 0.70 ? 'C' :
      score >= 0.60 ? 'D' : 'F';
    return {
      agentId: state.agentId,
      score,
      grade,
      proven: proven.length,
      failed: failed.length,
      unproven: trials.length - proven.length,
      passRate: Math.round(passRate * 100) / 100,
      streak: state.streak,
      evidence: state.ledger.length,
      claim: 'Computed from verified trials only. Unproven claims do not count.'
    };
  }

  function history() {
    return state.ledger.slice();
  }

  function verifyIntegrity() {
    let expectedPrevious = null;
    for (const entry of state.ledger) {
      if (entry.previousHash !== expectedPrevious) {
        return { valid: false, brokenAt: entry.seq };
      }
      expectedPrevious = entry.hash;
    }
    return { valid: true, length: state.ledger.length };
  }

  async function start() {
    if (stopped) throw new Error('Pulse already stopped. Create a new one.');
    if (timer) return;
    await beat(); // first beat immediately — the heart does not wait
    timer = setInterval(() => { beat(); }, intervalMs);
    if (typeof timer.unref === 'function') timer.unref();
  }

  function stop() {
    stopped = true;
    if (timer) clearInterval(timer);
    timer = null;
  }

  return {
    start,
    stop,
    beat: async () => { await beat(); return buildSummary(); },
    rating,
    history,
    verifyIntegrity,
    get beats() { return state.beats; },
    get streak() { return state.streak; },
    get running() { return Boolean(timer); }
  };
}

function validateConfig(cfg) {
  if (typeof cfg.agentId !== 'string' || cfg.agentId.trim().length === 0) {
    throw new Error('agentId must be a non-empty string');
  }
  if (!Number.isFinite(cfg.intervalMs) || cfg.intervalMs < 1000) {
    throw new Error('intervalMs must be a number >= 1000');
  }
  if (!Array.isArray(cfg.trials)) throw new Error('trials must be an array');
  for (const t of cfg.trials) validateTrialSpec(t);
}

function validateTrialSpec(t) {
  if (!t || typeof t !== 'object') throw new Error('each trial must be an object');
  if (typeof t.name !== 'string' || t.name.trim().length === 0) {
    throw new Error('trial.name must be a non-empty string');
  }
  if (typeof t.run !== 'function') throw new Error('trial.run must be a function');
}
