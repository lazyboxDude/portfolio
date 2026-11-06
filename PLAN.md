# Plan: Interaktive Bewerbungs-Website

> Einstieg für einen neuen Chat: erst `CLAUDE.md`, dann diese Datei lesen.
> Der aktuelle Stand steht im Abschnitt **Status**. Immer genau einen Schritt pro PR bauen.

## Ziel

Micael G. Fernandes bewirbt sich bei einer AI-Firma. Die Website (gomes-fernandes.ch) soll nicht
erklären, wie gut er ist, sondern es **zeigen**: eine interaktive, animierte Seite, die sich
handwerklich sauber, verspielt und durchdacht anfühlt. Besucher:innen sollen etwas anklicken,
entdecken und nebenbei verstehen, wer er ist und was er kann.

Die alte Website (Game-Dev/3D-Art-Portfolio) ist eingefroren in `archive/v1-2026-11/`.
Nicht anfassen. Ideen oder Inhalte dürfen von dort übernommen werden.

## Leitlinien

- **Interaktion zuerst.** Jede Seite hat etwas zum Anfassen. Inhalt wird durch Interaktion freigeschaltet.
- **Schritt für Schritt.** Jeder Schritt ist ein kleiner, lauffähiger PR, der für sich Spaß macht.
- **Kein Build-Schritt.** Statisches HTML, CSS und Vanilla-JS (ES-Module). Das Hosting ist statisch (Cloudflare).
  Eine Bibliothek oder ein Bundler kommt erst dazu, wenn ein Schritt sie wirklich braucht, und das wird im PR begründet.
- **Performance.** Ein `requestAnimationFrame`-Loop, nur `transform`/`opacity` animieren, Obergrenzen für Objektzahlen.
- **Barrierefrei.** Bedienbar per Tastatur (echte `<button>`s), `prefers-reduced-motion` respektieren,
  dekorative Ebenen mit `aria-hidden`. Wichtige Inhalte (Name, Kontakt, CV) müssen auch ohne JS und ohne Animation erreichbar sein.
- **Mobil mitdenken.** Es gibt dort keinen Mauszeiger, also Pointer-Events und Touch von Anfang an mitdenken.

## Nicht kaputtmachen

- `dienstplan.html` ist eine eigenständige Web-App im Betrieb (Google-Kalender-Login, PDF-Import).
- `datenschutz.html` und `nutzungsbedingungen.html` werden für die Google-Integration gebraucht.
  Sie nutzen `css/hub.css` und `js/socials.js`.
- `CNAME` bleibt im Root.
- `archive/` bleibt unverändert.

## Roadmap

