# DESIGN.md: Leitfaden für Design-Änderungen

> Für einen Design-Bot (oder jede:n, der/die das Aussehen von `index.html` verbessert).
> Erst `CLAUDE.md` und `PLAN.md` (Ziel, Zielbild, Privatsphäre) lesen, dann diese Datei.
> Diese Datei beschreibt **den Ist-Zustand** des Designs und **die Regeln, die beim Ändern gelten**.

## Auftrag

Die Seite soll **optisch** besser werden: Typografie, Abstände, Farben, Komposition, Rhythmus, Details,
Mobil. Sie bleibt dabei dasselbe Produkt: eine Seite, die sich vor den Augen der Besucher:innen von
drei Bot-Cursors selbst baut. Die Optik muss diese Idee unterstützen, nicht überdecken.

Zielbild und Referenzen (Linea, Orbit, Bakelayer, Mockup) stehen in `PLAN.md`, Abschnitt "Zielbild".
Kurz: dunkel, ein blauer Akzent, ein Serifen-Kursiv-Wort pro Überschrift, Mono-Labels, viel Luft,
handwerklich sauber statt laut.

## Arbeitsschleife

```bash
node tools/shoot.mjs            # Screenshots (Desktop, Tablet, Mobil) nach screenshots/ (nicht im Git)
# ... Bilder ansehen (Read-Tool auf die PNGs), Schwächen benennen, CSS ändern ...
node tools/shoot.mjs mobile --only projects,skills   # nur das Geänderte neu
node tools/check.mjs            # Leitplanken: Fehler, Überlauf, Kontrast, ohne JS, nichts bleibt versteckt
```

- Die Skripte brauchen keine Installation (Playwright ist in der Cloud-Umgebung vorhanden, kein `package.json`).
- Die Screenshots zeigen den **fertigen** Zustand (Reduced Motion, alles sofort gebaut) ohne die geparkten Bots
  (`--bots` blendet sie ein). Die Animation selbst beurteilt man nicht mit Standbildern: dafür die
  Playwright-Hinweise in `PLAN.md` ("Arbeitsweise") nutzen, mit festen Zuständen statt Pausen.
- **Immer vorher/nachher vergleichen** und beide Breiten ansehen (1440 und 390). Ein Desktop-Gewinn, der Mobil
  bricht, zählt nicht.
- `tools/check.mjs` muss grün sein, bevor etwas committet wird.

## Wo das Design lebt

| Datei | Inhalt |
|---|---|
| `css/site.css` | **Fast alles**: Tokens (`:root`), Layout, Komponenten, Bot-Cursors, Reduced-Motion-Block am Ende |
| `index.html` | Markup und Texte der Startseite (ein Block `data-section` pro Abschnitt) |
| `js/agents.js` | Zeichnet den Schwarm auf `<canvas>`, Farben dort **hartkodiert** (siehe unten) |
| `js/build.js` | `JOBS`: Name, Farbe und Form der drei Bots. Die Bau-Engine, nicht für Optik gedacht |
| `cv.html`, `css/cv.css` | CV-Seite (eigener Druckstil für A4), eigenständig |
| `css/hub.css` | Nur für `datenschutz.html` und `nutzungsbedingungen.html` |
| `fonts/` | Inter (variabel) und Instrument Serif Kursiv, selbst gehostet |
| `images/projects/` | Projektbilder (Webp, klein) |

Abschnitte der Startseite, von oben: **hero** (Nav-Pill, Headline, zwei Buttons) · **about** · **projects**
(Bento mit gekippten Mockups: Dienstplan-Telefon, Aphonia-Poster, "This website", acht Renders, Dolphin Rush) ·
**experience** (eine Karte) · **skills** (fünf Ebenen als Karten) · **swarm** (Canvas + Ebenenliste + Zähler) ·
**contact** (CTA, Download CV) · **footer**.

## Design-Tokens (heute)

In `:root` von `css/site.css`:

| Token | Wert | Rolle | Kontrast auf `--bg` |
|---|---|---|---|
| `--bg` | `#07090f` | Seitenhintergrund | – |
| `--fg` | `#f2f5ff` | Haupttext, Überschriften | 18,3 : 1 |
| `--muted` | `#a3adc8` | Fließtext, Lede | 8,9 : 1 |
| `--subtle` | `#8f9bba` | Labels, Metadaten | 7,2 : 1 |
| `--line` | `#222d4c` | Rahmen, Trenner | (kein Text) |
| `--accent` | `#6c8cff` | Akzent Blau | 6,5 : 1 |
| `--accent-soft` | `#9fb4ff` | Akzentwort, Links | 9,9 : 1 |
| `--accent-2` | `#b36cff` | definiert, kaum genutzt | – |
| `--font-sans` | Inter (variabel) | alles | – |
| `--font-serif` | Instrument Serif, **nur kursiv** | Akzentwort je Überschrift | – |
| `--font-mono` | System-Mono (`ui-monospace` …) | Eyebrows, Labels, Zähler | – |

