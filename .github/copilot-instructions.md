# Copilot Instructions for Portfolio Project

## Project Overview
Static site (HTML, CSS, Vanilla JS) for gomes-fernandes.ch. The previous website (Game Dev / 3D Art portfolio with "Cyber Mode") is frozen in `archive/v1-2026-11/` — do not edit it. A new site is being built from scratch.

## Current structure
- `index.html`: placeholder start page ("Neue Website kommt bald"), uses `css/hub.css` and `js/socials.js`.
- `dienstplan.html`: standalone, fully self-contained web app (inline `<style>`/`<script>`). Must keep working; it links back to `index.html`, `datenschutz.html` and `nutzungsbedingungen.html`.
- `datenschutz.html`, `nutzungsbedingungen.html`: legal pages required for the Dienstplan's Google Calendar integration. Keep them reachable.
- `css/hub.css`, `js/socials.js`, `images/icons/favicon.png`: shared by the pages above.
- `CNAME`: domain config, keep at root.

## Conventions
- Vanilla JS only, no jQuery. Use CSS variables for colors and fonts.
- `.assetsignore` excludes files too large for the asset host (e.g. the mp4 in the archive).
