# CLAUDE.md

Persönliche Website von Micael G. Fernandes (gomes-fernandes.ch), wird gerade neu gebaut:
eine interaktive, animierte Seite für eine Bewerbung bei einer AI-Firma.

**Zuerst `PLAN.md` lesen.** Dort stehen Ziel, Roadmap, aktueller Status und offene Fragen.
Pro PR genau ein Roadmap-Schritt, danach `PLAN.md` (Status/Roadmap) aktualisieren.

**Aufgabe betrifft das Aussehen (Design, CSS, Layout)?** Zusätzlich `DESIGN.md` lesen: Tokens, Regeln,
der Vertrag mit der Bau-Engine und die Arbeitsschleife mit `tools/shoot.mjs` (Screenshots) und `tools/check.mjs` (Leitplanken).

## Stack
Statisches HTML, CSS und Vanilla-JS (ES-Module), kein Build-Schritt, kein Framework. Deploy über Vercel (statisch, Konfiguration in `vercel.json`). Domain bei GoDaddy, DNS und Proxy über Cloudflare.

## Struktur
- `index.html`, `css/site.css`, `js/main.js`, `js/cursors.js`: die neue interaktive Startseite.
- `dienstplan.html`: eigenständige Web-App im Betrieb, nicht kaputtmachen.
- `datenschutz.html`, `nutzungsbedingungen.html`: Rechtsseiten für die Google-Kalender-Integration des Dienstplans. Nutzen `css/hub.css` und `js/socials.js`.
- `archive/v1-2026-11/`: eingefrorene alte Website, nicht ändern.
- `.assetsignore`: schließt zu große Dateien vom Cloudflare-Deploy aus (gilt bei Vercel nicht).
- `vercel.json`: Weiterleitungen. Die alten CV-Dateien unter `archive/v1-2026-11/docs/` (enthalten private Daten) werden auf `cv.html` umgeleitet.
- `cv.html`, `css/cv.css`, `js/cv.js`: der Lebenslauf als Seite (Deutsch/Englisch), kein PDF im Deploy. Keine privaten Daten auf der Website, siehe `PLAN.md`.
- `DESIGN.md`: Leitfaden für Design-Änderungen (für Design-Bots). `tools/`: Dev-Skripte (`shoot.mjs`, `check.mjs`), nicht Teil der Website. `screenshots/` ist ignoriert.
- `fonts/`, `images/projects/`: selbst gehostete Schriften und kleine Projektbilder.
- `CNAME`: Domain, bleibt im Root.

## Konventionen
- Chat und Commit-Messages auf Deutsch, Code und Kommentare auf Englisch.
- Farben und Schriften über CSS-Variablen (`:root` in `css/site.css`).
- Animationen nur mit `transform`/`opacity`, ein gemeinsamer `requestAnimationFrame`-Loop, `prefers-reduced-motion` respektieren.
- Bedienelemente sind echte `<button>`/`<a>`, dekorative Ebenen `aria-hidden`.
- Keine PRs oder Merges ohne ausdrückliche Aufforderung.
