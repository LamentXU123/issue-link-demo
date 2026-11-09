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
| A: title only | [1](../../issues/1) | [5](../../pull/5) | `title-only` -> `main` | `Fix GH-1: title-only test` | Empty | `Add sample A` |
| B: commit only | [2](../../issues/2) | [6](../../pull/6) | `commit-only` -> `main` | `Commit-only test` | Empty | `Fix GH-2: commit-only test` |
| C: description only | [3](../../issues/3) | [7](../../pull/7) | `body-only` -> `main` | `Body-only test` | `Fixes #3` | `Add sample C` |
| D: non-default branch | [4](../../issues/4) | [8](../../pull/8) | `commit-via-release` -> `release-demo` | `Non-default branch test` | Empty | `Fix GH-4: release test` |

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

| Case | Formal PR link before merge | Issue after first merge | Issue after reaching main | Evidence |
| --- | --- | --- | --- | --- |
| A | Pending | Pending | Pending | Pending |
| B | Pending | Pending | Pending | Pending |
| C | Pending | Pending | Pending | Pending |
| D | Pending | Pending (`release-demo`) | Pending | Pending |

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
