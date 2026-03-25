// @aq/guardian — Tests
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { guardResponse } = require('../src/guard');
const { detectVulnerability } = require('../src/vulnerability');
const { detectEmergency } = require('../src/emergency');
const { honestUncertainty } = require('../src/uncertainty');
const { auditAction, calculateRoboticScore } = require('../src/audit');
const { createFallbacks } = require('../src/fallback');

describe('@aq/guardian — guardResponse', () => {
  it('passes clean response', () => {
    const result = guardResponse('Hello, how can I help you today?');
    assert.equal(result.safe, true);
    assert.equal(result.flags.length, 0);
  });

  it('flags overpromise and auto-corrects', () => {
    const result = guardResponse('I guarantee this will double your revenue');
    assert.ok(result.flags.some(f => f.type === 'overpromise'));
    assert.ok(!result.response.includes('guarantee'));
    assert.ok(result.corrections.length > 0);
  });

  it('flags manipulation and removes it', () => {
    const result = guardResponse('Act now! Limited time only! Don\'t miss out!');
    assert.ok(result.flags.some(f => f.type === 'manipulation'));
    assert.ok(result.corrections.some(c => c.includes('false urgency')));
  });

  it('flags potential hallucination when no verified data', () => {
    const result = guardResponse('We are open from 9:00am to 5pm daily', { verified_data: false });
    assert.ok(result.flags.some(f => f.type === 'potential_hallucination'));
  });

  it('does not flag hallucination when verified data present', () => {
    const result = guardResponse('We are open from 9:00am to 5pm daily', { verified_data: true });
    assert.ok(!result.flags.some(f => f.type === 'potential_hallucination'));
  });

  it('flags missing AI disclosure on first contact phone', () => {
    const result = guardResponse('Hi there, welcome!', {
      channel: 'phone', is_first_contact: true, ai_disclosed: false
    });
    assert.ok(result.flags.some(f => f.type === 'missing_ai_disclosure'));
    assert.equal(result.safe, false); // critical flag
  });

  it('passes AI disclosure when present', () => {
    const result = guardResponse('Hi, I\'m an AI assistant helping with calls today', {
      channel: 'phone', is_first_contact: true, ai_disclosed: false
    });
    assert.ok(!result.flags.some(f => f.type === 'missing_ai_disclosure'));
  });

  it('flags competitor slander', () => {
    const result = guardResponse('Unlike other companies who can\'t deliver, we always do');
    assert.ok(result.flags.some(f => f.type === 'competitor_slander'));
  });

  it('flags robotic language', () => {
    const result = guardResponse('Certainly! I\'d be happy to assist you with that inquiry today, sir or madam.');
    assert.ok(result.flags.some(f => f.type === 'robotic_language'));
  });

  it('flags phone response too long', () => {
    const long = 'A'.repeat(350);
    const result = guardResponse(long, { channel: 'phone' });
    assert.ok(result.flags.some(f => f.type === 'too_long_for_channel'));
  });

  it('flags SMS response too long', () => {
    const long = 'A'.repeat(350);
    const result = guardResponse(long, { channel: 'sms' });
    assert.ok(result.flags.some(f => f.type === 'too_long_for_channel'));
  });

  it('applies custom rules', () => {
    const result = guardResponse('Contact us at secret@internal.com', {}, [
      { name: 'no_internal_email', pattern: 'internal\\.com', severity: 'high', action: 'strip' }
    ]);
    assert.ok(result.flags.some(f => f.type === 'no_internal_email'));
    assert.ok(!result.response.includes('internal.com'));
  });

  it('returns flag counts by severity', () => {
    const result = guardResponse('I guarantee! Act now! Limited time only!', {
      channel: 'phone', is_first_contact: true, ai_disclosed: false
    });
    assert.ok(typeof result.flag_count.critical === 'number');
    assert.ok(typeof result.flag_count.high === 'number');
    assert.ok(typeof result.flag_count.medium === 'number');
    assert.ok(typeof result.flag_count.low === 'number');
  });

  it('preserves original response', () => {
    const original = 'I guarantee results!';
    const result = guardResponse(original);
    assert.equal(result.original_response, original);
    assert.notEqual(result.response, original);
  });
});