Job-Farben der Bots und Ebenen (Teil der Marke, bitte als Satz behalten): layout blau `#7b95ff`, copy pink `#ff8fb8`,
design gelb `#ffc766`, a11y grün `#6fe3a5`, motion violett `#b79bff`, Cyan `#5fd4f0`.

Typografie heute (zum Verfeinern, nicht zum Umwerfen): Hero-H1 `600 clamp(42px, 7.4vw, 96px)/1`, Abschnittstitel
`600 clamp(32px, 4.6vw, 56px)/1.05`, Letter-Spacing negativ bei großen Titeln, Fließtext 17 bis 20 px, Mono-Labels 11 bis 13 px in
Großbuchstaben. Abschnitte haben `padding: 96px 20px`, Inhalt `min(1100px, 100%)`.

**Bekannte Schwächen, gute Ansatzpunkte:**

- Viele Farben stehen **hartkodiert** in `site.css` (`#26304f`, `#2a3658`, `#eaf0ff`, `#e4ebff`, `#c3cbe2`, `#0d1220`,
  26 `rgba(...)`) statt als Token. Ein Token-Satz (Flächen-Stufen, Rahmen-Stufen, Akzent-Töne) macht jede weitere Änderung billiger.
- Es gibt keine Abstands- oder Radius-Skala als Tokens (`96px`, `28px`, `16px` stehen einzeln im CSS).
- Die Schwarm-Farben in `js/agents.js` (`COLORS`, `#9fb4ff`, `#06080d`, `#ffffff`) sind nicht mit den CSS-Tokens verbunden.
  Ändert man dort etwas, **beide Stellen** anpassen.

## Spielregeln

### Frei (das ist die Aufgabe)

CSS in `css/site.css`: Farben, Schriftgrößen, Gewichte, Abstände, Radien, Schatten, Verläufe, Rahmen, Layout-Raster,
Breakpoints, Hover/Fokus-Zustände, Mobil-Anpassungen. Markup in `index.html`: Reihenfolge und Gruppierung **innerhalb** eines
Blocks, zusätzliche rein dekorative Elemente (mit `aria-hidden="true"`).

### Mit Vorsicht (der Bau-Vertrag)

Die Seite wird vom JS **gelesen und gebaut**. Diese Dinge sind Schnittstellen, keine Deko:

- **`data-section`**: jeder Abschnitt ist einer, er wird gebaut, wenn er in den Bildschirm scrollt. Neue Abschnitte brauchen nur dieses Attribut und Markup, kein JS.
- **`data-box`**: Form, die der `layout-bot` aufzieht. Bis dahin `visibility: hidden`, die Engine animiert **`transform: scale`** mit `transform-origin: 0 0`.
  Nicht überschreiben (`[data-box] { transform-origin: 0 0; }`), kein eigenes `transform` auf diese Elemente setzen. Die Größe wird **gemessen**: Layout vor dem Bau darf sich nicht ändern.
- **`data-type`**: Text, den der `copy-bot` tippt. Die Engine ersetzt jedes Zeichen durch ein `span.ch` (unsichtbar bis `.on`) und legt eine `sr-only`-Kopie an.
  Das Layout darf **nicht davon abhängen**, ob Zeichen schon sichtbar sind (es verschiebt sich nie). Kein `display: inline-block` auf `.ch`, das Umbrüche verändern könnte.
  Eigene Inline-Elemente im Text (Akzentwort `<em class="accent">`) sind erlaubt, die Engine behält das Markup.
- **`data-underline`, `data-outline`**: Linien, die der `design-bot` zeichnet (`.corner`/`.edge`, nur `transform`/`opacity`). Der Eckenradius kommt aus `--piece-r`,
  das setzt die Engine pro Element: Rahmen und Radius bei diesen Elementen über `--piece-r`, nicht fest.
