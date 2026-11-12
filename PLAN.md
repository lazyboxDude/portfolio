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
- **Kein Build-Schritt.** Statisches HTML, CSS und Vanilla-JS (ES-Module). Das Hosting ist statisch: **Vercel** (Deploy), Domain bei GoDaddy, DNS/Proxy über Cloudflare.
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
- `archive/` bleibt unverändert. Ausnahme: `archive/v1-2026-11/docs/` (altes CV-PDF und `CV.txt` mit privaten Daten) bleibt im Repo, wird aber nicht ausgeliefert: `vercel.json` leitet `/archive/v1-2026-11/docs/*` auf `/cv.html` um (`.assetsignore` greift nur bei Cloudflare-Deploys).

## Privatsphäre (gilt für alles, was ausgeliefert wird)

- **Keine privaten Daten auf der Website:** keine Wohnadresse, Telefonnummer, Geburtsdatum, Zivilstand, Nationalität und keine Kontaktdaten Dritter (z. B. von Referenzen). Öffentlich sind Name, Stationen, Skills, E-Mail, GitHub, LinkedIn.
- **Keine PDFs im Deploy.** Der CV ist die Seite `cv.html` (Deutsch und Englisch), die der Browser auf Knopfdruck als PDF speichert. Zeugnisse und Diplome (Scans) gehören nicht ins Repo.
- Dieses PLAN.md liegt im öffentlichen Repo: keine privaten Daten hier hineinschreiben.

## Roadmap

