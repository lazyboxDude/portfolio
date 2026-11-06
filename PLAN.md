# Plan: Interaktive Bewerbungs-Website

> Stand: 2026-11-06. Schritte 0 bis 8 sind gebaut und gemerged. **Schritt 9 ("Echter Bau") ist gebaut, aber noch ohne PR** (wartet auf Micaels Review). Danach: 10.
> Inhalt: 0 Einstieg · 1 Ziel · 2 Zielbild · 3 Zusammenarbeit (verbindlich) · 4 Leitlinien · 5 Privatsphäre und Deployment ·
> 6 Architektur heute · 7 Roadmap · 8 Erledigt · 9 Offene Fragen · 10 Arbeitsweise und QA · 11 Glossar

## 0. Einstieg für einen neuen Agenten (zuerst lesen)

**Lesereihenfolge:** `CLAUDE.md`, dann dieser Plan (Abschnitte 0 bis 3 vollständig, den Rest bei Bedarf). Wenn eine Übergabe-Zip vorliegt: dort `00_START_HERE.md`.

**Worum es geht, in sechs Sätzen**
1. Micael G. Fernandes bewirbt sich bei einer AI-Firma. Seine Website `www.gomes-fernandes.ch` soll **zeigen statt erzählen**, dass er solche Dinge baut.
2. Die Seite ist sein Portfolio und sein CV in einem: Hero, Über mich, Projekte, Werdegang, Skills, Schwarm-Finale, Kontakt.
3. Das Markenzeichen: **drei Bot-Cursors** (`layout-bot`, `copy-bot`, `design-bot`) bauen die Seite vor den Augen der Besucher:innen. Wer scrollt, löst den Bau des nächsten Abschnitts aus.
4. Technik: statisches HTML, CSS und Vanilla-JS (ES-Module), **kein Build-Schritt, kein Framework**. Deploy über Vercel.
5. Stand: Die Seite ist vollständig und live. Es fehlen das AI-Element, die Bewerbungs-Essentials (Vorschaubild beim Teilen) und der Feinschliff.
6. **Kritik von Micael (2026-11-06):** "Die Cursors sind eher Kosmetik, statt dass sie die Website wirklich bauen." Das war berechtigt und ist mit Schritt 9 umgesetzt (siehe 6.2 und 6.5, wartet auf Micaels Review).

**Verbindliche Regeln in Kurzform** (Details in den genannten Abschnitten)
- Chat und Commit-Messages auf **Deutsch**, Code und Kommentare auf Englisch.
- **Keine PRs und keine Merges ohne ausdrückliche Aufforderung** von Micael. Pro PR ein Roadmap-Schritt, danach diesen Plan aktualisieren.
- **Design wird mit Micael abgesprochen**, nicht allein entschieden (Abschnitt 3.2). Skills und Agents werden genutzt (3.4, 3.5).
- **Keine privaten Daten** auf der Website und in diesem Plan (Abschnitt 5).
- Nichts kaputtmachen: `dienstplan.html`, `datenschutz.html`, `nutzungsbedingungen.html` (Abschnitt 5).

## 1. Ziel

Micael bewirbt sich bei einer AI-Firma. Die Seite soll nicht erklären, wie gut er ist, sondern es **zeigen**: eine interaktive, animierte Seite, die sich handwerklich sauber, verspielt und durchdacht anfühlt. Besucher:innen sollen etwas anklicken, entdecken und nebenbei verstehen, wer er ist und was er kann.

**Zielgruppe:** Recruiter:innen und Engineers einer AI-Firma. Sie schauen oft nur 30 Sekunden hin, auf dem Laptop und auf dem Handy. Der erste Eindruck zählt, danach muss der Inhalt schnell auffindbar sein (Werdegang, Projekte, Kontakt, CV).

**Erfolgskriterium:** Jemand öffnet die Seite, versteht in zehn Sekunden "die Seite baut sich selbst, das ist handwerklich stark", findet in einer Minute alles Wichtige und hat Lust, sich zu melden.

Die alte Website (Game-Dev/3D-Art-Portfolio) ist eingefroren in `archive/v1-2026-11/`. Nicht ändern. Inhalte dürfen übernommen werden.

## 2. Zielbild

### 2.1 Die drei Referenzvideos (nicht im Repo, Fremdmaterial)
1. **Linea** (hell, ruhig, Serifen-Kursiv als Akzentwort wie *calm*): Die Seite startet leer. Mehrere Cursors mit Namens-Pills tippen die Navigation, ziehen Karten auf, setzen Texte (I-Beam) und bauen von oben nach unten eine komplette Landingpage.
2. **Orbit** (dunkel, Teal/Gold-Glow): Cursors heißen nach ihrem **Job** (`Claude · type`, `Claude · layout`, `Claude · glass`, `Claude · a11y` ...), haben je eine Farbe und blenden beim Arbeiten **Inspector-Labels** ein (`backdrop-filter: blur(22px)`, `640 · 92px / 0.98`, `175 × 67`, Auswahlrahmen mit Griffen). Man sieht, wie das Design entsteht. Danach läuft die Seite scroll-getrieben weiter (3D-Objekt, gekippte Phone-Mockups).
3. **Bakelayer** (dunkel, elektrisches Blau): **Skalierung.** Aus wenigen Cursors wird ein Schwarm von hunderten (`agent-756`, `kyc-agent` ...), mit Linien und einem Zähler (`1,048,576 agents · 5 layers`). Der Schwarm sammelt sich zu einer geschichteten 3D-Struktur.

### 2.2 Was daraus folgt
- Die **Cursor-Sprache** (Pills mit Name und Farbe, I-Beam beim Tippen, Auswahlrahmen, Inspector-Labels) ist das Markenzeichen.
- **Hero-Moment:** Klick auf die Startbox, die Seite baut sich auf. **Scroll-getriebenes Bauen:** Jeder Abschnitt baut sich, wenn man ihn erreicht.
- **Finale:** der Schwarm. Er steht für "ich kann Agenten orchestrieren".
- **Inhalt ist echt.** Kein Lorem ipsum, keine erfundenen Angaben. Was Micael nicht geliefert hat, steht nicht auf der Seite.
- **Der Bau muss echt sein** (neu, Schritt 9): Die Cursors sollen die Seite wirklich erzeugen, nicht nur eine fertige Seite enthüllen.

