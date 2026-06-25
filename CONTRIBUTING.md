# Contributing to Pathway

## Branching

- Always branch from `staging`, never from `main`.
- `main` is the production branch and only receives merges from `staging` via reviewed pull requests.
- Use descriptive branch names (e.g. `feature/essay-rewrite-tone`, `fix/login-rate-limit`).

## Pull Requests

- One task per PR — keep PRs focused and reviewable.
- `npm run build` must pass before requesting review.
- No direct pushes to `main` or `staging` — all changes go through a pull request.
- Fill out the PR template, including the test plan and checklist.

## AI Agent Instructions

Claude Code, Codex, and any other AI coding agent working on this repository must:
- Target the `staging` branch for all development work, never `main`.
- Open a pull request into `staging` (or a feature branch reviewed before merging into `staging`) rather than pushing directly.
- Run `npm run build` and confirm it passes before opening a PR.
- Never hardcode secrets, emails, or API keys — use environment variables documented in `.env.example`.
