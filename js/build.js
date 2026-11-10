// The build "job": five bot cursors construct the page live, one section at a time.
// The hero is built after the first click on the start box; every other section (index.html:
// data-section) is built ahead of the visitor, as soon as it is less than LOOKAHEAD screens below the
// viewport, so the bots keep working further down while the visitor scrolls. When a bot has nothing
// to do it waits at the bottom edge of the screen (the build front), or tucks into the corner once
// everything stands. Afterwards a small pill builds everything again.
//
// Who does what (the markup says what to build, see index.html):
//   layout-bot (arrow)  builds every data-box for real (js/layout.js): it drags out a box with a real
//                       width and height (selection frame, live size tag "980 × 56", snap lines, now and
//                       then an overshoot it corrects), then sets padding and gap ("pad 24 32 · gap 16")
//                       so the children flow into place. [data-grid] containers get their columns first.
//   copy-bot (I-beam)   types every data-type text, character by character, with a tag that shows
//                       the real typography ("600 · 96px / 1.00 · -0.035em") for data-tag texts.
//   design-bot (pencil) switches the glow on (hero), draws data-underline words and data-outline shapes.
//   a11y-bot (magnifier) checks every data-a11y element once it stands: draws a focus ring around it and
//                       shows the real WCAG contrast (and the click target size) in its tag (see a11y.js).
//   motion-bot (spark)  starts the drift of the background glow (hero) and tilts every .tilt mockup in
//                       by dragging it from flat to its 3D angle, with the live angles in its tag.
// The five bots work in parallel lanes and wait for each other only where they must: a text waits
// for the box around it, an underline waits for its text, an outline waits for its box, a check waits
// for the text and the box of the element, a tilt waits for the card it sits on.
//
// Everything bots aim at is measured against the page (see anchor), so it still works when the
// visitor scrolls during a build. Without JS the page is simply visible. With JS every text gets a
// screen-reader copy first, so assistive tech reads everything at once while the visible characters
// are revealed one by one. With prefers-reduced-motion everything is shown at once, bots parked.

import { DRAG_DAMPING, prefersReducedMotion } from './cursors.js';
import { describe, FocusRing } from './a11y.js';
import { anchor, clamp, easeInOut, pageRect, part } from './geometry.js';
import { Grid, Guides, MIN_SIZE, Shell, guidePlan } from './layout.js';

const DRAG_MS = 500;
const DRAG_FAST_MS = 250;
const FRAME_MS = 300;      // setting padding and gap
const FRAME_FAST_MS = 140;
const FIX_HOLD_MS = 120;   // after a miss the bot stands there for a moment, then corrects itself
const GRID_MS = 420;       // drawing the columns of a grid
const BIG_AREA = 20000;    // shapes bigger than this (px²) may overshoot; every third one does
const DRAW_MS = 900;
const TAG_GAP = 28;      // inspector tags sit this far above an element (or 8px below it)
const REPLAY_LABEL = 'Build again';
const BOX_EXIT_MS = 400; // keep in sync with .box.is-gone in site.css
const FONT_WAIT_MS = 1500;
const DEFAULT_TYPE_MS = 4500; // how long typing a whole section may take (data-type-ms overrides)
const SCROLL_TYPE_SPEED = 0.5; // sections the visitor scrolls to are typed faster than the hero
const AVG_CHAR_MS = 42;       // average delay per character at speed 1
const CHECK_MS = 900;         // how long the a11y-bot keeps its focus ring and tag on an element
const TILT_MS = 1000;         // how long the motion-bot takes to tilt a mockup in
// The bots build ahead of the visitor: a section is started once its top is this many screen heights
// below the bottom edge of the viewport. Visitors tend to keep scrolling, so the page is there before they are.
const LOOKAHEAD = 0.8;
const REST_MARGIN = 44;       // parked bots keep this far from the viewport edge (px)
const REST_STACK = 28;        // vertical gap between parked bots in the corner (px)

// How exactly a bot has to arrive before its job goes on. Close and fast enough is enough: the
// next movement (follow) catches up anyway, and waiting for a full stop made every step crawl.
const ARRIVE = { tolerance: 30, settleSpeed: 600, timeout: 1500 };
const ARRIVE_FAST = { tolerance: 80, settleSpeed: 1000, timeout: 700 };
// Typing starts while the copy-bot is still a few steps away: it follows the caret and catches up.
const TYPE_ARRIVE = { tolerance: 90, settleSpeed: 4000, timeout: 900 };

