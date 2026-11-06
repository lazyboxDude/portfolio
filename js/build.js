// The build "job": three bot cursors construct the landing page live.
// The first click on the start box makes it vanish and starts the build; afterwards a small pill
// at the bottom builds everything again. Who does what:
//   layout-bot (arrow)  drags out shapes: the nav pill, the nav button, the two hero buttons.
//                       A selection frame with handles and a live size tag ("980 × 56") show the drag.
//   copy-bot (I-beam)   types every text, character by character, with a tag that shows the real
//                       typography ("600 · 96px / 1.00 · -0.035em").
//   design-bot (pencil) switches the background glow on, draws the underline below the accent word
//                       and draws the outline of the ghost button.
// The page is real HTML (index.html): shapes are marked data-box, texts data-type. Without JS it is
// all visible. With JS the texts get a screen-reader copy first, so assistive tech reads everything
// at once, while the visible characters are revealed one by one.
// With prefers-reduced-motion everything is shown at once and the cursors are parked.

import { DRAG_DAMPING, prefersReducedMotion } from './cursors.js';

const MIN_SCALE = 0.02; // never scale to exactly 0 (keeps the shape measurable)
const DRAG_MS = 650;
const DRAW_MS = 900;
const TAG_GAP = 28;     // inspector tags sit this far above an element (or 8px below it)
const REPLAY_LABEL = 'Build again';
const BOX_EXIT_MS = 400; // keep in sync with .box.is-gone in site.css
const FONT_WAIT_MS = 1500;
// How exactly a bot has to arrive before its job goes on. Close and fast enough is enough: the
// next movement (follow) catches up anyway, and waiting for a full stop made every step crawl.
const ARRIVE = { tolerance: 30, settleSpeed: 600, timeout: 1500 };
// Typing starts while the copy-bot is still a few steps away: it follows the caret and catches up.
const TYPE_ARRIVE = { tolerance: 90, settleSpeed: 4000, timeout: 900 };

