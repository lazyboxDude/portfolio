// The build "job": bot cursors construct the page one section at a time.
// The first click on the start box makes it vanish and builds the first section; after that a
// small pill below the cards builds the next one. Each build:
//   1. layout-bot drags out the card (scale from the top-left corner follows the cursor)
//   2. copy-bot walks to the card and types its sentence, following the text caret
// A section's sentence lives in a <noscript> in index.html: readable without JS, and with
// JS it only enters the DOM once its section is built.
// With prefers-reduced-motion every section is shown at once and the cursors are parked.

import { DRAG_DAMPING, prefersReducedMotion } from './cursors.js';

const MIN_SCALE = 0.02; // never scale to exactly 0 (keeps the card measurable)
const DRAG_MS = 800;
const NEXT_LABEL = 'Next';
const REPLAY_LABEL = 'Build again';
const BOX_EXIT_MS = 400; // keep in sync with .box.is-gone in site.css

// Off-duty personalities of the two bots (see cursors.js): one shy, one curious.
const LAYOUT_BOT = { hue: 215, label: 'layout-bot', personality: { shyness: 1, curiosity: 0.1, sociability: 0.3 } };
const COPY_BOT = { hue: 285, label: 'copy-bot', personality: { shyness: 0.1, curiosity: 1, sociability: 0.6 } };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Pause after a typed character: slightly irregular, longer after punctuation. */
function typingDelay(ch) {
    if (ch === '.') return 300;
    if (ch === ',') return 180;
    return 28 + Math.random() * 28;
}

/** One card and the parts needed to type into it. */
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

        this.collapse();
    }

    /** Take the card's space in the layout while it is still invisible (so it can be measured). */
    reserve() {
        this.el.classList.add('is-reserved');
    }

    /** Empty state: no text anywhere in the card, card gone from the layout. */
    collapse() {
        this.el.classList.remove('is-reserved', 'is-shown', 'is-typing');
        this.el.style.scale = '';
        this.typed.textContent = '';
        this.rest.textContent = '';
        this.sr.textContent = '';
    }

    /** Put the text into the DOM. `rest` is invisible but reserves the final layout. */
    fill() {
        this.rest.textContent = this.text;
        this.sr.textContent = this.text;
    }

    caretPoint = () => {
        const b = this.caret.getBoundingClientRect();
        return { x: b.right + 4, y: b.bottom + 2 };
    };
}

export class SiteBuilder {
    constructor({ swarm, box, build, next, cards, status }) {
        this.swarm = swarm;
        this.box = box;     // start box: gone after the first click
        this.build = build; // container of the cards and the pill
        this.next = next;   // pill below the cards that builds the next section
        this.nextLabel = next.querySelector('.next-label');
        this.status = status;
        this.sections = cards.map((el) => new Section(el));

        this.index = 0;      // next section to build
        this.builder = null; // layout-bot
        this.typist = null;  // copy-bot
        this.busy = false;
        this.parked = false; // reduced motion: everything built once, no replay
    }

    /** Build the next section (or start over after the last one). `origin` is where the bots burst out (first run only). */
    async run(origin) {
        if (this.busy || this.parked) return;
        this.busy = true;
        this.next.classList.remove('is-ready');
        this.hideBox();
        this.build.focus({ preventScroll: true }); // keep keyboard focus somewhere sensible while building
        try {
            if (this.index >= this.sections.length) this.reset();
            const section = this.sections[this.index];
            section.reserve();
            section.fill();
            section.el.scrollIntoView({ block: 'nearest' });

            if (prefersReducedMotion()) this.buildStatic(section, origin);
            else await this.buildAnimated(section, origin);

            this.index++;
            this.parked = prefersReducedMotion() && this.index >= this.sections.length;
            this.updateUi();
        } finally {
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

    reset() {
        for (const s of this.sections) s.collapse();
        this.index = 0;
    }

    /** Announce the result and offer the next step (unless everything is built for good). */
    updateUi() {
        const total = this.sections.length;
        const done = this.index >= total;
        this.status.textContent = done ? 'Website built.' : `Section ${this.index} of ${total} built.`;
        if (this.parked) return;

        this.nextLabel.textContent = done ? REPLAY_LABEL : this.sections[this.index].prompt;
        this.next.classList.add('is-ready');
        this.next.focus({ preventScroll: true });
        this.next.scrollIntoView({ block: 'nearest' });
    }

    ensureBots(origin, burst) {
        this.builder ??= this.swarm.add({ ...origin, ...LAYOUT_BOT, burst });
        this.typist ??= this.swarm.add({ ...origin, ...COPY_BOT, burst });
    }

    // ---- Reduced motion ---------------------------------------------------

    buildStatic(section, origin) {
        this.ensureBots(origin, false);
        section.reserve();
        section.typed.textContent = section.text;
        section.rest.textContent = '';
        section.el.classList.add('is-shown');

        const r = section.el.getBoundingClientRect();
        this.builder.place(r.right, r.bottom);
        const end = section.caretPoint();
        this.typist.place(end.x, end.y);
    }

    // ---- Animated build ---------------------------------------------------

    async buildAnimated(section, origin) {
        this.status.textContent = 'Building the website…';

        // Measure the final card rect while it is still invisible at full size.
        const r = section.el.getBoundingClientRect();
        this.ensureBots(origin, true);
        const { builder, typist } = this;

        const waiting = {
            x: clamp(r.left + 40, 24, window.innerWidth - 24),
            y: clamp(r.bottom + 36, 24, window.innerHeight - 24),
        };
        await Promise.all([
            builder.moveTo(r.left, r.top, { tolerance: 8, settleSpeed: 160 }),
            typist.moveTo(waiting.x, waiting.y, { tolerance: 30, settleSpeed: 200 }),
        ]);

        await this.dragOut(section, r);
        builder.idle();

        await this.type(section);
        typist.idle();
    }

    /** layout-bot presses at the top-left corner and drags to the bottom-right one. */
    async dragOut(section, r) {
        const { builder, swarm } = this;
        const card = section.el;
        const t0 = performance.now();

        card.style.scale = `${MIN_SCALE} ${MIN_SCALE}`;
        card.classList.add('is-shown');
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
        });

        await sleep(DRAG_MS);
        await builder.moveTo(r.right, r.bottom, { tolerance: 4, settleSpeed: 120, damping: DRAG_DAMPING });
        stop();

        card.style.scale = '';
        builder.release();
        swarm.ripple(r.right, r.bottom, builder.color);
    }

    /** copy-bot walks to the text start, then types while following the caret. */
    async type(section) {
        const { typist } = this;
        const { el, typed, rest, text } = section;

        el.classList.add('is-typing');
        const start = section.caretPoint();
        await typist.moveTo(start.x, start.y, { tolerance: 14, settleSpeed: 160 });
        typist.follow(section.caretPoint);
        await sleep(250);

        for (let i = 1; i <= text.length; i++) {
            typed.textContent = text.slice(0, i);
            rest.textContent = text.slice(i);
            await sleep(typingDelay(text[i - 1]));
        }

        await sleep(700);
        el.classList.remove('is-typing');
    }
}
