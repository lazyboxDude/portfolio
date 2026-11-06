// The build "job": bot cursors construct the page one section at a time.
// Every click on the box builds the next section:
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

    /** Empty state: no text anywhere in the card, card hidden. */
    collapse() {
        this.el.classList.remove('is-shown', 'is-typing');
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
    constructor({ swarm, label, cards, status }) {
        this.swarm = swarm;
        this.label = label;
        this.status = status;
        this.sections = cards.map((el) => new Section(el));

        this.index = 0;      // next section to build
        this.builder = null; // layout-bot
        this.typist = null;  // copy-bot
        this.busy = false;
        this.parked = false; // reduced motion: everything built once, no replay
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
        this.builder ??= this.swarm.add({ ...origin, hue: 215, label: 'layout-bot', burst });
        this.typist ??= this.swarm.add({ ...origin, hue: 285, label: 'copy-bot', burst });
    }

    // ---- Reduced motion ---------------------------------------------------

    buildStatic(section, origin) {
        this.ensureBots(origin, false);
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
        this.label.textContent = 'Building…';
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
        builder.wander();

        await this.type(section);
        typist.wander();
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
