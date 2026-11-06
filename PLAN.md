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
| 3 | Mehr Jobs + Persönlichkeit | Weitere Bauschritte (Karten tragen, zeichnen, Abschnitte bauen) beim Scrollen. Dazu Reaktionen auf den echten Mauszeiger, aufeinander und auf die Box, gelegentliche Klicks und Ripples im Leerlauf. |
| 4 | Projekte entdecken | Projekte (u. a. Dienstplan-App, ausgewählte Arbeiten aus dem Archiv) werden spielerisch freigeschaltet und verlinkt. |
| 5 | AI-Element | Etwas, das zur Zielgruppe passt: z. B. die Cursors als kleine Agenten, die eine echte Aufgabe lösen. Falls ein Live-Modell nötig ist: Aufruf über einen Cloudflare Worker, der Schlüssel liegt nur serverseitig, mit Rate-Limit. Das ist ein eigener Schritt mit eigener Absprache. |
| 6 | Bewerbungs-Essentials | CV-Download, Kontakt, Links (GitHub, LinkedIn). Ohne-JS-Fallback, Meta-/OG-Tags, Favicon, Seitentitel. |
| 7 | Feinschliff | Performance-Messung, Mobil, Reduced-Motion, Lighthouse, Cross-Browser, Sound optional (standardmäßig aus). |

Die Reihenfolge darf sich ändern, sobald etwas ausprobiert wurde. Nach jedem Schritt Status und Roadmap hier aktualisieren.

## Status

- **Schritt 1 erledigt** (gemerged): Box + Cursor-Schwarm.
- **Schritt 2 gebaut** (siehe PR): Bots mit Jobs.
  - Konzept: jeder Cursor hat einen Job und ein Namensschild (`layout-bot`, `copy-bot`). Das zeigt, wie Bots arbeiten.
  - Ablauf: Klick auf die Box ("Build Website") lässt zwei Cursors herausplatzen. Das `layout-bot` zieht die Karte unter der Box auf
    (Skalierung ab der oberen linken Ecke folgt dem Cursor), dann tippt das `copy-bot` den Satz und folgt dabei dem Textcursor.
    Danach wandern beide frei herum. Die Box heißt dann "Build again" und startet den Ablauf erneut.
  - Code: `js/cursors.js` (`CursorSwarm` mit gemeinsamem rAF-Loop, `Cursor` mit `moveTo`/`follow`/`wander`/`click`),
    `js/intro.js` (der Intro-Job als `async`-Ablauf), `js/main.js` (Verdrahtung).
    Neue Jobs sind einfach weitere `async`-Abläufe auf diesen Bausteinen.
  - Der Satz steht als Text in einem `<noscript>` in `index.html`. Ohne JS ist er sofort sichtbar (Button ausgeblendet).
    Mit JS liest `js/intro.js` ihn und entfernt das Element: vor dem Klick ist die Karte komplett leer, den Text tippen erst die Bots. Screenreader bekommen den ganzen Satz auf einmal (`sr-only`) und eine `role="status"`-Meldung.
  - `prefers-reduced-motion`: kein Anlauf, keine Ripples. Karte und Text sind sofort da, die Cursors stehen still daneben, kein Replay.
  - Die Obergrenze von 40 Cursors bleibt als Sicherung im `CursorSwarm`. Die Zähler-Anzeige ("Enough!") aus Schritt 1 entfällt.
  - Der Intro-Satz ist vorläufig: "Hi, welcome to my personal website". Er steht in `index.html` im `<noscript id="intro-text">`. Name und Handle (Micael Gomes Fernandes, ._lazybox_) kommen später dazu.

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
  Der Intro-Ablauf dauert ca. 9 Sekunden. In Tests auf Zustände warten (z. B. Label "Build again"), keine festen Pausen.
- Vor jedem PR kurz prüfen, dass `dienstplan.html`, `datenschutz.html` und `nutzungsbedingungen.html` ohne Fehler laden.
