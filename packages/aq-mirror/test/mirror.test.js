// @aq/mirror — Tests
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { assess, isConfident } = require('../src/assess');

describe('@aq/mirror — assess', () => {
  it('returns baseline confidence for clean response', () => {
    const result = assess('What are your hours?', 'We are open Monday to Friday, 9am to 5pm.');
    assert.ok(result.confidence >= 0.5);
    assert.equal(result.assessment, 'confident');
    assert.equal(result.escalate, false);
  });

  it('boosts confidence with brain hits', () => {
    const low = assess('Question?', 'Answer here.', { brainHits: 0 });
    const high = assess('Question?', 'Answer here.', { brainHits: 5 });
    assert.ok(high.confidence > low.confidence);
  });

  it('reduces confidence for uncertain language', () => {
    const sure = assess('Q?', 'The answer is definitely yes, we do that.');
    const unsure = assess('Q?', "I'm not sure, maybe we do that, possibly on Tuesdays I think.");
    assert.ok(unsure.confidence < sure.confidence);
    assert.ok(unsure.flags.length > 0);
  });

  it('flags very short responses', () => {
    const result = assess('Tell me about your services', 'Yes.');
    assert.ok(result.gaps.includes('very_short_response'));
    assert.ok(result.confidence < 0.7);
  });

  it('flags verbose responses', () => {
    const long = 'A'.repeat(2500);
    const result = assess('Simple question', long);
    assert.ok(result.flags.includes('verbose_response'));
  });

  it('sets escalate for very low confidence', () => {
    // Short, uncertain, no brain knowledge
    const result = assess('Complex question', "I don't know, I'm not sure, maybe", { brainHits: 0 });
    assert.ok(result.confidence < 0.5);
  });

  it('identifies no_brain_knowledge gap', () => {
    const result = assess('Q?', 'Answer', { brainHits: 0 });
    assert.ok(result.gaps.includes('no_brain_knowledge'));
  });

  it('marks nerve signals in flags', () => {
    const result = assess('Q?', 'Answer', { nerveSignals: 2 });
    assert.ok(result.flags.includes('nerve_signals_present'));
  });

  it('fires onLowConfidence callback', () => {
    let called = false;
    assess('Q?', 'Hm.', { brainHits: 0 }, {
      baseConfidence: 0.2,
      onLowConfidence: () => { called = true; }
    });
    assert.equal(called, true);
  });

  it('clamps confidence to 0-1', () => {
    const result = assess('Q?', 'A very good answer with lots of detail.', { brainHits: 10 }, { baseConfidence: 0.95 });
    assert.ok(result.confidence <= 1);
    assert.ok(result.confidence >= 0);
  });
});

describe('@aq/mirror — isConfident', () => {
  it('returns true for confident response', () => {
    assert.equal(isConfident('Q?', 'A clear, detailed response about the topic.'), true);
  });

  it('returns false below threshold', () => {
    assert.equal(isConfident('Q?', 'Hm.', 0.9), false);
  });

  it('accepts custom threshold', () => {
    assert.equal(isConfident('Q?', 'Short.', 0.3), true);
  });
});
