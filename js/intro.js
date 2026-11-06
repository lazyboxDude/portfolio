// The intro "job": two bot cursors build the first piece of the page live.
//   1. layout-bot drags out the card (scale from the top-left corner follows the cursor)
//   2. copy-bot walks to the card and types the sentence, following the text caret
// The sentence itself lives in index.html, so it is still readable without JS.
// With prefers-reduced-motion everything is shown at once and the cursors are parked.

import { DRAG_DAMPING, prefersReducedMotion } from './cursors.js';

const MIN_SCALE = 0.02; // never scale to exactly 0 (keeps the card measurable)
const DRAG_MS = 800;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Pause after a typed character: slightly irregular, longer after punctuation. */
function typingDelay(ch) {
    if (ch === '.') return 300;
    if (ch === ',') return 180;
    return 28 + Math.random() * 28;
}

export class Intro {
    constructor({ swarm, label, card, typed, caret, rest, status }) {
        this.swarm = swarm;
        this.label = label;
        this.card = card;
        this.typed = typed;
        this.caret = caret;
        this.rest = rest;
        this.status = status;

        this.text = typed.textContent.trim();
        this.builder = null;
        this.typist = null;
        this.busy = false;
        this.parked = false; // reduced motion: built once, no replay

        // Screen readers get the whole sentence at once, not one character at a time.
        const sr = document.createElement('span');
        sr.className = 'sr-only';
        sr.textContent = this.text;
        typed.parentElement.prepend(sr);
        typed.setAttribute('aria-hidden', 'true');

        this.collapse();
    }

    /** Start (or replay) the build. `origin` is where the cursors burst out. */
    async run(origin) {
        if (this.busy || this.parked) return;
        this.busy = true;
        try {
            this.collapse();
            this.card.scrollIntoView({ block: 'nearest' });
            if (prefersReducedMotion()) await this.buildStatic(origin);
            else await this.buildAnimated(origin);
        } finally {
            this.busy = false;
        }
    }

    // ---- States -----------------------------------------------------------

    /** Back to the empty state. The full text stays in `rest` so the layout is stable. */
    collapse() {
        this.card.classList.remove('is-shown', 'is-typing');
        this.card.style.scale = '';
        this.typed.textContent = '';
        this.rest.textContent = this.text;
    }

    ensureBots(origin, burst) {
        this.builder ??= this.swarm.add({ ...origin, hue: 215, label: 'layout-bot', burst });
        this.typist ??= this.swarm.add({ ...origin, hue: 285, label: 'copy-bot', burst });
    }

    caretPoint = () => {
        const b = this.caret.getBoundingClientRect();
        return { x: b.right + 4, y: b.bottom + 2 };
    };

    // ---- Reduced motion ---------------------------------------------------

    async buildStatic(origin) {
        this.ensureBots(origin, false);
        this.typed.textContent = this.text;
        this.rest.textContent = '';
        this.card.classList.add('is-shown');

        const r = this.card.getBoundingClientRect();
        this.builder.place(r.right, r.bottom);
        const end = this.caretPoint();
        this.typist.place(end.x, end.y);

        this.parked = true;
        this.label.textContent = 'Built';
        this.status.textContent = 'Website built.';
    }

    // ---- Animated build ---------------------------------------------------

    async buildAnimated(origin) {
        this.label.textContent = 'Building…';
        this.status.textContent = 'Building the website…';

        // Measure the final card rect while it is still invisible at full size.
        const r = this.card.getBoundingClientRect();
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

        await this.dragOut(r);
        builder.wander();

        await this.type();
        typist.wander();

        this.label.textContent = 'Build again';
        this.status.textContent = 'Website built.';
    }

    /** layout-bot presses at the top-left corner and drags to the bottom-right one. */
    async dragOut(r) {
        const { builder, card, swarm } = this;
        const t0 = performance.now();

        card.style.scale = `${MIN_SCALE} ${MIN_SCALE}`;
        card.classList.add('is-shown');
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
    async type() {
        const { typist, card, typed, rest, text } = this;

        card.classList.add('is-typing');
        const start = this.caretPoint();
        await typist.moveTo(start.x, start.y, { tolerance: 14, settleSpeed: 160 });
        typist.follow(this.caretPoint);
        await sleep(250);

        for (let i = 1; i <= text.length; i++) {
            typed.textContent = text.slice(0, i);
            rest.textContent = text.slice(i);
            await sleep(typingDelay(text[i - 1]));
        }

        await sleep(700);
        card.classList.remove('is-typing');
    }
}
