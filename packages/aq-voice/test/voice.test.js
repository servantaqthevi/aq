// @aq/voice — Tests
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { detect } = require('../src/detect');
const { buildContext } = require('../src/context');
const { createProfileStore } = require('../src/profile');

describe('@aq/voice — detect', () => {
  it('detects formal language', () => {
    const traits = detect('I sincerely appreciate your assistance regarding this matter. Please advise.');
    assert.ok(traits.formal > 0.5);
  });

  it('detects casual language', () => {
    const traits = detect('Hey! yeah cool, gonna check it out lol');
    assert.ok(traits.formal < 0.5);
  });

  it('detects emotional language', () => {
    const traits = detect('I am so excited!! This is amazing! I love it!!!');
    assert.ok(traits.emotional > 0.5);
  });

  it('detects low emotion', () => {
    const traits = detect('The appointment is at 3pm on Tuesday.');
    assert.ok(traits.emotional < 0.5);
  });

  it('detects verbosity from length', () => {
    const short = detect('Yes.');
    const long = detect('A '.repeat(80));
    assert.ok(long.verbose > short.verbose);
  });

  it('returns defaults for empty input', () => {
    const traits = detect('');
    assert.equal(traits.formal, 0.5);
    assert.equal(traits.verbose, 0.5);
    assert.equal(traits.emotional, 0.3);
  });

  it('returns defaults for null', () => {
    const traits = detect(null);
    assert.equal(traits.formal, 0.5);
  });

  it('clamps all values to 0-1', () => {
    const traits = detect('love love love amazing!!! excited!! happy!! thrilled!! ' + 'please kindly '.repeat(20));
    assert.ok(traits.formal >= 0 && traits.formal <= 1);
    assert.ok(traits.verbose >= 0 && traits.verbose <= 1);
    assert.ok(traits.emotional >= 0 && traits.emotional <= 1);
  });
});

describe('@aq/voice — buildContext', () => {
  it('builds context with blueprint voice', () => {
    const ctx = buildContext(null, { formal: 0.7, verbose: 0.5, emotional: 0.3 });
    assert.ok(ctx.includes('VOICE CALIBRATION'));
    assert.ok(ctx.includes('formal=0.7'));
  });

  it('builds context with contact profile', () => {
    const ctx = buildContext({ formal: 0.2, verbose: 0.8, emotional: 0.5 });
    assert.ok(ctx.includes('Contact style'));
    assert.ok(ctx.includes('casual and friendly'));
    assert.ok(ctx.includes('detailed explanations'));
  });

  it('builds context with formal contact', () => {
    const ctx = buildContext({ formal: 0.9, verbose: 0.2, emotional: 0.3 });
    assert.ok(ctx.includes('professional language'));
    assert.ok(ctx.includes('brief and direct'));
  });

  it('returns empty for no data', () => {
    const ctx = buildContext(null, null);
    assert.equal(ctx, '');
  });
});

describe('@aq/voice — createProfileStore', () => {
  it('creates a profile store', () => {
    const store = createProfileStore();
    assert.ok(store.get);
    assert.ok(store.update);
    assert.ok(store.detectAndUpdate);
  });

  it('returns null for unknown contact', () => {
    const store = createProfileStore();
    assert.equal(store.get('agent', 'unknown'), null);
  });

  it('stores and retrieves profiles', () => {
    const store = createProfileStore();
    store.update('agent', 'c1', { formal: 0.8, verbose: 0.3, emotional: 0.2 });
    const profile = store.get('agent', 'c1');
    assert.equal(profile.formal, 0.8);
    assert.equal(profile.verbose, 0.3);
  });

  it('rolling averages on update', () => {
    const store = createProfileStore();
    store.update('agent', 'c1', { formal: 0.8, verbose: 0.4, emotional: 0.2 });
    store.update('agent', 'c1', { formal: 0.4, verbose: 0.8, emotional: 0.6 });
    const profile = store.get('agent', 'c1');
    assert.ok(Math.abs(profile.formal - 0.6) < 0.001); // (0.8 + 0.4) / 2
    assert.ok(Math.abs(profile.verbose - 0.6) < 0.001); // (0.4 + 0.8) / 2
    assert.equal(profile.interactions, 2);
  });

  it('detectAndUpdate combines detection and storage', () => {
    const store = createProfileStore();
    const traits = store.detectAndUpdate('agent', 'c1', 'Hey! Super excited lol!!');
    assert.ok(traits.formal < 0.5);
    assert.ok(traits.emotional > 0.3);
    const profile = store.get('agent', 'c1');
    assert.ok(profile);
  });

  it('isolates by agent name', () => {
    const store = createProfileStore();
    store.update('a1', 'c1', { formal: 0.9, verbose: 0.5, emotional: 0.5 });
    store.update('a2', 'c1', { formal: 0.1, verbose: 0.5, emotional: 0.5 });
    assert.equal(store.get('a1', 'c1').formal, 0.9);
    assert.equal(store.get('a2', 'c1').formal, 0.1);
  });

  it('exports and imports profiles', () => {
    const store1 = createProfileStore();
    store1.update('agent', 'c1', { formal: 0.7, verbose: 0.3, emotional: 0.5 });
    const exported = store1.exportAll();
    assert.equal(exported.length, 1);

    const store2 = createProfileStore();
    store2.importAll(exported);
    const profile = store2.get('agent', 'c1');
    assert.equal(profile.formal, 0.7);
  });
});