### 2.3 Mockup und Look
Gestaltungsentwurf der fertigen Seite: https://claude.ai/artifact/7Mt2y5VDf1my2k34tmtWv5 (privater Artifact, nur für Micael; Quelldateien liegen in der Übergabe-Zip unter `mockup/`, nicht im Repo, weil das Deploy öffentlich ist). Zwei Boards: Desktop (1440 px) und Mobil (390 px). Der Entwurf enthielt noch Platzhalter und Standbilder von Cursors und Schwarm.

**Look (festgelegt, Tokens in `:root` von `css/site.css`):** dunkel `--bg #07090f`, Text `--fg #f2f5ff`, gedämpft `--muted #a3adc8`, Linien `--line #222d4c`, Akzent Blau `--accent #6c8cff` (hell `--accent-soft #9fb4ff`).
Schriften (selbst gehostet in `fonts/`): **Inter** (variabel), **Instrument Serif kursiv** für das Akzentwort in Überschriften, Mono-Stack für Labels. Radien groß (Karten 24px, Pillen 999px).
**Job-Farben der Bots:** layout blau `#7b95ff`, copy pink `#ff8fb8`, design gelb `#ffc766`, dazu grün `#6fe3a5` (a11y), violett `#b79bff` (motion), cyan `#5fd4f0`. Pill-Text immer dunkel (`#06080d`) für Kontrast.

## 3. Zusammenarbeit mit Micael (verbindlich)

Micael entscheidet über **Aussehen, Gefühl, Inhalt und Risiko**. Der Agent entscheidet über Umsetzung und Technik, und schlägt vor. Micael ist entscheidungsfreudig und möchte ehrliche Einschätzungen ("das ist Kulisse, kein echter Bau") statt Schönreden. Er will wenig Text, klare Empfehlungen und Rückfragen nur dort, wo sie wirklich nötig sind.

### 3.1 Rollen
- **Micael:** Auftraggeber, Designentscheider, liefert Inhalte und Zugänge (Cloudflare, GitHub, Vercel), merged oder lässt mergen.
- **Haupt-Agent (der Chat):** spricht allein mit Micael, plant, integriert, prüft, committet. Kann Teilaufgaben an Hilfs-Agents geben (3.5).
- **Hilfs-Agents:** arbeiten still an klar abgegrenzten Teilen und berichten dem Haupt-Agent. Sie sprechen nie mit Micael.

### 3.2 Design-Absprachen: Pflicht-Checkpoints
Der Agent holt Micaels Entscheidung ein, **bevor** etwas Sichtbares festgelegt wird, und zeigt **Ergebnisse, nicht Beschreibungen**.

| Wann | Was der Agent tut | Was Micael entscheidet |
|---|---|---|
| **Start jedes Schritts** (Richtung) | Kurz die Idee in 3 bis 6 Zeilen, bei sichtbaren Änderungen **2 bis 3 Varianten** als Bild (Screenshot, Artifact-Mockup oder Vorschau in der Frage) und eine Empfehlung | Variante A/B/C oder eigene Richtung |
| **Neue sichtbare Elemente** (Karten, Mockups, Icons, Cursor-Formen) | Layout-Skizze oder Mockup, bevor Code entsteht | Layout, Hierarchie, Reihenfolge |
| **Bewegung** (Dauer, Easing, Reihenfolge, Gesten) | Kurzes Video oder Bildfolge plus die Zahlen (z. B. 650 ms, easeInOut) | tempo-, "zu langsam", "zu hektisch" |
| **Typografie und Farbe** (Größen, Gewichte, neue Töne) | Gegenüberstellung vorher/nachher | Größen, Akzentwahl |
| **Texte** (Headline, Über-mich, Beschriftungen, Ton) | Textvorschläge, max. 2 Varianten, Fakten markiert | Wortlaut, Ton |
| **Vor jedem PR** (Review) | Screenshots aller betroffenen Abschnitte (Desktop und Handy), Bauzeiten, Liste "was ist neu, was ist offen" | "so lassen" oder Änderungswünsche |
| **Riskantes oder Kostenpflichtiges** (Modell-Aufruf, neue Abhängigkeit, Änderung der Seitenstruktur, Datenschutz) | Kosten/Nutzen in drei Sätzen, Empfehlung | Ja/Nein |

**Regeln dazu**
- Mindestens **ein Design-Checkpoint pro Schritt am Anfang** und **einer vor dem PR**. Bei vielen kleinen Geschmacksfragen lieber einmal gebündelt fragen (bis zu 4 Fragen gleichzeitig) als ständig unterbrechen.
- Fragen mit dem Frage-Werkzeug (`AskUserQuestion`), **mit Vorschau** (`preview`) wo es um Optik geht, die **Empfehlung zuerst** und als "(Recommended)" markiert.
- Was Micael nicht beantwortet, wird nicht stillschweigend entschieden, sondern als offene Frage geführt (Abschnitt 9). Weitermachen darf der Agent nur mit Teilen, die nicht davon abhängen.
- Entscheidungen werden im **Entscheidungsprotokoll** (8.2) mit Datum festgehalten.
- Der Agent baut keine Variante zu Ende, bevor die Richtung steht. Lieber ein 10-Minuten-Mockup als ein 2-Stunden-Irrweg.

### 3.3 Vorlage für eine Absprache
> **Entscheidung: [Thema]**
> Ausgangslage in einem Satz. **A (empfohlen):** … **B:** … **C:** … (je mit Bild)
> Warum A: zwei Gründe. Was es kostet: Aufwand und Risiko. Ich baue erst nach deiner Antwort.

Mockups: Artifact-Werkzeug (Typ "Design", dazu **zuerst** `Artifact` mit `action: "quickstart"` und `intent: "design"` aufrufen, siehe `artifact-design`). Screenshots: Playwright (siehe 10.2), `deviceScaleFactor: 2` für Bilder, die Micael sieht.

