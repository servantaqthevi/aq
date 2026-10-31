// @aq/router — Tests (unit tests only — no live API calls)
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createRouter, DEFAULT_ROUTES, COST_PER_MILLION, calculateCost, createCostTracker } = require('../src/index');

describe('@aq/router — DEFAULT_ROUTES', () => {
  it('has required task types', () => {
    assert.ok(DEFAULT_ROUTES.agent_response);
    assert.ok(DEFAULT_ROUTES.content_bulk);
    assert.ok(DEFAULT_ROUTES.simple_template);
    assert.ok(DEFAULT_ROUTES.general_chat);
    assert.ok(DEFAULT_ROUTES.web_research);
  });

  it('every route has model and provider', () => {
    for (const [task, route] of Object.entries(DEFAULT_ROUTES)) {
      assert.ok(route.model, `${task} missing model`);
      assert.ok(route.provider, `${task} missing provider`);
    }
  });
});

describe('@aq/router — calculateCost', () => {
  it('calculates Claude Sonnet cost correctly', () => {
    const cost = calculateCost('claude-sonnet-4-20250514', 1000, 500);
    // input: 1000 * 3.00 / 1M = 0.003, output: 500 * 15.00 / 1M = 0.0075
    assert.ok(Math.abs(cost - 0.0105) < 0.0001);
  });

  it('calculates DeepSeek cost correctly', () => {
    const cost = calculateCost('deepseek-chat', 10000, 5000);
    // input: 10000 * 0.27 / 1M = 0.0027, output: 5000 * 1.10 / 1M = 0.0055
    assert.ok(Math.abs(cost - 0.0082) < 0.0001);
  });

  it('returns 0 for unknown model', () => {
    const cost = calculateCost('unknown-model', 1000, 1000);
    assert.equal(cost, 0);
  });

  it('handles zero tokens', () => {
    const cost = calculateCost('claude-sonnet-4-20250514', 0, 0);
    assert.equal(cost, 0);
  });
});

describe('@aq/router — COST_PER_MILLION', () => {
  it('has rates for all major models', () => {
    assert.ok(COST_PER_MILLION['claude-fable-5']);
    assert.ok(COST_PER_MILLION['claude-opus-5']);
    assert.ok(COST_PER_MILLION['claude-sonnet-4-20250514']);
    assert.ok(COST_PER_MILLION['claude-haiku-4-5-20251001']);
    assert.ok(COST_PER_MILLION['deepseek-chat']);
    assert.ok(COST_PER_MILLION['gemini-2.5-pro']);
    assert.ok(COST_PER_MILLION['gpt-4o-mini']);
    assert.ok(COST_PER_MILLION['grok-3-mini']);
    assert.ok(COST_PER_MILLION['sonar']);
  });

  it('all rates have input and output', () => {
    for (const [model, rates] of Object.entries(COST_PER_MILLION)) {
      assert.ok(typeof rates.input === 'number', `${model} missing input rate`);
      assert.ok(typeof rates.output === 'number', `${model} missing output rate`);
    }
  });
});

describe('@aq/router — createRouter', () => {
  it('creates a router instance', () => {
    const router = createRouter();
    assert.ok(router.route);
    assert.ok(router.addRoute);
    assert.ok(router.getHealth);
    assert.ok(router.testProvider);
  });

  it('adds custom routes', () => {
    const router = createRouter();
    router.addRoute('my_task', 'gpt-4o', 'openai');
    assert.equal(router.routes.my_task.model, 'gpt-4o');
  });

  it('merges custom routes with defaults', () => {
    const router = createRouter({
      routes: { custom_task: { model: 'gpt-4o', provider: 'openai' } }
    });
    assert.ok(router.routes.agent_response); // default preserved
    assert.ok(router.routes.custom_task);    // custom added
  });

  it('getHealth reports provider status', () => {
    const router = createRouter({ keys: { claude: 'test-key' } });
    const health = router.getHealth();
    assert.ok(health.providers.claude.status === 'configured');
    assert.ok(health.total_task_types > 0);
  });

  it('getHealth shows unconfigured providers', () => {
    const router = createRouter({ keys: {} });
    const health = router.getHealth();
    assert.ok(health.providers.claude.status === 'missing_key');
  });
});

describe('@aq/router — createCostTracker', () => {
  it('creates a cost tracker', () => {
    const tracker = createCostTracker();
    assert.ok(tracker.log);
    assert.ok(tracker.summary);
    assert.ok(tracker.byTaskType);
  });

  it('logs and summarizes costs', () => {
    const tracker = createCostTracker();
    tracker.log({ model: 'claude-sonnet-4-20250514', provider: 'claude', task_type: 'agent_response', input_tokens: 1000, output_tokens: 500 });
    tracker.log({ model: 'deepseek-chat', provider: 'deepseek', task_type: 'content_bulk', input_tokens: 5000, output_tokens: 2000 });

    const summary = tracker.summary(7);
    assert.equal(summary.total_calls, 2);
    assert.ok(summary.total_cost_usd > 0);
    assert.ok(summary.by_provider.claude > 0);
    assert.ok(summary.by_provider.deepseek > 0);
  });

  it('breaks down by task type', () => {
    const tracker = createCostTracker();
    tracker.log({ model: 'claude-sonnet-4-20250514', provider: 'claude', task_type: 'agent_response', input_tokens: 1000, output_tokens: 500 });
    tracker.log({ model: 'claude-sonnet-4-20250514', provider: 'claude', task_type: 'agent_response', input_tokens: 2000, output_tokens: 1000 });

    const byTask = tracker.byTaskType(7);
    assert.equal(byTask.agent_response.calls, 2);
  });

  it('exports and imports', () => {
    const t1 = createCostTracker();
    t1.log({ model: 'gpt-4o-mini', provider: 'openai', task_type: 'general_chat', input_tokens: 100, output_tokens: 50 });
    const exported = t1.exportAll();

    const t2 = createCostTracker();
    t2.importAll(exported);
    assert.equal(t2.summary(7).total_calls, 1);
  });
});