// One job per bot: name pill, colour and pointer shape (see cursors.js). Colours stay readable under
// the dark pill text. Off duty the bots do not roam (see SiteBuilder.rest): they wait where the next work is.
const JOBS = {
    layout: { label: 'layout-bot', color: '#7b95ff', kind: 'arrow' },
    copy: { label: 'copy-bot', color: '#ff8fb8', kind: 'text' },
    design: { label: 'design-bot', color: '#ffc766', kind: 'pen' },
    a11y: { label: 'a11y-bot', color: '#6fe3a5', kind: 'lens' },
    motion: { label: 'motion-bot', color: '#b79bff', kind: 'spark' },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** A promise that is resolved from outside (the bots wait for each other with these). */
const defer = () => {
    let resolve;
    const promise = new Promise((r) => { resolve = r; });
    return { promise, resolve };
};

/** Pause after a typed character: slightly irregular, longer after punctuation. `speed` < 1 is faster. */
function typingDelay(ch, speed) {
    if (ch === '.') return 300 * speed;
    if (ch === ',') return 180 * speed;
    return (28 + Math.random() * 28) * speed;
}

/** Wait for the web fonts (the layout must be final before the bots measure it), but never for long. */
const fontsReady = () => Promise.race([document.fonts?.ready ?? Promise.resolve(), sleep(FONT_WAIT_MS)]);

// ---- Text the copy-bot types ------------------------------------------------

/**
 * An element whose text is revealed character by character. Every character becomes a span that
 * is invisible until typed, so the final layout is there from the start and nothing shifts.
 * The element's own markup (links, the serif accent word) stays intact. Screen readers get the
 * whole text at once from a visually hidden copy; the character spans are aria-hidden.
 */
class Typable {
    constructor(el) {
        this.el = el;
        this.count = 0;
        this.chars = [];

        const text = el.textContent.replace(/\s+/g, ' ').trim();
        const visual = document.createElement('span');
        visual.setAttribute('aria-hidden', 'true');
        while (el.firstChild) visual.append(el.firstChild);

        const sr = document.createElement('span');
        sr.className = 'sr-only';
        sr.textContent = text;
        el.append(sr, visual);

        this.wrap(visual);
        this.text = this.chars.map((c) => c.textContent).join('');
    }

    /** Replace every text node under `root` by one span per character. */
    wrap(root) {
        const nodes = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);

        nodes.forEach((node, i) => {
            let data = node.data.replace(/\s+/g, ' ');
            if (i === 0) data = data.trimStart();
            if (i === nodes.length - 1) data = data.trimEnd();
            const frag = document.createDocumentFragment();
            for (const ch of data) {
                const span = document.createElement('span');
                span.className = 'ch';
                span.textContent = ch;
                frag.append(span);
                this.chars.push(span);
            }
            node.replaceWith(frag);
        });
    }

    /** Show the first n characters. */
    reveal(n) {
        const end = Math.min(n, this.chars.length);
        for (; this.count < end; this.count++) this.chars[this.count].classList.add('on');
    }

    revealAll() { this.reveal(this.chars.length); }

    hideAll() {
        for (const c of this.chars) c.classList.remove('on');
        this.count = 0;
    }

    /** Where the I-beam stands: right behind the last typed character, centred on the line. */
    caretPoint = () => {
        const last = this.chars[this.count - 1];
        if (!last) {
            const first = this.chars[0].getBoundingClientRect();
            return { x: first.left - 2, y: first.top + first.height / 2 };
        }
        const b = last.getBoundingClientRect();
        return { x: b.right + 8, y: b.top + b.height / 2 };
    };

    /** Typography the way an inspector would show it: weight · size / line-height · letter-spacing. */
    spec() {
        const cs = getComputedStyle(this.el);
        const size = parseFloat(cs.fontSize);
        const line = parseFloat(cs.lineHeight);
        const spacing = parseFloat(cs.letterSpacing);
        let out = `${cs.fontWeight} · ${Math.round(size)}px / ${Number.isFinite(line) ? (line / size).toFixed(2) : 'normal'}`;
        if (Number.isFinite(spacing) && spacing !== 0) out += ` · ${(spacing / size).toFixed(3)}em`;
        return out;
    }
}

// ---- Shapes the layout-bot drags out ----------------------------------------

/** An element the layout-bot builds (see layout.js), and optionally outlined by the design-bot. */
class Shape {
    constructor(el) {
        this.el = el;
        this.fast = el.dataset.box === 'fast'; // repeated small things: quicker, no size tag
        this.shell = new Shell(el);
        this.done = false; // built: other shapes may align to it
        this.pieces = null;
    }

    /** Hidden again: not shown, outline erased. */
    collapse() {
        this.shell.cleanup();
        this.el.classList.remove('is-shown');
        this.done = false;
        for (const piece of this.pieces ?? []) {
            piece.style.scale = '';
            piece.style.opacity = '';
        }
    }

    /** The outline as 8 pieces (4 corners, 4 edges) in drawing order, with the points they connect. */
    outline() {
        const el = this.el;
        const W = el.offsetWidth, H = el.offsetHeight;
        const R = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, W / 2, H / 2);
        el.style.setProperty('--piece-r', `${R}px`);
        if (!this.pieces) {
            this.pieces = [
                part('corner corner-tl'), part('edge edge-top'),
                part('corner corner-tr'), part('edge edge-right'),
                part('corner corner-br'), part('edge edge-bottom'),
                part('corner corner-bl'), part('edge edge-left'),
            ];
            el.append(...this.pieces);
        }
        const arc = (Math.PI * R) / 2;
        const lens = [arc, W - 2 * R, arc, H - 2 * R, arc, W - 2 * R, arc, H - 2 * R];
        const pts = [[0, R], [R, 0], [W - R, 0], [W, R], [W, H - R], [W - R, H], [R, H], [0, H - R], [0, R]];
        return { lens, pts, total: lens.reduce((a, b) => a + b, 0) };
    }

    /** Reveal the outline up to progress p (0..1). */
    setDrawn(p, path) {
        let dist = p * path.total;
        path.lens.forEach((len, i) => {
            const t = clamp(dist / len, 0, 1);
            dist -= len;
            const piece = this.pieces[i];
            if (i % 2 === 0) piece.style.opacity = t.toFixed(3);
            else piece.style.scale = i % 4 === 1 ? `${t.toFixed(3)} 1` : `1 ${t.toFixed(3)}`;
        });
    }

    /** Viewport position of the pencil tip at progress p. `r` is the shape's rect. */
    drawPoint(p, r, path) {
        let dist = p * path.total;
        let i = 0;
        while (i < path.lens.length - 1 && dist > path.lens[i]) dist -= path.lens[i++];
        const t = clamp(dist / path.lens[i], 0, 1);
        const [x0, y0] = path.pts[i];
        const [x1, y1] = path.pts[i + 1];
        return { x: r.left + x0 + (x1 - x0) * t, y: r.top + y0 + (y1 - y0) * t };
    }
}

