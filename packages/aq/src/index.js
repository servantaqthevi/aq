// aq — Governed AI agents
// Bismillah
'use strict';

// Quick API — the simple way
const { guard, create } = require('./quick');

// Individual organs — the advanced way
const soul = require('../../aq-soul/src/index');
const sacredLaws = require('../../aq-sacred-laws/src/index');
const guardian = require('../../aq-guardian/src/index');
const brain = require('../../aq-brain/src/index');
const nerve = require('../../aq-nerve/src/index');
const mirror = require('../../aq-mirror/src/index');
const voice = require('../../aq-voice/src/index');
const router = require('../../aq-router/src/index');
const bioWrap = require('../../aq-bio-wrap/src/index');

/**
 * aq — Governed AI agents.
 *
 * Quick start (2 lines):
 *   const aq = require('aq');
 *   const result = aq.guard('I guarantee 100% results!');
 *
 * Create a governed agent (5 lines):
 *   const agent = aq.create({
 *     soul: { name: 'my-agent', purpose: 'Help restaurant owners', values: ['honesty'] },
 *     brain: true,
 *     nerve: 'business',
 *     llm: (sys, msg) => callYourLLM(sys, msg)
 *   });
 *   const result = await agent.ask('You are helpful.', userMessage);
 *
 * Individual organs (advanced):
 *   const { createSoul } = require('aq').soul;
 *   const { guardResponse } = require('aq').guardian;
 *   const { createBrain } = require('aq').brain;
 */

module.exports = {
  // Quick API
  guard,
  create,

  // Individual organs
  soul,
  sacredLaws,
  guardian,
  brain,
  nerve,
  mirror,
  voice,
  router,
  bioWrap,

  // Version
  version: '0.1.0'
};
