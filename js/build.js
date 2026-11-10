// The build "job": three bot cursors construct the page live, one section at a time.
// The hero is built after the first click on the box; every other section (index.html:
// data-section) is built ahead of the visitor, as soon as it is less than LOOKAHEAD screens below the
// viewport, so the bots keep working further down while the visitor scrolls. When a bot has nothing
// to do it waits at the bottom edge of the screen (the build front), or next to the box in the corner once
// everything stands, and after a few seconds it walks home into the box (Cursor.goHome). A section that
// scrolls into reach calls the bots it needs back out of the box. A click on the docked box builds everything again.
//
// Who does what (the markup says what to build, see index.html):
//   layout-bot (arrow)  drags out every data-box: nav pill, buttons, cards, chips ...
//                       A selection frame with handles and a live size tag ("980 × 56") show the drag.
//   copy-bot (I-beam)   types every data-type text, character by character, with a tag that shows
//                       the real typography ("600 · 96px / 1.00 · -0.035em") for data-tag texts.
//   design-bot (pencil) switches the glow on (hero), draws data-underline words and data-outline shapes.
// The three bots work in parallel lanes and wait for each other only where they must: a text waits
// for the box around it, an underline waits for its text, an outline waits for its box.
//
// Everything bots aim at is measured against the page (see anchor), so it still works when the
// visitor scrolls during a build. Without JS the page is simply visible. With JS every text gets a
// screen-reader copy first, so assistive tech reads everything at once while the visible characters
// are revealed one by one. With prefers-reduced-motion everything is shown at once, bots parked.

import { DRAG_DAMPING, prefersReducedMotion } from './cursors.js';

const MIN_SCALE = 0.02; // never scale to exactly 0 (keeps the shape measurable)
const DRAG_MS = 650;
const DRAG_FAST_MS = 380;
const DRAW_MS = 900;
const TAG_GAP = 28;      // inspector tags sit this far above an element (or 8px below it)
const FONT_WAIT_MS = 1500;
const DEFAULT_TYPE_MS = 4500; // how long typing a whole section may take (data-type-ms overrides)
const SCROLL_TYPE_SPEED = 0.5; // sections the visitor scrolls to are typed faster than the hero
const AVG_CHAR_MS = 42;       // average delay per character at speed 1
// The bots build ahead of the visitor: a section is started once its top is this many screen heights
// below the bottom edge of the viewport. Visitors tend to keep scrolling, so the page is there before they are.
const LOOKAHEAD = 0.8;
const REST_MARGIN = 44;       // waiting bots keep this far from the viewport edge (px)
const REST_STACK = 34;        // vertical gap between waiting bots next to the box (px)
const EMERGE_STAGGER_MS = 130; // bots come out of the box one after the other

// How exactly a bot has to arrive before its job goes on. Close and fast enough is enough: the
// next movement (follow) catches up anyway, and waiting for a full stop made every step crawl.
const ARRIVE = { tolerance: 30, settleSpeed: 600, timeout: 1500 };
const ARRIVE_FAST = { tolerance: 60, settleSpeed: 900, timeout: 900 };
// Typing starts while the copy-bot is still a few steps away: it follows the caret and catches up.
const TYPE_ARRIVE = { tolerance: 90, settleSpeed: 4000, timeout: 900 };

