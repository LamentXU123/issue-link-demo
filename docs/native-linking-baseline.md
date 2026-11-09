Historical record from before the title issue bot was installed. PR A is now reused for the bot demonstration; pending outcomes below are the original hypotheses.

# Issue linking demo

A public experiment that separates issue references in pull request titles, pull request descriptions, and commit messages.

## Repository setup

- Default branch: `main`.
- Non-default target branch: `release-demo`.
- Issues are enabled.
- Only **Rebase and merge** is enabled. Merge commits and squash merges are disabled so that a PR title cannot become a commit message during merging.
- Branches are retained after merging so the experiment remains easy to inspect.
- No workflow or bot implements issue linking in this repository.

## Test cases

The table describes hypotheses to test, not completed results. All four issues and PRs start open.

| Case | Issue | Pull request | Head -> base | PR title | PR description | Commit message |
| --- | --- | --- | --- | --- | --- | --- |
| A: title only | [1](https://github.com/LamentXU123/issue-link-demo/issues/1) | [5](https://github.com/LamentXU123/issue-link-demo/pull/5) | `title-only` -> `main` | `Fix GH-1: title-only test` | Empty | `Add sample A` |
| B: commit only | [2](https://github.com/LamentXU123/issue-link-demo/issues/2) | [6](https://github.com/LamentXU123/issue-link-demo/pull/6) | `commit-only` -> `main` | `Commit-only test` | Empty | `Fix GH-2: commit-only test` |
| C: description only | [3](https://github.com/LamentXU123/issue-link-demo/issues/3) | [7](https://github.com/LamentXU123/issue-link-demo/pull/7) | `body-only` -> `main` | `Body-only test` | `Fixes #3` | `Add sample C` |
| D: non-default branch | [4](https://github.com/LamentXU123/issue-link-demo/issues/4) | [8](https://github.com/LamentXU123/issue-link-demo/pull/8) | `commit-via-release` -> `release-demo` | `Non-default branch test` | Empty | `Fix GH-4: release test` |

Issue and PR numbers share a counter; the issues are created before the PRs.

## How to run

1. Before merging anything, inspect each issue's **Development** section and timeline. Record formal PR links separately from commit references or other timeline mentions.
2. Rebase and merge PR A. Its commit message is deliberately neutral. Check whether issue A remains open.
3. Rebase and merge PR B. Check whether issue B closes, and which commit appears in its closing event.
4. Inspect issue C's PR link, then rebase and merge PR C. Check whether issue C closes.
5. Rebase and merge PR D into `release-demo`. Check that issue D is still open.
6. Create another PR with **base `main`**, **head `release-demo`**, title `Promote release demo`, and an empty description. Before merging, verify its commit still has the message `Fix GH-4: release test`.
7. Rebase and merge that promotion PR. Check whether issue D now closes.
8. Replace the pending entries below with the observed outcomes and links to the closing events or commits.

Keep the test issues free of manual links and manual close/reopen actions. Avoid adding issue references to other PR descriptions or commit messages. Do not rename the default branch during the experiment.

## Observations

The initial API checks are saved in [the before-merge snapshot](../evidence/before-merge.json). All four issues and PRs were open. Only PR C reported a closing issue reference. The after-merge results have not been measured yet.

| Case | Formal PR link before merge | Issue after first merge | Issue after reaching main | Evidence |
| --- | --- | --- | --- | --- |
| A | No | Pending | Pending | [PR A](https://github.com/LamentXU123/issue-link-demo/pull/5) |
| B | No | Pending | Pending | [PR B](https://github.com/LamentXU123/issue-link-demo/pull/6) |
| C | Yes, issue 3 | Pending | Pending | [PR C](https://github.com/LamentXU123/issue-link-demo/pull/7) |
| D | No | Pending (`release-demo`) | Pending | [PR D](https://github.com/LamentXU123/issue-link-demo/pull/8) |

## Expected outcomes

- A: no formal PR link; the issue remains open after merging the neutral commit.
- B: no formal PR link; the issue closes once the commit reaches `main`.
- C: the description establishes a formal PR link; the issue closes when the PR merges into `main`.
- D: merging into `release-demo` leaves the issue open; carrying the closing commit into `main` closes it.

These are the expectations being investigated. Record any different behavior rather than changing the experiment to match the expectations.

## References

- [Linking a pull request to an issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue)
- [Pull request merges](https://docs.github.com/en/pull-requests/reference/pull-request-merges)
- [Autolinked references and URLs](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/autolinked-references-and-urls)
