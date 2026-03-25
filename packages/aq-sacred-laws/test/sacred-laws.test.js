// @aq/sacred-laws — Tests
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createLaws, addLaw, removeLaw, getLaw, getLawsByPillar } = require('../src/laws');
const { check, isClean } = require('../src/check');
const { audit } = require('../src/audit');

describe('@aq/sacred-laws — createLaws', () => {
  it('creates an empty laws collection', () => {
    const laws = createLaws();
    assert.equal(laws.count(), 0);
  });

  it('creates with initial laws', () => {
    const laws = createLaws([
      { id: '1', pillar: 'TRUTH', description: 'No lies', severity: 'critical', action: 'block', detect: () => null }
    ]);
    assert.equal(laws.count(), 1);
  });

  it('provides all() method', () => {
    const laws = createLaws([
      { id: '1', pillar: 'TRUTH', description: 'A', severity: 'high', action: 'flag', detect: () => null },
      { id: '2', pillar: 'SAFETY', description: 'B', severity: 'medium', action: 'log', detect: () => null }
    ]);
    assert.equal(laws.all().length, 2);
  });

  it('provides pillars() method', () => {
    const laws = createLaws([
      { id: '1', pillar: 'TRUTH', description: 'A', severity: 'high', action: 'flag', detect: () => null },
      { id: '2', pillar: 'SAFETY', description: 'B', severity: 'medium', action: 'log', detect: () => null }
    ]);
    const pillars = laws.pillars();
    assert.ok(pillars.includes('TRUTH'));
    assert.ok(pillars.includes('SAFETY'));
  });
});

describe('@aq/sacred-laws — addLaw', () => {
  it('adds a law to collection', () => {
    const laws = createLaws();
    laws.add({
      id: 'no-lies',
      pillar: 'Truth',
      description: 'Never fabricate information',
      severity: 'critical',
      action: 'block',
      detect: (ctx) => /guaranteed|100%/.test(ctx.responseText || '') ? 'Contains fabrication' : null
    });
    assert.equal(laws.count(), 1);
    assert.equal(laws.get('no-lies').pillar, 'TRUTH');
  });

  it('throws on missing fields', () => {
    const laws = createLaws();
    assert.throws(() => laws.add({ id: 'x' }), /Missing/);
  });

  it('throws on invalid severity', () => {
    const laws = createLaws();
    assert.throws(() => laws.add({
      id: 'x', pillar: 'TRUTH', description: 'x', severity: 'extreme', action: 'block', detect: () => null
    }), /Invalid severity/);
  });

  it('throws on invalid action', () => {
    const laws = createLaws();
    assert.throws(() => laws.add({
      id: 'x', pillar: 'TRUTH', description: 'x', severity: 'high', action: 'destroy', detect: () => null
    }), /Invalid action/);
  });

  it('throws on non-function detect', () => {
    const laws = createLaws();
    assert.throws(() => laws.add({
      id: 'x', pillar: 'TRUTH', description: 'x', severity: 'high', action: 'block', detect: 'not a function'
    }), /detect must be a function/);
  });
});

describe('@aq/sacred-laws — removeLaw', () => {
  it('removes a law by ID', () => {
    const laws = createLaws([
      { id: '1', pillar: 'TRUTH', description: 'A', severity: 'high', action: 'flag', detect: () => null }
    ]);
    laws.remove('1');
    assert.equal(laws.count(), 0);
  });
});

describe('@aq/sacred-laws — getLaw', () => {
  it('gets a law by ID', () => {
    const laws = createLaws([
      { id: 'test', pillar: 'SAFETY', description: 'Test law', severity: 'medium', action: 'log', detect: () => null }
    ]);
    const law = laws.get('test');
    assert.equal(law.description, 'Test law');
  });

  it('returns null for unknown ID', () => {
    const laws = createLaws();
    assert.equal(laws.get('nonexistent'), null);
  });
});

describe('@aq/sacred-laws — getLawsByPillar', () => {
  it('filters by pillar', () => {
    const laws = createLaws([
      { id: '1', pillar: 'TRUTH', description: 'A', severity: 'high', action: 'flag', detect: () => null },
      { id: '2', pillar: 'SAFETY', description: 'B', severity: 'medium', action: 'log', detect: () => null },
      { id: '3', pillar: 'TRUTH', description: 'C', severity: 'low', action: 'log', detect: () => null }
    ]);
    const truthLaws = laws.byPillar('TRUTH');
    assert.equal(truthLaws.length, 2);
  });
});

describe('@aq/sacred-laws — check', () => {
  const laws = createLaws([
    { id: 'no-guarantee', pillar: 'TRUTH', description: 'No guarantees', severity: 'critical', action: 'block',
      detect: (ctx) => /guarantee/i.test(ctx.responseText || '') ? 'Contains guarantee' : null },
    { id: 'no-urgency', pillar: 'TRUST', description: 'No false urgency', severity: 'medium', action: 'flag',
      detect: (ctx) => /act now|hurry/i.test(ctx.responseText || '') ? 'Contains urgency' : null },
    { id: 'polite', pillar: 'EXCELLENCE', description: 'Be polite', severity: 'low', action: 'log',
      detect: () => null }
  ]);

  it('returns GREEN for clean context', () => {
    const result = check(laws, { responseText: 'Hello, how can I help you?' });
    assert.equal(result.status, 'GREEN');
    assert.equal(result.violations.length, 0);
    assert.equal(result.passed, 3);
  });

  it('returns RED for block violation', () => {
    const result = check(laws, { responseText: 'I guarantee results' });
    assert.equal(result.status, 'RED');
    assert.ok(result.violations.some(v => v.lawId === 'no-guarantee'));
  });

  it('returns YELLOW for flag violation', () => {
    const result = check(laws, { responseText: 'Act now before it is too late' });
    assert.equal(result.status, 'YELLOW');
  });

  it('stops on first block with stopOnBlock=true', () => {
    const result = check(laws, { responseText: 'I guarantee, act now!' }, { stopOnBlock: true });
    assert.equal(result.status, 'RED');
    // May not check all laws after block
  });

  it('continues checking with stopOnBlock=false', () => {
    const result = check(laws, { responseText: 'I guarantee, act now!' }, { stopOnBlock: false });
    assert.ok(result.violations.length >= 2);
  });

  it('fires onViolation callback', () => {
    const violations = [];
    check(laws, { responseText: 'Act now!' }, { onViolation: (law, msg) => violations.push({ law: law.id, msg }) });
    assert.equal(violations.length, 1);
  });

  it('handles detect function throwing', () => {
    const badLaws = createLaws([
      { id: 'bad', pillar: 'TEST', description: 'Throws', severity: 'high', action: 'flag',
        detect: () => { throw new Error('Broken'); } }
    ]);
    const result = check(badLaws, { responseText: 'Test' });
    assert.equal(result.status, 'YELLOW');
    assert.ok(result.violations[0].message.includes('detection error'));
  });
});

describe('@aq/sacred-laws — isClean', () => {
  const laws = createLaws([
    { id: '1', pillar: 'TRUTH', description: 'No lies', severity: 'high', action: 'flag',
      detect: (ctx) => /lie/i.test(ctx.responseText || '') ? 'Contains lie' : null }
  ]);

  it('returns true for clean context', () => {
    assert.equal(isClean(laws, { responseText: 'Honest truth' }), true);
  });

  it('returns false for violation', () => {
    assert.equal(isClean(laws, { responseText: 'This is a lie' }), false);
  });
});