// ---- Mockups the motion-bot tilts in ---------------------------------------------

/**
 * A .tilt mockup. In CSS its angle is --ry / --rx scaled by --t (1 = tilted, the default). With JS it
 * starts flat (--t: 0) and the motion-bot turns --t from 0 to 1, so the real angles can be shown live.
 */
class Tilt {
    constructor(el) {
        this.el = el;
        this.set(0);
    }

    set(t) { this.el.style.setProperty('--t', t.toFixed(3)); }

    /** Tilted for good: back to the CSS default (and the hover effect takes over from there). */
    reveal() {
        this.el.style.removeProperty('--t');
        this.el.classList.remove('is-driven');
    }

    /** The angles at full tilt, read from the CSS custom properties. */
    angles() {
        const cs = getComputedStyle(this.el);
        return { rx: parseFloat(cs.getPropertyValue('--rx')) || 0, ry: parseFloat(cs.getPropertyValue('--ry')) || 0 };
    }
}

// ---- One section of the page --------------------------------------------------

/** A [data-section]: its shapes, texts and decorations, and whether it has been built yet. */
class Section {
    constructor(el) {
        this.el = el;
        this.isHero = el.dataset.section === 'hero';
        this.state = 'idle'; // idle -> building -> built
        this.cancelled = false;

        this.shapes = [...el.querySelectorAll('[data-box]')].map((e) => new Shape(e));
        this.shapeOf = new Map(this.shapes.map((s) => [s.el, s]));
        this.texts = [...el.querySelectorAll('[data-type]')].map((e) => new Typable(e));
        this.textOf = new Map(this.texts.map((t) => [t.el, t]));

        // What the motion-bot tilts in, and what the a11y-bot checks.
        this.tilts = [...el.querySelectorAll('.tilt')].map((e) => new Tilt(e));
        this.checks = [...el.querySelectorAll('[data-a11y]')];

        // [data-grid]: the bot draws the real columns first, then drags the cards (its children) into them.
        this.grids = [...el.querySelectorAll('[data-grid]')]
            .map((e) => new Grid(e, this.shapes.filter((s) => s.el.parentElement === e)))
            .filter((g) => g.shapes.length);
        this.gridOf = new Map(this.grids.flatMap((g) => g.shapes.map((s) => [s, g])));

        // What the design-bot draws: an underline below data-underline words, the outline of data-outline shapes.
        this.decos = [];
        for (const e of el.querySelectorAll('[data-underline]')) {
            const line = part('underline');
            e.append(line);
            this.decos.push({ kind: 'underline', el: e, line, text: this.textOf.get(e.closest('[data-type]')) });
        }
        for (const shape of this.shapes) {
            if (shape.el.hasAttribute('data-outline')) this.decos.push({ kind: 'outline', shape });
        }
        // data-outline without data-box: not dragged out, only outlined once its text is typed.
        this.outlined = [];
        for (const e of el.querySelectorAll('[data-outline]:not([data-box])')) {
            const shape = new Shape(e);
            this.outlined.push(shape);
            this.decos.push({ kind: 'outline', shape, text: this.textOf.get(e.querySelector('[data-type]')) });
        }
    }

    /** Typing speed (1 = full, smaller = faster) so that the whole section takes about data-type-ms. */
    typingSpeed() {
        const budget = Number(this.el.dataset.typeMs) || DEFAULT_TYPE_MS;
        const chars = this.texts.reduce((sum, t) => sum + t.chars.length, 0);
        return clamp(budget / (Math.max(chars, 1) * AVG_CHAR_MS), 0.08, this.isHero ? 1 : SCROLL_TYPE_SPEED);
    }

    /** Empty again, ready to be built. */
    reset() {
        for (const shape of [...this.shapes, ...this.outlined]) shape.collapse();
        for (const g of this.grids) g.cleanup();
        for (const t of this.texts) t.hideAll();
        for (const d of this.decos) if (d.line) d.line.style.scale = '';
        for (const t of this.tilts) { t.set(0); t.el.classList.remove('is-driven'); }
        this.state = 'idle';
        this.cancelled = false;
    }

    /** The finished section, instantly. */
    showAll() {
        for (const g of this.grids) g.cleanup();
        for (const shape of this.shapes) {
            shape.shell.cleanup(); // a build that was cut short leaves nothing behind
            shape.el.classList.add('is-shown');
            shape.done = true;
        }
        for (const t of this.texts) t.revealAll();
        for (const t of this.tilts) t.reveal();
        for (const d of this.decos) {
            if (d.kind === 'underline') d.line.style.scale = '1 1';
            else d.shape.setDrawn(1, d.shape.outline());
        }
    }
}

