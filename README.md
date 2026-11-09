# Issue title bot

A GitHub Actions bot that links issues from PR titles and closes them when the PR is merged, including into non-default branches.

## Behavior

For a title such as `Fix GH-123: correct the parser`, the bot:

1. Confirms that issue 123 exists in the same repository and is an issue rather than another PR.
2. Adds a managed `Fixes #123` block to the PR description, preserving the author's other text.
3. Updates or removes that block when the title changes.
4. Closes the referenced issue as completed when the PR is merged into any target branch.

Supported verbs are `fix`, `fixes`, `fixed`, `close`, `closes`, `closed`, `resolve`, `resolves`, and `resolved`, ignoring case. References may use `GH-123` or `#123`. Multiple references work, for example `Fix GH-123 and GH-456`.

A normal closure without merging leaves the issue open. Plain mentions such as `Discuss GH-123`, nonexistent issues, references to other repositories, and references to PR numbers are ignored. Already closed issues remain closed. Editing a merged PR does not close additional issues.

On the default branch, GitHub may close the issue natively from the generated description before the bot's merge job runs. On a non-default branch, the bot explicitly closes the issue using the Issues API. GitHub's formal Development link from closing keywords is limited to PRs targeting the default branch; the generated reference still provides an issue-timeline backlink for other target branches.

## Live demonstration

The bot is installed in this repository. Demonstration links and observed results are recorded here after execution; the initial native-behavior snapshot is preserved in [evidence/before-merge.json](evidence/before-merge.json).

| Demonstration | PR | Issue | Observed result |
| --- | --- | --- | --- |
| Title reference, default branch | [5](https://github.com/LamentXU123/issue-link-demo/pull/5) | [1](https://github.com/LamentXU123/issue-link-demo/issues/1) | Pending bot demonstration |
| Title reference, non-default branch | To be created | To be created | Pending bot demonstration |

See [workflow runs](https://github.com/LamentXU123/issue-link-demo/actions/workflows/title-issue-bot.yml) for the bot's execution logs and summaries.

## Install in another repository

Copy these two files into the repository's default branch:

- [.github/workflows/title-issue-bot.yml](.github/workflows/title-issue-bot.yml)
- [.github/scripts/title-issue-bot.cjs](.github/scripts/title-issue-bot.cjs)

Enable GitHub Actions. The workflow requests `pull-requests: write`, `issues: write`, and `contents: read`, using the built-in `GITHUB_TOKEN`. No personal access token or external service is required.

It listens to PR creation, edits, reopening, and closing. It reads bot code only from the trusted default branch, never from the PR head, and does not post comments.

Public repositories may require an explicit Actions event policy allowing `pull_request_target`. This demo has an active policy scoped to this workflow only, allowing `pull_request_target` and `workflow_dispatch`. The policy request is saved in [.github/title-issue-bot-policy.json](.github/title-issue-bot-policy.json). In another repository, an administrator can review existing policies under **Settings > Actions > Policies**, then configure this workflow's permitted events. See [GitHub's event-policy guidance](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target#default-policy-for-pull_request_target).

For existing PRs, select **Actions > Title issue bot > Run workflow**. Leave `pr_number` empty to reconcile open PRs, or provide a PR number to process it explicitly. Explicit manual reconciliation can also repair a missed merge event for an already merged PR.

## Local verification

Use Node.js 22 or later:

```sh
node --test test/title-issue-bot.test.cjs
```

The tests cover title parsing, preservation of manual descriptions, title edits, retry behavior, merge versus unmerged closure, non-default branches, missing issues, PR-number references, stale events, and API failures.

## Earlier native-behavior baseline

The original four-case experiment is archived in [docs/native-linking-baseline.md](docs/native-linking-baseline.md). It describes the repository before the bot was installed. PR A is now reused for the bot demonstration; the original before-merge snapshot remains available for comparison.
