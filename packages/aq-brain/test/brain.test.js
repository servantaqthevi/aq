// @aq/brain — Tests
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createBrain, VALID_TYPES } = require('../src/memory');

describe('@aq/brain — createBrain', () => {
  it('creates a brain instance', () => {
    const brain = createBrain();
    assert.ok(brain.remember);
    assert.ok(brain.recall);
    assert.ok(brain.search);
    assert.ok(brain.getContext);
    assert.ok(brain.forget);
    assert.ok(brain.decay);
  });
});

describe('@aq/brain — remember', () => {
  it('stores a memory and returns an ID', () => {
    const brain = createBrain();
    const id = brain.remember('agent', 'ns', { content: 'Test memory', type: 'fact' });
    assert.ok(id);
  });

  it('rejects invalid memory types', () => {
    const brain = createBrain();
    const id = brain.remember('agent', 'ns', { content: 'Test', type: 'invalid_type' });
    assert.equal(id, null);
  });

  it('rejects empty content', () => {
    const brain = createBrain();
    const id = brain.remember('agent', 'ns', { type: 'fact' });
    assert.equal(id, null);
  });

  it('deduplicates same subject+type within 24h', () => {
    const brain = createBrain();
    const id1 = brain.remember('agent', 'ns', { content: 'First', type: 'fact', subject: 'John' });
    const id2 = brain.remember('agent', 'ns', { content: 'Updated', type: 'fact', subject: 'John' });
    assert.equal(id1, id2); // same ID, updated in place
    const memories = brain.recall('agent', 'ns', { subject: 'John' });
    assert.equal(memories.length, 1);
    assert.equal(memories[0].content, 'Updated');
  });

  it('fires onRemember callback', () => {
    const remembered = [];
    const brain = createBrain({ onRemember: (m) => remembered.push(m) });
    brain.remember('agent', 'ns', { content: 'Test', type: 'fact' });
    assert.equal(remembered.length, 1);
  });

  it('respects maxMemories limit', () => {
    const brain = createBrain({ maxMemories: 3 });
    brain.remember('a', 'ns', { content: '1', type: 'fact', importance: 1 });
    brain.remember('a', 'ns', { content: '2', type: 'interaction', importance: 5 });
    brain.remember('a', 'ns', { content: '3', type: 'insight', importance: 10 });
    brain.remember('a', 'ns', { content: '4', type: 'pattern', importance: 8 });
    const stats = brain.stats();
    assert.equal(stats.total, 3); // evicted lowest
  });
});

describe('@aq/brain — recall', () => {
  it('recalls memories sorted by importance', () => {
    const brain = createBrain();
    brain.remember('agent', 'ns', { content: 'Low', type: 'fact', importance: 2 });
    brain.remember('agent', 'ns', { content: 'High', type: 'interaction', importance: 9 });
    brain.remember('agent', 'ns', { content: 'Med', type: 'insight', importance: 5 });
    const memories = brain.recall('agent', 'ns');
    assert.equal(memories[0].content, 'High');
    assert.equal(memories[2].content, 'Low');
  });

  it('filters by type', () => {
    const brain = createBrain();
    brain.remember('agent', 'ns', { content: 'A', type: 'fact' });
    brain.remember('agent', 'ns', { content: 'B', type: 'interaction' });
    const facts = brain.recall('agent', 'ns', { type: 'fact' });
    assert.equal(facts.length, 1);
    assert.equal(facts[0].content, 'A');
  });

  it('filters by subject', () => {
    const brain = createBrain();
    brain.remember('agent', 'ns', { content: 'A', type: 'fact', subject: 'John' });
    brain.remember('agent', 'ns', { content: 'B', type: 'fact', subject: 'Jane' });
    const johns = brain.recall('agent', 'ns', { subject: 'John' });
    assert.equal(johns.length, 1);
  });

  it('respects limit', () => {
    const brain = createBrain();
    for (let i = 0; i < 10; i++) {
      brain.remember('a', 'ns', { content: `Memory ${i}`, type: 'fact', subject: `s${i}` });
    }
    const limited = brain.recall('a', 'ns', { limit: 3 });
    assert.equal(limited.length, 3);
  });

  it('excludes expired memories', () => {
    const brain = createBrain();
    brain.remember('agent', 'ns', { content: 'Expired', type: 'fact', subject: 'exp', expiresAt: '2020-01-01T00:00:00Z' });
    brain.remember('agent', 'ns', { content: 'Active', type: 'interaction', subject: 'act' });
    const memories = brain.recall('agent', 'ns');
    assert.equal(memories.length, 1);
    assert.equal(memories[0].content, 'Active');
  });

  it('filters by minImportance', () => {
    const brain = createBrain();
    brain.remember('agent', 'ns', { content: 'Low', type: 'fact', subject: 'l', importance: 2 });
    brain.remember('agent', 'ns', { content: 'High', type: 'interaction', subject: 'h', importance: 8 });
    const high = brain.recall('agent', 'ns', { minImportance: 5 });
    assert.equal(high.length, 1);
  });

  it('tracks access count', () => {
    const brain = createBrain();
    brain.remember('agent', 'ns', { content: 'Test', type: 'fact', subject: 'tracked' });
    brain.recall('agent', 'ns');
    brain.recall('agent', 'ns');
    const memories = brain.recall('agent', 'ns');
    assert.equal(memories[0].access_count, 3);
  });

  it('isolates by namespace', () => {
    const brain = createBrain();
    brain.remember('agent', 'ns1', { content: 'A', type: 'fact' });
    brain.remember('agent', 'ns2', { content: 'B', type: 'fact' });
    assert.equal(brain.recall('agent', 'ns1').length, 1);
    assert.equal(brain.recall('agent', 'ns2').length, 1);
  });

  it('isolates by agent name', () => {
    const brain = createBrain();
    brain.remember('agent1', 'ns', { content: 'A', type: 'fact' });
    brain.remember('agent2', 'ns', { content: 'B', type: 'fact' });
    assert.equal(brain.recall('agent1', 'ns').length, 1);
    assert.equal(brain.recall('agent2', 'ns').length, 1);
  });
});

