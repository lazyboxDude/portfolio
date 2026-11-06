# Plan: Interaktive Bewerbungs-Website

> Einstieg für einen neuen Chat: erst `CLAUDE.md`, dann diese Datei lesen.
> Der aktuelle Stand steht im Abschnitt **Status**. Immer genau einen Schritt pro PR bauen.

## Ziel

Micael G. Fernandes bewirbt sich bei einer AI-Firma. Die Website (gomes-fernandes.ch) soll nicht
erklären, wie gut er ist, sondern es **zeigen**: eine interaktive, animierte Seite, die sich
handwerklich sauber, verspielt und durchdacht anfühlt.

**Am Ende ist die Seite sein Portfolio und sein CV in einem:** eine vollständige Landingpage über ihn
(Hero, Über mich, Werdegang, Skills, Projekte, Kontakt, CV-Download), die sich **vor den Augen der
Besucher:innen selbst baut**. Ein Team aus Bot-Cursors arbeitet live an der Seite, und die Seite ist
gleichzeitig der Beweis, dass er genau so etwas bauen kann.

Die alte Website (Game-Dev/3D-Art-Portfolio) ist eingefroren in `archive/v1-2026-11/`.
Nicht anfassen. Ideen oder Inhalte dürfen von dort übernommen werden.

## Zielbild (Vibe)

Drei Referenzvideos von Micael (nicht im Repo, weil Fremdmaterial und groß). Das haben sie gemeinsam
und das wollen wir:

1. **Linea** (hell, ruhig, Serifen-Kursiv als Akzentwort wie *calm*): Die Seite startet leer und weiß.
   Mehrere Cursors mit Namensschildern (Pills: Mia, Ravi, Kai, ...) tippen die Navigation, ziehen
   Karten auf, setzen Texte (I-Beam-Cursor) und bauen von oben nach unten eine komplette Landingpage:
   Hero, Produkt-Mockup, Logo-Leiste, Bento-Features, Zitat, Preise, CTA, Footer.
2. **Orbit** (dunkel, Teal/Gold-Glow): Die Cursors heißen nach ihrem **Job** (`Claude · type`,
   `Claude · color`, `Claude · layout`, `Claude · glass`, `Claude · a11y`, ...) und bekommen je eine
   Farbe. Beim Arbeiten blenden sie **Inspector-Labels** ein (`backdrop-filter: blur(22px)`,
   `640 · 92px / 0.98`, `175 × 67`, Auswahlrahmen mit Griffen). Man sieht, wie das Design entsteht.
   Danach läuft die fertige Seite scroll-getrieben weiter (3D-Objekt, gekippte Phone-Mockups).
3. **Bakelayer** (dunkel, elektrisches Blau): **Skalierung.** Aus wenigen Cursors wird ein Schwarm
   von hunderten (`agent-756`, `kyc-agent`, `vibe-agent`, ...), mit Linien zwischen ihnen und einem
   Zähler unten (`1,048,576 agents · 5 layers`). Der Schwarm sammelt sich zu einer geschichteten
   3D-Struktur (Pyramide aus Layern) hinter der Headline.

Was daraus für uns folgt:

- Die **Cursor-Sprache** (Pills mit Namen und Farbe, I-Beam beim Tippen, Auswahlrahmen, Inspector-Labels)
  ist das Markenzeichen der Seite.
- **Hero-Moment:** Klick, und die Seite baut sich auf. Das gibt es schon (Schritt 1 bis 3, Teil 1).
- **Scroll-getriebenes Bauen:** Jeder Abschnitt baut sich, wenn man ihn erreicht. Die Bots wandern mit.
- **Finale/Signatur:** der Schwarm. Er steht für "ich kann Agenten orchestrieren" und passt zur Zielgruppe.
- **Inhalt ist echt:** Hinter jeder gebauten Karte steckt ein echter CV-/Portfolio-Inhalt, kein Lorem ipsum.

### Mockup (Referenz für das Endergebnis)

Gestaltungsentwurf der fertigen Seite: https://claude.ai/artifact/7Mt2y5VDf1my2k34tmtWv5
(privater Artifact, nur für Micael sichtbar; die Quelldateien liegen bewusst nicht im Repo, weil das Deploy statisch und öffentlich ist).