### 3.4 Skills (mit dem Skill-Werkzeug aufrufen, nicht raten)
| Skill | Wann einsetzen |
|---|---|
| **`anthropic-skills:apple-design`** | **Immer** bei Bewegung und Gesten (Federn, Dauer, unterbrechbare Übergänge), Materialien/Tiefe (Blur, Schatten, Glas), Typografie (optische Größen, Laufweite, Zeilenhöhe), Reduced Motion, Feedback und Zustände. Vor und nach jedem visuellen Schritt zur Review. |
| `artifact-design`, `Artifact` (Typ Design) | Mockups, Varianten, Layout-Skizzen für Absprachen. |
| `run` | Die Seite starten, bedienen, Änderung wirklich sehen (vor jedem Bericht "funktioniert"). |
| `code-review`, `simplify` | Vor jedem PR: Fehlersuche, Aufräumen, Doppelungen. |
| `security-review` | Vor Schritt 10 (Modell-Aufruf, Schlüssel, Eingaben) und vor dem PR dazu. |
| `claude-api` | Nur wenn in Schritt 10 ein Modell angebunden wird (Modell-IDs, Parameter, Fehlerbehandlung nie aus dem Gedächtnis). |
| `dataviz` | Nur falls Diagramme entstehen (bisher keine). |
| `update-config`, `fewer-permission-prompts` | Nur wenn Micael es will (Einstellungen). |

Regel: Wer visuell arbeitet und `anthropic-skills:apple-design` nicht geladen hat, hat den Schritt nicht ordentlich begonnen.

### 3.5 Agents: Teilen in höchstens 3 bis 4
Micael erlaubt, große Schritte auf **maximal 3 bis 4 Hilfs-Agents** aufzuteilen. Nie mehr. Nur teilen, wenn die Teile sich **nicht dieselben Dateien** teilen und je mehr als eine Stunde Arbeit sind. Kleine Dinge macht der Haupt-Agent selbst.

**Zuschnitt** (Beispiel für Schritt 9, jeweils mit eigenem Dateibesitz)
| Agent | Besitzt | Aufgabe |
|---|---|---|
| **A: Engine** | `js/build.js`, `js/cursors.js` | DOM-Fabrik, Bots arbeiten an echten Knoten, Messung, Abbruch/Fehlerfälle |
| **B: Inhalt und Bauplan** | `index.html`, `cv.html`, später `js/i18n` | Bauplan-Format, Texte, Übersetzungen, `noscript`-Fallback, Datenschutz-Check |
| **C: Design und Bewegung** | `css/site.css`, Mockups | Optik des echten Baus, Übergänge, Review mit `anthropic-skills:apple-design`, Varianten für Absprachen |
| **D: QA** (nur lesend und Tests) | Tests, Messungen | Playwright-Läufe, A11y-Prüfung, Performance, Screenshots, Bericht an den Haupt-Agent |

**Regeln**
- Der Haupt-Agent schreibt jedem Hilfs-Agent einen **vollständigen Auftrag** (er kennt nichts): Ziel, Dateien (nur diese darf er ändern), Schnittstelle zu den anderen, Akzeptanzkriterien, "nicht committen, nicht pushen, nichts mit Micael besprechen", gewünschtes Berichtsformat (kurz, mit Dateiliste und Messwerten).
- Reihenfolge klären, wenn B die Schnittstelle liefert, auf der A aufbaut: erst B (Format), dann A. Parallel nur, was unabhängig ist.
- Der Haupt-Agent **integriert, prüft jede Abgabe selbst** (Test laufen lassen, Diff lesen) und committet. Hilfs-Agents sind nicht "fertig", bevor das geprüft ist.
- Bei Dateikonflikten gewinnt der Besitzer der Datei. Wünsche an eine fremde Datei gehen als Bitte an den Haupt-Agent.
- Optional `isolation: "worktree"`, wenn zwei Agents an verwandten Dateien arbeiten müssen.

### 3.6 Berichte an Micael
Kurz, deutsch, zuerst das Ergebnis. Bei jedem Abschluss: was ist neu, was wurde getestet (mit Zahlen), was ist **nicht** getestet, was braucht seine Entscheidung. Keine geschönten Aussagen: Was nicht geprüft wurde (Safari, echte Geräte), wird so genannt.

## 4. Leitlinien und Konventionen

- **Interaktion zuerst.** Jede Seite hat etwas zum Anfassen. **Schritt für Schritt:** jeder Schritt ist ein lauffähiger PR.
- **Kein Build-Schritt.** Statisches HTML, CSS, Vanilla-JS (ES-Module). Eine Bibliothek oder ein Bundler nur mit Begründung im PR und nach Absprache. Das 3D lässt sich mit CSS-3D lösen, Three.js nur wenn das nicht reicht.
- **Performance.** Ein `requestAnimationFrame`-Loop (der des `CursorSwarm`, andere Dinge hängen sich per `onFrame` dran). Animationen nur mit `transform` und `opacity`. Ausnahmen müssen begründet sein: das `<canvas>` des Schwarms, und künftig layout-wirksame Änderungen beim echten Bau (Schritt 9, dort mit Obergrenze und Messung). DOM-Cursors maximal 40.
- **Barrierefrei.** Echte `<button>` und `<a>`, Tastatur, `prefers-reduced-motion` respektieren, dekorative Ebenen `aria-hidden`. **Alle Inhalte müssen ohne JS und ohne Animation lesbar sein.** Screenreader bekommen jeden Text vollständig (unsichtbare Kopie `sr-only`).
- **Mobil mitdenken.** Kein Mauszeiger, also Pointer-Events und Touch von Anfang an. Auf dem Handy laufen die Bots allein.
- **Design über Tokens.** Farben, Schriften, Radien als CSS-Variablen.
- **Sprache:** die Seite ist Englisch, der CV Deutsch und Englisch. Chat und Commits Deutsch, Code und Kommentare Englisch.
- **Commits:** deutsch, im Imperativ-Stil der bisherigen Commits, mit den Attribution-Zeilen. **Kein Modellname in Commit-Texten, PR-Texten oder Code.**
- **PRs:** erst auf Aufforderung. Beschreibung nach dem bisherigen Muster: Was, Änderungen, Barrierefreiheit und Performance, Getestet (mit Zahlen), Bitte prüfen, Nächster Schritt.

## 5. Privatsphäre, Deployment, Nicht kaputtmachen

