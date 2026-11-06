# CLAUDE.md

Persönliche Website von Micael G. Fernandes (gomes-fernandes.ch), wird gerade neu gebaut:
eine interaktive, animierte Seite für eine Bewerbung bei einer AI-Firma.

**Zuerst `PLAN.md` lesen** (mindestens Abschnitte 0 bis 3). Dort stehen Ziel, Zusammenarbeit, Architektur, Roadmap und offene Fragen.
Pro PR genau ein Roadmap-Schritt, danach `PLAN.md` (Erledigt, Entscheidungen, offene Fragen) aktualisieren.

## Zusammenarbeit (verbindlich, Details in `PLAN.md` Abschnitt 3)
- **Design mit Micael absprechen**, nicht allein entscheiden: zu Beginn jedes Schritts (2 bis 3 Varianten als Bild, Empfehlung zuerst) und vor jedem PR (Screenshots, Zahlen). Fragen mit dem Frage-Werkzeug, bei Optik mit Vorschau.
- **Skills nutzen:** `anthropic-skills:apple-design` für Bewegung, Typografie, Materialien und Reduced Motion (vor und nach jedem visuellen Schritt), `artifact-design` für Mockups, `run` zum Ansehen der Seite, `code-review` und `simplify` vor jedem PR, `security-review` und `claude-api` für Schritt 10.
- **Agents:** große Schritte dürfen auf **höchstens 3 bis 4 Hilfs-Agents** mit getrenntem Dateibesitz verteilt werden. Nur der Haupt-Agent spricht mit Micael, prüft jede Abgabe und committet.
- **Keine privaten Daten** (Adresse, Telefon, Geburtsdatum, Zivilstand, Nationalität, Daten Dritter) auf der Website und in `PLAN.md`. Keine PDFs im Deploy.

## Stack
Statisches HTML, CSS und Vanilla-JS (ES-Module), kein Build-Schritt, kein Framework. Deploy über Vercel (statisch, Konfiguration in `vercel.json`). Domain bei GoDaddy, DNS und Proxy über Cloudflare.

## Struktur
- `index.html`, `css/site.css`, `js/main.js`, `js/cursors.js`, `js/build.js`, `js/agents.js`: die interaktive Startseite (Bau-Engine, Cursor-System, Schwarm).
- `dienstplan.html`: eigenständige Web-App im Betrieb, nicht kaputtmachen.
- `datenschutz.html`, `nutzungsbedingungen.html`: Rechtsseiten für die Google-Kalender-Integration des Dienstplans. Nutzen `css/hub.css` und `js/socials.js`.
- `archive/v1-2026-11/`: eingefrorene alte Website, nicht ändern.
- `.assetsignore`: schließt zu große Dateien vom Cloudflare-Deploy aus (gilt bei Vercel nicht).
- `vercel.json`: Weiterleitungen. Die alten CV-Dateien unter `archive/v1-2026-11/docs/` (enthalten private Daten) werden auf `cv.html` umgeleitet, die internen Dateien `PLAN.md`, `CLAUDE.md` und `.github/` auf die Startseite.
- `cv.html`, `css/cv.css`, `js/cv.js`: der Lebenslauf als Seite (Deutsch/Englisch), kein PDF im Deploy. Keine privaten Daten auf der Website, siehe `PLAN.md`.
- `fonts/`, `images/projects/`: selbst gehostete Schriften und kleine Projektbilder.
- `CNAME`: Domain, bleibt im Root.

## Konventionen
- Chat und Commit-Messages auf Deutsch, Code und Kommentare auf Englisch.
- Farben und Schriften über CSS-Variablen (`:root` in `css/site.css`).
- Animationen nur mit `transform`/`opacity`, ein gemeinsamer `requestAnimationFrame`-Loop, `prefers-reduced-motion` respektieren.
- Bedienelemente sind echte `<button>`/`<a>`, dekorative Ebenen `aria-hidden`.
- Keine PRs oder Merges ohne ausdrückliche Aufforderung.