- **Board "Desktop"** (1440 px): Nav-Pill, Hero mit Headline "I build interfaces that *build themselves.*", Cursors mit Namensschildern,
  Inspector-Labels und Auswahlrahmen · Streifen "Now" · Über mich · Projekte als Bento (Dienstplan mit Browser-Mockup, "This website", Archiv, Platzhalter) ·
  Werdegang · Skills als Schwarm um einen Stapel aus fünf Layern mit Button "More agents" und Zähler · CTA mit CV-Download · Footer.
- **Board "Mobil"** (390 px): Hero und Skills.
- **Look:** dunkel (`#07090f`), Akzent Blau `#6f8cff` mit Cyan-Hauch, Inter + Instrument Serif kursiv für das Akzentwort + JetBrains Mono für Labels.
  Job-Farben der Bots: layout blau `#7b95ff`, copy pink `#ff8fb8`, design gelb `#ffc766`, a11y grün `#6fe3a5`, motion violett `#b79bff`, dazu Cyan `#5fd4f0`.
- Alles in `[Klammern]` ist ein Platzhalter für echte CV-Daten (siehe offene Frage 4). Cursors, Labels und Schwarm sind im Mockup Standbilder.

## Leitlinien

- **Interaktion zuerst.** Jede Seite hat etwas zum Anfassen. Inhalt wird durch Interaktion freigeschaltet.
- **Schritt für Schritt.** Jeder Schritt ist ein kleiner, lauffähiger PR, der für sich Spaß macht.
- **Kein Build-Schritt.** Statisches HTML, CSS und Vanilla-JS (ES-Module). Das Hosting ist statisch (Cloudflare).
  Eine Bibliothek oder ein Bundler kommt erst dazu, wenn ein Schritt sie wirklich braucht, und das wird im PR begründet.
  Absehbar: Der Schwarm (Schritt 7) braucht ein `<canvas>` statt DOM-Cursors. Das ist ohne Bibliothek machbar.
  Das 3D-Objekt lässt sich mit CSS-3D (`transform`) lösen. Three.js nur, wenn das nicht reicht.
- **Performance.** Ein `requestAnimationFrame`-Loop, nur `transform`/`opacity` animieren, Obergrenzen für Objektzahlen.
  DOM-Cursors bleiben bei maximal 40. Alles darüber (Schwarm) wird auf Canvas gezeichnet, mit fester Obergrenze und Abbruch bei Frame-Einbruch.
- **Barrierefrei.** Bedienbar per Tastatur (echte `<button>`s), `prefers-reduced-motion` respektieren,
  dekorative Ebenen (Cursors, Inspector-Labels, Schwarm) mit `aria-hidden`.
  **Name, CV, Kontakt und alle Inhalte müssen ohne JS und ohne Animation lesbar sein.** Die Seite ist ja der CV.
- **Mobil mitdenken.** Es gibt dort keinen Mauszeiger, also Pointer-Events und Touch von Anfang an mitdenken.
  Auf dem Handy laufen die Bots allein, Besucher:innen scrollen und tippen auf Buttons.
