// @aq/sacred-laws — Pre-built law sets for common domains
'use strict';

const { createLaws } = require('./laws');

const OVERPROMISE = /\b(guarantee|100\s*%\s*(certain|sure|guaranteed)|promise\s+you|absolutely\s+will|never\s+fail)/i;
const FALSE_URGENCY = /\b(limited\s+time|act\s+now|last\s+chance|only\s+\d+\s+left|hurry|don'?t\s+miss\s+out|expir(es?|ing)\s+soon|offer\s+ends)/i;
const FAKE_SCARCITY = /\b(selling\s+fast|almost\s+gone|few\s+left|running\s+out|before\s+it'?s\s+too\s+late)/i;
const COMPETITOR_SLANDER = /\b(competitor(s?)\s+(is|are)\s+(terrible|awful|scam|trash|garbage|worst)|never\s+use\s+\w+\s+because)/i;
const EXAGGERATION = /\b(best\s+in\s+the\s+world|no\s+one\s+else\s+can|literally\s+impossible|guaranteed\s+results|miracle|revolutionary\s+breakthrough)/i;
const HIDDEN_FEES = /\b(processing\s+fee|convenience\s+fee|service\s+charge|additional\s+cost|plus\s+tax|not\s+included|extra\s+charge)/i;
const GUILT_TRIP = /\b(you'?ll\s+regret|don'?t\s+let\s+.*\s+down|you\s+owe\s+it|everyone\s+else\s+is|you'?re\s+missing\s+out)/i;
const DEPENDENCY = /\b(you\s+need\s+us|you\s+can'?t\s+do\s+this\s+alone|without\s+us|where\s+would\s+you\s+be\s+without)/i;
const MEDICAL = /\b(you\s+(have|might\s+have|probably\s+have)|diagnos|prescrib|treatment\s+plan|take\s+\d+\s*mg)/i;
const FINANCIAL = /\b(guaranteed\s+returns?|risk-?\s*free\s+invest|you\s+will\s+make\s+\$|double\s+your\s+money)/i;

const presets = {

  /**
   * The full AQTheVision 49-law system. The standard.
   */
  aqBase() {
    return createLaws([
      // AMANAH (Trust) — Laws 1-4
      { id: 1, pillar: 'AMANAH', description: 'Never betray trust for profit', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.profitOverSafety || ctx.betraysTrust ? 'Action prioritizes profit over trust' : null },
      { id: 2, pillar: 'AMANAH', description: 'Never sell, share, or exploit client data', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.dataSharing || ctx.exploitsData ? 'Client data exploitation detected' : null },
      { id: 3, pillar: 'AMANAH', description: 'Every action logged and traceable', severity: 'high', action: 'flag',
        detect: (ctx) => ctx.bypassesLogging ? 'Action bypasses audit logging' : null },
      { id: 4, pillar: 'AMANAH', description: 'Admit mistakes before clients find them', severity: 'high', action: 'flag',
        detect: (ctx) => ctx.concealsError ? 'Error concealment detected' : null },

      // IHSAN (Excellence) — Laws 5-9
      { id: 5, pillar: 'IHSAN', description: 'If it feels like AI, it is not ready', severity: 'medium', action: 'log',
        detect: (ctx) => ctx.genericResponse ? 'Response feels generic — needs human warmth' : null },
      { id: 6, pillar: 'IHSAN', description: 'Every lead is someone\'s livelihood', severity: 'high', action: 'flag',
        detect: (ctx) => ctx.dismissesMissedLead ? 'Missed lead dismissed' : null },
      { id: 7, pillar: 'IHSAN', description: 'Never ship what we wouldn\'t use ourselves', severity: 'high', action: 'flag',
        detect: (ctx) => ctx.untested ? 'Output has not been verified' : null },
      { id: 8, pillar: 'IHSAN', description: 'Continuous improvement is obligatory', severity: 'medium', action: 'log',
        detect: (ctx) => ctx.containsPHI ? 'May expose protected information' : null },
      { id: 9, pillar: 'IHSAN', description: 'Responses must carry warmth', severity: 'medium', action: 'flag',
        detect: (ctx) => ctx.lacksEmpathy ? 'Response lacks warmth' : null },

      // SIDQ (Truth) — Laws 10-15
      { id: 10, pillar: 'SIDQ', description: 'Every claim must be verifiable', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.responseText && EXAGGERATION.test(ctx.responseText) ? `Exaggeration: "${ctx.responseText.match(EXAGGERATION)?.[0]}"` : null },
      { id: 11, pillar: 'SIDQ', description: 'Never overpromise', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.responseText && OVERPROMISE.test(ctx.responseText) ? `Overpromise: "${ctx.responseText.match(OVERPROMISE)?.[0]}"` : null },
      { id: 12, pillar: 'SIDQ', description: 'Never manipulate with false urgency or scarcity', severity: 'critical', action: 'block',
        detect: (ctx) => {
          if (ctx.responseText && FALSE_URGENCY.test(ctx.responseText)) return `False urgency: "${ctx.responseText.match(FALSE_URGENCY)?.[0]}"`;
          if (ctx.responseText && FAKE_SCARCITY.test(ctx.responseText)) return `Fake scarcity: "${ctx.responseText.match(FAKE_SCARCITY)?.[0]}"`;
          return null;
        }},
      { id: 13, pillar: 'SIDQ', description: 'Outbound text free of urgency manipulation', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.outboundText && FALSE_URGENCY.test(ctx.outboundText) ? `Outbound urgency: "${ctx.outboundText.match(FALSE_URGENCY)?.[0]}"` : null },
      { id: 14, pillar: 'SIDQ', description: 'Honest about AI nature', severity: 'high', action: 'flag',
        detect: (ctx) => ctx.hidesAI ? 'Agent hiding its AI nature' : null },
      { id: 15, pillar: 'SIDQ', description: 'Bad news travels up fast', severity: 'high', action: 'flag',
        detect: (ctx) => ctx.suppressesError ? 'Error suppression detected' : null },

      // ADL (Justice) — Laws 16-19
      { id: 16, pillar: 'ADL', description: 'Equal service regardless of tier', severity: 'high', action: 'flag',
        detect: (ctx) => ctx.tierDiscrimination ? 'Service varies by tier' : null },
      { id: 17, pillar: 'ADL', description: 'No hidden fees, dark patterns, or exit penalties', severity: 'critical', action: 'block',
        detect: (ctx) => {
          if (ctx.darkPattern || ctx.exitPenalty) return 'Dark pattern or exit penalty';
          if (ctx.responseText && HIDDEN_FEES.test(ctx.responseText)) return 'Hidden fees referenced';
          return null;
        }},
      { id: 18, pillar: 'ADL', description: 'Fair pricing reflects value, not extraction', severity: 'high', action: 'flag',
        detect: (ctx) => ctx.priceGouging ? 'Extractive pricing detected' : null },
      { id: 19, pillar: 'ADL', description: 'Disputes resolved client-first', severity: 'high', action: 'flag',
        detect: (ctx) => ctx.clientBlamed ? 'Dispute resolution blames client' : null },

      // RAHMAH (Mercy) — Laws 20-25
      { id: 20, pillar: 'RAHMAH', description: 'Serve the person, not the transaction', severity: 'medium', action: 'log',
        detect: (ctx) => ctx.transactionalOnly ? 'Purely transactional interaction' : null },
      { id: 21, pillar: 'RAHMAH', description: 'Never abandon a client in crisis', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.abandonsClient || (ctx.isEmergency && ctx.action === 'ignore') ? 'Client abandoned in crisis' : null },
      { id: 22, pillar: 'RAHMAH', description: 'Price for access, not exclusion', severity: 'medium', action: 'log',
        detect: (ctx) => ctx.priceExclusion ? 'Creates access barrier' : null },
      { id: 23, pillar: 'RAHMAH', description: 'Never slander competitors', severity: 'high', action: 'flag',
        detect: (ctx) => ctx.responseText && COMPETITOR_SLANDER.test(ctx.responseText) ? 'Competitor slander' : null },
      { id: 24, pillar: 'RAHMAH', description: 'Angry reviewer gets empathy before defense', severity: 'high', action: 'flag',
        detect: (ctx) => ctx.isNegativeReview && ctx.lacksEmpathy ? 'Defensive response to negative feedback' : null },
      { id: 25, pillar: 'RAHMAH', description: 'Every failed action has a graceful fallback', severity: 'high', action: 'flag',
        detect: (ctx) => ctx.noFallback ? 'No fallback for failed action' : null },

      // SHUKR (Gratitude) — Laws 26-28
      { id: 26, pillar: 'SHUKR', description: 'Success belongs to the client, not the agent', severity: 'medium', action: 'log',
        detect: (ctx) => ctx.responseText && /\b(we('re|\s+are)\s+the\s+best|thanks\s+to\s+(us|our)|we\s+did\s+(it|this))/i.test(ctx.responseText) ? 'Agent taking credit for success' : null },
      { id: 27, pillar: 'SHUKR', description: 'Foundation before features', severity: 'medium', action: 'log',
        detect: (ctx) => ctx.featureWithoutFoundation ? 'Feature built without proper foundation' : null },
      { id: 28, pillar: 'SHUKR', description: 'Gratitude in failure — learn from every error', severity: 'medium', action: 'log',
        detect: (ctx) => ctx.ignoresLessons ? 'Failed action without lesson capture' : null },

      // AGENTS — Laws 29-34
      { id: 29, pillar: 'AGENTS', description: 'No agent may harm a client', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.causesHarm ? 'Action would harm client' : null },
      { id: 30, pillar: 'AGENTS', description: 'Safety overrides speed', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.skipsSafety ? 'Safety check bypassed for speed' : null },
      { id: 31, pillar: 'AGENTS', description: 'Human authority is supreme', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.overridesHuman ? 'Agent overriding human authority' : null },
      { id: 32, pillar: 'AGENTS', description: 'Agent scope is fixed — stay in your lane', severity: 'high', action: 'flag',
        detect: (ctx) => ctx.outOfScope ? 'Agent acting outside defined scope' : null },
      { id: 33, pillar: 'AGENTS', description: 'Escalate uncertainty — do not guess', severity: 'high', action: 'flag',
        detect: (ctx) => ctx.lowConfidence && !ctx.escalated ? 'Low confidence action without escalation' : null },
      { id: 34, pillar: 'AGENTS', description: 'No autonomous financial decisions above threshold', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.financialDecision && ctx.amount > (ctx.threshold || 100) && !ctx.ownerApproved ? 'Financial decision requires owner approval' : null },

      // DATA — Laws 35-38
      { id: 35, pillar: 'DATA', description: 'Client can export all data anytime', severity: 'high', action: 'flag',
        detect: (ctx) => ctx.blocksExport ? 'Data export blocked' : null },
      { id: 36, pillar: 'DATA', description: 'Client can delete all data anytime', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.blocksDeletion ? 'Data deletion blocked' : null },
      { id: 37, pillar: 'DATA', description: 'No cross-client data usage', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.crossClientData ? 'Data from one client used for another' : null },
      { id: 38, pillar: 'DATA', description: 'Encryption at rest and in transit', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.unencrypted ? 'Data transmitted or stored without encryption' : null },

      // MONEY — Laws 39-42
      { id: 39, pillar: 'MONEY', description: 'Transparent pricing — no surprises', severity: 'medium', action: 'log',
        detect: (ctx) => ctx.hiddenCost ? 'Hidden cost in transaction' : null },
      { id: 40, pillar: 'MONEY', description: 'No hostage contracts — cancel anytime', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.exitBarrier || ctx.cancellationPenalty ? 'Exit barrier or cancellation penalty' : null },
      { id: 41, pillar: 'MONEY', description: 'Refund within stated policy, no questions', severity: 'medium', action: 'log',
        detect: (ctx) => ctx.refundDenied && ctx.withinPolicy ? 'Refund denied within policy period' : null },
      { id: 42, pillar: 'MONEY', description: 'No guilt-driven upselling', severity: 'high', action: 'flag',
        detect: (ctx) => {
          if (ctx.responseText && GUILT_TRIP.test(ctx.responseText)) return `Guilt upsell: "${ctx.responseText.match(GUILT_TRIP)?.[0]}"`;
          if (ctx.responseText && DEPENDENCY.test(ctx.responseText)) return `Dependency language: "${ctx.responseText.match(DEPENDENCY)?.[0]}"`;
          return null;
        }},

      // SERVICE — Laws 43-47
      { id: 43, pillar: 'SERVICE', description: 'Real help over ticket closure', severity: 'high', action: 'flag',
        detect: (ctx) => ctx.closesWithoutResolving ? 'Ticket closed without resolution' : null },
      { id: 44, pillar: 'SERVICE', description: 'Onboarding SLA — live within stated timeframe', severity: 'high', action: 'flag',
        detect: (ctx) => ctx.onboardingOverdue ? 'Onboarding exceeded SLA' : null },
      { id: 45, pillar: 'SERVICE', description: 'Teach while serving — every interaction builds capability', severity: 'medium', action: 'log',
        detect: (ctx) => ctx.missedTeachingMoment ? 'Interaction missed opportunity to teach' : null },
      { id: 46, pillar: 'SERVICE', description: 'Protect vulnerable populations with extra care', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.vulnerableDetected && !ctx.extraCareApplied ? 'Vulnerable person detected without extra care' : null },
      { id: 47, pillar: 'SERVICE', description: 'Follow up on every promise', severity: 'high', action: 'flag',
        detect: (ctx) => ctx.brokenPromise ? 'Promise made without follow-up' : null },

      // ETERNAL — Laws 48-49
      { id: 48, pillar: 'ETERNAL', description: 'Every action accountable to a standard higher than profit', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.profitOverPrinciple ? 'Principle sacrificed for profit' : null },
      { id: 49, pillar: 'ETERNAL', description: 'Build what outlasts us', severity: 'medium', action: 'log',
        detect: (ctx) => ctx.shortTermThinking ? 'Decision optimizes short-term over long-term' : null }
    ]);
  },

  /**
   * Minimal safety laws — use as a starting point for any domain.
   */
  safety() {
    return createLaws([
      { id: 'no-harm', pillar: 'SAFETY', description: 'Never take an action that could harm a person', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.causesHarm ? 'Harmful action detected' : null },
      { id: 'no-fabrication', pillar: 'TRUTH', description: 'Never fabricate information', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.responseText && OVERPROMISE.test(ctx.responseText) ? 'Fabricated or overpromised claim' : null },
      { id: 'no-manipulation', pillar: 'ETHICS', description: 'Never manipulate through urgency, scarcity, or guilt', severity: 'critical', action: 'block',
        detect: (ctx) => {
          const t = ctx.responseText || ctx.outboundText || '';
          if (FALSE_URGENCY.test(t)) return 'False urgency';
          if (FAKE_SCARCITY.test(t)) return 'Fake scarcity';
          if (GUILT_TRIP.test(t)) return 'Guilt manipulation';
          return null;
        }},
      { id: 'no-data-leak', pillar: 'PRIVACY', description: 'Never expose or share private data', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.dataSharing || ctx.crossClientData ? 'Data leak risk' : null },
      { id: 'human-authority', pillar: 'GOVERNANCE', description: 'Human authority overrides agent decisions', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.overridesHuman ? 'Agent overriding human authority' : null }
    ]);
  },

  /**
   * Healthcare-specific laws — add to base or safety preset.
   */
  healthcare() {
    return createLaws([
      { id: 'no-medical-advice', pillar: 'SAFETY', description: 'Never provide medical diagnoses or treatment recommendations', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.responseText && MEDICAL.test(ctx.responseText) ? 'Medical advice detected' : null },
      { id: 'hipaa-compliance', pillar: 'DATA', description: 'All health data handled per HIPAA', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.containsPHI && !ctx.hipaaCompliant ? 'PHI exposure without HIPAA compliance' : null },
      { id: 'emergency-escalation', pillar: 'SAFETY', description: 'Medical emergencies escalate to human immediately', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.medicalEmergency && !ctx.escalated ? 'Medical emergency without human escalation' : null }
    ]);
  },

  /**
   * Financial services laws.
   */
  finance() {
    return createLaws([
      { id: 'no-financial-advice', pillar: 'COMPLIANCE', description: 'Never provide investment advice without proper licensing', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.responseText && FINANCIAL.test(ctx.responseText) ? 'Financial advice detected' : null },
      { id: 'no-guaranteed-returns', pillar: 'TRUTH', description: 'Never promise or imply guaranteed financial returns', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.responseText && /guaranteed\s+returns?|risk-?\s*free/i.test(ctx.responseText) ? 'Guaranteed returns language' : null },
      { id: 'audit-all-transactions', pillar: 'COMPLIANCE', description: 'Every financial transaction fully auditable', severity: 'critical', action: 'block',
        detect: (ctx) => ctx.financialTransaction && !ctx.auditLogged ? 'Financial transaction without audit log' : null }
    ]);
  }
};

module.exports = { presets };
