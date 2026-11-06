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
| 2 | Bots mit Jobs: Intro baut sich selbst | erledigt, [PR #15](https://github.com/lazyboxDude/portfolio/pull/15) und [PR #16](https://github.com/lazyboxDude/portfolio/pull/16): die Seite baut sich live auf, wie Bots arbeiten. Ein Cursor zieht die Karte auf, ein zweiter tippt den Text. |
| 3 | Mehr Jobs + Persönlichkeit | erledigt, [PR #17](https://github.com/lazyboxDude/portfolio/pull/17) und [PR #19](https://github.com/lazyboxDude/portfolio/pull/19): Folge von Bauschritten (Name und Handle als zweite Karte), Startbox verschwindet nach dem ersten Klick, Bots mit Persönlichkeit reagieren auf den echten Mauszeiger, aufeinander und klicken im Leerlauf. Weitere Bauarten (Karten tragen, zeichnen, Abschnitte beim Scrollen) kommen mit den Inhalten in Schritt 4. |
| 4 | Projekte entdecken | Projekte (u. a. Dienstplan-App, ausgewählte Arbeiten aus dem Archiv) werden spielerisch freigeschaltet und verlinkt. |
| 5 | AI-Element | Etwas, das zur Zielgruppe passt: z. B. die Cursors als kleine Agenten, die eine echte Aufgabe lösen. Falls ein Live-Modell nötig ist: Aufruf über einen Cloudflare Worker, der Schlüssel liegt nur serverseitig, mit Rate-Limit. Das ist ein eigener Schritt mit eigener Absprache. |
| 6 | Bewerbungs-Essentials | CV-Download, Kontakt, Links (GitHub, LinkedIn). Ohne-JS-Fallback, Meta-/OG-Tags, Favicon, Seitentitel. |
| 7 | Feinschliff | Performance-Messung, Mobil, Reduced-Motion, Lighthouse, Cross-Browser, Sound optional (standardmäßig aus). |

Die Reihenfolge darf sich ändern, sobald etwas ausprobiert wurde. Nach jedem Schritt Status und Roadmap hier aktualisieren.

## Status

- **Schritt 1 erledigt** (gemerged): Box + Cursor-Schwarm.
- **Schritt 2 erledigt** (gemerged): Bots mit Jobs. Jeder Cursor hat einen Job und ein Namensschild (`layout-bot`, `copy-bot`).
- **Schritt 3, Teil 1 erledigt** (gemerged): Folge von Bauschritten, zweite Karte mit Name und Handle.
- **Schritt 3, Teil 2 gebaut** (siehe PR): Startbox verschwindet, Bots mit Persönlichkeit.
  - **Startbox:** Der erste Klick lässt sie schrumpfen und ausblenden (danach `hidden`), die Bots platzen an der Klickstelle heraus.
    Sie kommt nie wieder und spawnt nie wieder Cursors. Die zwei Bots entstehen nur beim ersten Klick, danach wird nichts mehr gespawnt.
  - **Weiter geht es mit einer Pill** (`#next`) unter den Karten: erst "Who are you?", nach dem letzten Schritt "Build again".
    Sie ist nur sichtbar, solange kein Bau läuft, und bekommt danach den Fokus (Tastatur). Während des Baus liegt der Fokus auf `#build`, damit er nie auf `<body>` fällt.
    Die Karten (`#build`) starten dort, wo die Box war, wachsen nach unten, und gebaute Karten wandern nie.
    Ungebaute Karten belegen keinen Platz (`display: none` bis `is-reserved`).
  - **Persönlichkeit** (`js/cursors.js`): Jeder Cursor hat `shyness`, `curiosity` und `sociability`. Sie gelten nur im Leerlauf (`idle()`), nicht bei der Arbeit.
    `layout-bot` ist scheu: hält Abstand zum echten Mauszeiger und flieht, je schneller die Maus, desto früher.
    `copy-bot` ist neugierig: geht zum Mauszeiger und umkreist ihn. Ruht die Maus länger als 4 s, verliert er das Interesse.
    Idle-Cursors halten Abstand zueinander, hängen manchmal beieinander ab und klicken ab und zu ins Leere (Ripple).
  - Touch wird ignoriert (es gibt dort keinen Hover). Mit `prefers-reduced-motion` läuft der Loop nicht: kein Anlauf, keine Reaktionen, keine Ripples.
    Jeder Klick zeigt den nächsten Abschnitt sofort, nach dem letzten gibt es keine Pill mehr.
  - Code: `js/cursors.js` (`CursorSwarm` mit gemeinsamem rAF-Loop und Mauszeiger-Tracking, `Cursor` mit `moveTo`/`follow`/`idle`/`click`),
    `js/build.js` (`SiteBuilder` und `Section`), `js/main.js` (Verdrahtung).
  - Jeder Satz steht in einem `<noscript>` in der jeweiligen Karte. Ohne JS sind alle Sätze sichtbar (Buttons ausgeblendet).
    Mit JS liest `js/build.js` sie und entfernt das Element: vor dem Bau ist eine Karte komplett leer.
  - Offen gelassen: "reagieren auf die Box" aus dem alten Plan entfällt, weil die Box verschwindet.

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
  Browser-Test mit Playwright (ist in der Umgebung vorinstalliert). Das Element `#box` schwebt dauerhaft, deshalb in Tests mit `{ force: true }` klicken (die Pill `#next` schwebt nicht).
  Ein Bauschritt dauert ca. 9 Sekunden. In Tests auf Zustände warten (z. B. `#next` mit Klasse `is-ready` und Label "Who are you?" oder "Build again"), keine festen Pausen.
- Vor jedem PR kurz prüfen, dass `dienstplan.html`, `datenschutz.html` und `nutzungsbedingungen.html` ohne Fehler laden.