- **Design über Tokens.** Farben, Schriften, Radien als CSS-Variablen in `:root`, damit ein Look-Wechsel (hell/dunkel) billig bleibt.

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
| 2 | Bots mit Jobs: Intro baut sich selbst | erledigt, [PR #15](https://github.com/lazyboxDude/portfolio/pull/15) und [PR #16](https://github.com/lazyboxDude/portfolio/pull/16): Cursors mit Job und Namensschild bauen die erste Karte. |
| 3 | Folge von Bauschritten | erledigt: Teil 1 ([PR #17](https://github.com/lazyboxDude/portfolio/pull/17)): ein Klick pro Abschnitt, zweite Karte mit Name und Handle. Teil 2 ([PR #19](https://github.com/lazyboxDude/portfolio/pull/19)): Startbox verschwindet nach dem ersten Klick, Pill für die Folgeschritte, Bots mit Persönlichkeit (reagieren im Leerlauf auf den echten Mauszeiger und aufeinander, klicken ins Leere). |
| 4 | **Cursor-Sprache** (Orbit/Linea) | gebaut (siehe Status): Job-Farben, drei Pointer-Formen (Pfeil, I-Beam, Stift), Auswahlrahmen mit Griffen, Inspector-Labels mit echten Werten, `design-bot` zeichnet den Akzentrahmen. Die Persönlichkeit im Leerlauf kommt aus Schritt 3 (Teil 2) und gilt auch für den neuen Bot. Die weiteren Bots aus dem Mockup (`a11y-bot`, `motion-bot`) kommen mit den Inhalten in Schritt 6 und 7. |
| 5 | **Landingpage-Gerüst: Hero + Nav** (Linea) | Die Seite startet leer und baut sich zur echten Landingpage auf: Nav-Pill (getippt), Hero-Headline mit Serifen-Kursiv-Akzent, zwei Buttons (CV, Kontakt), Hintergrund-Glow. Der Box-Klick wird zum "Start"-Moment, danach geht es scroll-getrieben weiter. Look wird hier festgelegt (siehe offene Frage 3). |
| 6 | **Scroll-getriebenes Bauen + CV-Abschnitte** | Jeder Abschnitt baut sich beim Erreichen live (IntersectionObserver, Bots wandern mit): Über mich, Werdegang/Timeline, Skills als Bento-Grid, Kontakt/CTA, Footer. Inhalte aus echten CV-Daten (Micael liefert sie, siehe offene Frage 4). Ohne-JS-Fallback von Anfang an (`<noscript>`-Muster aus Schritt 3). |
| 7 | **Projekte als Mockups** | Projekte (Dienstplan-App, ausgewählte Arbeiten aus dem Archiv) als Browser-/Phone-Mockups, die die Bots zusammensetzen (gekippt, mit Tiefe wie bei Orbit), mit Link zur Live-App oder zum Case. |
| 8 | **Schwarm-Finale** (Bakelayer) | Signatur der Seite: Ein Klick (z. B. "More agents") skaliert von wenigen auf hunderte Cursors (`agent-NNN`, Job-Namen), gezeichnet auf `<canvas>`, mit Verbindungslinien und Zähler. Der Schwarm sammelt sich zu einer geschichteten Struktur (CSS-3D oder Canvas), die für Micaels Skill-Ebenen steht. Harte Obergrenze, Frame-Budget, Reduced-Motion zeigt ein Standbild. |
| 9 | AI-Element | Etwas, das zur Zielgruppe passt: z. B. die Cursors als kleine Agenten, die eine echte Aufgabe lösen. Falls ein Live-Modell nötig ist: Aufruf über einen Cloudflare Worker, der Schlüssel liegt nur serverseitig, mit Rate-Limit. Das ist ein eigener Schritt mit eigener Absprache. |
| 10 | Bewerbungs-Essentials | CV-Download (PDF), Kontakt, Links (GitHub, LinkedIn). Ohne-JS-Fallback prüfen, Meta-/OG-Tags (mit Vorschaubild), Favicon, Seitentitel, Druck-Stylesheet. |
| 11 | Feinschliff | Performance-Messung, Mobil, Reduced-Motion, Lighthouse, Cross-Browser, Sound optional (standardmäßig aus). |

Die Reihenfolge darf sich ändern, sobald etwas ausprobiert wurde. Nach jedem Schritt Status und Roadmap hier aktualisieren.
Schritt 8 und 9 sind die Show-Stücke, aber Schritt 5 bis 7 liefern schon eine vollständige, bewerbungsfähige Seite.
Wird die Zeit knapp, dann zuerst 10 (Essentials) vorziehen, bevor 8 oder 9 gebaut werden.

## Status

- **Schritt 1 erledigt** (gemerged): Box + Cursor-Schwarm.
- **Schritt 2 erledigt** (gemerged): Bots mit Jobs. Jeder Cursor hat einen Job und ein Namensschild (`layout-bot`, `copy-bot`).
- **Schritt 3 erledigt** (gemerged, Teil 1 [PR #17](https://github.com/lazyboxDude/portfolio/pull/17), Teil 2 [PR #19](https://github.com/lazyboxDude/portfolio/pull/19)): Folge von Bauschritten, Startbox, Persönlichkeit.
  - **Ablauf:** Der erste Klick auf die Startbox ("Build Website") lässt sie schrumpfen und ausblenden (danach `hidden`), die Bots platzen an der Klickstelle heraus.
    Die Box kommt nie wieder und es werden nie wieder Cursors gespawnt (nur die zwei Bots, `layout-bot` und `copy-bot`).
    Das `layout-bot` zieht die Karte auf (Skalierung ab der oberen linken Ecke folgt dem Cursor, mit Ripple beim "Mausdruck"), das `copy-bot` tippt den Satz und folgt dem Textcursor.
  - **Folge:** 1. "Hi, welcome to my personal website", 2. "I'm Micael Gomes Fernandes, or online ._lazybox_." (Pill davor: "Who are you?").
    Danach heißt die Pill "Build again" und baut von vorn. Weitere Abschnitte sind weitere `<section class="card">` in `#cards` (`index.html`),
    der Pill-Text davor steht in `data-prompt`.
  - **Pill statt Box:** Die Pill (`#next`) liegt unter den Karten und ist nur sichtbar, solange kein Bau läuft. Danach bekommt sie den Fokus (Tastatur).
    Während des Baus liegt der Fokus auf `#build`, damit er nie auf `<body>` fällt.
    Die Karten (`#build`) starten dort, wo die Box war, wachsen nach unten, und gebaute Karten wandern nie.
    Ungebaute Karten belegen keinen Platz (`display: none` bis `is-reserved`).
  - **Persönlichkeit** (`js/cursors.js`): Jeder Cursor hat `shyness`, `curiosity` und `sociability`. Sie gelten nur im Leerlauf (`idle()`), nicht bei der Arbeit.
    `layout-bot` ist scheu: hält Abstand zum echten Mauszeiger und flieht, je schneller die Maus, desto früher.
    `copy-bot` ist neugierig: geht zum Mauszeiger und umkreist ihn. Ruht die Maus länger als 4 s, verliert er das Interesse.
    Idle-Cursors halten Abstand zueinander, hängen manchmal beieinander ab und klicken ab und zu ins Leere (Ripple).
    Touch wird ignoriert (es gibt dort keinen Hover).
  - **Code:** `js/cursors.js` (`CursorSwarm` mit gemeinsamem rAF-Loop und Mauszeiger-Tracking, `Cursor` mit `moveTo`/`follow`/`idle`/`click`),
    `js/build.js` (`SiteBuilder` und `Section`, früher `js/intro.js`), `js/main.js` (Verdrahtung).
  - **Ohne JS und Barrierefreiheit:** Jeder Satz steht in einem `<noscript>` in der jeweiligen Karte. Ohne JS sind alle Sätze sofort sichtbar (Buttons ausgeblendet).
    Mit JS liest `js/build.js` sie und entfernt das Element: vor dem Bau ist eine Karte komplett leer, der Text kommt erst beim Bau ins DOM.
    Screenreader bekommen den ganzen Satz auf einmal (`sr-only`) und eine `role="status"`-Meldung.
  - **`prefers-reduced-motion`:** Der Loop läuft nicht, also kein Anlauf, keine Reaktionen, keine Ripples. Die Box ist sofort weg, jeder Klick zeigt den nächsten Abschnitt sofort,
    die Cursors stehen still daneben, nach dem letzten gibt es keine Pill mehr.
  - Die Obergrenze von 40 DOM-Cursors bleibt als Sicherung im `CursorSwarm`.
- **Plan umgebaut** (gemerged, [PR #18](https://github.com/lazyboxDude/portfolio/pull/18)): Zielbild aus den Referenzvideos (Linea, Orbit, Bakelayer) eingearbeitet.
  Roadmap von 8 auf 12 Schritte erweitert, das Endziel ist jetzt ausdrücklich "Portfolio + CV, das sich selbst baut". Dazu ein Mockup als Referenz (Abschnitt "Mockup").
- **Schritt 4 gebaut** (im PR #20): Cursor-Sprache. Noch keine neuen Inhalte, nur das Handwerk.
  - **Drei Bots, drei Formen:** `layout-bot` (Pfeil, blau, scheu), `copy-bot` (I-Beam, pink, neugierig), `design-bot` (Stift, gelb, gesellig).
    Konfiguration in `JOBS` (`js/build.js`: Name, Farbe, Form, Persönlichkeit), die Form wählt `Cursor.setKind('arrow' | 'text' | 'pen')` (`js/cursors.js`).
    Jede Form hat ihren Hotspot (`--hx`/`--hy`), der Namens-Pill sitzt relativ dazu. `swarm.add()` nimmt jetzt `color` (Hex) statt `hue`.
  - **Bauablauf pro Klick:** `layout-bot` zieht die Karte auf (Auswahlrahmen mit Griffen, Tag mit der Live-Größe, z. B. `556 × 80`),
    danach tippt `copy-bot` (Tag mit der echten Typografie aus `getComputedStyle`, z. B. `500 · 22px / 1.55`), **gleichzeitig** zeichnet `design-bot`
    den Akzentrahmen (4 Ecken blenden ein, 4 Kanten wachsen, nur `transform`/`opacity`; Tag `border 1.5px #6c8cff`). Die Rahmen-Teile erzeugt `Section` in `js/build.js`.
  - **Inspector-Tags:** `cursor.inspect(text, x, y)` / `cursor.hideTag()`, Klasse `InspectorTag` in `js/cursors.js`, Stil `.inspector-tag` in `css/site.css`.
  - **Leerlauf:** unverändert das Persönlichkeitssystem aus Schritt 3 (Teil 2), der `design-bot` ist als dritter Bot dabei und der I-Beam/Stift sind im Leerlauf sichtbar.
  - **Reduced Motion:** Rahmen sofort fertig gezeichnet, keine Tags, Bots geparkt.
  - Ein Bauschritt dauert ca. 8 Sekunden. **Nächster Schritt: 5 (Landingpage-Gerüst: Hero + Nav).**

## Offene Fragen an Micael

1. **Sprache:** Englisch (passt zu einer internationalen AI-Firma) oder Deutsch? Aktuell: Englisch auf der Startseite.
2. **Zielfirma/Rolle:** Wofür genau bewirbst du dich (Rolle, Firma)? Das bestimmt, was in Schritt 6 bis 9 gezeigt werden soll.
3. **Look:** Die Referenzen gehen in zwei Richtungen: Linea hell und ruhig, Orbit/Bakelayer dunkel mit Glow.
   Empfehlung (so ist das Mockup gebaut): dunkel mit einem blauen Akzent (passt zu Bakelayer und zum jetzigen Stand), dazu ein Serifen-Kursiv-Akzentwort aus Linea für Wärme. Einverstanden?
4. **Inhalte (CV-Daten):** Ich brauche für Schritt 6 und 7 die echten Daten: Werdegang (Stationen, Zeiträume), Skills (3 bis 5 Ebenen für den Schwarm/die Struktur),
   welche Projekte rein sollen, Kontaktdaten und Links, ein aktuelles CV als PDF. Welche 3 bis 5 Dinge sollen Besucher:innen unbedingt über dich erfahren?
5. **AI-Element (Schritt 9):** Soll es ein echtes Modell im Hintergrund geben (kostet Geld, braucht einen Worker) oder reicht eine gebaute Illusion?
6. **Schwarm-Struktur (Schritt 8):** Soll die Struktur am Ende eine Pyramide aus Layern sein (wie bei Bakelayer) oder etwas Eigenes, das zu dir passt (z. B. deine Skill-Ebenen, ein Logo)?

## Arbeitsweise

- Branch: der Chat bekommt einen Branch vorgegeben. Pro Schritt ein PR gegen `main`. Ist der PR gemerged, den Branch neu von `main` starten.
- Commit-Messages und Chat auf Deutsch, Code und Kommentare auf Englisch.
- Lokal testen: `python3 -m http.server` im Repo-Root, dann `http://localhost:8000` öffnen.
  Browser-Test mit Playwright (ist in der Umgebung vorinstalliert). Das Element `#box` schwebt dauerhaft, deshalb in Tests mit `{ force: true }` klicken (die Pill `#next` schwebt nicht).
  Ein Bauschritt dauert ca. 8 Sekunden. In Tests auf Zustände warten (z. B. `#next` mit Klasse `is-ready` und Label "Who are you?" oder "Build again"), keine festen Pausen.
- Vor jedem PR kurz prüfen, dass `dienstplan.html`, `datenschutz.html` und `nutzungsbedingungen.html` ohne Fehler laden.