// ---- The builder -------------------------------------------------------------

export class SiteBuilder {
    constructor({ swarm, box, site, glow, next, status }) {
        this.swarm = swarm;
        this.box = box;   // start box: gone after the first click
        this.site = site; // the page
        this.glow = glow;
        this.next = next; // pill that builds everything again
        this.nextLabel = next.querySelector('.next-label');
        this.status = status;

        this.sections = [...site.querySelectorAll('[data-section]')].map((el) => new Section(el));
        this.hero = this.sections.find((s) => s.isHero) ?? this.sections[0];

        this.builder = null;  // layout-bot
        this.typist = null;   // copy-bot
        this.designer = null; // design-bot
        this.checker = null;  // a11y-bot
        this.animator = null; // motion-bot
        this.ring = null;     // the a11y-bot's focus ring
        this.busy = false;    // the hero is being (re)built
        this.pumping = false; // a later section is being built
        this.started = false; // the start box has been clicked
        this.live = false;    // the hero stands: the other sections follow the scrolling
        this.parked = false;  // reduced motion: built once, no replay
        this.current = null;  // the section being built right now
        this.frame = 0;
        this.guides = new Guides(swarm.layer); // snap lines
        this.bigCount = 0;    // big shapes built so far: every third one overshoots and corrects itself

        const onScroll = () => {
            if (this.frame) return;
            this.frame = requestAnimationFrame(() => { this.frame = 0; this.skipPast(); this.pump(); });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
    }

    /** Start (or restart) the build. `origin` is where the bots burst out (first run only). */
    async run(origin) {
        if (this.busy || this.pumping || this.parked) return;
        this.busy = true;
        this.next.classList.remove('is-ready');
        this.hideBox();
        if (this.started) this.reset();
        this.started = true;
        document.documentElement.classList.add('is-live');
        this.site.classList.add('is-live');
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        this.site.focus({ preventScroll: true }); // keep keyboard focus somewhere sensible while building
        try {
            if (prefersReducedMotion()) this.buildStatic(origin);
            else await this.buildSection(this.hero, origin);
        } finally {
            this.busy = false;
            this.live = true;
            this.parked = prefersReducedMotion();
        }
        this.pump();
    }

    /** The start box dissolves on the first click and never comes back. */
    hideBox() {
        const { box } = this;
        if (box.hidden || box.classList.contains('is-gone')) return;
        box.classList.add('is-gone');
        if (prefersReducedMotion()) box.hidden = true;
        else setTimeout(() => { box.hidden = true; }, BOX_EXIT_MS);
    }

    /** Back to the empty page (the glow fades out on its own). */
    reset() {
        this.live = false;
        this.bigCount = 0;
        this.guides.clear();
        for (const s of this.sections) s.reset();
        this.glow.classList.remove('is-on', 'is-moving');
    }

    /** Build every section that has scrolled into view, in order. */
    async pump() {
        if (this.pumping || this.busy || !this.live) return;
        this.pumping = true;
        try {
            for (;;) {
                const next = this.sections.find((s) => s.state === 'idle');
                if (!next || !this.wanted(next)) break;
                await this.buildSection(next);
            }
        } finally {
            this.pumping = false;
        }
        this.restAll();
        this.updateUi();
    }

    /** A section is wanted once it is close to the viewport: in it, above it, or less than LOOKAHEAD screens below. */
    wanted(section) {
        const r = section.el.getBoundingClientRect();
        return r.top < window.innerHeight * (1 + LOOKAHEAD);
    }

    /** The visitor scrolled past the section being built: finish it at once so the bots move on to the next one. */
    skipPast() {
        const s = this.current;
        if (!s || s.isHero || s.cancelled) return;
        if (s.el.getBoundingClientRect().bottom >= 0) return;
        s.cancelled = true;
        s.showAll();
    }

    // ---- Off duty -------------------------------------------------------------

    /**
     * Where a bot waits while it has nothing to build. Not a roaming target: the bots stand at the bottom
     * edge of the screen, where the next section will come from. Once everything stands they tuck into
     * the bottom-right corner (stacked, so the name pills stay readable and nothing sits on the content).
     */
    restPoint(bot) {
        const i = Math.max(0, this.crew.indexOf(bot));
        const vw = window.innerWidth, vh = window.innerHeight;
        if (this.sections.every((s) => s.state === 'built')) {
            return { x: Math.max(REST_MARGIN, vw - 120), y: vh - REST_MARGIN - i * REST_STACK };
        }
        return { x: vw * (0.2 + i * 0.15), y: vh - REST_MARGIN };
    }

    /** Send a bot to wait at its resting point (it follows it, so resizing and the end of the build are covered). */
    rest(bot) {
        if (!bot || prefersReducedMotion()) return;
        bot.follow(() => this.restPoint(bot));
    }

    restAll() {
        for (const bot of this.crew) this.rest(bot);
    }

    get crew() { return [this.builder, this.typist, this.designer, this.checker, this.animator]; }

    /** Announce the result and offer to build again, once everything stands. */
    updateUi() {
        if (this.sections.some((s) => s.state !== 'built')) return;
        this.status.textContent = 'Website built.';
        if (this.parked) return;
        this.nextLabel.textContent = REPLAY_LABEL;
        this.next.classList.add('is-ready');
    }

    ensureBots(origin, burst) {
        this.builder ??= this.swarm.add({ ...origin, ...JOBS.layout, burst });
        this.typist ??= this.swarm.add({ ...origin, ...JOBS.copy, burst });
        this.designer ??= this.swarm.add({ ...origin, ...JOBS.design, burst });
        this.checker ??= this.swarm.add({ ...origin, ...JOBS.a11y, burst });
        this.animator ??= this.swarm.add({ ...origin, ...JOBS.motion, burst });
        this.ring ??= new FocusRing(this.swarm.layer, JOBS.a11y.color);
    }

    // ---- Instant builds -----------------------------------------------------

    /** Show a section at once (reduced motion, or it was scrolled past before its turn). */
    showSection(section) {
        section.showAll();
        if (section.isHero) this.glow.classList.add('is-on', 'is-moving');
        section.state = 'built';
    }

    /** Reduced motion: the whole page at once, the bots parked next to the hero. */
    buildStatic(origin) {
        this.ensureBots(origin, false);
        for (const s of this.sections) this.showSection(s);
        this.status.textContent = 'Website built.';

        const { shapes, texts, decos } = this.hero;
        const last = shapes.at(-1).el.getBoundingClientRect();
        this.builder.place(last.right, last.bottom);
        const end = texts.find((t) => t.el.classList.contains('lede'))?.chars.at(-1).getBoundingClientRect();
        if (end) this.typist.place(end.right + 8, end.top + end.height / 2);
        const accent = decos.find((d) => d.kind === 'underline')?.el.getBoundingClientRect();
        if (accent) this.designer.place(accent.right, accent.bottom);
        const checked = this.hero.checks.at(-1)?.getBoundingClientRect();
        if (checked) this.checker.place(checked.right, checked.bottom);
        this.animator.place(window.innerWidth * 0.72, window.innerHeight * 0.3);
    }

    // ---- Animated builds ----------------------------------------------------

    /** Build one section with the bots (instantly if it is already behind the visitor). */
    async buildSection(section, origin) {
        section.state = 'building';
        this.current = section;
        try {
            const scrolledPast = !section.isHero && section.el.getBoundingClientRect().bottom < 0;
            const instant = section.el.hasAttribute('data-instant');
            if (prefersReducedMotion() || scrolledPast || instant) this.showSection(section);
            else await this.animate(section, origin);
        } catch (error) {
            // Whatever went wrong: the visitor must never be left with a half-built page.
            console.error(error);
            section.cancelled = true;
            this.showSection(section);
        }
        section.state = 'built';
        this.current = null;
        if (section.isHero) this.status.textContent = 'The first screen is built. Scroll down for the rest.';
    }

    async animate(section, origin) {
        this.status.textContent = 'Building the website…';
        await fontsReady(); // the layout must be final before anything is measured
        this.ensureBots(origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 }, true);
        const { builder, typist, designer, checker, animator } = this;

        const boxReady = new Map(section.shapes.map((s) => [s, defer()]));
        const typed = new Map(section.texts.map((t) => [t, defer()]));
        const speed = section.typingSpeed();
        const glowOn = defer(); // the design-bot has switched the glow on: the motion-bot may set it drifting

        // layout-bot: drags out the shapes, in page order.
        const layout = (async () => {
            for (const shape of section.shapes) {
                if (section.cancelled) return;
                const grid = section.gridOf.get(shape);
                if (grid && !grid.opened) await this.openGrid(grid);
                await this.dragOut(shape, section);
                if (grid && --grid.pending === 0) grid.close();
                boxReady.get(shape).resolve();
            }
            this.rest(builder);
        })();

        // copy-bot: types the texts, in page order. A text waits for the shape around it.
        const copy = (async () => {
            for (const t of section.texts) {
                if (section.cancelled) return;
                const around = section.shapeOf.get(t.el.closest('[data-box]'));
                if (around) await boxReady.get(around).promise;
                const override = parseFloat(t.el.dataset.speed);
                await this.typeText(t, { speed: Number.isFinite(override) ? override : speed, tag: t.el.hasAttribute('data-tag') });
                typed.get(t).resolve();
            }
            this.rest(typist);
        })();

        // design-bot: switches the glow on (hero), then draws whatever is ready first.
        const design = (async () => {
            if (section.isHero) await this.lightUp();
            glowOn.resolve();
            const pending = section.decos.map((d) => ({
                d,
                ready: d.kind === 'underline'
                    ? typed.get(d.text).promise
                    // An outline waits for its box, or (no box) for its text, or for the box around it, or goes right away.
                    : (boxReady.get(d.shape)?.promise ?? typed.get(d.text)?.promise
                        ?? boxReady.get(section.shapeOf.get(d.shape.el.closest('[data-box]')))?.promise ?? Promise.resolve()),
            }));
            while (pending.length) {
                const item = await Promise.race(pending.map((p) => p.ready.then(() => p)));
                pending.splice(pending.indexOf(item), 1);
                if (section.cancelled) return;
                if (item.d.kind === 'underline') await this.drawUnderline(item.d);
                else await this.drawOutline(item.d.shape);
            }
            this.rest(designer);
        })();

        // a11y-bot: checks whatever is marked data-a11y, as soon as its text and its box stand.
        const a11y = (async () => {
            const pending = section.checks.map((el) => {
                const around = section.shapeOf.get(el.closest('[data-box]'));
                const waits = section.texts.filter((t) => el.contains(t.el)).map((t) => typed.get(t).promise);
                if (around) waits.push(boxReady.get(around).promise);
                return { el, ready: Promise.all(waits) };
            });
            while (pending.length) {
                const item = await Promise.race(pending.map((p) => p.ready.then(() => p)));
                pending.splice(pending.indexOf(item), 1);
                if (section.cancelled) return;
                await this.checkElement(item.el);
            }
            this.rest(checker);
        })();

        // motion-bot: starts the glow drifting (hero), then tilts every mockup in once its card stands.
        const motion = (async () => {
            if (section.isHero) {
                await glowOn.promise;
                if (section.cancelled) return;
                await this.startDrift();
            }
            for (const tilt of section.tilts) {
                if (section.cancelled) return;
                const around = section.shapeOf.get(tilt.el.closest('[data-box]'));
                if (around) await boxReady.get(around).promise;
                await this.tiltIn(tilt);
            }
            this.rest(animator);
        })();

        await Promise.all([layout, copy, design, a11y, motion]);
    }