### 5.1 Privatsphäre (gilt für alles, was ausgeliefert wird, und für diesen Plan)
- **Öffentlich sind:** Name, berufliche Stationen, Skills, E-Mail, GitHub, LinkedIn.
- **Nie auf die Website oder in diesen Plan:** Wohnadresse, Telefonnummer, Geburtsdatum, Zivilstand, Nationalität, Kontaktdaten Dritter (z. B. Referenzen), Inhalte von Zeugnissen und Diplom-Scans.
- **Keine PDFs im Deploy.** Der CV ist die Seite `cv.html` (Deutsch und Englisch), die der Browser auf Knopfdruck als PDF speichert.
- Das alte CV-PDF und `CV.txt` in `archive/v1-2026-11/docs/` enthalten private Daten. Sie bleiben im Repo (und in der Git-Historie), werden aber nicht ausgeliefert: `vercel.json` leitet auf `/cv.html` um.
- **Diese Datei und `CLAUDE.md` sind interne Arbeitsdateien.** Sie sind nicht verlinkt, `vercel.json` leitet ihre Adressen auf die Startseite um. Trotzdem: nichts Persönliches hineinschreiben, Unstimmigkeiten zu Lebenslaufdaten nur neutral erwähnen ("Datum einer Station klären") und Details im Chat besprechen.

### 5.2 Deployment
- **Vercel** liefert aus (Git-Integration, jeder PR bekommt eine Vorschau). Domain bei GoDaddy, **DNS und Proxy über Cloudflare**. `gomes-fernandes.ch` leitet mit 307 auf `www.gomes-fernandes.ch` um.
- Konfiguration in `vercel.json` (nur Weiterleitungen). `.assetsignore` gilt nur für Cloudflare-Deploys und hat bei Vercel keine Wirkung.
- **Cache-Falle (gemessen):** HTML kommt mit `max-age=0`, **JS, CSS, Schriften und Bilder mit `max-age=14400` (4 Stunden)**, weil Cloudflares "Browser Cache TTL" (Standard 4 Stunden) sie verlängert. Folge: Besucher, die kurz vor einem Deploy da waren, sehen neue HTML-Seite mit altem CSS/JS (so geschehen, erkennbar am Schritt-1-Label "6 cursors").
  **Abhilfe in Cloudflare (Micael):** Caching, Configuration, Browser Cache TTL auf "Respect Existing Headers", nach einem Deploy einmal "Purge Everything". Im Repo nicht lösbar. Wenn Micael es nicht umstellt, ist Cache-Busting per Versions-Parameter und Import-Map die Alternative (Absprache nötig).
- **Nach jedem Deploy prüfen** (die Sandbox darf `gomes-fernandes.ch` und `www` erreichen): Status und `cache-control` von `/`, `/js/main.js`, `/css/site.css`; die Weiterleitungen (alte CV-Dateien, interne `.md`-Dateien) antworten mit 307.

### 5.3 Nicht kaputtmachen
- `dienstplan.html`: eigenständige Web-App im Betrieb (Google-Kalender-Login, PDF-Import).
- `datenschutz.html`, `nutzungsbedingungen.html`: für die Google-Integration nötig, nutzen `css/hub.css` und `js/socials.js`.
- `CNAME` bleibt im Root. `archive/` bleibt unverändert.
- Vor jedem PR prüfen, dass diese drei Seiten ohne Konsolenfehler laden.

## 6. Architektur heute (Ist-Zustand)

### 6.1 Dateien
| Datei | Zweck |
|---|---|
| `index.html` | Die Seite als **Bauplan**: der vollständige Inhalt steht in `<noscript id="blueprint">` in `#site`. Ohne JS rendert der Browser ihn direkt, mit JS liest die Engine ihn und `#site` startet mit leeren Abschnitts-Hüllen. Abschnitte: Hero (`data-section="hero"`), `#about`, `#projects`, `#experience`, `#skills`, `#swarm`, `#contact`, `footer` (`data-instant`). Dazu außerhalb des Bauplans: Startbox, "Build again", Status, Quelltext-Panel, Cursor-Ebene. |
| `css/site.css` | Alles Visuelle der Startseite. Tokens, Hero, Abschnitte, Karten, Mockups (`.tilt`), Galerie, Schwarm, Cursor, Inspector-Tags, Rahmen-Teile, Reduced Motion. |
| `js/main.js` | Verdrahtung: erzeugt `CursorSwarm` (max 40), `SiteBuilder`, `SourcePanel`; startet `AgentField`, sobald die Bots den Abschnitt `#swarm` gebaut haben (und beendet ihn bei "Build again"); Klick auf die Startbox und auf "Build again"; Test-Haken `window.siteBuilder` (`pause()`/`resume()`). |
| `js/cursors.js` | Cursor-System (siehe 6.3). |
| `js/build.js` | Bau-Engine (siehe 6.2). |
| `js/agents.js` | Schwarm-Finale auf `<canvas>` (siehe 6.4). |
| `js/source.js` | "Show source": Panel mit dem echten, live entstehenden DOM des zuletzt geänderten Abschnitts (MutationObserver, pretty-printed, die letzten 34 Zeilen). Dekorativ (`aria-hidden`), der Schalter ist ein echter Button. |
| `cv.html`, `css/cv.css`, `js/cv.js` | CV als Seite, Deutsch und Englisch (siehe 6.6). |
| `fonts/`, `images/projects/`, `images/icons/` | Selbst gehostete Schriften (Inter, Instrument Serif), Projektbilder (Webp, zusammen ca. 0,5 MB), Favicon. |
| `vercel.json`, `.assetsignore`, `CNAME` | Deploy-Konfiguration. |
| `dienstplan.html`, `datenschutz.html`, `nutzungsbedingungen.html`, `css/hub.css`, `js/socials.js` | **Nicht anfassen** (5.3). |
| `archive/v1-2026-11/` | Eingefrorene alte Seite. |