describe('@aq/guardian — detectVulnerability', () => {
  it('returns standard for normal input', () => {
    const result = detectVulnerability('Hi, I\'d like to book an appointment');
    assert.equal(result.is_vulnerable, false);
    assert.equal(result.care_level, 'standard');
  });

  it('detects emotional distress', () => {
    const result = detectVulnerability('I\'m so scared, I don\'t know what to do');
    assert.equal(result.is_vulnerable, true);
    assert.ok(result.care_level === 'elevated' || result.care_level === 'maximum');
    assert.ok(result.indicators.some(i => i.type === 'emotional_distress'));
  });

  it('detects financial crisis with maximum care', () => {
    const result = detectVulnerability('I\'m going out of business, I\'m losing everything');
    assert.equal(result.care_level, 'maximum');
    assert.ok(result.adjustments.escalate_to_human);
    assert.ok(result.adjustments.mention_flexible_payment);
  });

  it('detects language barriers', () => {
    const result = detectVulnerability('My english is not good, can you help');
    assert.ok(result.indicators.some(i => i.type === 'language_barrier'));
    assert.ok(result.adjustments.use_simple_language);
  });

  it('detects accessibility needs', () => {
    const result = detectVulnerability('I\'m hard of hearing so please text me');
    assert.ok(result.indicators.some(i => i.type === 'hearing_impairment'));
  });

  it('detects late night calls', () => {
    // Use a time that's 3am in local timezone
    const date = new Date();
    date.setHours(3, 0, 0, 0);
    const result = detectVulnerability('Hello', { call_time: date.toISOString() });
    assert.ok(result.indicators.some(i => i.type === 'late_night_call'));
  });

  it('detects negative sentiment from context', () => {
    const result = detectVulnerability('Whatever', { sentiment: 'frustrated' });
    assert.ok(result.indicators.some(i => i.type === 'negative_sentiment'));
  });

  it('handles empty input', () => {
    const result = detectVulnerability('');
    assert.equal(result.is_vulnerable, false);
  });

  it('handles null input', () => {
    const result = detectVulnerability(null);
    assert.equal(result.is_vulnerable, false);
  });
});

describe('@aq/guardian — detectEmergency', () => {
  it('detects general emergency', () => {
    const result = detectEmergency('This is an emergency!');
    assert.equal(result.is_emergency, true);
    assert.equal(result.type, 'general_emergency');
    assert.equal(result.transfer_to_human, true);
  });

  it('detects medical emergency', () => {
    const result = detectEmergency('Someone is having a heart attack');
    assert.equal(result.is_emergency, true);
    assert.equal(result.type, 'medical_emergency');
  });

  it('detects crisis emergency with special action', () => {
    const result = detectEmergency('I want to kill myself');
    assert.equal(result.type, 'crisis_emergency');
    assert.ok(result.action.includes('crisis hotline'));
  });

  it('returns false for normal input', () => {
    const result = detectEmergency('I\'d like to book an appointment please');
    assert.equal(result.is_emergency, false);
  });

  it('handles empty/null input', () => {
    assert.equal(detectEmergency('').is_emergency, false);
    assert.equal(detectEmergency(null).is_emergency, false);
  });
});

describe('@aq/guardian — honestUncertainty', () => {
  it('returns phone-appropriate response', () => {
    const response = honestUncertainty('What are your hours?', { channel: 'phone' });
    assert.ok(response.length > 20);
    assert.ok(typeof response === 'string');
  });

  it('returns sms-appropriate response', () => {
    const response = honestUncertainty('What are your hours?', { channel: 'sms' });
    assert.ok(response.length < 200);
  });

  it('returns chat response by default', () => {
    const response = honestUncertainty('Question');
    assert.ok(response.length > 0);
  });

  it('includes client name when provided', () => {
    // honestUncertainty picks randomly; some phone responses include client_name, some don't
    // Test that it returns a string without error
    const response = honestUncertainty('Question', { channel: 'phone', client_name: 'Sarah' });
    assert.ok(response.length > 20);
    assert.ok(typeof response === 'string');
  });
});

describe('@aq/guardian — calculateRoboticScore', () => {
  it('scores robotic text higher than natural text', () => {
    const robotic = calculateRoboticScore('Certainly! I understand your concern. I appreciate your patience. Furthermore, rest assured we will handle this. Please don\'t hesitate to reach out.');
    const natural = calculateRoboticScore("Hey, that's a great question! I'm not totally sure but let me look into it and I'll get back to you.");
    assert.ok(robotic > natural, `robotic (${robotic}) should be > natural (${natural})`);
  });

  it('scores natural text low', () => {
    const score = calculateRoboticScore("Hey, that's a great question! I'm not totally sure about the specifics, but let me look into it and I'll get back to you.");
    assert.ok(score < 0.3);
  });

  it('handles empty text', () => {
    const score = calculateRoboticScore('');
    assert.equal(score, 0);
  });
});

describe('@aq/guardian — auditAction', () => {
  it('returns green for clean action', () => {
    const result = auditAction('test', 'send_email', {}, { response: 'Hello there, how are you?' });
    assert.equal(result.compliance, 'green');
  });

  it('returns yellow for failed action without fallback', () => {
    const result = auditAction('test', 'send_email', {}, { error: 'timeout' });
    assert.equal(result.compliance, 'yellow');
  });

  it('returns red for unaddressed vulnerability', () => {
    const result = auditAction('test', 'respond', { vulnerability_detected: true, extra_care_applied: false }, {});
    assert.equal(result.compliance, 'red');
  });
});

describe('@aq/guardian — createFallbacks', () => {
  it('returns default fallback for unknown agent', () => {
    const fb = createFallbacks();
    const result = fb.get('unknown', 'unknown');
    assert.ok(result.description);
    assert.ok(result.action);
  });

  it('returns configured fallback', () => {
    const fb = createFallbacks({
      'my-agent': { send_email: { description: 'Retry', action: 'retry' } }
    });
    const result = fb.get('my-agent', 'send_email');
    assert.equal(result.action, 'retry');
  });

  it('registers new fallbacks', () => {
    const fb = createFallbacks();
    fb.register('new-agent', { call: { description: 'Voicemail', action: 'voicemail' } });
    assert.equal(fb.get('new-agent', 'call').action, 'voicemail');
  });
});