    /** a11y-bot walks to an element, holds a focus ring around it and reads out its real contrast. */
    async checkElement(el) {
        const { checker: bot, ring, swarm } = this;
        const a = anchor(el);
        const centre = () => { const r = a(); return { x: r.left + Math.min(r.width / 2, 160), y: r.top + r.height / 2 }; };

        await bot.chase(centre, ARRIVE);
        bot.press();
        ring.show(el, a);
        bot.inspect(describe(el), () => { const r = a(); return { x: r.left, y: Math.max(4, r.top - TAG_GAP) }; });
        const stop = swarm.onFrame(() => ring.move());

        await sleep(CHECK_MS);
        stop();
        ring.hide();
        bot.release();
        swarm.ripple(bot.x, bot.y, bot.color);
        await sleep(150);
        bot.hideTag();
    }

    /** motion-bot clicks into the page: the background glow starts to drift (slowly, forever). */
    async startDrift() {
        const { animator: bot } = this;
        const at = () => ({ x: window.innerWidth * 0.72, y: window.innerHeight * 0.3 });
        await bot.chase(at, ARRIVE);
        bot.inspect('drift 26s · ease-in-out', () => { const p = at(); return { x: p.x, y: p.y - TAG_GAP }; });
        await bot.click();
        this.glow.classList.add('is-moving');
        await sleep(700);
        bot.hideTag();
    }