### 6.2 Bau-Engine (`js/build.js`)
**Idee:** Das Markup (der Bauplan) sagt, was gebaut wird. Drei Bots arbeiten in **parallelen Spuren** und warten nur aufeinander, wo es nötig ist. **Seit Schritt 9 erzeugen sie die Knoten wirklich:** vor dem ersten Klick enthält `#site` nur leere Abschnitts-Hüllen.
- **Markup-Attribute** (nur im Bauplan, die gebaute Seite trägt sie nicht): `data-section` (Abschnitt; `="hero"` für den Hero, `data-instant` = ohne Bots, `data-type-ms` = Tippbudget), `data-box` (Element, das der `layout-bot` erzeugt und aufzieht; `="fast"` = kleine Wiederholer ohne Größen-Tag), `data-type` (Text, den der `copy-bot` schreibt; `data-tag` zeigt die Typografie, `data-speed` überschreibt das Tempo), `data-underline` (Unterstreichung), `data-outline` (gezeichneter Rahmen, mit oder ohne `data-box`). Elemente ohne eines dieser Attribute kommen mit ihrem Elternelement ("statisch": Bilder, Canvas, Buttons im Schwarm, Leerraum). Sichtbarer Text gehört immer in `data-type`.
- **Klassen:**
  - `Section`: ein Abschnitt des Bauplans und seine Hülle (`shell`). Hält die Zuordnung Bauplan-Knoten → lebender Knoten (`map`), die Maße (`sizes`) und die Reservierungen (`locks`). `make()`/`create()` erzeugen Elemente, `instantBuild()` den fertigen Abschnitt auf einmal, `release()` gibt die Reservierungen frei.
  - `Typable`: ein `data-type`-Element des Bauplans und der Schreibfortschritt. Der `copy-bot` erzeugt das leere Element und hängt die Zeichen an **echte Textknoten**; Inline-Elemente (Links, Akzentwort) entstehen, wenn ihr erstes Zeichen getippt wird.
  - `Shape` (ein `data-box`): `prepare()` legt es unsichtbar an seinen Platz, `begin()` erzeugt es sichtbar (Auswahlrahmen mit Griffen), `end()` setzt den statischen Inhalt ein (blendet ein) und entfernt den Rahmen. `Outline`: erzeugt beim Zeichnen die acht Rahmenteile. Die Unterstreichung ist ein Element, das der `design-bot` beim Zeichnen anhängt, der Hintergrund-Glow wird vom `design-bot` aus dem Bauplan erzeugt (`showGlow()`).
  - `SiteBuilder`: steuert alles (`run`, `pump`, `animate`, `measure`, `complete`, `reset`).
- **Ruhiger Bau (Entscheidung Micael):** Jedes Element wird mit seiner **Endgröße** erzeugt (`min-width`/`min-height`, gemessen an einer Wegwerf-Kopie des Bauplans in der echten Seitenbreite, `measure()`), und beim Erzeugen eines Elements entstehen seine **Geschwister als unsichtbare Platzhalter** (Klasse `is-stub`, leer, mit Endgröße). Dadurch springt nichts (Grid/Flex platzieren alles sofort richtig), und die Seitenhöhe steht von Anfang an fest (jede Hülle reserviert ihre Endhöhe). Ist ein Abschnitt fertig, werden alle Reservierungen entfernt (`release()`). Der Aufzieh-Effekt bleibt `scale` (nur `transform`).
- **Ablauf:** `run()` nach dem Klick auf die Startbox misst und baut den Hero (`buildSection`), danach beobachtet ein Scroll-Listener (`pump()`, `wanted()`) die Abschnitte und baut jeden, der in den Bildschirm kommt, **in Reihenfolge**. Übersprungene Abschnitte erscheinen sofort (`instantBuild`). `animate()` startet die drei Spuren: **layout** (`dragOut` je Form: Platzhalter anlegen, hinlaufen, erzeugen, aufziehen, Inhalt einsetzen), **copy** (`typeText` je Text, wartet auf die Form um ihn), **design** (`lightUp`, `drawUnderline`, `drawOutline`, nimmt, was zuerst bereit ist).
- **Scroll-fest:** Ziele werden mit `anchor(el)` relativ zur Seite gemessen. `Cursor.chase()` folgt ihnen und meldet die Ankunft.
- **Tempo:** Konstanten `ARRIVE`, `TYPE_ARRIVE` (Bots müssen nicht zur Ruhe kommen), `DEFAULT_TYPE_MS`, `SCROLL_TYPE_SPEED`. Bauzeiten (gemessen, Desktop): Hero ca. 15 s, Über mich 3 s, Projekte 12 s, Werdegang 4 s, Skills 5 s, Schwarm 6 s, Kontakt 10 s, zusammen ca. 57 s (vor Schritt 9: ca. 57 s).
- **Screenreader:** Bis ein Abschnitt fertig ist, steht vor seiner Hülle eine vollständige, unsichtbare Kopie (`.sr-only[data-sr]`, ohne IDs, Links/Buttons mit `tabindex="-1"`), die halbfertige Hülle ist `aria-hidden`. `complete()` entfernt die Kopie und das `aria-hidden`.
- **Fehlerfall:** Wirft ein Abschnitt, ersetzt `showSection()` ihn sofort durch den fertigen (nie eine halbe Seite, nur eine Konsolenmeldung); die Spuren brechen ab (`section.cancelled`). **Reduced Motion:** `buildStatic()` baut alles sofort, Bots stehen still.
- **Ohne JS:** der Bauplan (`<noscript>`) ist die Seite. Mit JS ist sie vor dem ersten Klick `visibility: hidden` und das Scrollen gesperrt.
- **Test-Haken:** `window.siteBuilder.pause()`/`resume()` halten die Bots an. Dann steht die Seite unfertig still (Kausalitätsbeweis: ohne Bots entsteht nichts).

### 6.3 Cursor-System (`js/cursors.js`)
- `CursorSwarm`: gemeinsamer `requestAnimationFrame`-Loop (`start`, `tick`), `onFrame(fn)`-Hooks, `ripple`, Mauszeiger-Tracking (`pointer`, Touch wird ignoriert), `add({x, y, color, label, kind, burst, personality})`.
- `Cursor`: Federmodell mit Modi `hold` (`moveTo`), `follow`, `idle`. API: `moveTo`, `follow`, `chase` (follow mit Ankunfts-Promise), `idle`, `place`, `press`/`release`/`click`, `setKind('arrow' | 'text' | 'pen')`, `inspect(text, pos)`/`hideTag()` (Inspector-Tag, `pos` darf eine Funktion sein).
- **Persönlichkeit** im Leerlauf: `shyness`, `curiosity`, `sociability` (scheu = flieht vor dem Mauszeiger, neugierig = umkreist ihn, gesellig = hängt bei anderen ab, klickt ins Leere).
- Die drei Bots (`JOBS` in `js/build.js`): `layout-bot` Pfeil blau scheu, `copy-bot` I-Beam pink neugierig, `design-bot` Stift gelb gesellig.