- **Zustandsklassen**, die JS schaltet: `is-live`, `is-shown`, `is-on`, `is-ready`, `is-gone`, `is-pressed`, `is-selected`, `is-active`, `on`. Sie dürfen gestylt, aber nicht umbenannt oder entfernt werden.
- **IDs, die `js/main.js` greift:** `box`, `next`, `site`, `glow`, `status`, `cursor-layer`, `swarm-canvas`, `swarm-count`, `swarm-more`, `swarm-stack`, dazu `.swarm`, `.layer-btn`.
- **Bot-Ebene:** `.fake-cursor`, `.fake-cursor-tag`, `.inspector-tag`, `.sel-frame`, `.ripple`. Sehen darf man sie verbessern, Struktur und Hotspots (`--hx`/`--hy`) bleiben.
- **`.js` auf `<html>`**: Ohne JS ist alles sichtbar, mit JS erst nach dem Klick. Regeln wie `.js .site:not(.is-live) { visibility: hidden; }` nicht abschwächen.

### Tabu

- `archive/` (eingefroren), `dienstplan.html`, `datenschutz.html`, `nutzungsbedingungen.html` (Betrieb und Google-Integration), `CNAME`, `vercel.json`.
- Keine Frameworks, Bundler, Tailwind, Icon-Bibliotheken per CDN, keine Google-Fonts-Anfragen. Neue Schriften nur selbst hosten (`fonts/`, OFL, Eintrag in `fonts/README.md`).
- Keine neuen Abhängigkeiten ohne Begründung im PR (`PLAN.md`, "Leitlinien").

## Technische Leitplanken (gelten für jede Änderung)

- **Animation:** nur `transform` und `opacity`, ein gemeinsamer `requestAnimationFrame`-Loop (`CursorSwarm`), kein zweiter. Kein Animieren von `width`, `height`, `top`, `left`, `box-shadow` oder `filter` im Dauerlauf.
  `backdrop-filter` sparsam (Nav-Pill, Inspector-Tags haben es schon).
- **`prefers-reduced-motion`:** jede neue Transition oder Animation im Block am Ende von `site.css` abschalten.
- **Barrierefreiheit:** echte `<button>`/`<a>`, Fokus sichtbar (`:focus-visible` ist gesetzt, nicht entfernen), Text-Kontrast mindestens 4,5 : 1 (große Schrift 3 : 1),
  Touch-Ziele mindestens 40 px, dekorative Ebenen `aria-hidden`. Das Erscheinungsbild darf nie die Lesbarkeit ohne JS kosten.
- **Performance:** Bilder bleiben klein (Webp, `width`/`height` gesetzt, `loading="lazy"`), kein Layout-Shift. Der Schwarm hat ein Frame-Budget (`agents.js`), nicht erhöhen, um schöner auszusehen.
- **Mobil zuerst prüfen:** 390 px. Es gibt keinen Mauszeiger, Hover-Effekte stehen in `@media (hover: hover)`.
- **Ohne Build:** CSS direkt im Browser lauffähig, keine Präprozessor-Syntax, die ein Build bräuchte (natives CSS-Nesting und Custom Properties sind okay).

## Inhalt (nicht Teil des Designs)

- Texte nicht umschreiben oder erfinden. Die Aussagen stammen aus dem Lebenslauf und den Projekten, die **About-Texte** sind ohnehin noch von Micael zu prüfen (`PLAN.md`, offene Frage 3).
  Reine Design-Anpassungen an Zeilenumbrüchen (`text-wrap: balance`, Breiten) sind okay, Wortlaut ändern nicht.
- **Keine privaten Daten** (Adresse, Telefon, Geburtsdatum, Zivilstand, Nationalität, Dritte). Siehe `PLAN.md`, "Privatsphäre".
- Keine Platzhalter wie Lorem ipsum, keine Fantasie-Kennzahlen, keine Logos fremder Firmen.

## Vor dem Abgeben

1. `node tools/check.mjs` ist grün.
2. Vorher/Nachher-Screenshots in 1440 und 390 px angesehen, beide besser oder gleich.
3. `dienstplan.html`, `datenschutz.html` und `nutzungsbedingungen.html` unverändert (`git diff --stat` zeigt sie nicht).
4. Keine Datei in `screenshots/` im Commit (steht in `.gitignore`).
5. Kleine, benannte Commits (Deutsch), eine Änderung = eine Idee ("Hero: Abstände und Zeilenhöhe", nicht "Design").
6. Nach einem Deploy kann der Browser-Cache (Cloudflare) alte CSS-Dateien zeigen: siehe `PLAN.md`, Schritt 7, "Cache-Hinweis".