| # | Schritt | Ergebnis |
|---|---------|----------|
| 0 | Archiv + leerer Root | erledigt, [PR #13](https://github.com/lazyboxDude/portfolio/pull/13) |
| 1 | Box + Cursor-Schwarm | erledigt, [PR #14](https://github.com/lazyboxDude/portfolio/pull/14): Box spawnt mehrere Mauszeiger, die herumwandern. |
| 2 | **Bots mit Jobs: Intro baut sich selbst** | Idee: die Seite baut sich live vor den Augen auf, wie Bots arbeiten. Klick auf "Build Website", ein Cursor zieht die Karte auf, ein zweiter tippt den ersten Text ein. Besucher:innen scrollen und klicken höchstens Buttons. |
| 3 | **Mehr Jobs + Persönlichkeit** | **Teil 1 gebaut:** Folge von Bauschritten, ein Klick pro Schritt. Zweite Karte mit Name und Handle. **Teil 2 offen:** weitere Bauarten (Karten tragen, zeichnen, Abschnitte beim Scrollen) sowie Reaktionen auf den echten Mauszeiger, aufeinander und auf die Box, Klicks und Ripples im Leerlauf. |
| 4 | Projekte entdecken | Projekte (u. a. Dienstplan-App, ausgewählte Arbeiten aus dem Archiv) werden spielerisch freigeschaltet und verlinkt. |
| 5 | AI-Element | Etwas, das zur Zielgruppe passt: z. B. die Cursors als kleine Agenten, die eine echte Aufgabe lösen. Falls ein Live-Modell nötig ist: Aufruf über einen Cloudflare Worker, der Schlüssel liegt nur serverseitig, mit Rate-Limit. Das ist ein eigener Schritt mit eigener Absprache. |
| 6 | Bewerbungs-Essentials | CV-Download, Kontakt, Links (GitHub, LinkedIn). Ohne-JS-Fallback, Meta-/OG-Tags, Favicon, Seitentitel. |
| 7 | Feinschliff | Performance-Messung, Mobil, Reduced-Motion, Lighthouse, Cross-Browser, Sound optional (standardmäßig aus). |

Die Reihenfolge darf sich ändern, sobald etwas ausprobiert wurde. Nach jedem Schritt Status und Roadmap hier aktualisieren.

## Status

- **Schritt 1 erledigt** (gemerged): Box + Cursor-Schwarm.
- **Schritt 2 erledigt** (gemerged): Bots mit Jobs. Jeder Cursor hat einen Job und ein Namensschild (`layout-bot`, `copy-bot`).
- **Schritt 3, Teil 1 gebaut** (siehe PR): Folge von Bauschritten.
  - Jeder Klick auf die Box baut den nächsten Abschnitt: das `layout-bot` zieht die Karte auf
    (Skalierung ab der oberen linken Ecke folgt dem Cursor, mit Ripple beim "Mausdruck"), das `copy-bot` tippt den Satz und folgt dem Textcursor.
  - Aktuelle Folge: 1. "Hi, welcome to my personal website" (Button: "Build Website"),
    2. "I'm Micael Gomes Fernandes, or online ._lazybox_." (Button davor: "Who are you?"). Danach heißt der Button "Build again" und baut von vorn.
  - Weitere Abschnitte sind weitere `<section class="card">` in `#cards` (`index.html`). Der Button-Text davor steht in `data-prompt`.
    Die Karten wachsen nach unten, bereits gebaute Karten wandern nie.
  - Code: `js/cursors.js` (`CursorSwarm` mit gemeinsamem rAF-Loop, `Cursor` mit `moveTo`/`follow`/`wander`/`click`),
    `js/build.js` (`SiteBuilder` und `Section`, früher `js/intro.js`), `js/main.js` (Verdrahtung).
  - Jeder Satz steht in einem `<noscript>` in der jeweiligen Karte. Ohne JS sind alle Sätze sofort sichtbar (Button ausgeblendet).
    Mit JS liest `js/build.js` sie und entfernt das Element: vor dem Bau ist eine Karte komplett leer, der Text kommt erst beim Bau ins DOM.
    Screenreader bekommen den ganzen Satz auf einmal (`sr-only`) und eine `role="status"`-Meldung.
  - `prefers-reduced-motion`: kein Anlauf, keine Ripples. Jeder Klick zeigt den nächsten Abschnitt sofort, die Cursors stehen still daneben, nach dem letzten kein Replay.
  - Die Obergrenze von 40 Cursors bleibt als Sicherung im `CursorSwarm`.

## Offene Fragen an Micael

1. **Sprache:** Englisch (passt zu einer internationalen AI-Firma) oder Deutsch? Aktuell: Englisch auf der Startseite.
2. **Zielfirma/Rolle:** Wofür genau bewirbst du dich (Rolle, Firma)? Das bestimmt, was in Schritt 3 bis 5 gezeigt werden soll.
3. **Look:** Aktuell dunkel mit blau-violetten Akzenten. Soll das bleiben, oder ist eine andere Richtung gewünscht?
4. **Inhalte:** Welche 3 bis 5 Dinge sollen Besucher:innen unbedingt über dich erfahren? Welche Projekte gehören rein?
5. **AI-Element (Schritt 5):** Soll es ein echtes Modell im Hintergrund geben (kostet Geld, braucht einen Worker) oder reicht eine gebaute Illusion?

## Arbeitsweise

- Branch: der Chat bekommt einen Branch vorgegeben. Pro Schritt ein PR gegen `main`. Ist der PR gemerged, den Branch neu von `main` starten.
- Commit-Messages und Chat auf Deutsch, Code und Kommentare auf Englisch.
- Lokal testen: `python3 -m http.server` im Repo-Root, dann `http://localhost:8000` öffnen.
  Browser-Test mit Playwright (ist in der Umgebung vorinstalliert). Das Element `#box` schwebt dauerhaft, deshalb in Tests mit `{ force: true }` klicken.
  Ein Bauschritt dauert ca. 9 Sekunden. In Tests auf Zustände warten (z. B. Label "Who are you?" oder "Build again"), keine festen Pausen.
- Vor jedem PR kurz prüfen, dass `dienstplan.html`, `datenschutz.html` und `nutzungsbedingungen.html` ohne Fehler laden.
