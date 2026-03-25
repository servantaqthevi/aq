// @aq/sacred-laws — Audit trail generation
'use strict';

/**
 * Generate an audit trail entry from a laws check result.
 * Store these however you want — database, file, external service.
 *
 * @param {Object} laws - Laws collection
 * @param {string} agentName - Which agent performed the action
 * @param {string} actionType - What action was performed
 * @param {Object} checkResult - Result from check()
 * @param {Object} [metadata] - Additional metadata (tenantId, userId, etc.)
 * @returns {Object} Audit trail entry
 *
 * @example
 * const result = check(laws, context);
 * const entry = audit(laws, 'my-agent', 'send_email', result, { tenantId: '123' });
 *
 * // Store it
 * await db.insert('audit_log', entry);
 * // or: fs.appendFileSync('audit.jsonl', JSON.stringify(entry) + '\n');
 */
function audit(laws, agentName, actionType, checkResult, metadata = {}) {
  return {
    timestamp: new Date().toISOString(),
    agent: agentName,
    action: actionType,
    status: checkResult.status,
    lawsChecked: checkResult.total,
    lawsPassed: checkResult.passed,
    violations: checkResult.violations.map(v => ({
      lawId: v.lawId,
      pillar: v.pillar,
      severity: v.severity,
      action: v.action,
      message: v.message
    })),
    ...metadata
  };
}

/**
 * Format an audit entry as a human-readable string.
 * Useful for logging.
 *
 * @param {Object} entry - Audit entry from audit()
 * @returns {string}
 */
function formatAudit(entry) {
  const icon = entry.status === 'RED' ? 'BLOCKED' : entry.status === 'YELLOW' ? 'WARNING' : 'PASSED';
  const lines = [`[${icon}] ${entry.agent}/${entry.action} — ${entry.lawsPassed}/${entry.lawsChecked} laws passed`];

  if (entry.violations.length) {
    for (const v of entry.violations) {
      lines.push(`  [${v.severity}/${v.action}] Law ${v.lawId} (${v.pillar}): ${v.message}`);
    }
  }

  return lines.join('\n');
}

module.exports = { audit, formatAudit };
