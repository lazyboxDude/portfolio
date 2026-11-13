# CLAUDE.md

Persönliche Website von Micael G. Fernandes (gomes-fernandes.ch), wird gerade neu gebaut:
eine interaktive, animierte Seite für eine Bewerbung bei einer AI-Firma.

**Zuerst `PLAN.md` lesen.** Dort stehen Ziel, Roadmap, aktueller Status und offene Fragen.
Pro PR genau ein Roadmap-Schritt, danach `PLAN.md` (Status/Roadmap) aktualisieren.

## Stack
Statisches HTML, CSS und Vanilla-JS (ES-Module), kein Build-Schritt, kein Framework. Deploy über Vercel (statisch, Konfiguration in `vercel.json`). Domain bei GoDaddy, DNS und Proxy über Cloudflare.

## Struktur
- `index.html`, `css/site.css`, `js/main.js`, `js/cursors.js`, `js/build.js`, `js/dock.js`, `js/skills.js`, `js/marquee.js`: die neue interaktive Startseite (`dock.js` = die Box: Startknopf, dann Zuhause der Bots; `marquee.js` = der Name als Laufband, `skills.js` = der Skills-Picker, gebaut aus den Listen in `#skills-data`).
- `tools/check.mjs`, `tools/shoot.mjs`: Prüfung (`node tools/check.mjs`) und Screenshots (`node tools/shoot.mjs --out <Ordner>`), siehe `PLAN.md`, Arbeitsweise.
- `tools/og.mjs`: nimmt das Vorschaubild `images/og.jpg` (Open Graph) neu auf.
- `dienstplan.html`: eigenständige Web-App im Betrieb, nicht kaputtmachen.
- `datenschutz.html`, `nutzungsbedingungen.html`, `renders.html`, `cv.html`, `dienstplan.html`: alle Unterseiten haben dasselbe Design wie die Startseite. Sie laden `css/site.css` (Tokens, Schrift, Nav, Footer) und `css/pages.css`, ohne JS, ohne Google-Schriften, ohne Icon-Fonts. Neue Seite = Nav und Footer aus `renders.html` kopieren.
- `archive/v1-2026-11/`: eingefrorene alte Website (altes Design), nicht ändern und nicht mehr von der Website verlinkt.
- `.assetsignore`: schließt zu große Dateien vom Cloudflare-Deploy aus (gilt bei Vercel nicht).
- `vercel.json`: Weiterleitungen. Die alten CV-Dateien unter `archive/v1-2026-11/docs/` (enthalten private Daten) werden auf `cv.html` umgeleitet.
- `cv.html`, `css/cv.css`, `js/cv.js`: der Lebenslauf als Seite (Deutsch/Englisch), kein PDF im Deploy. Keine privaten Daten auf der Website, siehe `PLAN.md`.
- `fonts/`, `images/projects/`: selbst gehostete Schriften und kleine Projektbilder.
- `history.html`, `images/history/`: Zeitleiste "How this site changed" mit Screenshots der fertigen Versionen (WebP, zusammen ca. 0,8 MB), keine Zwischenschritte. Neue Version dazu = Ordner unter `images/history/` und ein `<li class="stage">` in `history.html`.
- `CNAME`: Domain, bleibt im Root.

## Konventionen
- Chat und Commit-Messages auf Deutsch, Code und Kommentare auf Englisch.
- Farben und Schriften über CSS-Variablen (`:root` in `css/site.css`).
- Animationen nur mit `transform`/`opacity`, ein gemeinsamer `requestAnimationFrame`-Loop, `prefers-reduced-motion` respektieren.
- Bedienelemente sind echte `<button>`/`<a>`, dekorative Ebenen `aria-hidden`.
- Keine PRs oder Merges ohne ausdrückliche Aufforderung.