// One job per bot: name pill, colour and pointer shape (see cursors.js). Colours stay readable under
// the dark pill text. Off duty the bots do not roam (see SiteBuilder.rest): they wait where the next work is.
// Personality: the layout-bot is shy (goes home first), the copy-bot curious, the design-bot sociable.
const JOBS = {
    layout: { label: 'layout-bot', color: '#7b95ff', kind: 'arrow', personality: { shyness: 0.9, curiosity: 0.2, sociability: 0.3 } },
    copy: { label: 'copy-bot', color: '#ff8fb8', kind: 'text', personality: { shyness: 0.2, curiosity: 0.9, sociability: 0.4 } },
    design: { label: 'design-bot', color: '#ffc766', kind: 'pen', personality: { shyness: 0.4, curiosity: 0.3, sociability: 0.9 } },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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

const part = (className) => {
    const el = document.createElement('span');
    el.className = className;
    el.setAttribute('aria-hidden', 'true');
    return el;
};

/** "rgb(51, 85, 255)" -> "#3355ff" (what an inspector would show). */
const toHex = (rgb) => '#' + (rgb.match(/\d+/g) ?? []).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('');

/** Wait for the web fonts (the layout must be final before the bots measure it), but never for long. */
const fontsReady = () => Promise.race([document.fonts?.ready ?? Promise.resolve(), sleep(FONT_WAIT_MS)]);

/**
 * The rect of an element in viewport coordinates that keeps up when the page scrolls.
 * Measure once (before the element is scaled), call the returned function as often as needed.
 */
function anchor(el) {
    const r = el.getBoundingClientRect();
    const x0 = window.scrollX, y0 = window.scrollY;
    return () => {
        const dx = x0 - window.scrollX, dy = y0 - window.scrollY;
        return {
            left: r.left + dx, top: r.top + dy, right: r.right + dx, bottom: r.bottom + dy,
            width: r.width, height: r.height,
        };
    };
}

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

/** An element that is dragged out (scale from the top-left corner), and optionally outlined by the design-bot. */
class Shape {
    constructor(el) {
        this.el = el;
        this.fast = el.dataset.box === 'fast'; // repeated small things: quicker, no size tag
        this.pieces = null;

        // Selection frame with handles, shown while the layout-bot drags the shape.
        const frame = part('sel-frame');
        for (const corner of ['tl', 'tr', 'bl', 'br']) frame.append(part(`handle handle-${corner}`));
        el.append(frame);
    }

    select(on) { this.el.classList.toggle('is-selected', on); }

    /** Hidden again: not shown, not selected, outline erased. */
    collapse() {
        this.el.classList.remove('is-shown', 'is-selected');
        this.el.style.scale = '';
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
            const t = len > 0 ? clamp(dist / len, 0, 1) : 1; // square corners have length 0
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
        const t = path.lens[i] > 0 ? clamp(dist / path.lens[i], 0, 1) : 0;
        const [x0, y0] = path.pts[i];
        const [x1, y1] = path.pts[i + 1];
        return { x: r.left + x0 + (x1 - x0) * t, y: r.top + y0 + (y1 - y0) * t };
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
        for (const t of this.texts) t.hideAll();
        for (const d of this.decos) if (d.line) d.line.style.scale = '';
        this.state = 'idle';
        this.cancelled = false;
    }

    /** The finished section, instantly. */
    showAll() {
        for (const shape of this.shapes) {
            shape.el.style.scale = '';
            shape.select(false);
            shape.el.classList.add('is-shown');
        }
        for (const t of this.texts) t.revealAll();
        for (const d of this.decos) {
            if (d.kind === 'underline') d.line.style.scale = '1 1';
            else d.shape.setDrawn(1, d.shape.outline());
        }
    }
}

// ---- The builder -------------------------------------------------------------

export class SiteBuilder {
    constructor({ swarm, dock, site, glow, status }) {
        this.swarm = swarm;
        this.dock = dock; // the box: start button, then the bots' home and the button that builds everything again
        this.site = site; // the page
        this.glow = glow;
        this.status = status;

        this.sections = [...site.querySelectorAll('[data-section]')].map((el) => new Section(el));
        this.hero = this.sections.find((s) => s.isHero) ?? this.sections[0];

        dock.canReceive = () => !this.busy && !this.pumping && !this.current; // bots only go home between builds
        this.builder = null;  // layout-bot
        this.typist = null;   // copy-bot
        this.designer = null; // design-bot
        this.busy = false;    // the hero is being (re)built
        this.pumping = false; // a later section is being built
        this.started = false; // the start box has been clicked
        this.live = false;    // the hero stands: the other sections follow the scrolling
        this.parked = false;  // reduced motion: built once, no replay
        this.current = null;  // the section being built right now
        this.frame = 0;

        const onScroll = () => {
            if (this.frame) return;
            this.frame = requestAnimationFrame(() => { this.frame = 0; this.skipPast(); this.pump(); });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
    }

    /** Start (or restart) the build: the bots come out of the box. The first run also sends the box to its corner. */
    async run() {
        if (this.busy || this.pumping || this.parked) return;
        this.busy = true;
        this.syncDock();
        if (this.started) this.reset();
        this.started = true;
        document.documentElement.classList.add('is-live');
        this.site.classList.add('is-live');
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        this.site.focus({ preventScroll: true }); // keep keyboard focus somewhere sensible while building
        const origin = this.dock.entry(); // the opening of the box
        const reduced = prefersReducedMotion();
        this.dock.open(); // the lid lifts, the bots come out; the box travels to its corner once the name is typed (data-dock-after)
        try {
            if (reduced) {
                this.dock.fly({ instant: true });
                this.buildStatic(origin);
            } else {
                await this.buildSection(this.hero, origin);
            }
        } finally {
            this.dock.fly(); // in case the name was never typed (error): the box gets to its corner anyway
            this.busy = false;
            this.live = true;
            this.parked = reduced;
        }
        this.pump();
    }

    /** The box can only be clicked while no build is running. */
    syncDock() {
        this.dock.setBusy(this.busy || this.pumping);
    }

    /** Back to the empty page (the glow fades out on its own). */
    reset() {
        this.live = false;
        for (const s of this.sections) s.reset();
        this.glow.classList.remove('is-on');
    }

    /** Build every section that has scrolled into view, in order. */
    async pump() {
        if (this.pumping || this.busy || !this.live) return;
        this.pumping = true;
        this.syncDock();
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
        this.syncDock();
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
     * edge of the screen, where the next section will come from. Once everything stands they wait next to
     * the box in the corner (stacked, so the name pills stay readable and nothing sits on the content).
     */
    restPoint(bot) {
        const i = Math.max(0, this.crew.indexOf(bot));
        const vw = window.innerWidth, vh = window.innerHeight;
        if (this.sections.every((s) => s.state === 'built')) {
            const box = this.dock.corner();
            if (box) return { x: Math.max(REST_MARGIN, box.left - 120), y: box.bottom - 24 - i * REST_STACK };
            return { x: Math.max(REST_MARGIN, vw - 120), y: vh - REST_MARGIN - i * REST_STACK };
        }
        return { x: vw * (0.3 + i * 0.2), y: vh - REST_MARGIN };
    }

    /** Off duty: wait at the resting point (it follows it, so resizing and the end of the build are covered), then go home. */
    rest(bot) {
        if (!bot || prefersReducedMotion()) return;
        bot.idle({ at: () => this.restPoint(bot) });
    }

    restAll() {
        for (const bot of this.crew) this.rest(bot);
    }

    get crew() { return [this.builder, this.typist, this.designer]; }

    /** Announce the result once everything stands (the box then calls the bots to build it all again). */
    updateUi() {
        if (this.sections.some((s) => s.state !== 'built')) return;
        this.status.textContent = 'Website built.';
    }

    /**
     * The bots a section needs, out of the box: created at the opening the first time, called back (walk
     * cancelled or brought out of the box) afterwards. Others stay where they are, at home.
     */
    async callBots(section, origin) {
        const needs = {
            builder: section.shapes.length > 0,
            typist: section.texts.length > 0,
            designer: section.isHero || section.decos.length > 0,
        };
        const jobs = { builder: JOBS.layout, typist: JOBS.copy, designer: JOBS.design };
        const calls = [];
        let n = 0;
        for (const key of Object.keys(needs)) {
            if (!needs[key]) continue;
            if (!this[key]) {
                this[key] = this.swarm.add({ ...origin, ...jobs[key], burst: true });
            } else {
                const bot = this[key], delay = n++ * EMERGE_STAGGER_MS;
                calls.push(sleep(delay).then(() => bot.callBack(this.dock)));
            }
        }
        await Promise.all(calls);
    }

    // ---- Instant builds -----------------------------------------------------

    /** Show a section at once (reduced motion, or it was scrolled past before its turn). */
    showSection(section) {
        section.showAll();
        if (section.isHero) this.glow.classList.add('is-on');
        section.state = 'built';
    }

    /** Reduced motion: the whole page at once, the box docked at once, every bot at home (nothing moves). */
    buildStatic(origin) {
        this.builder ??= this.swarm.add({ ...origin, ...JOBS.layout });
        this.typist ??= this.swarm.add({ ...origin, ...JOBS.copy });
        this.designer ??= this.swarm.add({ ...origin, ...JOBS.design });
        for (const s of this.sections) this.showSection(s);
        this.status.textContent = 'Website built.';
        for (const bot of this.crew) bot.setHome();
        this.dock.lock();
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
        await this.callBots(section, origin ?? this.dock.entry());
        const { builder, typist, designer } = this;

        const boxReady = new Map(section.shapes.map((s) => [s, defer()]));
        const typed = new Map(section.texts.map((t) => [t, defer()]));
        const speed = section.typingSpeed();

        // layout-bot: drags out the shapes, in page order.
        const layout = (async () => {
            for (const shape of section.shapes) {
                if (section.cancelled) return;
                await this.dragOut(shape);
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
                if (t.el.hasAttribute('data-dock-after')) this.dock.fly(); // e.g. the name: now the box may leave
            }
            this.rest(typist);
        })();

        // design-bot: switches the glow on (hero), then draws whatever is ready first.
        const design = (async () => {
            if (section.isHero) await this.lightUp();
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

        await Promise.all([layout, copy, design]);
    }

    /** design-bot walks into the page and clicks: the background glow comes on. */
    async lightUp() {
        const { designer } = this;
        await designer.chase(() => ({ x: window.innerWidth * 0.3, y: window.innerHeight * 0.4 }), ARRIVE);
        await designer.click();
        this.glow.classList.add('is-on');
    }

    /** layout-bot presses at the top-left corner of a shape and drags to the bottom-right one. */
    async dragOut(shape) {
        const { builder, swarm } = this;
        const el = shape.el;
        const fast = shape.fast;
        const ms = fast ? DRAG_FAST_MS : DRAG_MS;
        const a = anchor(el); // measured now, while the shape is not scaled yet

        await builder.chase(() => { const r = a(); return { x: r.left, y: r.top }; }, fast ? ARRIVE_FAST : ARRIVE);

        const t0 = performance.now();
        el.style.scale = `${MIN_SCALE} ${MIN_SCALE}`;
        el.classList.add('is-shown');
        if (!fast) shape.select(true);
        const from = a();
        swarm.ripple(from.left, from.top, builder.color); // the "mouse down" of the drag
        builder.press();

        builder.follow(() => {
            const p = easeInOut(clamp((performance.now() - t0) / ms, 0, 1));
            const r = a();
            return { x: r.left + r.width * p, y: r.top + r.height * p };
        }, { damping: DRAG_DAMPING });

        // The far corner is glued to the cursor, so the scale follows its real position.
        const stop = swarm.onFrame(() => {
            const r = a();
            const sx = clamp((builder.x - r.left) / r.width, MIN_SCALE, 1);
            const sy = clamp((builder.y - r.top) / r.height, MIN_SCALE, 1);
            el.style.scale = `${sx.toFixed(3)} ${sy.toFixed(3)}`;
            if (!fast) builder.inspect(`${Math.round(r.width * sx)} × ${Math.round(r.height * sy)}`, () => { const q = a(); return { x: q.left, y: Math.max(4, q.top - TAG_GAP) }; });
        });

        await sleep(ms);
        // Small repeated shapes do not wait for the bot to come to a stop: the next shape is next.
        if (!fast) {
            await builder.chase(() => { const r = a(); return { x: r.right, y: r.bottom }; },
                { tolerance: 6, settleSpeed: 200, timeout: 1000, damping: DRAG_DAMPING });
        }
        stop();

        el.style.scale = '';
        builder.release();
        const to = a();
        swarm.ripple(to.right, to.bottom, builder.color);
        if (!fast) {
            await sleep(150); // let the final size sink in before the tag goes
            builder.hideTag();
            shape.select(false);
        }
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
        const y = () => a().bottom - 2;

        await designer.chase(() => ({ x: a().left, y: y() }), ARRIVE);
        // The tag shows the real numbers of this line: thickness and colour.
        const lineStyle = getComputedStyle(line);
        designer.inspect(`underline ${Math.round(parseFloat(lineStyle.height) * 10) / 10}px ${toHex(lineStyle.backgroundColor)}`, () => { const r = a(); return { x: r.left, y: r.bottom + 10 }; });
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
