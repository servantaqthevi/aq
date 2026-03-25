// @aq/guardian — Action audit (Muhasabah) and robotic score
'use strict';

const { guardResponse } = require('./guard');

/**
 * Calculate how "robotic" a response sounds (0 = human, 1 = robot).
 *
 * @param {string} text - Response text to analyze
 * @returns {number} Score between 0 (human-like) and 1 (robotic)
 */
function calculateRoboticScore(text) {
  let score = 0;
  let checks = 0;

  const aiPhrases = ['certainly', 'absolutely', 'I\'d be happy to', 'I understand your concern',
    'I appreciate your patience', 'rest assured', 'please don\'t hesitate'];
  for (const phrase of aiPhrases) {
    checks++;
    if (text.toLowerCase().includes(phrase)) score++;
  }

  checks++;
  if (/\b(?:furthermore|moreover|additionally|henceforth)\b/i.test(text)) score++;

  checks++;
  if (/^(?:Thank you for|I understand|I appreciate)/.test(text)) score += 0.5;

  checks++;
  const words = text.split(/\s+/).length;
  const contractions = (text.match(/\w+'\w+/g) || []).length;
  if (words > 20 && contractions === 0) score += 0.5;

  return checks > 0 ? score / checks : 0;
}

/**
 * Audit a single agent action against ethical standards.
 * Returns compliance level: green, yellow, red.
 *
 * @param {string} agentName - Name of the agent
 * @param {string} actionType - Type of action performed
 * @param {Object} actionData - Context about the action
 * @param {Object} result - The result of the action
 * @returns {Object} { compliance, violations, red_count, yellow_count }
 */
function auditAction(agentName, actionType, actionData, result) {
  const violations = [];

  // Did this action risk harming the client?
  if (result.error && !result.fallback) {
    violations.push({ law: 'safety', description: 'Action failed without fallback — potential client impact', severity: 'yellow' });
  }

  // Was the response truthful?
  if (result.response) {
    const guard = guardResponse(result.response, actionData);
    if (guard.flags.some(f => f.type === 'potential_hallucination')) {
      violations.push({ law: 'truth', description: 'Potential hallucination in response', severity: 'red' });
    }
    if (guard.flags.some(f => f.type === 'overpromise')) {
      violations.push({ law: 'truth', description: 'Overpromise detected', severity: 'yellow' });
    }
  }

  // Was this person treated with equal dignity?
  if (actionData.response_time_ms && actionData.response_time_ms > 10000) {
    violations.push({ law: 'dignity', description: `Slow response: ${actionData.response_time_ms}ms — every person deserves prompt service`, severity: 'yellow' });
  }

  // Was vulnerability detected and addressed?
  if (actionData.vulnerability_detected && !actionData.extra_care_applied) {
    violations.push({ law: 'protection', description: 'Vulnerable person detected but extra care not applied', severity: 'red' });
  }

  // Did agent communicate like a human on their best day?
  if (result.response && result.response.length > 0) {
    const roboticScore = calculateRoboticScore(result.response);
    if (roboticScore > 0.6) {
      violations.push({ law: 'excellence', description: `Response feels robotic (score: ${roboticScore.toFixed(2)})`, severity: 'yellow' });
    }
  }

  // Was this interaction excellent?
  if (actionData.client_satisfaction === 'negative') {
    violations.push({ law: 'excellence', description: 'Client expressed dissatisfaction', severity: 'red' });
  }

  const redViolations = violations.filter(v => v.severity === 'red');
  const yellowViolations = violations.filter(v => v.severity === 'yellow');

  let compliance = 'green';
  if (redViolations.length > 0) compliance = 'red';
  else if (yellowViolations.length > 0) compliance = 'yellow';

  return { compliance, violations, red_count: redViolations.length, yellow_count: yellowViolations.length };
}

module.exports = { auditAction, calculateRoboticScore };
