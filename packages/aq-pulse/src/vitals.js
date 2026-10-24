// @aq/pulse — vitals: what "healthy" means, measured not claimed
'use strict';

/**
 * Record one set of live vitals and judge them against thresholds.
 *
 * @param {string} agentId
 * @param {Object} live - raw vitals from onBeat(): { latencyMs, errorRate, confidence, ... }
 * @param {Object} [thresholds] - per-metric: { latencyMs: { warn: 2000, critical: 5000 } }
 * @returns {{ status: 'healthy'|'degraded'|'critical'|'unknown', score: number, alerts: string[] }}
 */
function recordVitals(agentId, live = {}, thresholds = {}) {
  const alerts = [];
  let score = 1;

  if (live.vitalsError) {
    return { status: 'unknown', score: 0, alerts: [`vitals collection failed: ${live.vitalsError}`] };
  }

  const metrics = ['latencyMs', 'errorRate', 'confidence'];

  for (const metric of metrics) {
    if (live[metric] === undefined || live[metric] === null) continue;
    const value = Number(live[metric]);
    if (!Number.isFinite(value)) continue;
    const t = thresholds[metric] || DEFAULT_THRESHOLDS[metric];
    if (!t) continue;

    if (value >= t.critical) {
      alerts.push(`${metric}=${value} is critical (>= ${t.critical})`);
      score -= 0.4;
    } else if (value >= t.warn) {
      alerts.push(`${metric}=${value} is degraded (>= ${t.warn})`);
      score -= 0.15;
    }
  }

  // Confidence is inverted: low confidence is the problem, not high.
  if (live.confidence !== undefined && Number.isFinite(Number(live.confidence))) {
    const t = thresholds.confidence || DEFAULT_THRESHOLDS.confidence;
    const c = Number(live.confidence);
    if (c <= t.criticalLow) {
      alerts.push(`confidence=${c} is critically low (<= ${t.criticalLow})`);
      score -= 0.4;
    } else if (c <= t.warnLow) {
      alerts.push(`confidence=${c} is low (<= ${t.warnLow})`);
      score -= 0.15;
    }
  }

  score = Math.max(0, score);
  const status = alerts.length === 0 ? 'healthy' : score >= 0.6 ? 'degraded' : 'critical';
  return { status, score: Math.round(score * 100) / 100, alerts };
}

const DEFAULT_THRESHOLDS = {
  latencyMs: { warn: 2000, critical: 5000 },
  errorRate: { warn: 0.05, critical: 0.2 },
  confidence: { warnLow: 0.5, criticalLow: 0.3 }
};

module.exports = { recordVitals, DEFAULT_THRESHOLDS };
