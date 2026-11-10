# Copilot Instructions for Portfolio Project

See `CLAUDE.md` (conventions, structure) and `PLAN.md` (goal, roadmap, status). Both are the source of truth.

For visual/design changes also read `DESIGN.md` (tokens, rules, contract with the build engine) and use `node tools/shoot.mjs` (screenshots) and `node tools/check.mjs` (guard rails).

Short version: static site (HTML, CSS, Vanilla JS ES modules, no build step) for gomes-fernandes.ch.
The previous site is frozen in `archive/v1-2026-11/` — do not edit it. `dienstplan.html` and the legal pages must keep working.
`.assetsignore` excludes files too large for the asset host (e.g. the mp4 in the archive).
