'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseIssueNumbers, renderBody, reconcilePull, run } = require('../.github/scripts/title-issue-bot.cjs');

function fixture(overrides = {}, issueOverrides = {}) {
  const pull = { number: 10, title: 'Fix GH-9: sample', body: 'Original description.', state: 'open', merged: false, base: { ref: 'main' }, ...overrides };
  const calls = { bodies: [], closed: [], lookups: [] };
  const issues = new Map([[9, { number: 9, state: 'open', ...issueOverrides }]]);
  const github = {
    rest: {
      pulls: {
        get: async () => ({ data: pull }),
        update: async input => { calls.bodies.push(input); pull.body = input.body; },
        list: () => {},
      },
      issues: {
        get: async ({ issue_number }) => {
          calls.lookups.push(issue_number);
          if (!issues.has(issue_number)) throw Object.assign(new Error('Not found'), { status: 404 });
          return { data: issues.get(issue_number) };
        },
        update: async input => { calls.closed.push(input); },
      },
    },
    paginate: async () => [{ number: 10 }],
  };
  const context = { repo: { owner: 'example', repo: 'demo' }, eventName: 'pull_request_target', payload: { action: 'opened', pull_request: { number: 10 } } };
  const dependencies = { github, context, core: { info() {}, warning() {} } };
  return { dependencies, pull, calls, issues };
}

test('recognizes closing verbs, case, multiple references, and duplicates', () => {
  assert.deepEqual(parseIssueNumbers('Fix GH-1, GH-2 and #3; RESOLVES: #4; fixed GH-1'), [1, 2, 3, 4]);
  assert.deepEqual(parseIssueNumbers('Closed GH-9: sample'), [9]);
});

test('ignores ordinary mentions, cross-repository references, and invalid numbers', () => {
  for (const title of ['Discuss GH-9', 'Fix example/other#9', 'Fix GH-0', 'Fix GH-9abc', 'Fix GH-9007199254740992']) {
    assert.deepEqual(parseIssueNumbers(title), []);
  }
});

test('updates only the managed block and removes stale title references', () => {
  const body = 'Human description.\n\nFixes #42';
  const linked = renderBody(body, [9]);
  assert.ok(linked.startsWith(body));
  assert.equal(renderBody(linked, [9]), linked);
  assert.ok(!renderBody(linked, [8]).includes('Fixes #9'));
  assert.equal(renderBody(linked, []), body);
  assert.equal(renderBody('Untouched human text.\n\n', []), 'Untouched human text.\n\n');
});

test('opening a PR adds the link without closing anything; retries are idempotent', async () => {
  const { dependencies, calls } = fixture();
  await reconcilePull(dependencies, 10);
  await reconcilePull(dependencies, 10);
  assert.equal(calls.bodies.length, 1);
  assert.ok(calls.bodies[0].body.includes('Fixes #9'));
  assert.equal(calls.closed.length, 0);
});

test('fetches the current title rather than trusting a stale event title', async () => {
  const { dependencies, calls } = fixture({ title: 'Neutral title', body: renderBody('Human text', [9]) });
  dependencies.context.payload.pull_request.title = 'Fix GH-9: stale title';
  await reconcilePull(dependencies, 10);
  assert.equal(calls.bodies[0].body, 'Human text');
  assert.equal(calls.lookups.length, 0);
});

test('merging into a non-default branch closes the issue as completed', async () => {
  const { dependencies, calls } = fixture({ state: 'closed', merged: true, base: { ref: 'release-demo' } });
  const result = await reconcilePull(dependencies, 10);
  assert.deepEqual(result.closed, [9]);
  assert.equal(calls.closed[0].state, 'closed');
  assert.equal(calls.closed[0].state_reason, 'completed');
  assert.equal(calls.bodies.length, 0);
});

test('an unmerged closure never closes an issue, including a queued stale event', async () => {
  const { dependencies, calls } = fixture({ state: 'closed', merged: false });
  await reconcilePull(dependencies, 10);
  dependencies.context.payload.action = 'closed';
  dependencies.context.payload.pull_request.merged = false;
  await run(dependencies);
  assert.equal(calls.closed.length, 0);
  assert.equal(calls.bodies.length, 0);
});

test('editing an already merged PR cannot close additional issues', async () => {
  const { dependencies, calls } = fixture({ state: 'closed', merged: true });
  dependencies.context.payload.action = 'edited';
  await run(dependencies);
  assert.equal(calls.closed.length, 0);
  assert.equal(calls.lookups.length, 0);
});

test('a merge event uses its title snapshot even if the title is edited afterwards', async () => {
  const { dependencies, calls } = fixture({ state: 'closed', merged: true, title: 'Fix GH-99: later edit' });
  dependencies.context.payload.action = 'closed';
  dependencies.context.payload.pull_request = { number: 10, merged: true, title: 'Fix GH-9: title when merged' };
  await run(dependencies);
  assert.deepEqual(calls.lookups, [9]);
  assert.equal(calls.closed[0].issue_number, 9);
});

test('does not close an already closed issue or mistake a PR for an issue', async () => {
  const closed = fixture({ state: 'closed', merged: true }, { state: 'closed' });
  await reconcilePull(closed.dependencies, 10);
  assert.equal(closed.calls.closed.length, 0);
  const pr = fixture({}, { pull_request: { url: 'sample' } });
  await reconcilePull(pr.dependencies, 10);
  assert.equal(pr.calls.bodies.length, 0);
  assert.equal(pr.calls.closed.length, 0);
});

test('skips nonexistent references while retaining valid ones', async () => {
  const { dependencies, calls } = fixture({ title: 'Fix GH-99 and GH-9' });
  await reconcilePull(dependencies, 10);
  assert.ok(calls.bodies[0].body.includes('Fixes #9'));
  assert.ok(!calls.bodies[0].body.includes('Fixes #99'));
});

test('permission errors fail the run rather than being treated as missing issues', async () => {
  const { dependencies } = fixture();
  dependencies.github.rest.issues.get = async () => { throw Object.assign(new Error('Forbidden'), { status: 403 }); };
  await assert.rejects(reconcilePull(dependencies, 10), /Forbidden/);
});

test('manual reconciliation supports a single PR and scanning existing open PRs', async () => {
  const { dependencies, calls } = fixture();
  dependencies.context.eventName = 'workflow_dispatch';
  dependencies.context.payload = { inputs: { pr_number: '10' } };
  assert.equal((await run(dependencies)).length, 1);
  dependencies.context.payload = { inputs: {} };
  assert.equal((await run(dependencies)).length, 1);
  assert.equal(calls.bodies.length, 1);
  dependencies.context.payload.inputs.pr_number = '10; execute';
  await assert.rejects(run(dependencies), /positive integer/);
});