// One job per bot: name pill, colour, pointer shape (see cursors.js) and off-duty personality:
// one shy, one curious, one sociable. Colours stay readable under the dark pill text.
const JOBS = {
    layout: { label: 'layout-bot', color: '#7b95ff', kind: 'arrow', personality: { shyness: 1, curiosity: 0.1, sociability: 0.3 } },
    copy: { label: 'copy-bot', color: '#ff8fb8', kind: 'text', personality: { shyness: 0.1, curiosity: 1, sociability: 0.6 } },
    design: { label: 'design-bot', color: '#ffc766', kind: 'pen', personality: { shyness: 0.3, curiosity: 0.3, sociability: 0.9 } },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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

/** An element that is dragged out (scale from the top-left corner), and optionally outlined by the design-bot. */
class Shape {
    constructor(el) {
        this.el = el;
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

        const $ = (selector) => site.querySelector(selector);
        const text = (selector) => new Typable($(selector));
        this.shapes = {
            nav: new Shape($('#nav')),
            navCta: new Shape($('#nav-cta')),
            cv: new Shape($('#cv')),
            hello: new Shape($('#hello')),
        };
        this.texts = {
            logo: text('.nav-logo'),
            links: [...site.querySelectorAll('.nav-links a')].map((a) => new Typable(a)),
            ctaLabel: text('#nav-cta [data-type]'),
            eyebrow: text('.eyebrow'),
            headline: text('#headline'),
            lede: text('.lede'),
            cvLabel: text('#cv [data-type]'),
            helloLabel: text('#hello [data-type]'),
        };
        this.accent = $('.accent');
        this.underline = $('.underline');

        this.builder = null;  // layout-bot
        this.typist = null;   // copy-bot
        this.designer = null; // design-bot
        this.busy = false;
        this.built = false;   // a build finished at least once (so the next run starts by erasing)
        this.parked = false;  // reduced motion: built once, no replay
    }

    /** Build the page (again). `origin` is where the bots burst out (first run only). */
    async run(origin) {
        if (this.busy || this.parked) return;
        this.busy = true;
        this.next.classList.remove('is-ready');
        this.hideBox();
        if (this.built) this.reset();
        this.site.classList.add('is-live');
        this.site.focus({ preventScroll: true }); // keep keyboard focus somewhere sensible while building
        try {
            if (prefersReducedMotion()) this.buildStatic(origin);
            else await this.buildAnimated(origin);
        } catch (error) {
            // Whatever went wrong: the visitor must never be left with a half-built page.
            console.error(error);
            this.showAll();
        } finally {
            this.built = true;
            this.parked = prefersReducedMotion();
            this.updateUi();
            this.busy = false;
        }
    }

    /** The start box dissolves on the first click and never comes back. */
    hideBox() {
        const { box } = this;
        if (box.hidden || box.classList.contains('is-gone')) return;
        box.classList.add('is-gone');
        if (prefersReducedMotion()) box.hidden = true;
        else setTimeout(() => { box.hidden = true; }, BOX_EXIT_MS);
    }

    allTexts() { return [...Object.values(this.texts).flat()]; }

    /** Back to the empty page (the glow fades out on its own). */
    reset() {
        for (const shape of Object.values(this.shapes)) shape.collapse();
        for (const t of this.allTexts()) t.hideAll();
        this.underline.style.scale = '';
        this.glow.classList.remove('is-on');
    }

    /** The finished page, instantly. */
    showAll() {
        this.glow.classList.add('is-on');
        for (const shape of Object.values(this.shapes)) {
            shape.el.style.scale = '';
            shape.el.classList.add('is-shown');
            shape.select(false);
        }
        for (const t of this.allTexts()) t.revealAll();
        this.underline.style.scale = '1 1';
        const hello = this.shapes.hello;
        hello.setDrawn(1, hello.outline());
    }

    /** Announce the result and offer to build again (unless reduced motion: nothing to replay). */
    updateUi() {
        this.status.textContent = 'Website built.';
        if (this.parked) return;
        this.nextLabel.textContent = REPLAY_LABEL;
        this.next.classList.add('is-ready');
    }

    ensureBots(origin, burst) {
        this.builder ??= this.swarm.add({ ...origin, ...JOBS.layout, burst });
        this.typist ??= this.swarm.add({ ...origin, ...JOBS.copy, burst });
        this.designer ??= this.swarm.add({ ...origin, ...JOBS.design, burst });
    }

    // ---- Reduced motion ---------------------------------------------------

    buildStatic(origin) {
        this.ensureBots(origin, false);
        this.showAll();

        const cv = this.shapes.cv.el.getBoundingClientRect();
        this.builder.place(cv.right, cv.bottom);
        const end = this.texts.lede.chars.at(-1).getBoundingClientRect();
        this.typist.place(end.right + 8, end.top + end.height / 2);
        const accent = this.accent.getBoundingClientRect();
        this.designer.place(accent.right, accent.bottom);
    }

    // ---- Animated build ---------------------------------------------------

    async buildAnimated(origin) {
        this.status.textContent = 'Building the website…';
        await fontsReady(); // the layout must be final before anything is measured
        this.ensureBots(origin, true);

        const { shapes: s, texts: t, builder, typist, designer } = this;

        // 1. The design-bot switches the lights on while the layout-bot drags out the nav pill.
        await Promise.all([this.lightUp(), this.dragOut(s.nav)]);

        // 2. The copy-bot writes the nav while the layout-bot drags out the nav button.
        await Promise.all([this.dragOut(s.navCta, { ms: 500 }), this.typeAll([t.logo, ...t.links], { speed: 0.35 })]);
        await this.typeText(t.ctaLabel, { speed: 0.35 });

        // 3. Three lanes at once. layout-bot: drags out the two buttons. copy-bot: eyebrow and headline.
        //    design-bot: outlines the ghost button as soon as it exists, then underlines the accent word
        //    once the headline stands.
        const buttons = (async () => {
            await this.dragOut(s.cv);
            await this.dragOut(s.hello);
            builder.idle();
        })();
        const headline = (async () => {
            await this.typeText(t.eyebrow, { speed: 0.3, tag: true });
            await this.typeText(t.headline, { speed: 0.7, tag: true });
        })();
        const design = (async () => {
            await buttons;
            await this.drawOutline(s.hello);
            await headline;
            await this.drawUnderline();
        })();

        // 4. The copy-bot goes on with the lede and the button labels while the design-bot finishes.
        const rest = (async () => {
            await headline;
            await this.typeText(t.lede, { speed: 0.25, tag: true });
            await this.typeAll([t.cvLabel, t.helloLabel], { speed: 0.35 });
        })();
        await Promise.all([rest, design]);

        typist.idle();
        designer.idle();
    }

    /** design-bot walks into the page and clicks: the background glow comes on. */
    async lightUp() {
        const { designer } = this;
        await designer.moveTo(window.innerWidth * 0.3, window.innerHeight * 0.4, ARRIVE);
        await designer.click();
        this.glow.classList.add('is-on');
    }

    /** layout-bot presses at the top-left corner of a shape and drags to the bottom-right one. */
    async dragOut(shape, { ms = DRAG_MS } = {}) {
        const { builder, swarm } = this;
        const el = shape.el;
        const r = el.getBoundingClientRect();
        await builder.moveTo(r.left, r.top, ARRIVE);

        const t0 = performance.now();
        el.style.scale = `${MIN_SCALE} ${MIN_SCALE}`;
        el.classList.add('is-shown');
        shape.select(true);
        swarm.ripple(r.left, r.top, builder.color); // the "mouse down" of the drag
        builder.press();

        builder.follow(() => {
            const p = easeInOut(clamp((performance.now() - t0) / ms, 0, 1));
            return { x: r.left + r.width * p, y: r.top + r.height * p };
        }, { damping: DRAG_DAMPING });

        // The far corner is glued to the cursor, so the scale follows its real position.
        const stop = swarm.onFrame(() => {
            const sx = clamp((builder.x - r.left) / r.width, MIN_SCALE, 1);
            const sy = clamp((builder.y - r.top) / r.height, MIN_SCALE, 1);
            el.style.scale = `${sx.toFixed(3)} ${sy.toFixed(3)}`;
            builder.inspect(`${Math.round(r.width * sx)} × ${Math.round(r.height * sy)}`, r.left, Math.max(4, r.top - TAG_GAP));
        });

        await sleep(ms);
        await builder.moveTo(r.right, r.bottom, { tolerance: 6, settleSpeed: 200, timeout: 1000, damping: DRAG_DAMPING });
        stop();

        el.style.scale = '';
        builder.release();
        swarm.ripple(r.right, r.bottom, builder.color);
        await sleep(150); // let the final size sink in before the tag goes
        builder.hideTag();
        shape.select(false);
    }

    /** copy-bot types several texts one after another. */
    async typeAll(list, options) {
        for (const t of list) await this.typeText(t, options);
    }

    /** copy-bot walks to the start of a text, then types it while following the last character. */
    async typeText(t, { speed = 1, tag = false } = {}) {
        const { typist } = this;
        const r = t.el.getBoundingClientRect();

        const start = t.caretPoint();
        await typist.moveTo(start.x, start.y, TYPE_ARRIVE);
        typist.follow(t.caretPoint);
        if (tag) typist.inspect(t.spec(), r.left, Math.max(4, r.top - TAG_GAP));
        await sleep(60);

        for (let i = 1; i <= t.chars.length; i++) {
            t.reveal(i);
            await sleep(typingDelay(t.text[i - 1], speed));
        }

        await sleep(120);
        if (tag) typist.hideTag();
    }

    /** design-bot draws the underline below the accent word from left to right. */
    async drawUnderline() {
        const { designer, swarm, underline } = this;
        const r = this.accent.getBoundingClientRect();
        const y = r.bottom - 2;
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

        await designer.moveTo(r.left, y, ARRIVE);
        designer.inspect(`underline 2px ${accent}`, r.left, r.bottom + 10);
        designer.press();

        const t0 = performance.now();
        const progress = () => easeInOut(clamp((performance.now() - t0) / DRAW_MS, 0, 1));
        designer.follow(() => ({ x: r.left + r.width * progress(), y }), { damping: DRAG_DAMPING });
        const stop = swarm.onFrame(() => { underline.style.scale = `${progress().toFixed(3)} 1`; });

        await sleep(DRAW_MS);
        stop();
        underline.style.scale = '1 1';
        designer.release();
        swarm.ripple(r.right, y, designer.color);
        await sleep(200);
        designer.hideTag();
    }

    /** design-bot draws the outline of a shape, corner by corner. */
    async drawOutline(shape) {
        const { designer, swarm } = this;
        const r = shape.el.getBoundingClientRect();
        const path = shape.outline();
        const start = shape.drawPoint(0, r, path);
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

        await designer.moveTo(start.x, start.y, ARRIVE);
        designer.inspect(`border 1.5px ${accent}`, r.left, r.bottom + 8);
        designer.press();

        const t0 = performance.now();
        const progress = () => clamp((performance.now() - t0) / (DRAW_MS * 1.5), 0, 1);
        designer.follow(() => shape.drawPoint(progress(), r, path), { damping: DRAG_DAMPING });
        const stop = swarm.onFrame(() => shape.setDrawn(progress(), path));

        await sleep(DRAW_MS * 1.5);
        stop();
        shape.setDrawn(1, path);
        designer.release();
        swarm.ripple(start.x, start.y, designer.color);
        await sleep(200);
        designer.hideTag();
    }
}