### 6.4 Schwarm (`js/agents.js`, `AgentField`)
Abschnitt `#swarm`. 16 Agents wandern, "More agents" verdreifacht (16, 48, 144, 432, bis Obergrenze 720, Handy 360), auf dem Höchststand sammeln sie sich zu fünf Ebenen (= die fünf Skill-Karten), Zähler zeigt die echte Zahl. Canvas, aber aus dem gemeinsamen Loop; Sprite je Ebene, Linien in einem Pfad, Namen nur für 14 Agents; Frame-Budget mit `degrade()`; Standbild bei Reduced Motion; Ebenen-Liste als echte Buttons hebt eine Ebene hervor; der Zeiger scheucht Agents weg.

### 6.5 Was Kulisse war und jetzt echt ist (Schritt 9)
Bis Schritt 8 stand der gesamte Inhalt vom ersten Byte an im DOM, die Bots schalteten nur um (`visibility`, `opacity`, `scale`). Seit Schritt 9 gilt: Kein Knoten der Seite existiert, bevor ein Bot ihn erzeugt (Hüllen und `is-stub`-Platzhalter ausgenommen, siehe 6.2). **Weiterhin Inszenierung:** die Bewegung (Position, Tempo, Reihenfolge), das Aufziehen per `scale` und die Inspector-Tags. **Vereinfachungen:** Die Platzhalter reservieren Platz, statt dass die Seite wirklich wächst (Entscheidung Micael). Statischer Inhalt in einer Box (Bilder, Canvas, Buttons) wird nach dem Aufziehen in einem Zug eingesetzt, nicht einzeln gebaut.

## 7. Roadmap

| # | Schritt | Stand |
|---|---|---|
| 0 bis 8 | Archiv, Box und Cursor, Bots mit Jobs, Bauschritte, Cursor-Sprache, Landingpage, Scroll-Bau und CV, Projekte, Schwarm | **erledigt** (8) |
| **9** | **Echter Bau: die Bots erzeugen das DOM wirklich** | **gebaut, wartet auf Review und PR** (siehe unten und 8.2) |
| 10 | Aufträge an die Bots (das AI-Element) | geplant |
| 11 | Bewerbungs-Essentials (Vorschau beim Teilen, Metadaten) | geplant |
| 12 | Feinschliff und Messung | geplant |

Die Reihenfolge darf sich ändern. Wird die Zeit knapp: **11 vor 10 ziehen** (die Vorschau beim Teilen ist für eine Bewerbung wichtiger als das AI-Element).

### Schritt 9: Echter Bau (gebaut, wartet auf Micaels "so lassen")
**Warum:** Der Bau soll ursächlich sein: Ohne die Bots gibt es die Seite nicht. In den DevTools sieht man Elemente entstehen.

**Entschieden (Micael, 2026-11-06):** Bauplan in `<noscript>`; kleiner Schalter "Show source" mit dem live entstehenden DOM; ruhiger Bau mit reserviertem Platz; bei einem Fehler die fertige Seite sofort, still.

**Umgesetzt:** siehe 6.2. Bauplan statt fertiger Seite (`index.html`), `layout-bot` erzeugt Elemente und zieht sie auf, `copy-bot` schreibt echte Textknoten, `design-bot` erzeugt Glow, Unterstreichungen und Rahmenteile. Platzhalter und Endgrößen halten das Layout ruhig. Screenreader-Kopie je Abschnitt, Quelltext-Panel (`js/source.js`), Pause-Haken.

**Gemessen (Headless-Chromium, Desktop 1440 × 900 und Handy 390 × 844):**
- Vor dem Klick enthält `#site` nur leere Hüllen und je eine unsichtbare Textkopie (kein sichtbarer Inhalt).
- Nach dem Bau entspricht das normalisierte DOM jedes Abschnitts dem Bauplan (Bot-Attribute, Unterstreichung, Rahmenteile ignoriert). Einzige Abweichung: `width`/`height` am Schwarm-Canvas, die `AgentField` zur Laufzeit setzt. Gilt auch für Reduced Motion, Sprung ans Ende, "Build again" und Handy.
- Kein Layout-Springen: 26 beobachtete Elemente mit `id`, keines wich seit der ersten Sichtung um mehr als 2 px ab (Messung alle 40 ms); die Seitenhöhe bleibt über den ganzen Bau bei einem Wert (8008 px).
- Pause-Test: Mit angehaltenen Bots bleibt das DOM identisch (Test auf zwei Momentaufnahmen im Abstand von 2,5 s), die Seite ist unfertig (Platzhalter vorhanden).
- Fehler-Test (ein Bot wirft mitten im Abschnitt): der Abschnitt steht danach fertig und gleich dem Bauplan da, nur die Konsole zeigt den Fehler.
- Bauzeiten wie vorher (Hero 14,9 s, zusammen ca. 57 s). Keine Konsolenfehler, keine fehlgeschlagenen Requests auf der Startseite und `cv.html`. Ohne JS sieht die Seite aus wie vorher (jetzt mit Unterstreichung).
- `dienstplan.html`, `datenschutz.html`, `nutzungsbedingungen.html` sind unverändert. Ihre CDN-Anfragen (cdnjs) scheitern in der Sandbox, das hat nichts mit diesem Schritt zu tun.

**Nicht geprüft:** Safari und Firefox, echte Geräte, Screenreader (die Struktur ist vorhanden: Kopie je Abschnitt, `aria-hidden` auf der Hülle), Lighthouse. `code-review` und `simplify` laufen vor dem PR.

**Bewusst offen:** Das Quelltext-Panel zeigt die letzten 34 Zeilen des zuletzt geänderten Abschnitts (Aussehen und Länge sind ein Vorschlag, siehe 9.7).

