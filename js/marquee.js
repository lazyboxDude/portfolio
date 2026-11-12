// The giant name in the hero as an endless ticker: it keeps scrolling in from the right.
//
// How it stays seamless: the copy-bot types the name once (js/build.js, Typable). When the motion-bot starts the
// ticker, copies of the finished text are appended to the heading, cloned from the very same markup (one span per
// character), so every letter has exactly the same shape and position as in the original. The loop is exactly the
// distance from the start of one copy to the start of the next (a copy plus its gap), measured, not guessed.
// One CSS animation moves the heading by that distance and starts over: transform only, no JS per frame.
//
// Accessibility: the copies are aria-hidden like the typed characters; the screen-reader text exists once.
// Reduced motion and no JS: no ticker, the name just stands there. The animation pauses while the hero is off screen.

import { prefersReducedMotion } from './cursors.js';

const EM_PER_SECOND = 0.45; // speed: 0.45 font sizes per second (about 92px/s at the full 204px, calm at 55px)
const RESIZE_MS = 200;

export class NameMarquee {
    /** @param {HTMLElement} h1 the heading with the typed name  @param {HTMLElement} hero what pauses it when out of view */
    constructor(h1, hero) {
        this.h1 = h1;
        this.hero = hero;
        this.running = false;
        this.clones = [];
        this.timer = 0;

        new IntersectionObserver(([entry]) => this.h1.classList.toggle('is-offscreen', !entry.isIntersecting)).observe(hero);
        window.addEventListener('resize', () => {
            clearTimeout(this.timer);
            this.timer = setTimeout(() => { if (this.running) { this.stop(); this.start(); } }, RESIZE_MS);
        }, { passive: true });
    }

    /** The typed characters of the name (not the screen-reader copy, not a clone). */
    get original() {
        return this.h1.querySelector(':scope > [aria-hidden="true"]:not(.marquee-clone)');
    }

    /** Start the ticker. Returns { speed, loop } (px/s and px) for the bot's tag, or null (reduced motion, nothing to run). */
    start() {
        const original = this.original;
        if (this.running || !original || prefersReducedMotion()) return null;

        original.classList.add('marquee-copy');
        const first = this.append(original);
        // One loop = from the start of a copy to the start of the next one (the copy plus its gap).
        const loop = first.getBoundingClientRect().left - original.getBoundingClientRect().left;
        if (!(loop > 0)) { this.stop(); return null; }
        // Enough copies to fill the window for as long as the loop runs.
        for (let i = Math.ceil(window.innerWidth / loop); i > 0; i--) this.append(original);

        const speed = parseFloat(getComputedStyle(this.h1).fontSize) * EM_PER_SECOND;
        this.h1.style.setProperty('--loop', `${loop.toFixed(2)}px`);
        this.h1.style.setProperty('--loop-time', `${(loop / speed).toFixed(2)}s`);
        this.h1.classList.add('is-marquee');
        this.running = true;
        return { speed: Math.round(speed), loop: Math.round(loop) };
    }

    append(original) {
        const clone = original.cloneNode(true);
        clone.classList.add('marquee-clone');
        this.h1.append(clone);
        this.clones.push(clone);
        return clone;
    }

    /** Back to the plain heading (a replay types the name again). */
    stop() {
        for (const clone of this.clones) clone.remove();
        this.clones = [];
        this.original?.classList.remove('marquee-copy');
        this.h1.classList.remove('is-marquee');
        this.h1.style.removeProperty('--loop');
        this.h1.style.removeProperty('--loop-time');
        this.running = false;
    }
}