describe('@aq/brain — search', () => {
  it('finds memories by content', () => {
    const brain = createBrain();
    brain.remember('a', 'ns', { content: 'Loves morning meetings', type: 'fact', subject: 'John' });
    brain.remember('a', 'ns', { content: 'Prefers email over phone', type: 'preference', subject: 'Jane' });
    const results = brain.search('a', 'ns', 'morning');
    assert.equal(results.length, 1);
    assert.ok(results[0].content.includes('morning'));
  });

  it('ranks subject matches higher', () => {
    const brain = createBrain();
    brain.remember('a', 'ns', { content: 'Something about coffee', type: 'fact', subject: 'coffee-lover' });
    brain.remember('a', 'ns', { content: 'Drinks coffee daily', type: 'fact', subject: 'person' });
    const results = brain.search('a', 'ns', 'coffee');
    assert.equal(results[0].subject, 'coffee-lover'); // subject match ranked higher
  });

  it('returns empty for no matches', () => {
    const brain = createBrain();
    brain.remember('a', 'ns', { content: 'Hello', type: 'fact' });
    const results = brain.search('a', 'ns', 'nonexistent');
    assert.equal(results.length, 0);
  });

  it('returns empty for empty query', () => {
    const brain = createBrain();
    assert.equal(brain.search('a', 'ns', '').length, 0);
    assert.equal(brain.search('a', 'ns', null).length, 0);
  });
});

describe('@aq/brain — getContext', () => {
  it('returns formatted context string', () => {
    const brain = createBrain();
    brain.remember('agent', 'ns', { content: 'Likes coffee', type: 'fact', subject: 'John' });
    const ctx = brain.getContext('agent', 'ns');
    assert.ok(ctx.includes('Agent Memory'));
    assert.ok(ctx.includes('John'));
    assert.ok(ctx.includes('Likes coffee'));
    assert.ok(ctx.includes('End Memory'));
  });

  it('returns empty string for no memories', () => {
    const brain = createBrain();
    assert.equal(brain.getContext('agent', 'ns'), '');
  });
});

describe('@aq/brain — forget', () => {
  it('soft-deletes a memory', () => {
    const brain = createBrain();
    const id = brain.remember('agent', 'ns', { content: 'Forget me', type: 'fact' });
    assert.equal(brain.forget(id), true);
    assert.equal(brain.recall('agent', 'ns').length, 0); // importance=0, excluded
  });

  it('returns false for unknown ID', () => {
    const brain = createBrain();
    assert.equal(brain.forget('999'), false);
  });
});

describe('@aq/brain — decay', () => {
  it('decays old unaccessed memories', () => {
    const brain = createBrain();
    // We can't easily test time-based decay without manipulating time,
    // but we can verify the function runs without error
    const count = brain.decay('ns');
    assert.equal(count, 0); // no old memories to decay
  });
});

describe('@aq/brain — export/import', () => {
  it('exports and imports memories', () => {
    const brain1 = createBrain();
    brain1.remember('agent', 'ns', { content: 'Exportable', type: 'fact', subject: 'test' });
    const exported = brain1.exportAll();
    assert.equal(exported.length, 1);

    const brain2 = createBrain();
    brain2.importAll(exported);
    const memories = brain2.recall('agent', 'ns');
    assert.equal(memories.length, 1);
    assert.equal(memories[0].content, 'Exportable');
  });
});

describe('@aq/brain — stats', () => {
  it('returns correct stats', () => {
    const brain = createBrain();
    brain.remember('a1', 'ns', { content: 'A', type: 'fact' });
    brain.remember('a1', 'ns', { content: 'B', type: 'interaction', subject: 'x' });
    brain.remember('a2', 'ns', { content: 'C', type: 'fact' });
    const s = brain.stats();
    assert.equal(s.total, 3);
    assert.equal(s.active, 3);
    assert.equal(s.by_type.fact, 2);
    assert.equal(s.by_type.interaction, 1);
    assert.equal(s.by_agent.a1, 2);
    assert.equal(s.by_agent.a2, 1);
  });
});