### Schritt 10: Aufträge an die Bots (AI-Element)
**Idee:** Die Cursors nehmen **echte Aufträge** an und verändern die Seite wirklich (das ist erst nach Schritt 9 glaubwürdig). Besucher:innen sehen z. B. Chips und ein Eingabefeld: "Make it German", "Light theme", "Show only projects", "Skip the animation", "Explain this section".
- **Aufträge (Vorschlag, in Absprache zu kürzen):** Sprache EN/DE (die Bots tippen alle Texte neu, Inhalte liegen in zwei Bauplänen), Thema hell/dunkel (der `design-bot` färbt über die Tokens um, sichtbar als Welle), Fokus-Ansicht (der `layout-bot` faltet Abschnitte zu), Tempo.
- **Ohne Modell zuerst:** feste Befehle, Regelwerk, sichere Aktionen. **Mit Modell (optional):** eine serverseitige Funktion (Vercel Function), die einen Freitext in **eine Liste erlaubter Aktionen als JSON** übersetzt. **Das Modell erzeugt nie HTML oder Code**, nur Aktionen aus einer festen Liste. Schlüssel nur serverseitig (Vercel-Umgebungsvariable), Rate-Limit, Eingabelänge begrenzt, Fallback auf das Regelwerk. `claude-api` und `security-review` Pflicht.
- **Absprache vorab (Pflicht):** Ist ein echtes Modell gewünscht (Kosten, Missbrauchsrisiko)? Welche Aufträge? Wie soll die Bedienung aussehen (Varianten als Mockup)?
- **Akzeptanz:** Jeder Auftrag verändert das echte DOM durch die Bots (Test), ist unterbrechbar, per Tastatur bedienbar, mit Reduced Motion sofort. Kein Auftrag kann Seiteninhalt einschleusen (XSS-Test).

### Schritt 11: Bewerbungs-Essentials
- **Vorschau beim Teilen:** `og:title`, `og:description`, `og:image` (1200 × 630, aus der Seite erzeugt, z. B. Hero mit den Bots), `twitter:card`, `canonical` auf `https://www.gomes-fernandes.ch/`, `theme-color`. Bild und Texte **in Absprache** (Varianten).
- Favicon-Satz (mehrere Größen, `apple-touch-icon`), Seitentitel pro Seite, `lang`, strukturierte Daten (`Person`), `robots`/Sitemap (Absprache: soll die Seite indexiert werden?), eigene 404-Seite im Look.
- `cv.html`: weitere Sprachen auf Wunsch, Druckstil prüfen, Titel als PDF-Dateiname.
- Cloudflare-Cache-Einstellung geprüft (5.2), Weiterleitungen geprüft.
- **Akzeptanz:** Link-Vorschau in mindestens zwei Tools geprüft (z. B. LinkedIn Post Inspector, Slack/Messenger, soweit erreichbar), Lighthouse SEO und Best Practices ≥ 95.

### Schritt 12: Feinschliff
- **Messung:** Lighthouse (Performance, Barrierefreiheit, Best Practices, SEO), Web Vitals (LCP, CLS, INP), CPU-Drosselung 4x für Hero und Schwarm, Speicher. Ziel: Performance ≥ 90 Mobil, Barrierefreiheit 100, CLS < 0,05.
- **Browser und Geräte:** Chrome, Firefox, Safari (Desktop und iPhone), Android-Chrome. Das Sprachwechsel-CSS der CV-Seite nutzt `:has()`. Echte Geräte, nicht nur Headless.
- **Barrierefreiheit:** Tastatur-Durchlauf, Screenreader-Stichprobe (VoiceOver oder NVDA), 200 % Zoom, hoher Kontrast, Reduced Motion, Fokus-Sichtbarkeit.
- **Inhalt:** Text-Review mit Micael (Ton, Rechtschreibung, Fakten), Datenschutz-Suche über alle ausgelieferten Dateien, tote Links.
- **Optional (Absprache):** Ton, standardmäßig aus.

## 8. Erledigt

