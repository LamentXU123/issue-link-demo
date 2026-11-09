'use strict';

const START = '<!-- title-issue-bot:start -->';
const END = '<!-- title-issue-bot:end -->';

function parseIssueNumbers(title) {
  const groups = /\b(?:fix(?:es|ed)?|close[sd]?|resolve[sd]?)\s*:?\s+((?:GH-|#)[1-9]\d*\b(?:\s*(?:,|&|\band\b)\s*(?:GH-|#)[1-9]\d*\b)*)/gi;
  const numbers = new Set();
  for (const group of String(title).matchAll(groups)) {
    for (const reference of group[1].matchAll(/(?:GH-|#)([1-9]\d*)/gi)) {
      const number = Number(reference[1]);
      if (Number.isSafeInteger(number)) numbers.add(number);
    }
  }
  return [...numbers];
}

function renderBody(body, numbers) {
  if (numbers.length === 0 && !(body ?? '').includes(START)) return body ?? '';
  const original = (body ?? '').replace(
    /\n?<!-- title-issue-bot:start -->[\s\S]*?<!-- title-issue-bot:end -->/g,
    '',
  ).trimEnd();
  if (numbers.length === 0) return original;
  const block = `${START}\n${numbers.map(number => `Fixes #${number}`).join('\n')}\n${END}`;
  return original ? `${original}\n\n${block}` : block;
}

async function reconcilePull({ github, context, core }, number, { closeMerged = true, mergedTitle } = {}) {
  const repo = context.repo;
  const { data: pull } = await github.rest.pulls.get({ ...repo, pull_number: number });
  const result = { pull_request: number, target: pull.base.ref, linked: [], closed: [] };

  if (pull.state !== 'open' && !pull.merged) {
    result.skipped = 'Closed without merging';
    return result;
  }
  if (pull.merged && !closeMerged) {
    result.skipped = 'Only merge events or explicit manual reconciliation close issues';
    return result;
  }

  const issues = [];
  const title = pull.merged && typeof mergedTitle === 'string' ? mergedTitle : pull.title;
  for (const issueNumber of parseIssueNumbers(title)) {
    try {
      const { data: issue } = await github.rest.issues.get({ ...repo, issue_number: issueNumber });
      if (issue.pull_request) {
        core.warning(`Ignoring #${issueNumber}: it is a pull request, not an issue.`);
      } else {
        issues.push(issue);
      }
    } catch (error) {
      if (error.status !== 404) throw error;
      core.warning(`Ignoring #${issueNumber}: the issue does not exist in this repository.`);
    }
  }

  if (pull.state === 'open') {
    const body = renderBody(pull.body, issues.map(issue => issue.number));
    if (body !== (pull.body ?? '')) {
      await github.rest.pulls.update({ ...repo, pull_number: number, body });
    }
    result.linked = issues.map(issue => issue.number);
  }

  if (pull.merged) {
    for (const issue of issues) {
      if (issue.state === 'closed') continue;
      await github.rest.issues.update({
        ...repo,
        issue_number: issue.number,
        state: 'closed',
        state_reason: 'completed',
      });
      result.closed.push(issue.number);
      core.info(`Closed issue #${issue.number} after PR #${number} merged into ${pull.base.ref}.`);
    }
  }
  return result;
}

async function run(dependencies) {
  const { github, context, core } = dependencies;
  let numbers;
  let closeMerged = false;
  let mergedTitle;
  if (context.eventName === 'workflow_dispatch') {
    const input = (context.payload.inputs?.pr_number ?? '').trim();
    if (input) {
      if (!/^[1-9]\d*$/.test(input) || !Number.isSafeInteger(Number(input))) {
        throw new Error('pr_number must be a positive integer.');
      }
      numbers = [Number(input)];
      closeMerged = true;
    } else {
      const pulls = await github.paginate(github.rest.pulls.list, { ...context.repo, state: 'open', per_page: 100 });
      numbers = pulls.map(pull => pull.number);
    }
  } else if (context.eventName === 'pull_request_target' && context.payload.pull_request) {
    if (context.payload.action === 'closed' && !context.payload.pull_request.merged) {
      core.info('PR closed without merging; no issue will be closed.');
      return [];
    }
    numbers = [context.payload.pull_request.number];
    closeMerged = context.payload.action === 'closed';
    if (closeMerged) mergedTitle = context.payload.pull_request.title;
  } else {
    throw new Error('Unsupported workflow event.');
  }

  const results = [];
  for (const number of numbers) results.push(await reconcilePull(dependencies, number, { closeMerged, mergedTitle }));
  core.info(JSON.stringify(results));
  if (core.summary) {
    await core.summary.addHeading('Title issue bot').addRaw(
      `\n\`\`\`json\n${JSON.stringify(results, null, 2)}\n\`\`\`\n`,
    ).write();
  }
  return results;
}

module.exports = { parseIssueNumbers, renderBody, reconcilePull, run };