    /** motion-bot grabs a flat mockup and drags it into its 3D angle; the tag counts the degrees. */
    async tiltIn(tilt) {
        const { animator: bot, swarm } = this;
        const el = tilt.el;
        const { rx, ry } = tilt.angles();
        const a = anchor(el); // measured while the mockup is still flat
        const grab = () => { const r = a(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
        const tagAt = () => { const r = a(); return { x: r.left, y: Math.max(4, r.top - TAG_GAP) }; };

        await bot.chase(grab, ARRIVE);
        bot.press();
        el.classList.add('is-driven'); // no CSS transition while the bot drives --t every frame
        const t0 = performance.now();
        const progress = () => easeInOut(clamp((performance.now() - t0) / TILT_MS, 0, 1));
        const side = ry < 0 ? -1 : 1;
        bot.follow(() => { const g = grab(); return { x: g.x + side * 40 * progress(), y: g.y }; }, { damping: DRAG_DAMPING });
        const stop = swarm.onFrame(() => {
            const p = progress();
            tilt.set(p);
            bot.inspect(`rotateY ${Math.round(ry * p)}° · rotateX ${Math.round(rx * p)}°`, tagAt);
        });

        await sleep(TILT_MS);
        stop();
        tilt.reveal();
        bot.release();
        swarm.ripple(bot.x, bot.y, bot.color);
        await sleep(250);
        bot.hideTag();
    }

    /** design-bot walks into the page and clicks: the background glow comes on. */
    async lightUp() {
        const { designer } = this;
        await designer.chase(() => ({ x: window.innerWidth * 0.3, y: window.innerHeight * 0.4 }), ARRIVE);
        await designer.click();
        this.glow.classList.add('is-on');
    }

    /** Where the bot's inspector tag sits for a shape: just above its top-left corner. */
    tagAbove(a) {
        return () => { const q = a(); return { x: q.left, y: Math.max(4, q.top - TAG_GAP) }; };
    }

    /** layout-bot draws the columns of a [data-grid] along its top edge; the cards are dragged into them next. */
    async openGrid(grid) {
        const { builder, swarm } = this;
        const a = anchor(grid.el);
        const { count, gap } = grid.open();

        await builder.chase(() => { const r = a(); return { x: r.left, y: r.top + 6 }; }, ARRIVE_FAST);
        const tag = this.tagAbove(a);
        builder.inspect(`grid ${count} ${count === 1 ? 'col' : 'cols'} · gap ${gap}`, tag);
        swarm.ripple(a().left, a().top + 6, builder.color);
        builder.press();

        const t0 = performance.now();
        const progress = () => easeInOut(clamp((performance.now() - t0) / GRID_MS, 0, 1));
        builder.follow(() => { const r = a(); return { x: r.left + r.width * progress(), y: r.top + 6 }; }, { damping: DRAG_DAMPING });
        const stop = swarm.onFrame(() => grid.progress(progress()));
        await sleep(GRID_MS);
        stop();
        grid.progress(1);
        builder.release();
        await sleep(120);
        builder.hideTag();
    }

    /** Edges that line up with what already stands: neighbours, the parent's inner edges, grid columns, the page centre. */
    snapPlan(shape, section, a) {
        const targets = [];
        for (const s of section.shapes) {
            if (s === shape || !s.done) continue;
            const r = s.el.getBoundingClientRect();
            if (s.el.contains(shape.el)) {
                // the parent: its inner edges (inside border and padding) are what the child aligns to
                const { pad, border } = s.shell.m;
                targets.push(pageRect({
                    left: r.left + border[1] + pad[3], top: r.top + border[0] + pad[0],
                    right: r.right - border[1] - pad[1], bottom: r.bottom - border[0] - pad[2],
                }));
            } else {
                targets.push(pageRect(r));
            }
        }
        const grid = section.gridOf.get(shape);
        if (grid) targets.push(...grid.targets());
        return guidePlan(pageRect(a()), targets, [document.documentElement.clientWidth / 2]);
    }

    /**
     * layout-bot builds a shape for real: it presses at the top-left corner and drags a box with a real
     * width and height to the bottom-right one (every now and then too far or too small, then it
     * corrects), then sets the padding and the gap so that the children flow in (frameOut).
     */
    async dragOut(shape, section) {
        const { builder, swarm, guides } = this;
        const el = shape.el;
        const fast = shape.fast;
        const shell = shape.shell;
        const a = anchor(el);
        const m = shell.measure(); // the finished size, while nothing has been changed yet
        const ms = fast ? DRAG_FAST_MS : DRAG_MS;

        // Every third big shape misses: too far (+) or too small (-) by a few pixels, then the bot corrects.
        let ox = 0, oy = 0;
        if (!fast && m.w * m.h > BIG_AREA && this.bigCount++ % 3 === 0) {
            const sign = (this.bigCount - 1) / 3 % 2 === 0 ? 1 : -1;
            const room = Math.max(0, document.documentElement.clientWidth - 8 - a().right);
            ox = sign * Math.min(clamp(m.w * 0.08, 10, 40), sign > 0 ? room : Infinity);
            oy = sign * clamp(m.h * 0.2, 6, 18);
        }
        const misses = ox !== 0 || oy !== 0;
        const SETTLE = { tolerance: 10, settleSpeed: 450, timeout: 650, damping: DRAG_DAMPING };
        const MISS = { tolerance: 6, settleSpeed: 200, timeout: 1000, damping: DRAG_DAMPING }; // slow enough that the miss shows
        const corner = () => { const r = a(); return { x: r.right, y: r.bottom }; };

        await builder.chase(() => { const r = a(); return { x: r.left, y: r.top }; }, fast ? ARRIVE_FAST : ARRIVE);
        if (section.cancelled) return;

        guides.arm(this.snapPlan(shape, section, a));
        const t0 = performance.now();
        shell.begin();
        if (!fast) shell.select(true);
        const from = a();
        swarm.ripple(from.left, from.top, builder.color); // the "mouse down" of the drag
        builder.press();

        builder.follow(() => {
            const r = a();
            const k = easeInOut(clamp((performance.now() - t0) / ms, 0, 1));
            return { x: r.left + m.w * k, y: r.top + m.h * k };
        }, { damping: DRAG_DAMPING });

        // The far corner is glued to the cursor: the box's real width and height follow its real position.
        const tag = this.tagAbove(a);
        const stop = swarm.onFrame(() => {
            const r = a();
            const w = clamp(builder.x - r.left, MIN_SIZE, m.w + Math.max(ox, 0));
            const h = clamp(builder.y - r.top, MIN_SIZE, m.h + Math.max(oy, 0));
            shell.resize(w, h);
            const px = window.scrollX, py = window.scrollY;
            guides.update({
                left: r.left + px, cx: r.left + w / 2 + px, right: r.left + w + px,
                top: r.top + py, cy: r.top + h / 2 + py, bottom: r.top + h + py,
            }, performance.now() - t0);
            if (!fast) builder.inspect(`${Math.round(w)} × ${Math.round(h)}`, tag);
        });

        try {
            await sleep(ms);
            // Small repeated shapes do not wait for the bot to come to a stop: the next shape is next.
            if (!fast) {
                // A miss: the bot lets go a few pixels too far (or too short), sees the tag, and corrects.
                await builder.chase(misses ? () => { const r = a(); return { x: r.right + ox, y: r.bottom + oy }; } : corner, misses ? MISS : SETTLE);
                if (misses) {
                    await sleep(FIX_HOLD_MS);
                    await builder.chase(corner, SETTLE);
                }
            }
        } finally {
            stop();
        }

        shell.resize(m.w, m.h); // exactly the finished size: the tag shows what the layout really is
        builder.release();
        const to = a();
        swarm.ripple(to.right, to.bottom, builder.color);
        if (!fast) {
            builder.inspect(`${Math.round(m.w)} × ${Math.round(m.h)}`, tag);
            await sleep(90); // let the final size sink in before the tag goes
        }
        guides.hold(fast ? 120 : 250);
        if (section.cancelled) return;
        shell.swap();
        shape.done = true;

        if (m.frames) await this.frameOut(shape, section, a);
        else shell.restore();
        if (!fast || m.frames) builder.hideTag();
    }

    /**
     * Auto-layout: the element is pinned to its size and starts with padding 0 and gap 0, so its children
     * are stacked in the corner (dashed outlines). The bot pulls the padding in from the bottom-right
     * corner, then the gap opens; the numbers in the tag count up and the children flow into place.
     */
    async frameOut(shape, section, a) {
        const { builder, swarm } = this;
        const shell = shape.shell;
        const m = shell.m;
        const ms = shape.fast ? FRAME_FAST_MS : FRAME_MS;

        shell.frameBegin();
        const t0 = performance.now();
        const prog = () => clamp((performance.now() - t0) / ms, 0, 1);
        const fp = () => easeInOut(clamp(prog() / 0.7, 0, 1));       // padding first ...
        const fg = () => easeInOut(clamp((prog() - 0.3) / 0.7, 0, 1)); // ... the gap opens a little later
        const tag = this.tagAbove(a);
        builder.press();
        builder.follow(() => {
            const r = a();
            const f = fp();
            return { x: r.right - m.pad[1] * f, y: r.bottom - m.pad[2] * f };
        }, { damping: DRAG_DAMPING });
        const stop = swarm.onFrame(() => {
            shell.frameStep(fp(), fg());
            builder.inspect(shell.label(fp(), fg()), tag);
        });

        try {
            await sleep(ms);
        } finally {
            stop();
            shell.frameStep(1, 1);
        }
        builder.inspect(shell.label(1, 1), tag);
        builder.release();
        if (!shape.fast) await sleep(40);
        shell.frameEnd();
    }

    /** copy-bot walks to the start of a text, then types it while following the last character. */
    async typeText(t, { speed = 1, tag = false } = {}) {
        const { typist } = this;
        const slow = speed > 0.3; // fast typing does not wait for the bot to arrive

        if (slow) await typist.chase(t.caretPoint, TYPE_ARRIVE);
        else typist.follow(t.caretPoint);
        if (tag) {
            typist.inspect(t.spec(), () => {
                const r = t.el.getBoundingClientRect();
                return { x: r.left, y: Math.max(4, r.top - TAG_GAP) };
            });
        }
        if (slow) await sleep(60);

        // Very fast typing reveals a few characters per tick (timers cannot go much below 4ms).
        const step = speed < 0.15 ? 3 : speed < 0.3 ? 2 : 1;
        const n = t.chars.length;
        for (let i = 0; i < n; i += step) {
            if (this.current?.cancelled) {
                if (tag) typist.hideTag();
                return;
            }
            const end = Math.min(i + step, n);
            t.reveal(end);
            await sleep(typingDelay(t.text[end - 1], speed));
        }

        if (slow) await sleep(120);
        if (tag) typist.hideTag();
    }

    /** design-bot draws the underline below a word from left to right. */
    async drawUnderline({ el, line }) {
        const { designer, swarm } = this;
        const a = anchor(el);
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        const y = () => a().bottom - 2;

        await designer.chase(() => ({ x: a().left, y: y() }), ARRIVE);
        designer.inspect(`underline 2px ${accent}`, () => { const r = a(); return { x: r.left, y: r.bottom + 10 }; });
        designer.press();

        const t0 = performance.now();
        const progress = () => easeInOut(clamp((performance.now() - t0) / DRAW_MS, 0, 1));
        designer.follow(() => { const r = a(); return { x: r.left + r.width * progress(), y: y() }; }, { damping: DRAG_DAMPING });
        const stop = swarm.onFrame(() => { line.style.scale = `${progress().toFixed(3)} 1`; });

        await sleep(DRAW_MS);
        stop();
        line.style.scale = '1 1';
        designer.release();
        swarm.ripple(a().right, y(), designer.color);
        await sleep(200);
        designer.hideTag();
    }

    /** design-bot draws the outline of a shape, corner by corner. */
    async drawOutline(shape) {
        const { designer, swarm } = this;
        const a = anchor(shape.el);
        const path = shape.outline();
        const accent = getComputedStyle(shape.el).getPropertyValue('--outline').trim()
            || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

        await designer.chase(() => shape.drawPoint(0, a(), path), ARRIVE);
        designer.inspect(`border 1.5px ${accent}`, () => { const r = a(); return { x: r.left, y: r.bottom + 8 }; });
        designer.press();

        const ms = DRAW_MS * 1.5;
        const t0 = performance.now();
        const progress = () => clamp((performance.now() - t0) / ms, 0, 1);
        designer.follow(() => shape.drawPoint(progress(), a(), path), { damping: DRAG_DAMPING });
        const stop = swarm.onFrame(() => shape.setDrawn(progress(), path));

        await sleep(ms);
        stop();
        shape.setDrawn(1, path);
        designer.release();
        const start = shape.drawPoint(0, a(), path);
        swarm.ripple(start.x, start.y, designer.color);
        await sleep(200);
        designer.hideTag();
    }
}