### 8.1 Verlauf
- **0** Archiv und leerer Root, [PR #13](https://github.com/lazyboxDude/portfolio/pull/13).
- **1** Box und Cursor-Schwarm, [PR #14](https://github.com/lazyboxDude/portfolio/pull/14).
- **2** Bots mit Jobs, [PR #15](https://github.com/lazyboxDude/portfolio/pull/15), [#16](https://github.com/lazyboxDude/portfolio/pull/16).
- **3** Bauschritte, Startbox, Persönlichkeit, [PR #17](https://github.com/lazyboxDude/portfolio/pull/17), [#19](https://github.com/lazyboxDude/portfolio/pull/19).
- **Plan** auf 12 Schritte erweitert, Referenzen und Mockup, [PR #18](https://github.com/lazyboxDude/portfolio/pull/18).
- **4** Cursor-Sprache (Formen, Farben, Inspector-Tags, `design-bot`), [PR #20](https://github.com/lazyboxDude/portfolio/pull/20).
- **5 und 6** Landingpage und Scroll-Bau, Über mich, Werdegang, Skills, Kontakt, CV als Seite, [PR #21](https://github.com/lazyboxDude/portfolio/pull/21).
- **7** Projekte als Mockups (Dienstplan, Aphonia, Galerie, diese Seite, Dolphin Rush) und Weiterleitung der alten CV-Dateien, [PR #22](https://github.com/lazyboxDude/portfolio/pull/22).
- **8** Schwarm-Finale, [PR #23](https://github.com/lazyboxDude/portfolio/pull/23).
- **9** Echter Bau (gebaut, noch kein PR).

### 8.2 Entscheidungsprotokoll
| Datum | Entscheidung | Von |
|---|---|---|
| 2026-11 | Seite auf Englisch, CV auf Deutsch und Englisch | Micael |
| 2026-11 | Look: dunkel, blauer Akzent, Serifen-Kursiv-Akzentwort (Mockup) | Micael (Mockup bestätigt) |
| 2026-11 | CV als Seite, **keine PDFs** im Deploy; Download-Button unten im Kontaktbereich, nicht im Hero | Micael |
| 2026-11 | Skills als fünf Ebenen: Business und Betrieb, 3D und Grafik, Game Engines, Programmieren, KI-Werkzeuge ("lass das mal so testen") | Micael |
| 2026-11 | Alle acht Renders im Portfolio, Aphonia und Dolphin Rush bleiben wie sie sind | Micael |
| 2026-11 | Deploy über Vercel, Domain GoDaddy, DNS/Proxy Cloudflare | Micael |
| 2026-11 | Schwarm-Struktur: Pyramide aus fünf Ebenen (ungeprüft, siehe offene Fragen) | Agent |
| 2026-11-06 | Cursors sollen die Seite **wirklich** bauen (Schritt 9), Plan ausführlicher, mehr Design-Absprachen, Skills und bis zu 3 bis 4 Agents | Micael |
| 2026-11-06 | Bauplan liegt in `<noscript>` (eine Quelle, ohne JS ist die Seite da) | Micael |
| 2026-11-06 | "Show source": kleiner Schalter, Panel standardmäßig zu | Micael |
| 2026-11-06 | Ruhiger Bau: Platz wird reserviert, nichts springt (statt sichtbar wachsender Seite) | Micael |
| 2026-11-06 | Bei Fehler oder Abbruch die fertige Seite sofort, still (nur Konsolenmeldung) | Micael |

## 9. Offene Fragen an Micael
1. **Lebenslauf-Details:** Bei zwei Stationen weichen Lebenslauf und Zeugnis ab (ein Zeitraum, eine Berufsbezeichnung). Die Seite zeigt vorläufig die belegte Variante. Details im Chat besprechen, nicht hier.
2. **Über-mich-Texte** sind aus dem Lebenslauf formuliert, nicht von Micael. Bitte lesen und anpassen (Abschnitt "About" in `index.html`).
3. **Zielfirma/Rolle:** Für welche Rolle und Firma? Bestimmt Gewichtung der Projekte, ein mögliches Kurzprofil und den Ton.
4. **Aphonia:** Gibt es ein Titelbild oder Screenshots, die öffentlich sein dürfen? Sonst bleibt das Typografie-Poster. Dolphin Rush hat keinen Link, weil unklar ist, ob das Spiel noch spielbar ist.
5. **Schwarm-Struktur:** Pyramide aus fünf Ebenen gebaut. Passt das, oder etwas Eigenes? (Nur `layout()` und `target()` in `js/agents.js`.)
6. **AI-Element (Schritt 10):** Echtes Modell im Hintergrund (Kosten, serverseitiger Aufruf) oder Regelwerk? Welche Aufträge?
7. **Quelltext-Panel (Schritt 9):** Ja, ist gebaut. Bitte Aussehen, Länge (34 Zeilen) und Platz (unten links) ansehen und sagen, ob es so bleibt.
8. **Weitere CV-Sprachen** (z. B. Portugiesisch, Französisch)?
9. **Cloudflare:** "Browser Cache TTL" auf "Respect Existing Headers" stellen und nach Deploys "Purge Everything" (siehe 5.2).
10. **Indexierung:** Soll die Seite von Suchmaschinen gefunden werden (Schritt 11)?

## 10. Arbeitsweise und QA

### 10.1 Git
- Der Chat bekommt einen Branch vorgegeben, **nie auf `main` pushen**. Pro Schritt ein PR gegen `main`, **nur auf Aufforderung**. Nach dem Merge den Branch neu von `main` starten (`git fetch origin main && git checkout -B <branch> origin/main`).
- Im PR-Beschreibungstext keine Modellnamen. Attribution-Zeilen laut Umgebung.
- GitHub-Zugriff nur über die GitHub-Werkzeuge (kein `gh` für PRs). Nach dem Erstellen eines PR fragen, ob er beobachtet werden soll.

### 10.2 Lokal testen
- Server im Repo-Root: `python3 -m http.server 8765`. Browser-Tests mit Playwright (in der Umgebung vorinstalliert, `require('playwright')`, kein Installieren).
- `#box` schwebt dauerhaft: in Tests mit `{ force: true }` klicken. Auf Zustände warten (alle `.ch` eines Abschnitts mit Klasse `on` und alle `[data-box]` mit `is-shown`, `#next` mit `is-ready`, `#status`), keine festen Pausen. Abschnitte bauen sich erst beim Hinscrollen: mit `window.scrollTo({ top, behavior: 'instant' })` springen (das normale Scrollen ist weich). Bei Zeitmessungen keine Screenshots mitlaufen lassen.
- **Bau anhalten:** `window.siteBuilder.pause()` / `resume()` (Kausalitäts-Test). Die Abschnitte stehen als Hüllen in `#site`, der fertige Abschnitt hat kein `aria-hidden` mehr; darauf kann ein Test warten.
- **Testmatrix für jeden PR:** Desktop 1440, Handy 390 (ohne Überlauf), **ohne JS**, **Reduced Motion**, Sprung ans Seitenende, "Build again", CV-Seite (Deutsch/Englisch, mit und ohne JS), Konsolenfehler und fehlgeschlagene Requests (müssen leer sein), die drei geschützten Seiten laden.
- Die Skripte der bisherigen Läufe liegen in der Übergabe-Zip unter `qa/`.

### 10.3 Definition of Done (jeder Schritt)
Design-Checkpoints eingehalten (3.2) · Testmatrix grün · Messwerte im Bericht · Datenschutz-Suche über ausgelieferte Dateien leer · Plan aktualisiert (Erledigt, Entscheidungen, offene Fragen) · `code-review` und `simplify` gelaufen · Micael hat "so lassen" gesagt.

## 11. Glossar
- **Bots:** die drei Cursor-Figuren (`layout-bot`, `copy-bot`, `design-bot`).
- **Agents (Schwarm):** die kleinen Cursor im Schwarm-Finale. Nicht zu verwechseln mit **Hilfs-Agents** (3.5), die dem Entwickler-Agent helfen.
- **Form (Shape):** ein Element mit `data-box`, das der `layout-bot` aufzieht.
- **Spur (Lane):** ein parallel laufender Ablauf eines Bots innerhalb eines Abschnitts.
- **Inspector-Tag:** das kleine Mono-Label, das einen echten Wert zeigt (Größe, Typografie).
- **Echter Bau:** Schritt 9, die Bots erzeugen die Knoten, statt sie nur zu enthüllen.
