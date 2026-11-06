// The build "job": bot cursors construct the page one section at a time.
// Every click on the box builds the next section, with three bots at work:
//   1. layout-bot (arrow) drags out the card: the scale from the top-left corner follows the cursor,
//      a selection frame with handles and a live size tag ("560 x 96") show what is being dragged
//   2. copy-bot (I-beam) walks to the card and types its sentence, following the text caret,
//      with a tag that shows the real typography ("500 · 22px / 1.55")
//   3. design-bot (pencil) draws the accent border around the finished card while the text is typed
// A section's sentence lives in a <noscript> in index.html: readable without JS, and with
// JS it only enters the DOM once its section is built.
// With prefers-reduced-motion every section is shown at once and the cursors are parked.

import { DRAG_DAMPING, prefersReducedMotion } from './cursors.js';

const MIN_SCALE = 0.02; // never scale to exactly 0 (keeps the card measurable)
const DRAG_MS = 800;
const DRAW_MS = 1500;
const TAG_GAP = 28;     // inspector tags sit this far above the card (or 8px below it)
const NEXT_LABEL = 'Next';
const REPLAY_LABEL = 'Build again';

// One job per bot: name pill, colour and pointer shape. Colours stay readable under dark pill text.
const JOBS = {
    layout: { label: 'layout-bot', color: '#7b95ff', kind: 'arrow' },
    copy: { label: 'copy-bot', color: '#ff8fb8', kind: 'text' },
    design: { label: 'design-bot', color: '#ffc766', kind: 'pen' },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Pause after a typed character: slightly irregular, longer after punctuation. */
function typingDelay(ch) {
    if (ch === '.') return 300;
    if (ch === ',') return 180;
    return 28 + Math.random() * 28;
}

const part = (className) => {
    const el = document.createElement('span');
    el.className = className;
    el.setAttribute('aria-hidden', 'true');
    return el;
};

/** One card and the parts needed to type into it, select it and draw its border. */
class Section {
    constructor(el) {
        this.el = el;
        // Button label while this section is the next one to build (data-prompt).
        this.prompt = el.dataset.prompt || NEXT_LABEL;

        const source = el.querySelector('noscript');
        this.text = source.textContent.trim();
        source.remove(); // with JS the text only appears once the section is built

        this.typed = el.querySelector('.typed');
        this.caret = el.querySelector('.caret');
        this.rest = el.querySelector('.rest');

        // Screen readers get the whole sentence at once, not one character at a time.
        this.sr = document.createElement('span');
        this.sr.className = 'sr-only';
        this.typed.parentElement.prepend(this.sr);
        this.typed.setAttribute('aria-hidden', 'true');

        // Decorative parts: selection frame with handles, and the border the design-bot draws.
        // Corner pieces fade in, edge pieces grow along their side (transform/opacity only).
        this.frame = part('card-frame');
        for (const corner of ['tl', 'tr', 'bl', 'br']) this.frame.append(part(`handle handle-${corner}`));
        this.pieces = [
            part('corner corner-tl'), part('edge edge-top'),
            part('corner corner-tr'), part('edge edge-right'),
            part('corner corner-br'), part('edge edge-bottom'),
            part('corner corner-bl'), part('edge edge-left'),
        ];
        el.append(this.frame, ...this.pieces);

        this.collapse();
    }

    /** Empty state: no text anywhere in the card, card hidden. */
    collapse() {
        this.el.classList.remove('is-shown', 'is-typing', 'is-selected');
        this.el.style.scale = '';
        this.typed.textContent = '';
        this.rest.textContent = '';
        this.sr.textContent = '';
        for (const piece of this.pieces) {
            piece.style.scale = '';
            piece.style.opacity = '';
        }
    }

    /** Put the text into the DOM. `rest` is invisible but reserves the final layout. */
    fill() {
        this.rest.textContent = this.text;
        this.sr.textContent = this.text;
    }

    caretPoint = () => {
        // The I-beam sits right behind the caret, vertically centred on the line.
        const b = this.caret.getBoundingClientRect();
        return { x: b.right + 8, y: b.top + b.height / 2 };
    };

    /** Typography the way an inspector would show it: weight · size / line-height. */
    typeSpec() {
        const cs = getComputedStyle(this.el);
        const size = parseFloat(cs.fontSize);
        const line = parseFloat(cs.lineHeight);
        const ratio = Number.isFinite(line) ? (line / size).toFixed(2) : 'normal';
        return `${cs.fontWeight} · ${Math.round(size)}px / ${ratio}`;
    }

    select(on) { this.el.classList.toggle('is-selected', on); }

    /** The border as 8 pieces (4 corners, 4 edges) in drawing order, with the points they connect. */
    drawPath() {
        const W = this.el.offsetWidth, H = this.el.offsetHeight;
        const R = parseFloat(getComputedStyle(this.el).borderTopLeftRadius) || 0;
        const arc = (Math.PI * R) / 2;
        const lens = [arc, W - 2 * R, arc, H - 2 * R, arc, W - 2 * R, arc, H - 2 * R];
        const pts = [[0, R], [R, 0], [W - R, 0], [W, R], [W, H - R], [W - R, H], [R, H], [0, H - R], [0, R]];
        return { lens, pts, total: lens.reduce((a, b) => a + b, 0) };
    }

    /** Reveal the border up to progress p (0..1). */
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

    /** Viewport position of the pencil tip at progress p. `r` is the card's rect. */
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

export class SiteBuilder {
    constructor({ swarm, label, cards, status }) {
        this.swarm = swarm;
        this.label = label;
        this.status = status;
        this.sections = cards.map((el) => new Section(el));

        this.index = 0;       // next section to build
        this.builder = null;  // layout-bot
        this.typist = null;   // copy-bot
        this.designer = null; // design-bot
        this.busy = false;
        this.parked = false;  // reduced motion: everything built once, no replay
    }

    /** Build the next section (or start over after the last one). `origin` is where new cursors burst out. */
    async run(origin) {
        if (this.busy || this.parked) return;
        this.busy = true;
        try {
            if (this.index >= this.sections.length) this.reset();
            const section = this.sections[this.index];
            section.fill();
            section.el.scrollIntoView({ block: 'nearest' });

            if (prefersReducedMotion()) this.buildStatic(section, origin);
            else await this.buildAnimated(section, origin);

            this.index++;
            this.parked = prefersReducedMotion() && this.index >= this.sections.length;
            this.updateLabel();
        } finally {
            this.busy = false;
        }
    }

    reset() {
        for (const s of this.sections) s.collapse();
        this.index = 0;
    }

    updateLabel() {
        const total = this.sections.length;
        if (this.index < total) {
            this.label.textContent = this.sections[this.index].prompt;
            this.status.textContent = `Section ${this.index} of ${total} built.`;
        } else {
            this.label.textContent = this.parked ? 'Built' : REPLAY_LABEL;
            this.status.textContent = 'Website built.';
        }
    }

    ensureBots(origin, burst) {
        this.builder ??= this.swarm.add({ ...origin, ...JOBS.layout, burst });
        this.typist ??= this.swarm.add({ ...origin, ...JOBS.copy, burst });
        this.designer ??= this.swarm.add({ ...origin, ...JOBS.design, burst });
    }

    // ---- Reduced motion ---------------------------------------------------

    buildStatic(section, origin) {
        this.ensureBots(origin, false);
        section.typed.textContent = section.text;
        section.rest.textContent = '';
        section.el.classList.add('is-shown');
        section.setDrawn(1, section.drawPath());

        const r = section.el.getBoundingClientRect();
        this.builder.place(r.right, r.bottom);
        const end = section.caretPoint();
        this.typist.place(end.x, end.y);
        this.designer.place(r.right - 12, r.top - 4); // top-right corner, clear of the text
    }

    // ---- Animated build ---------------------------------------------------

    async buildAnimated(section, origin) {
        this.label.textContent = 'Building…';
        this.status.textContent = 'Building the website…';

        // Measure the final card rect while it is still invisible at full size.
        const r = section.el.getBoundingClientRect();
        this.ensureBots(origin, true);
        const { builder, typist, designer } = this;

        const waitY = clamp(r.bottom + 36, 24, window.innerHeight - 24);
        await Promise.all([
            builder.moveTo(r.left, r.top, { tolerance: 8, settleSpeed: 160 }),
            typist.moveTo(clamp(r.left + 40, 24, window.innerWidth - 24), waitY, { tolerance: 30, settleSpeed: 200 }),
            designer.moveTo(clamp(r.right - 40, 24, window.innerWidth - 24), waitY, { tolerance: 30, settleSpeed: 200 }),
        ]);

        await this.dragOut(section, r);
        builder.wander();

        // The card is complete now: the copy-bot types while the design-bot draws the border.
        await Promise.all([this.type(section), this.draw(section, r)]);
        typist.wander();
        designer.wander();
    }

    /** layout-bot presses at the top-left corner and drags to the bottom-right one. */
    async dragOut(section, r) {
        const { builder, swarm } = this;
        const card = section.el;
        const t0 = performance.now();

        card.style.scale = `${MIN_SCALE} ${MIN_SCALE}`;
        card.classList.add('is-shown');
        section.select(true);
        swarm.ripple(r.left, r.top, builder.color); // the "mouse down" of the drag
        builder.press();

        builder.follow(() => {
            const p = easeInOut(clamp((performance.now() - t0) / DRAG_MS, 0, 1));
            return { x: r.left + r.width * p, y: r.top + r.height * p };
        }, { damping: DRAG_DAMPING });

        // The card's far corner is glued to the cursor, so scale follows the real position.
        const stop = swarm.onFrame(() => {
            const sx = clamp((builder.x - r.left) / r.width, MIN_SCALE, 1);
            const sy = clamp((builder.y - r.top) / r.height, MIN_SCALE, 1);
            card.style.scale = `${sx.toFixed(3)} ${sy.toFixed(3)}`;
            builder.inspect(`${Math.round(r.width * sx)} × ${Math.round(r.height * sy)}`, r.left, Math.max(4, r.top - TAG_GAP));
        });

        await sleep(DRAG_MS);
        await builder.moveTo(r.right, r.bottom, { tolerance: 4, settleSpeed: 120, damping: DRAG_DAMPING });
        stop();

        card.style.scale = '';
        builder.release();
        swarm.ripple(r.right, r.bottom, builder.color);
        await sleep(250); // let the final size sink in before the tag goes
        builder.hideTag();
        section.select(false);
    }

    /** copy-bot walks to the text start, then types while following the caret. */
    async type(section) {
        const { typist } = this;
        const { el, typed, rest, text } = section;
        const r = el.getBoundingClientRect();

        el.classList.add('is-typing');
        const start = section.caretPoint();
        await typist.moveTo(start.x, start.y, { tolerance: 14, settleSpeed: 160 });
        typist.follow(section.caretPoint);
        typist.inspect(section.typeSpec(), r.left, Math.max(4, r.top - TAG_GAP));
        await sleep(250);

        for (let i = 1; i <= text.length; i++) {
            typed.textContent = text.slice(0, i);
            rest.textContent = text.slice(i);
            await sleep(typingDelay(text[i - 1]));
        }

        await sleep(700);
        el.classList.remove('is-typing');
        typist.hideTag();
    }

    /** design-bot draws the accent border around the card, corner by corner. */
    async draw(section, r) {
        const { designer, swarm } = this;
        const path = section.drawPath();
        const start = section.drawPoint(0, r, path);
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

        await designer.moveTo(start.x, start.y, { tolerance: 10, settleSpeed: 160 });
        designer.inspect(`border 1.5px ${accent}`, r.left, r.bottom + 8);
        designer.press();

        const t0 = performance.now();
        const progress = () => clamp((performance.now() - t0) / DRAW_MS, 0, 1);
        designer.follow(() => section.drawPoint(progress(), r, path), { damping: DRAG_DAMPING });
        const stop = swarm.onFrame(() => section.setDrawn(progress(), path));

        await sleep(DRAW_MS);
        stop();
        section.setDrawn(1, path);
        designer.release();
        swarm.ripple(start.x, start.y, designer.color);
        await sleep(400);
        designer.hideTag();
    }
}