| # | Schritt | Ergebnis |
|---|---------|----------|
| 0 | Archiv + leerer Root | erledigt, [PR #13](https://github.com/lazyboxDude/portfolio/pull/13) |
| 1 | Box + Cursor-Schwarm | erledigt, [PR #14](https://github.com/lazyboxDude/portfolio/pull/14): Box spawnt mehrere Mauszeiger, die herumwandern. |
| 2 | Bots mit Jobs: Intro baut sich selbst | erledigt, [PR #15](https://github.com/lazyboxDude/portfolio/pull/15) und [PR #16](https://github.com/lazyboxDude/portfolio/pull/16): Cursors mit Job und Namensschild bauen die erste Karte. |
| 3 | Folge von Bauschritten | erledigt: Teil 1 ([PR #17](https://github.com/lazyboxDude/portfolio/pull/17)): ein Klick pro Abschnitt, zweite Karte mit Name und Handle. Teil 2 ([PR #19](https://github.com/lazyboxDude/portfolio/pull/19)): Startbox verschwindet nach dem ersten Klick, Pill für die Folgeschritte, Bots mit Persönlichkeit (reagieren im Leerlauf auf den echten Mauszeiger und aufeinander, klicken ins Leere). |
| 4 | **Cursor-Sprache** (Orbit/Linea) | erledigt, [PR #20](https://github.com/lazyboxDude/portfolio/pull/20): Job-Farben, drei Pointer-Formen (Pfeil, I-Beam, Stift), Auswahlrahmen mit Griffen, Inspector-Labels mit echten Werten, `design-bot` zeichnet den Akzentrahmen. Die Persönlichkeit im Leerlauf kommt aus Schritt 3 (Teil 2) und gilt auch für den neuen Bot. Die weiteren Bots aus dem Mockup (`a11y-bot`, `motion-bot`) sind nachgereicht (Status: "Schritt 4b"), jetzt gibt es fünf Bots. |
| 5 | **Landingpage-Gerüst: Hero + Nav** (Linea) | gebaut (siehe Status): Nav-Pill, Hero mit Serifen-Kursiv-Akzent, zwei Buttons, Hintergrund-Glow. Die Seite ist echtes HTML und baut sich nach dem Klick auf die Startbox selbst (alle drei Bots, drei Spuren parallel). Look festgelegt (dunkel, blau), Schriften selbst gehostet. |
| 5b | **Echtes Bauen: der layout-bot trifft sichtbare Layout-Entscheidungen** | gebaut (siehe Status): keine `scale`-Attrappe mehr. Der Bot zieht Hüllen mit echter Breite/Höhe auf, setzt danach Padding und Gap, zeichnet bei Grids zuerst die Spalten, rastet an Kanten ein und korrigiert sich ab und zu. |
| 6 | **Scroll-getriebenes Bauen + CV-Abschnitte** | gebaut (siehe Status): Über mich, Werdegang, Skills (fünf Ebenen), Kontakt mit CV-Download und Footer bauen sich beim Scrollen. Dazu die mehrsprachige CV-Seite `cv.html` statt PDF. |
| 7 | **Projekte als Mockups** | erledigt, [PR #22](https://github.com/lazyboxDude/portfolio/pull/22): Dienstplan als Telefon mit echtem Screenshot, Aphonia als Poster, zwei Renders aus dem Archiv, diese Seite als Mini-Bild, Dolphin Rush. Mockups sind gekippt (CSS-3D) und richten sich beim Hover auf. |
| 8 | **Schwarm-Finale** (Bakelayer) | gebaut (siehe Status): neuer Abschnitt `#swarm`. "More agents" vervielfacht den Schwarm (16, 48, 144, 432 bis 720 Agents auf `<canvas>`), auf dem Höchststand sammelt er sich zu den fünf Skill-Ebenen. Mit Zähler, Verbindungslinien, Frame-Budget und Standbild bei Reduced Motion. |
| 9 | AI-Element | Etwas, das zur Zielgruppe passt: z. B. die Cursors als kleine Agenten, die eine echte Aufgabe lösen. Falls ein Live-Modell nötig ist: Aufruf über eine serverseitige Funktion (Vercel Function oder Cloudflare Worker), der Schlüssel liegt nur serverseitig, mit Rate-Limit. Das ist ein eigener Schritt mit eigener Absprache. |
| 10 | Bewerbungs-Essentials | Meta-/OG-Tags (mit Vorschaubild), Favicon prüfen, Seitentitel, Ohne-JS-Fallback prüfen. Der CV-Download (mehrsprachige Seite, kein PDF) ist schon in Schritt 6 gebaut, hier bleiben eventuell weitere Sprachen und Feinschliff am Druck. |
| E1 | **Redesign "Editorial", Schritt 1: Look und Hero** | gebaut (siehe Status): hell (Papier/Tinte/Blau), Space Grotesk, flache Nav, Riesen-Name als Hero, Tiefen-Effekt vorbereitet, eckige Buttons. |
| E2 | **Redesign, Schritt 2: wandernde Box als Zuhause der Bots** | gebaut (siehe Status): isometrische Box im Hero, FLIP nach unten rechts, Zähler und Tooltip, Bots gehen heim und kommen beim Bauen wieder heraus, Klick auf die Box ruft alle (ersetzt "Build again"). |
| E3 | **Redesign, Schritt 3: Abschnitte im Editorial-Stil** | gebaut (siehe Status): Projects als Raster mit 1 px Tintenrahmen, About, Experience, Skills, Swarm, Contact und Footer im selben Stil. Damit ist das Redesign "Editorial" komplett (Schritt E1 bis E3). |
| 11 | Feinschliff | Performance-Messung, Mobil, Reduced-Motion, Lighthouse, Cross-Browser, Sound optional (standardmäßig aus). |

Die Reihenfolge darf sich ändern, sobald etwas ausprobiert wurde. Nach jedem Schritt Status und Roadmap hier aktualisieren.
Schritt 8 und 9 sind die Show-Stücke, aber Schritt 5 bis 7 liefern schon eine vollständige, bewerbungsfähige Seite.
Wird die Zeit knapp, dann zuerst 10 (Essentials) vorziehen, bevor 8 oder 9 gebaut werden.

## Status

- **Schritt 1 erledigt** (gemerged): Box + Cursor-Schwarm.
- **Schritt 2 erledigt** (gemerged): Bots mit Jobs. Jeder Cursor hat einen Job und ein Namensschild (`layout-bot`, `copy-bot`).
- **Schritt 3 erledigt** (gemerged, Teil 1 [PR #17](https://github.com/lazyboxDude/portfolio/pull/17), Teil 2 [PR #19](https://github.com/lazyboxDude/portfolio/pull/19)): Folge von Bauschritten, Startbox, Persönlichkeit.
  Die Karten-Folge ("Hi, welcome ..." und "I'm Micael ...") ist in Schritt 5 durch die Landingpage ersetzt. Was davon gilt weiter:
  - **Startbox:** Der erste Klick auf die Box ("Build Website") lässt sie schrumpfen und ausblenden (danach `hidden`), die Bots platzen an der Klickstelle heraus.
    Die Box kommt nie wieder, es werden nie wieder Cursors gespawnt (nur die drei Bots).
  - **Persönlichkeit** (`js/cursors.js`, vom Bau seit der Nachbesserung nach Schritt 8 nicht mehr benutzt, die Bots warten dort ruhig): Jeder Cursor hat `shyness`, `curiosity` und `sociability`. Sie gelten nur im Leerlauf (`idle()`), nicht bei der Arbeit.
    Scheu = hält Abstand zum echten Mauszeiger und flieht (je schneller die Maus, desto früher). Neugierig = geht zum Mauszeiger und umkreist ihn, verliert nach 4 s Ruhe das Interesse.
    Idle-Cursors halten Abstand zueinander, hängen manchmal beieinander ab und klicken ab und zu ins Leere (Ripple). Touch wird ignoriert.
  - **Code:** `js/cursors.js` (`CursorSwarm` mit gemeinsamem rAF-Loop und Mauszeiger-Tracking, `Cursor` mit `moveTo`/`follow`/`idle`/`click`), `js/main.js` (Verdrahtung).
  - Die Obergrenze von 40 DOM-Cursors bleibt als Sicherung im `CursorSwarm`.
- **Plan umgebaut** (gemerged, [PR #18](https://github.com/lazyboxDude/portfolio/pull/18)): Zielbild aus den Referenzvideos (Linea, Orbit, Bakelayer) eingearbeitet.
  Roadmap von 8 auf 12 Schritte erweitert, das Endziel ist jetzt ausdrücklich "Portfolio + CV, das sich selbst baut". Dazu ein Mockup als Referenz (Abschnitt "Mockup").
- **Schritt 4 erledigt** (gemerged, [PR #20](https://github.com/lazyboxDude/portfolio/pull/20)): Cursor-Sprache.
  - **Drei Bots, drei Formen:** `layout-bot` (Pfeil, blau, scheu), `copy-bot` (I-Beam, pink, neugierig), `design-bot` (Stift, gelb, gesellig).
    Konfiguration in `JOBS` (`js/build.js`: Name, Farbe, Form, Persönlichkeit), die Form wählt `Cursor.setKind('arrow' | 'text' | 'pen')` (`js/cursors.js`).
    Jede Form hat ihren Hotspot (`--hx`/`--hy`), der Namens-Pill sitzt relativ dazu. `swarm.add()` nimmt `color` (Hex) statt `hue`.
  - **Inspector-Tags:** `cursor.inspect(text, x, y)` / `cursor.hideTag()`, Klasse `InspectorTag` in `js/cursors.js`, Stil `.inspector-tag` in `css/site.css`.
  - Auswahlrahmen mit Griffen und gezeichneter Rahmen (4 Ecken blenden ein, 4 Kanten wachsen, nur `transform`/`opacity`) leben seit Schritt 5 in `Shape` (`js/build.js`).
- **Schritt 4b gebaut** (siehe PR): `a11y-bot` und `motion-bot`, jetzt arbeiten **fünf Bots** an der Seite. Beide haben echte Arbeit, keine Statisten.
  - **`a11y-bot`** (Lupe, grün `#6fe3a5`): prüft jedes Element mit `data-a11y`, sobald dessen Text getippt und dessen Box aufgezogen ist.
    Er geht hin, hält einen **Fokus-Ring** darum (`FocusRing` in `js/a11y.js`, liegt im Cursor-Layer, fasst die Seite nicht an) und zeigt im Tag den **echten WCAG-Kontrast**
    (`contrast 18.3 : 1 · AAA`, bei Links und Buttons dazu `target 119 × 48`). Die Werte kommen aus `getComputedStyle`, der Hintergrund wird aus den Eltern zusammengesetzt (`contrast()` in `js/a11y.js`).
    Verläufe und Bilder als Hintergrund kennt die Rechnung nicht: `data-a11y` nur an Elemente auf einfarbigem Grund setzen. Fällt ein Wert unter AA, zeigt der Tag `FAIL` (aktuell besteht alles mindestens AAA).
    Markiert sind: Hero (Nav-Button, Headline, Lede), je ein Element in About, Projects, Experience, Skills, Swarm (Button "More agents") und Kontakt.
  - **`motion-bot`** (Funke, violett `#b79bff`): (1) **Hero:** setzt den Hintergrund-Glow in Bewegung (`.glow.is-moving`, zwei langsame `translate`-Schleifen, Tag `drift 26s · ease-in-out`),
    nachdem der `design-bot` ihn angeschaltet hat. (2) **Projects:** zieht jedes `.tilt`-Mockup von flach in seinen 3D-Winkel, der Tag zählt live mit (`rotateY -12° · rotateX 5°`).
    Technik: `.tilt` rechnet seinen Winkel aus `--ry`/`--rx` mal `--t` (0 = flach, 1 = gekippt, Standard 1). Mit JS startet jedes Mockup bei `--t: 0`, der Bot dreht `--t` per Frame hoch, danach übernimmt wieder CSS (Hover richtet es auf). Ohne JS und bei Reduced Motion bleibt `--t` bei 1.
  - **Markup/Engine:** `data-a11y` ist die neue Konvention (siehe Kommentar in `index.html`). Die Spuren heißen in `SiteBuilder.animate` `a11y` und `motion`, laufen parallel zu den anderen drei, `checkElement()`, `startDrift()` und `tiltIn()` sind die Handgriffe.
    Der Hero braucht weiterhin ca. 15 s (die Checks sind auf früh stehende Elemente gelegt), jeder Abschnitt ein bis drei Sekunden länger als vorher.
  - **Bugfix nebenbei:** Positionen (Cursor, Ripple, Tags, Ring) werden jetzt mit der CSS-Eigenschaft `translate` gesetzt statt mit `transform: translate3d(...)`. Die einzelne Eigenschaft `scale` wirkt **nach** `transform`
    und hat die Position mitskaliert: Ripples flogen von der Ecke oben links nach aussen, statt am Klickpunkt zu bleiben (gemessen), und Cursors poppten von dort ein. Inspector-Tags werden ausserdem am rechten Rand eingeklemmt, statt abgeschnitten zu werden.
  - **Mobil und Reduced Motion:** wie bei den anderen Bots. Bei Reduced Motion stehen alle fünf geparkt, Mockups sofort gekippt, Glow an (ohne Drift). Das Mini-Bild in "This website" zeigt jetzt fünf Bots.
- **Schritt 5 gebaut** (im PR): Landingpage-Gerüst, Hero + Nav. Die Seite ist jetzt echtes HTML und baut sich nach dem Klick auf die Startbox selbst.
  - **Inhalt** (nur Wahres, nichts Erfundenes): Nav-Pill mit Logo `._lazybox_`, Links zu Dienstplan, Archiv, GitHub und LinkedIn und Button "Contact" (`mailto:`).
    Hero mit Eyebrow, Headline "I build interfaces that *build themselves.*" (Akzentwort in Instrument Serif kursiv), Lede, "About me" und "Say hello" (`mailto:micael@gomes-fernandes.ch`, steht schon auf der alten Seite).
    Der "Download CV"-Button aus dem ersten Entwurf ist in Schritt 6 nach unten in den Kontaktbereich gewandert.
  - **Wer baut was:** `layout-bot` zieht die Nav-Pill, den Nav-Button und die zwei Hero-Buttons auf (Auswahlrahmen, Live-Größen-Tag). `copy-bot` tippt alle Texte Zeichen für Zeichen
    (Tag mit der echten Typografie, z. B. `600 · 96px / 1.00 · -0.035em`). `design-bot` schaltet den Hintergrund-Glow an, zeichnet die Unterstreichung unter dem Akzentwort und den Rahmen des Ghost-Buttons.
    Drei Spuren laufen parallel (Reihenfolge in `SiteBuilder.buildAnimated`). Der Bau dauert ca. 14 Sekunden.
  - **Markup-Konvention** (`index.html`): `data-box` = Form, die der `layout-bot` aufzieht (bis dahin `visibility: hidden`). `data-type` = Text, den der `copy-bot` tippt.
    `Typable` (`js/build.js`) macht daraus pro Zeichen ein `span` (unsichtbar bis getippt), damit sich das Layout nie verschiebt, und behält das Markup (Links, Akzentwort).
    `Shape` kapselt Aufziehen, Auswahlrahmen und gezeichneten Rahmen (`--piece-r` = Eckenradius, wird pro Element gesetzt, Pillen werden auf die halbe Höhe begrenzt).
  - **Schriften** liegen im Repo (`fonts/`, Inter variabel und Instrument Serif kursiv, jeweils nur `latin`, OFL), damit keine Anfrage an Google geht. Der Bau wartet auf `document.fonts.ready` (max. 1,5 s), bevor die Bots messen.
  - **Look festgelegt** wie im Mockup: dunkel (`#07090f`), Akzent Blau `#6c8cff`, serifenloser Fließtext. Tokens in `:root` von `css/site.css`.
  - **Bots müssen nicht zur Ruhe kommen:** `ARRIVE`/`TYPE_ARRIVE` in `js/build.js` lassen einen Schritt beginnen, sobald der Bot nah genug ist (die Feder holt ihn beim Folgen ein). Das hat den Bau von 31 auf 14 Sekunden gedrückt.
  - **Ohne JS** ist alles sofort sichtbar (Start-Box und "Build again" ausgeblendet, Glow und Unterstreichung an, Ghost-Button mit Rahmen).
    **Barrierefreiheit:** Jeder Text bekommt eine `sr-only`-Kopie (die Zeichen-Spans sind `aria-hidden`), Screenreader lesen also alles auf einmal. Vor dem Klick ist die Seite `visibility: hidden` (nicht fokussierbar), während des Baus liegt der Fokus auf `#site`.
    Schlägt der Bau fehl, zeigt `showAll()` die fertige Seite (nie eine halbe Seite).
  - **`prefers-reduced-motion`:** Alles sofort fertig, Bots stehen still daneben, keine Tags, keine "Build again"-Pill.
  - **Pill "Build again"** (`#next`, unten mittig) baut alles von vorn, nur sichtbar, solange kein Bau läuft.
  - Die Einschränkung aus Schritt 3 bleibt: Scrollt man mitten im Bau, stimmen die Bot-Positionen nicht mehr (der Hero passt in einen Bildschirm). Das Scroll-getriebene Bauen kommt in Schritt 6.
- **Schritt 6 gebaut** (im PR, zusammen mit Schritt 5): Scroll-getriebenes Bauen, CV-Abschnitte, mehrsprachiger CV.
  - **Seitenaufbau** (`index.html`): Hero · Über mich · Werdegang · Skills · Kontakt · Footer. Jeder Block ist ein `data-section`.
    Der Hero baut sich nach dem Klick auf die Startbox, **jeder weitere Abschnitt, wenn er in den Bildschirm scrollt** (seit der Nachbesserung nach Schritt 8: schon kurz davor, siehe dort). Vor dem Klick ist Scrollen gesperrt.
    Wer an einen späteren Abschnitt springt (Anker, Scrollbalken), sieht alle übersprungenen Abschnitte sofort fertig, nur der Abschnitt im Bild wird gebaut. Der Footer erscheint ohne Bots (`data-instant`).
    "Build again" (`#next`) steht am Ende der Seite und erscheint erst, wenn alles gebaut ist. Es scrollt nach oben und baut von vorn.
  - **Die Bau-Engine ist jetzt allgemein** (`js/build.js`): Sie liest das Markup und baut jeden Abschnitt mit denselben drei Spuren.
    `data-box` (layout-bot zieht auf, `data-box="fast"` = kleine Wiederholer ohne Größen-Tag), `data-type` (copy-bot tippt; `data-tag` zeigt die Typografie, `data-speed` überschreibt das Tempo),
    `data-underline` und `data-outline` (design-bot zeichnet). Ein Text wartet auf die Form um ihn, eine Unterstreichung auf ihren Text, ein Rahmen auf seine Form. Neue Abschnitte brauchen nur Markup, kein JS.
  - **Tempo:** Das Tippen eines Abschnitts soll etwa `data-type-ms` dauern (Standard 4,5 s, Hero 4,2 s, Kontakt 3 s), unterhalb des Hero höchstens halb so langsam wie voll. Bauzeiten: Hero ca. 15 s, Über mich 3 s, Werdegang 5 s, Skills 6 s, Kontakt 9 s.
  - **Scroll-fest:** Alles, worauf die Bots zielen, wird relativ zur Seite gemessen (`anchor()` in `js/build.js`, neu `Cursor.chase()` und Tags, die einer Funktion folgen, in `js/cursors.js`). Scrollt man mitten im Bau, bleiben die Bots an ihren Elementen. Das behebt die Einschränkung aus Schritt 3.
  - **Inhalt** stammt aus dem aktuellen Lebenslauf und dem Dienstplan-Projekt. Die Texte unter "About" sind aus den Fakten formuliert, nicht von Micael geschrieben: bitte lesen und anpassen.
    Skills als fünf Ebenen: 1 Business und Betrieb, 2 3D und Grafik, 3 Game Engines, 4 Programmieren, 5 KI-Werkzeuge. Das ist auch die Grundlage für den Schwarm in Schritt 8.
  - **CV statt PDF:** `cv.html` enthält den Lebenslauf als HTML, pro Sprache ein `<article class="cv">` (Deutsch und Englisch), mit Sprachwechsel (ohne JS über `:target`, mit JS zusätzlich nach Browsersprache) und Druckstil für A4.
    "Save as PDF" öffnet den Druckdialog des Browsers, der Seitentitel wird zum Dateinamen. Eine neue Sprache: Artikel kopieren, übersetzen, Link in die Toolbar. `css/cv.css`, `js/cv.js`.
    Der CV enthält bewusst keine privaten Daten (siehe "Privatsphäre"), "weitere Angaben und Referenzen auf Anfrage".
  - **Kontakt:** "Download CV" steht unten im Kontaktbereich und führt auf `cv.html`. Die Nav verlinkt About, Experience, Skills und Dienstplan. GitHub, LinkedIn, Archiv und die Rechtsseiten stehen im Footer.
  - **Altes CV-PDF** und `CV.txt` im Archiv: In Schritt 6 nur über `.assetsignore` ausgeschlossen, das bei Vercel nichts bewirkt. Seit Schritt 7 leitet `vercel.json` die Adressen unter `/archive/v1-2026-11/docs/` auf `/cv.html` um (bleiben im Repo und in der Git-Historie).
  - Gemerged als [PR #21](https://github.com/lazyboxDude/portfolio/pull/21).
- **Schritt 7 erledigt** (gemerged, [PR #22](https://github.com/lazyboxDude/portfolio/pull/22)): Projekte als Mockups, neuer Abschnitt `#projects` zwischen "About" und "Experience". Nav: About, Projects, Experience, Skills.
  - **Fünf Karten:** Dienstplan (Web-App im Einsatz, Link auf die App), Aphonia (Moonflux Interactive, 2025, Links zu Steam und zum Studio), "Selected renders" (alle acht Arbeiten aus dem Archiv als Galerie mit Titel, Werkzeugen und Jahr, Link ins Archiv),
    "This website" (Mini-Bild dieser Seite mit den drei Bots) und Dolphin Rush (2023, nur Text). Alle Angaben stammen aus dem Dienstplan selbst und aus dem alten Portfolio im Archiv (`js/projects-data.js`), nichts ist erfunden.
  - **Mockups mit Tiefe:** `.tilt` kippt die Geräte per `perspective()`/`rotateY()`, `@media (hover: hover)` richtet sie beim Hover auf, mit Reduced Motion ohne Übergang.
    Das Telefon zeigt einen **echten Screenshot** der Dienstplan-App im Leerzustand (ohne Daten), das Aphonia-"Poster" ist reine Typografie (es gibt kein Titelbild). Aphonia und Dolphin Rush bleiben so (Micael).
  - **Bilder** liegen in `images/projects/` (Webp, 22 bis 85 KB, zusammen ca. 0,5 MB, `loading="lazy"`, `width`/`height` gesetzt, damit sich das Layout nie verschiebt). Die Originale im Archiv (3 bis 21 MB pro PNG) werden nicht verlinkt.
    **Alle acht Renders sind drin** (Entscheidung von Micael). Titel, Kategorie, Werkzeuge und Jahr stammen aus `js/projects-data.js` im Archiv, die Bildbeschreibungen (`alt`) habe ich selbst geschrieben.
  - **Bau:** Nur die Karten und das Dienstplan-Telefon werden vom `layout-bot` aufgezogen, die übrigen Mockups erscheinen mit ihrer Karte, die Ghost-Buttons haben keine eigene Form.
    `data-outline` funktioniert dafür jetzt auch **ohne** `data-box` (der `design-bot` zeichnet den Rahmen, sobald der Text getippt ist). Bauzeit des Abschnitts ca. 9 s (vorher 16 s mit 13 einzelnen Formen).
  - **Cache-Hinweis:** Nach einem Deploy hat ein Browser die neue HTML-Seite mit alten CSS/JS-Dateien angezeigt (erkennbar am Schritt-1-Label "6 cursors"). Vercel liefert statische Dateien mit `max-age=0, must-revalidate`, das erklärt es nicht.
    **Ursache bestätigt (Messung an der Live-Seite):** HTML kommt mit `max-age=0`, **JS, CSS, Bilder und PDFs mit `max-age=14400`** (4 Stunden) und `server: cloudflare`. Das ist die Cloudflare-Einstellung "Browser Cache TTL" (Standard 4 Stunden), Vercel selbst sendet `max-age=0`.
    Wer die Seite innerhalb von 4 Stunden vor einem Deploy besucht hat, sieht danach neue HTML mit alten CSS/JS-Dateien. Abhilfe in Cloudflare: Caching, Configuration, Browser Cache TTL auf "Respect Existing Headers", dann einmal "Purge Everything".
    Oder Proxy aus (graue Wolke, nur DNS), denn Vercel hat ein eigenes CDN. Im Repo lässt sich das nicht lösen. Die Apex-Domain `gomes-fernandes.ch` leitet mit 307 auf `www.gomes-fernandes.ch` um.
  - **Live geprüft (Stand Schritt 6):** Das alte CV-PDF (1,5 MB) und `CV.txt` sind unter `www.gomes-fernandes.ch/archive/v1-2026-11/docs/` noch öffentlich abrufbar, bis `vercel.json` deployt ist. Nach dem Deploy in Cloudflare "Purge Everything" (sonst kann der Edge-Cache das PDF noch ausliefern) und die Adresse prüfen: sie soll auf `/cv.html` umleiten.
  - **Weiterleitung:** `vercel.json` leitet `/archive/v1-2026-11/docs/*` auf `/cv.html` um (so wird auch der alte "Download"-Link im Archiv zur neuen CV-Seite).
- **Schritt 8 gebaut** (siehe PR): Schwarm-Finale, neuer Abschnitt `#swarm` zwischen "Skills" und "Kontakt" (Titel "Press the button, *they multiply.*").
  - **Ablauf:** Es starten 16 Agents, die umherwandern. "More agents" verdreifacht den Schwarm (16, 48, 144, 432, dann bis zur Obergrenze). Auf dem Höchststand **sammeln sie sich von selbst** zu fünf Ebenen (isometrische Rauten, unten die breiteste),
    der Zähler zeigt die echte Zahl ("720 agents · 5 layers"). "Stack them up" schaltet den Stapel auch von Hand (`aria-pressed`, der Text bleibt gleich). Der Zeiger scheucht Agents beiseite.
  - **Ebenen = Skills:** Die fünf Ebenen sind die fünf Skill-Karten (Business, 3D, Engines, Programmieren, KI-Tools), je eine Farbe. In der Liste neben dem Bild (echte `<button>`s) hebt Hover, Fokus oder Tippen eine Ebene hervor, die anderen werden blasser.
  - **Technik** (`js/agents.js`, `AgentField`): Zeichnen auf `<canvas>` (die 40 DOM-Cursors reichen hier nicht), aber **aus dem gemeinsamen Loop** (`CursorSwarm.onFrame`), es gibt weiterhin nur ein `requestAnimationFrame`. Ein vorgezeichnetes Sprite pro Ebene (`drawImage`), alle Verbindungslinien in einem Pfad,
    nur die ersten 14 Agents zeigen ihren Namen (`agent-NNN`, `layout-agent` ...). Gezeichnet und bewegt wird nur, solange der Abschnitt im Bild ist (IntersectionObserver).
  - **Obergrenzen und Budget:** 720 Agents (Breite ab 720 px), 360 auf dem Handy. Frisst das Zeichnen im Schnitt mehr als 10 ms pro Frame (45 Frames in Folge), entfallen die Linien und der Schwarm wächst nicht weiter (`degrade()`, Button "Enough for this device").
    Gemessen im Headless-Browser: 60 fps mit 720 Agents.
  - **Reduced Motion:** ein Standbild mit 240 Agents im Stapel, die Buttons sind weg (`[hidden]` gilt jetzt auch für Buttons, global in `css/site.css`). Ohne JS bleibt nur die Liste der Ebenen.
  - **Barrierefreiheit:** Das Canvas ist `aria-hidden`, der Text daneben sagt dasselbe. Der Zähler ist `role="status"`. Die Bühne wird vom `layout-bot` aufgezogen (`data-box`), der Rahmen des Stack-Buttons vom `design-bot` gezeichnet.
  - **Bau-Engine:** Ein `data-outline`-Element ohne Text und ohne eigene Form wartet auf die Form um es.
  - **Nächster Schritt: 9 (AI-Element).** Das ist ein eigener Schritt mit eigener Absprache (siehe offene Frage 6).
- **Nachbesserung Cursor-Logik (nach Schritt 8):** Die Bots schwirrten nach dem Bau im Bild herum, und neue Abschnitte begannen erst, wenn man schon hinscrollte. Jetzt (`js/build.js`):
  - **Vorausbauen:** Ein Abschnitt wird gebaut, sobald seine Oberkante weniger als `LOOKAHEAD` (0,8) Bildschirmhöhen unter dem unteren Bildrand liegt. Nach dem Hero baut sich also gleich "About", ohne dass man scrollt;
    wer kontinuierlich scrollt, findet die Seite schon vor oder sieht die Bots mitten im Bau. Die Bots zielen auf Seitenpositionen (`anchor()`), arbeiten also unter dem Bildrand und kommen beim Scrollen ins Bild.
  - **Kein Herumwandern mehr:** `idle()` wird im Bau nicht mehr benutzt. Ein Bot ohne Aufgabe wartet an der "Baufront" am unteren Bildrand (`SiteBuilder.restPoint`, x je Bot versetzt).
    Steht alles, parken die drei Bots gestapelt unten rechts. Sie reagieren nicht mehr auf den Mauszeiger.
  - **Überscrollt:** Scrollt man an einem Abschnitt vorbei, der gerade gebaut wird, wird er sofort fertiggestellt (`skipPast()`), und die Bots machen mit dem nächsten weiter.
  - Die Persönlichkeit (scheu/neugierig/gesellig, Schritt 3 Teil 2) steckt noch in `js/cursors.js` (`idle()`), wird aber vom Bau nicht mehr gerufen. Kann bei Bedarf entfernt werden.
  - **Bekannte Folge:** Der Abschnitt direkt unter dem Hero baut sich, bevor man ihn sieht, wenn man im Hero liest. Wer das Bauen mehr sehen will, senkt `LOOKAHEAD`.
- **Redesign "Editorial", Schritt 1 gebaut** (Branch `claude/bold-lamport-n9w5kv`, kein PR): Referenz ist ein privates Mockup (https://claude.ai/artifact/4t7DPkX3g1pkpZbvjc3S63, Boards "E · Editorial, state 1" und "state 3").
  Das Redesign hat drei Schritte (E1 bis E3 in der Roadmap), jeder ein eigener Commit-Block, nach jedem Schritt Stopp und Bericht.
  - **Tokens** (`:root` in `css/site.css`, die alten Dunkel-Tokens sind weg): Papier `--bg #fbfaf6`, Fläche `--surface #fff`, Tinte `--fg #0b0c10`, `--muted #3d4050`, `--subtle #5a5d6a`, Linie `--line #e7e4da`, `--line-strong #cfcbbf`, Akzent `--accent #3355ff`. Später dazu (keine festen Hex-Werte mehr im CSS/Markup ausser den Ebenen- und Bot-Farben): `--accent-on-ink`, `--muted-on-ink`, `--hover`, `--graphite`, `--graphite-top` (die Box).
    Kontrast gemessen: Akzent auf Papier 5,2 : 1, Weiss auf Akzent 5,4 : 1, `--subtle` 6,3 : 1. `--accent-soft` und `--accent-2` entfallen. Der Gutter ist `--gutter` (20 bis 48 px).
  - **Schriften:** Space Grotesk (variabel, latin, `fonts/space-grotesk-latin-var.woff2`, OFL, Eintrag in `fonts/README.md`) für alles, Instrument Serif kursiv für Akzentwörter und Tagline, Mono bleibt die System-Mono. Die Datei hat die Achse 300 bis 700, genutzt werden 400 (Fliesstext), 500 und 700.
    Kein Google-Request zur Laufzeit (wird in `tools/check.mjs` geprüft). Inter bleibt im Repo, weil `cv.html` es noch nutzt.
  - **Nav:** flache Leiste, 72 px, Linie unten, Logo, Home/About/Projects/Experience/Skills in Grossbuchstaben (12 px, 0.14em), eckiger Button "Contact". Der aktive Link (Akzent, 1 px Unterstrich, `aria-current`) folgt dem Scrollen (`markNav()` in `js/main.js`). Mobil zwei Zeilen.
  - **Hero:** Der Name ist die H1 (`#headline`, 700, -0.045em, einzeilig, `14.17vw` = 204 px bei 1440), rechts abgeschnitten. Links wird er nur minimal angeschnitten (`margin-left: -1vw`), damit "Micael" lesbar bleibt. Das Mockup schneidet links viel stärker (ca. -17vw), das ist ein einziger Wert in `h1` (`css/site.css`).
    Die Tagline darunter (Instrument Serif kursiv) ist "Game designer, 3D artist and tool builder. I build interfaces that *build themselves.*". Buttons "Say hello" (gefüllt) und "See my work" (Rahmen, Anker `#projects`, `#work-link` ersetzt `#about-link`). Unten Linie mit "Scroll" und den fünf Skill-Ebenen.
    Eyebrow und Lede ("This page builds itself ...") sind unverändert geblieben (Wortlaut), das Mockup zeigt sie nicht.
  - **Tiefe:** `.hero` ist ein eigener Stacking-Kontext (`isolation: isolate`, Papier als Hintergrund), die H1 ist ab 1000 px Papierfarbe mit `mix-blend-mode: difference` (schwarz auf Papier, hell über Dunklem), darunter schwarzer Text. Mit einer eingeschobenen dunklen Fläche getestet, es wirkt. Die Box kommt in Schritt E2 darunter.
    Der Hintergrund-Glow (`#glow`) liegt jetzt im Hero (`z-index: -1`), weil der Hero deckend ist. Er ist ein dezenter blauer und ocker Schimmer.
  - **Eckig:** `.btn`, `.nav-cta`, `.layer-btn`, `.next` und `.box` haben Radius 0. Karten und Chips bleiben vorerst rund (Schritt E3). **Bau-Engine:** Bei Radius 0 teilte `Shape.setDrawn`/`drawPoint` durch 0 (NaN, Bots hätten ein NaN-Ziel bekommen), jetzt abgefangen (`js/build.js`).
  - **Übrige Abschnitte:** nur neue Tokens (weisse Flächen mit Linie, Kontakt als Tinten-Block, Footer), kein Umbau. Cursor-Umrisse sind jetzt Tinte statt weiss (`js/cursors.js`, `js/agents.js`), Schwarm-Linien blau, Ebenen-Rauten kräftiger auf Hell. Namens-Pills behalten dunklen Text.
  - **Eingabeleiste** ("Ask the bots to build something") bewusst weggelassen (totes Bedienelement bis Roadmap-Schritt 9).
  - **Fehlende Dateien:** `DESIGN.md` gibt es im Repo nicht (weder hier noch auf `main`), der Bau-Vertrag ist in `index.html` (Kommentar vor `#site`), im Kopf von `js/build.js` und oben in diesem Plan beschrieben. `tools/check.mjs` und `tools/shoot.mjs` gab es ebenfalls nicht, sie sind in diesem Schritt neu (siehe Arbeitsweise).
  - **Mobil:** Der Name bleibt einzeilig und riesig (55 px bei 390), also rechts abgeschnitten ("Micael Gomes Fe"). Der volle Name steht im Eyebrow darüber.
- **Redesign "Editorial", Schritt 2 gebaut** (gleicher Branch, kein PR): Die Box wandert und wird das Zuhause der Bots.
  - **Ablauf:** Die Box (`#box-wrap` mit `<button id="box">`, Label "Open the box") steht im Hero rechts, hinter dem Namen, als isometrisches SVG (`aria-hidden`), graphit, Deckel einen Spalt offen mit Akzent-Lichtkante, Logo auf der Seite, Hinweis "Click to open" (mobil "Tap to open").
    Klick: Der Deckel hebt sich, die Bots (jetzt fünf) platzen aus der Öffnung und bauen den Hero wie bisher. **Sobald der Name getippt ist** (`data-dock-after` an der H1), fliegt die Box nach unten rechts. So kippen die Buchstaben beim Tippen über der Box auf Hell und beim Abflug wieder zurück.
    Das Mockup zeigt den Namen schon vor dem Klick, der Bau bleibt aber "wie bisher" (Seite leer bis zum Klick). Will man den Effekt schon vor dem Klick, müsste der Name statisch sichtbar sein statt getippt (dann braucht der Hero ein deckendes Pseudo-Element, weil die Seite bis zum Klick `visibility: hidden` ist).
  - **Flug = EINE Transform-Animation** (`js/dock.js`, `Dock.fly()`, WAAPI): Zielrechteck messen (kurz die Klasse `is-home` setzen, messen, zurücknehmen), `translate` und `scale` von der Startgrösse **herunter** animieren (so bleibt der Vektor scharf), im Hero hinter dem Namen. Im selben Frame, in dem die Animation endet, zieht die Box nach `<body>` und bekommt `position: fixed; right/bottom` mit `env(safe-area-inset-*)`, am selben Ort, also ohne Sprung.
    (Direkt zu `position: fixed` im Hero ging nicht: Der Hero ist ein Stacking-Kontext, spätere Abschnitte würden über der angedockten Box liegen.) Angedockt: 120 px Breite auf Desktop, 72 px bis 760 px Breite, 24 bzw. 16 px Abstand. Sie bleibt dort für immer.
  - **Layout:** Zwischen Eyebrow und Name liegt `.box-slot` (nimmt den freien Platz des Hero). Desktop ab 1000 px: die Box ragt aus dem Slot hinter den Namen (`--bw`, Mitte leicht über der Namensmitte). Darunter sitzt sie ganz im Slot (Mindesthöhe), damit der dort nicht überblendete schwarze Name nie über der dunklen Box liegt.
    Der Hero-Strip lässt rechts Platz für die angedockte Box, der Footer unten ebenfalls.
  - **Zuhause** (`js/cursors.js`): `idle({ at })` lässt einen Bot ruhig an seinem Rastpunkt warten (`SiteBuilder.rest`), nach `homeDelay()` (ca. 6 s, scheue Bots früher: `6 s * (1.4 - 0.8 * shyness)`) und nur wenn gerade nichts gebaut wird (`Dock.canReceive`), ruft er `goHome(dock)`:
    zur Öffnung laufen (18 px darüber), dort schrumpfen und ausblenden (`.is-entering`, nur `scale` und `opacity` auf den inneren Teilen, nicht auf dem positionierten Element), Zähler plus 1, die Box "federt" kurz. `callBack(dock)` bricht einen Heimweg ab, wartet auf einen, der gerade hineinsinkt, oder holt einen Bot heraus (`emerge`, mit kleinem Schwung nach links oben, versetzt um 130 ms).
    Zustände pro Bot: `work`, `walking`, `entering`, `home` (`swarm.counts()`). Persönlichkeit steckt jetzt in `JOBS` (`js/build.js`): layout-bot scheu (geht zuerst heim), copy-bot neugierig, design-bot gesellig. Das Herumwandern aus Schritt 3 (`idle()` ohne `at`) ist weiter ungenutzt.
  - **Bauen mit Zuhause** (`SiteBuilder.callBots`): Ein Abschnitt ruft nur die Bots, die er braucht (layout bei Formen, copy bei Texten, design bei Unterstreichung/Rahmen/Hero). Der Rest bleibt zu Hause (Experience braucht z. B. keinen design-bot). Wartende Bots stehen nach dem Bau links neben der Box.
  - **Klick auf die gedockte Box** ruft alle Bots heraus und baut die Seite neu auf, `#next` ("Build again") gibt es nicht mehr. Während ein Bau läuft, ist die Box `aria-disabled` (bleibt fokussierbar, ignoriert Klicks). Label für Screenreader: "Call the bots".
  - **Anzeige:** Badge in Akzent mit der Zahl der Bots zu Hause (nur ab 1), Tooltip beim Hover/Fokus "1 home · 2 on their way" (dazu "· n at work", wenn Bots arbeiten). Zähler als `role="status"`, der Satz fürs Vorlesen ("2 bots are at home.") wird höchstens alle 0,9 s aktualisiert (leise).
  - **Reduced Motion:** Die Box dockt sofort an, alle Bots sind zu Hause (Zähler 5 seit dem Merge mit `main`, vorher 3), keine Animation, die Box ist gesperrt (`aria-disabled`, Label "The bots are at home"). Ohne JS gibt es keine Box (der Slot ist `display: none`).
  - **Offene Entscheidungen, Standards genommen:** (1) Klick auf die Box = Neu-Aufbau (Alternative: Bots zur Eingabeleiste, Roadmap-Schritt 9). (2) Keine Eingabeleiste. (3) Akzent Blau `#3355ff`.
  - **Bekannt:** Die Box deckt unten rechts 120 x 145 px Inhalt ab (fix, wie im Mockup); die Bots warten links daneben. Scrollt man während des 1,5 s langen Flugs, rechnet `Dock.fly()` den Scroll in den Zielpunkt ein (`setKeyframes` bei jedem Scroll-Event), die Box landet ohne Sprung (getestet).
- **Redesign "Editorial", Schritt 3 gebaut** (gleicher Branch, kein PR): Alle Abschnitte im Editorial-Stil.
  - **Gemeinsame Regeln** (`css/site.css`, Bereich "Sections below the hero"): Eyebrow als Grossbuchstaben-Label mit Laufweite, Titel 700 / -0.045em mit Serifen-Kursiv-Akzentwort, Raster aus 1 px Tintenlinien, kein Radius, keine Füllung (Papier), Hairline (`--line`) zwischen den Abschnitten. `.wrap` ist 1344 px breit (Gutter wie die Nav).
    Titelgrössen: `.title-xl` 112 px bei 1440 (Projects, Experience, Skills), `.title` 80 px (About, Swarm), Contact 96 px. Neues Muster für Zellen, die sich eine Linie teilen: eigener Rahmen pro Zelle mit `margin: 0 -1px -1px 0` (Skills, About-Liste), damit jede Zelle für sich vom `layout-bot` aufgezogen werden kann.
  - **Projects:** Titel 112 px, darunter ein Rahmen (`.cells`, `data-box`) mit drei Zellen (01 Dienstplan, 02 Aphonia, 03 This website): Mono-Nummer, Label, Titel 44 px, Text, Links unten. Dann im selben Rahmenstil "Selected renders" (04, mit der Galerie der acht Renders, quadratische Bilder ohne Radius, Linien statt Karten) und Dolphin Rush (05).
    Die Links sind Textlinks in Grossbuchstaben mit 1 px Unterstreichung, die der `design-bot` zeichnet (`data-underline`, ohne JS ein Rahmen unten). Der Inspector-Tag des `design-bot` zeigt dafür jetzt die echten Werte der Linie (Dicke und Farbe) statt fest "2px Akzent".
  - **Entfallen:** Die Geräte-Mockups (gekipptes Telefon mit Dienstplan-Screenshot, Aphonia-Poster, Mini-Bild dieser Seite) und ihr CSS (`.tilt`, `.phone`, `.poster`, `.mini*`), weil das Mockup die Zellen ohne Bild zeigt. `images/projects/dienstplan.webp` ist gelöscht (wurde nicht mehr benutzt).
  - **Neue Texte** (bitte prüfen): Link "See the source" in Zelle 03 (auf `https://github.com/lazyboxDude/portfolio`, das Repo ist öffentlich; das Mockup hat dort einen toten Link "See how"), Label "Contact" über dem Kontakt-Titel, Nummern 01 bis 05 (`aria-hidden`).
    Alle übrigen Texte sind wortgleich. Die Aphonia-Zelle hat zwei Links (Steam und Moonflux), das Mockup nur einen.
  - **About:** Text links, die vier Schwerpunkte als Liste mit Linien rechts. **Experience:** ein Rahmen, Zeilen mit Linien, Datum in Mono. **Skills:** fünf Zellen (zwei oben, drei unten), Layer-Label in Mono und Akzent. **Swarm:** weisse Bühne mit Tintenrahmen, die Ebenenfarben bleiben.
    **Contact:** ein Tinten-Block (links ausgerichtet) mit hellem Akzentwort, Mail-Button hell, "Download CV" mit hellem Rahmen. **Footer:** Tintenlinie, Grossbuchstaben-Links (40 px Touch-Höhe).
  - **`main` eingearbeitet** (Merge von `main` nach Schritt 3, Konflikte in `index.html`, `css/site.css`, `js/build.js`, `PLAN.md`): Die fünf Bots, der echte `layout-bot` (Hülle, Padding/Gap, `data-grid`) und die Bauzeiten von `main` gelten weiter. Was die Zusammenführung geändert hat:
    - **Fünf Bots + Box:** `SiteBuilder.callBots()` ruft pro Abschnitt nur die nötigen von fünf Bots aus der Box (layout: Formen oder Grids, copy: Texte, design: Hero oder Unterstreichung/Rahmen, a11y: `data-a11y`, motion: Hero oder `.tilt`). Der Hero ruft also alle fünf, "About" z. B. nur layout, copy und a11y. Reduced Motion: alle fünf Bots zu Hause (Zähler 5). Persönlichkeit: a11y-bot eher vorsichtig, motion-bot gesellig.
    - **Projects als echtes Grid:** `.cells` ist jetzt `data-grid`, jede Zelle ein eigenes `data-box` (eigener Rahmen, Nachbarn teilen eine Linie wie bei Skills). Der `layout-bot` zeichnet erst die drei echten Spalten, dann zieht er die Zellen hinein, mit Padding-Schritt ("pad 28").
    - **`data-a11y`** sitzt an Elementen mit einfarbigem Grund: Nav-Button, Tagline (statt der H1: der überblendete Name hat keinen einfarbigen Grund), Lede, zweiter About-Absatz, Link "Open the app", "Moonflux Interactive, Zürich", erste Skill-Beschreibung, "More agents", Mail-Button. Texte von `main` übernommen ("checks it and sets it in motion", "Five cursor bots ...").
    - **Fehler in der Bau-Engine behoben** (gab es schon auf `main`, mit dem Projects-Grid aus lauter einzelnen Zellen wurde er sichtbar): Scrollt man an einem Abschnitt vorbei, der gerade gebaut wird, bricht `skipPast()` ihn ab. Eine Spur, die früh aufhört, meldet ihre Box oder ihren Text aber nie als fertig, und die Spuren, die darauf warten (zuletzt der `a11y-bot`), hingen für immer.
      `pumping` blieb dann `true`, nichts wurde mehr gebaut, die Box blieb gesperrt. Jetzt löst `section.release()` beim Abbruch alle wartenden Zusagen auf (auch wenn der Abbruch kommt, bevor die Spuren angelegt sind), und jede Spur prüft nach jedem Warten, ob ihr Abschnitt abgebrochen wurde. `typeText` prüft den eigenen Abschnitt statt `this.current`.
      Getestet: erst mitten im Projects-Bau stehenbleiben, dann ganz durchscrollen: alles wird fertig, die Endgeometrie der Elemente stimmt mit der statischen Seite überein (47 Elemente, einzige Abweichung: der Schwarm ist animiert 35 px höher, weil die Buttons-Leiste bei Reduced Motion fehlt).
    - **motion-bot trägt die Box:** Im Editorial-Look gibt es keine `.tilt`-Mockups mehr (Zellen ohne Bild). Seine neue Arbeit im Hero: Nach dem Glow-Drift wartet er, bis der Name getippt ist, geht zum Deckel der Box, packt sie (`SiteBuilder.carryBox()`) und folgt ihr auf dem Flug in die Ecke.
      Der Tag zeigt die echten Werte der Transform-Animation ("translate 248px 473px · scale 0.43", gelesen aus `Dock.bounds()`). Bei einem Replay steht die Box schon in der Ecke, dann trägt er nichts. Das Kippen von Mockups (`Tilt`, `tiltIn`) bleibt im Code und läuft wieder an, sobald ein `.tilt` im Markup steht.
      Der Flug selbst startet weiter in `Dock.fly()`; fällt der `motion-bot` aus, holt `run()` ihn am Ende nach.
- **Schritt 5b gebaut** (siehe Commit): Echtes Bauen. Der `layout-bot` tat nur so (fertiges Element per `scale` von der oberen linken Ecke aufgezogen, Ecken und Rahmen wurden dabei elliptisch). Jetzt trifft er Layout-Entscheidungen, die man an Bewegung und Tags sieht. Alles in `js/layout.js` (neu), Hilfsfunktionen in `js/geometry.js` (neu), Verdrahtung in `dragOut()`/`frameOut()`/`openGrid()` (`js/build.js`).
  - **Ablauf pro Karte/Container:** (1) Der Bot zieht eine **Hülle mit echter Breite und Höhe** auf (Tag `980 × 56`, die Zahlen sind die echte Endgröße, geprüft gegen `getBoundingClientRect`). (2) **Auto-Layout:** das Element ist auf seine Endgröße festgenagelt, Padding und Gap starten bei 0, die Kinder stehen als gestrichelte Umrisse gestapelt in der Ecke. Der Bot zieht das Padding von der Ecke nach innen (getönter Padding-Streifen), danach öffnet sich der Gap. Der Tag zählt die echten Werte hoch (`pad 24 32 · gap 16`), die Kinder fließen live an ihren Platz, dann blenden sie ein. (3) Erst jetzt tippt der `copy-bot`.
  - **Raster zuerst:** `data-grid` am Elternteil der Karten (`.projects`, `.skills`). Der Bot liest die echten Spalten (`grid-template-columns` in px), zieht sie als Bänder auf (`grid 2 cols · gap 24`, bei Skills `grid 6 cols · gap 16`), danach ziehen die Karten in die Spalten. Die Bänder verschwinden, wenn die letzte Karte steht.
  - **Snap-Linien:** Nur Kanten, die im fertigen Layout wirklich fluchten (Nachbarn, Innenkante des Elternelements, Spaltenkanten, Seitenmitte), bekommen eine cyanfarbene Linie. Start-Kanten (links/oben) beim Aufsetzen, Ende-Kanten, sobald der Bot nah genug kommt.
  - **Korrekturen:** Jede dritte große Form (> 20 000 px², nicht `fast`) landet erst einige Pixel zu weit (oder zu kurz), der Tag zeigt die falsche Zahl, der Bot hält kurz inne und korrigiert (`1020 × 64`, dann `980 × 56`). Zähler `bigCount`, deterministisch, wird bei "Build again" zurückgesetzt. Im Hero trifft das die Nav, sonst die Schwarm-Bühne.
  - **Abweichung von "nur transform/opacity" (Begründung):** Es ändern sich echte `width`/`height` (nur an der Hülle), `padding`/`gap` und `width`/`height`/`contain` (nur am Element im Bau). Damit nichts springt: (a) Das Element behält seine **Endgröße im Fluss**, die Hülle ist ein eigenes, absolut positioniertes Kind (`div.shell`, trägt die Klassen des Elements und damit dessen Hintergrund, Rahmen, Radius, Schatten), das Element selbst ist dabei durch `.is-building` nur durchsichtig. (b) Beim Auto-Layout ist das Element auf `width`/`height` fixiert und `contain: layout size`, Padding/Gap ändern nur seinen Inhalt. (c) Danach wird alles Inline-Gesetzte wieder entfernt (die Stylesheet-Werte sind dieselben Zahlen). Ausgleichs-Margins wären die Alternative gewesen, brechen aber durch Margin-Collapsing bei Blockgeschwistern.
  - **Geprüft (Playwright, Desktop 1280 und Mobil 390):** pro Frame wurden Rechtecke von Abschnitten, Karten, Titeln und allen Boxen mit dem Endzustand verglichen: **0 Abweichungen** über den ganzen Bau (und die Seitenhöhe bleibt gleich). Dabei kam ein echter Fund heraus: `.row:last-child` traf nicht mehr, sobald ein Hilfsknoten am Ende der Liste hing (+1 px, Seite sprang). Jetzt `.row:last-of-type` (das war auch vorher schon falsch: der alte Auswahlrahmen hing als letztes Kind in der Liste, die letzte Zeile hatte immer eine Linie). Frame-Zeit im Bau: Median 16,7 ms, p95 17,5 ms, Max ca. 30 ms. Nach dem Bau bleiben keine Knoten, Klassen oder Inline-Styles zurück. "Build again" geht. Reduced Motion und ohne JS unverändert (alles sofort fertig, `showAll()` räumt zusätzlich auf, falls ein Bau abgebrochen wird).
  - **Bauzeiten** (vorher, nachher, Desktop): Hero 15,1 s, 15,1 bis 15,4 s · About 3,3 s, 2,6 s · Projekte 8,8 s, 9,2 s · Werdegang 8,5 s, 9,5 s · Skills 5,6 s, 6,6 s · Schwarm 6,0 s, 5,9 s · Kontakt 9,2 s, 9,1 s. Messungen schwanken um etwa 0,5 s. Stellschrauben: `DRAG_MS`, `DRAG_FAST_MS`, `FRAME_MS`, `FRAME_FAST_MS`, `GRID_MS`, `FIX_HOLD_MS` und `SETTLE` in `dragOut()` (`js/build.js`). Der Hero ist vom Tippen begrenzt (die Texte warten auf ihre Boxen), deshalb zählt vor allem, wie schnell die Nav und die Buttons stehen.
  - **Markup:** `data-grid` (Elternteil von Karten), `data-frame="none"` (kein Padding/Gap-Schritt, nur beim Schwarm: sein Canvas würde sonst bei jedem Frame neu skaliert). Neue Abschnitte brauchen weiter nur Markup. Ein Container mit mindestens zwei Kindern und Padding/Gap bekommt den Auto-Layout-Schritt automatisch.
  - **Nicht gebaut** (nicht gewählt): Abstandsmarkierungen im Figma-Stil zwischen Geschwistern. Die Padding-/Gap-Tags und die Spaltenbänder zeigen die Abstände schon.

## Offene Fragen an Micael

1. **Läbesruum, Zeitraum:** Der Lebenslauf nennt 05.2021 bis 02.2024, das Arbeitszeugnis 25.01.2023 bis 13.02.2024. Die Website und der CV zeigen vorläufig **2023 bis 2024** (das, was das Zeugnis belegt). Welches Datum stimmt?
2. **Luxottica, Bezeichnung:** Im Lebenslauf "Sachbearbeiter", im Zeugnis "Praktikant Trade Marketing". Der CV zeigt vorläufig die Zeugnis-Bezeichnung. Passt das?
3. **Über-mich-Texte:** Sie sind aus dem Lebenslauf formuliert. Bitte lesen und in deinen Worten anpassen (Abschnitt "About" in `index.html`).
4. **Zielfirma/Rolle:** Wofür genau bewirbst du dich (Rolle, Firma)? Das bestimmt, was in Schritt 7 bis 9 gezeigt werden soll und ob der CV eine Kurzprofil-Zeile bekommt.
5. **Aphonia-Bilder:** Gibt es ein Titelbild oder Screenshots, die öffentlich sein dürfen? Sonst bleibt das Typografie-Poster.
6. **AI-Element (Schritt 9):** Soll es ein echtes Modell im Hintergrund geben (kostet Geld, braucht einen Worker) oder reicht eine gebaute Illusion?
7. **Schwarm-Struktur (Schritt 8):** Ich habe die Pyramide aus fünf Ebenen gebaut (wie im Mockup, die Ebenen sind die Skill-Karten). Passt das, oder soll es etwas Eigenes sein (z. B. ein Logo)? Der Umbau betrifft nur `layout()` und `target()` in `js/agents.js`.
8. **Weitere CV-Sprachen:** Deutsch und Englisch sind drin. Soll eine weitere dazu (z. B. Portugiesisch, Französisch)?
9. **Cloudflare:** Bitte "Browser Cache TTL" auf "Respect Existing Headers" stellen und nach dem nächsten Deploy "Purge Everything" (siehe Cache-Hinweis in Schritt 7). Die Domain ist für die Sandbox freigegeben (`gomes-fernandes.ch` und `www`), ich kann die Live-Seite also prüfen.

Entschieden: Alle acht Renders werden gezeigt, Aphonia und Dolphin Rush bleiben so, Deploy über Vercel (Domain bei GoDaddy, DNS über Cloudflare), Englisch auf der Startseite, dunkler Look mit blauem Akzent (Mockup), CV als Seite statt PDF, Skill-Ebenen wie oben ("lass das mal so testen").

## Arbeitsweise

- Branch: der Chat bekommt einen Branch vorgegeben. Pro Schritt ein PR gegen `main`. Ist der PR gemerged, den Branch neu von `main` starten.
- Commit-Messages und Chat auf Deutsch, Code und Kommentare auf Englisch.
- Lokal testen: `python3 -m http.server` im Repo-Root, dann `http://localhost:8000` öffnen.
  Browser-Test mit Playwright (ist in der Umgebung vorinstalliert). Die Box `#box` schwebt (Float-Animation) und ist während eines Baus `aria-disabled`, deshalb in Tests mit `{ force: true }` klicken.
  Der Hero baut sich in ca. 15 Sekunden, jeder weitere Abschnitt in 3 bis 9 Sekunden. In Tests auf Zustände warten (z. B. alle `.ch` eines Abschnitts mit Klasse `on`, alle `[data-box]` mit `is-shown` und kein Element mehr mit `is-building` oder `is-framing`, oder `#next` mit Klasse `is-ready`), keine festen Pausen.
  Weitere Abschnitte bauen sich erst, wenn man hinscrollt: im Test mit `window.scrollTo({ top, behavior: 'instant' })` springen (das Standard-Scrollen ist weich).
  Bei Zeitmessungen keine Screenshots mitlaufen lassen, sie verfälschen die Dauer.
- **Werkzeuge** (`tools/`, ohne Abhängigkeiten ausser dem vorinstallierten Playwright): `node tools/check.mjs` (`--quick` überspringt den animierten Hero-Bau) prüft Bau-Vertrag, Kontrast, Touch-Ziele 40 px, Überlauf, Reduced Motion, ohne JS, keine externen Requests und dass die anderen Seiten laden.
  `node tools/shoot.mjs --out <dir>` macht Screenshots (Desktop 1440 und Mobil 390: Start, Hero nach dem Bau, fertige Seite).
- Vor jedem PR kurz prüfen, dass `dienstplan.html`, `datenschutz.html` und `nutzungsbedingungen.html` ohne Fehler laden.
