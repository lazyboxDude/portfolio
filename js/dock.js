// The box: the start button in the hero, then the bots' home.
//
// Click: the lid lifts, the bots burst out of the box and build the page (js/build.js). Once the giant name is typed
// (it stands in front of the box and flips light over it), the box shrinks and travels to the bottom-right corner.
// That trip is ONE transform animation (FLIP: the target rectangle is measured, translate and
// scale are animated). It runs inside the hero, where the box stands behind the giant name (the name inverts where
// they overlap). Only when it has arrived does the box move to the end of <body> and get `position: fixed` with a
// safe-area margin, at exactly the same spot, so nothing jumps. From then on it stays there.
//
// At home it counts its bots (badge), says where they are (tooltip) and calls them back on click (js/main.js).
// It is also the `home` of the CursorSwarm: bots walk to `entry()`, the opening in the lid, and sink into it.

const FLY_MS = 1500;
const OPENING = { x: 0.5, y: 0.285 }; // where the opening is, as a fraction of the box (x, y); matches the SVG in index.html
const ANNOUNCE_MS = 900;              // the live region speaks at most this often (no constant chatter)

export class Dock {
    constructor({ wrap, button, swarm }) {
        this.wrap = wrap;
        this.button = button;
        this.swarm = swarm;
        this.art = wrap.querySelector('.box-art');
        this.badge = wrap.querySelector('.box-count');
        this.badgeN = wrap.querySelector('.box-count-n');
        this.badgeSr = wrap.querySelector('.box-count .sr-only');
        this.tip = wrap.querySelector('.box-tip');
        this.state = 'start'; // 'start' (in the hero) -> 'open' (lid up, bots out) -> 'flying' -> 'home' (fixed in the corner)
        this.busy = false;    // a build is running: the box cannot be clicked
        this.locked = false;  // reduced motion: nothing to call
        this.rect = null;     // cached while home (the box is fixed there)
        this.speaking = 0;
        this.shown = '';

        swarm.home = this;
        swarm.stateHooks.add(() => this.render());
        this.glide = null;    // the animation that settles the box from the screen centre into its place in the hero
        window.addEventListener('resize', () => { this.rect = null; this.centerOnScreen(); }, { passive: true });
        window.addEventListener('load', () => this.centerOnScreen());
        document.fonts?.ready.then(() => this.centerOnScreen());
        this.centerOnScreen();
        this.canReceive = () => true; // replaced by the builder: bots only go home while nothing is being built
    }

    /**
     * Before the first click the box is all the visitor sees: put it in the middle of the screen (both axes), whatever
     * the layout of the hero behind it. It is only shifted with the `translate` property (the flight to the corner uses
     * `transform`, so the two never collide); open() lets it settle into its real place.
     */
    centerOnScreen() {
        if (this.state !== 'start') return;
        const { wrap } = this;
        wrap.style.translate = 'none'; // measure the box at its place in the hero
        const r = wrap.getBoundingClientRect();
        if (!r.width) return;
        const dx = window.innerWidth / 2 - (r.left + r.width / 2);
        const dy = window.innerHeight / 2 - (r.top + r.height / 2);
        wrap.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
    }

    get disabled() { return this.button.getAttribute('aria-disabled') === 'true'; }

    /** The opening of the box in viewport coordinates: where bots burst out of and sink into. */
    entry() {
        if (this.state !== 'home' || !this.rect) {
            const r = this.wrap.getBoundingClientRect();
            if (this.state === 'home') this.rect = r;
            return this.point(r);
        }
        return this.point(this.rect);
    }

    point(r) {
        return { x: r.left + r.width * OPENING.x, y: r.top + r.height * OPENING.y };
    }

    /** The box's rectangle right now (it moves while it flies: the motion-bot follows it). */
    bounds() {
        return this.wrap.getBoundingClientRect();
    }

    /** The box's rectangle once it stands in the corner (the bots wait next to it). */
    corner() {
        return this.state === 'home' ? (this.rect ??= this.wrap.getBoundingClientRect()) : null;
    }

    /** The lid lifts and the hint goes (CSS); the box is not a start button any more. */
    open({ glide = true } = {}) {
        if (this.state !== 'start') return;
        this.state = 'open';
        this.wrap.classList.remove('is-start');
        this.setLabel('Call the bots');
        // The box settles from the screen centre into its place in the hero (not with reduced motion, not when it docks at once).
        const from = this.wrap.style.translate;
        this.wrap.style.translate = '';
        if (glide && from && from !== 'none' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.glide = this.wrap.animate({ translate: [from, '0px 0px'] }, { duration: 700, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
        }
    }

    /**
     * Shrink and travel to the corner. `instant` skips the animation (reduced motion).
     * Call it after the page is live: the target is measured, and the layout must be final.
     */
    async fly({ instant = false } = {}) {
        this.open({ glide: !instant });
        if (this.state !== 'open') return;
        const { wrap } = this;
        this.glide?.cancel(); // measure the box at its real place
        this.state = 'flying';

        const first = wrap.getBoundingClientRect();
        // Measure the target: dock it for a moment (no paint happens in between), then put it back.
        wrap.classList.add('is-home');
        const last = wrap.getBoundingClientRect();
        wrap.classList.remove('is-home');

        if (!instant && first.width > 0) {
            const dx = last.left - first.left, dy = last.top - first.top, s = last.width / first.width;
            const y0 = window.scrollY;
            // The box flies inside the page, its corner is fixed to the window: when the visitor scrolls during the
            // flight, the target moves by the same amount, so it still lands exactly in the corner.
            const frames = () => [
                { transform: 'none' },
                { transform: `translate(${dx.toFixed(1)}px, ${(dy + window.scrollY - y0).toFixed(1)}px) scale(${s.toFixed(4)})` },
            ];
            const flight = wrap.animate(frames(), { duration: FLY_MS, easing: 'cubic-bezier(0.65, 0, 0.25, 1)', fill: 'forwards' });
            const onScroll = () => flight.effect.setKeyframes(frames());
            window.addEventListener('scroll', onScroll, { passive: true });
            try { await flight.finished; } catch { /* cancelled */ }
            window.removeEventListener('scroll', onScroll);
            // Dock for real in the same frame as the animation ends: same rectangle, so nothing moves.
            wrap.classList.add('is-home');
            document.body.append(wrap);
            flight.cancel();
        } else {
            wrap.classList.add('is-home');
            document.body.append(wrap);
        }
        this.state = 'home';
        this.rect = null;
        this.render();
    }

    /** One quick press-in of the box when a bot disappears inside. */
    bump() {
        this.art?.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
    }

    /** The box cannot be clicked while a build is running (it stays focusable, aria-disabled). */
    setBusy(busy) {
        this.busy = busy;
        this.applyDisabled();
    }

    /** Reduced motion: the page is built at once, the bots stay home, there is nothing to call. */
    lock() {
        this.locked = true;
        this.setLabel('The bots are at home');
        this.applyDisabled();
    }

    applyDisabled() {
        const off = this.busy || this.locked;
        this.button.setAttribute('aria-disabled', String(off));
    }

    setLabel(text) { this.button.setAttribute('aria-label', text); }

    /** Badge, tooltip and the (quiet) live region: who is home, who is on the way, who is at work. */
    render() {
        const c = this.swarm.counts();
        this.badgeN.textContent = String(c.home);
        this.wrap.classList.toggle('has-home', c.home > 0);

        const parts = [`${c.home} home`];
        if (c.away) parts.push(`${c.away} on their way`);
        if (c.work) parts.push(`${c.work} at work`);
        this.tip.textContent = parts.join(' · ');

        // Announce only what settled: one calm sentence, at most every ANNOUNCE_MS.
        const say = `${c.home} ${c.home === 1 ? 'bot is' : 'bots are'} at home.`;
        if (say === this.shown) return;
        clearTimeout(this.speaking);
        this.speaking = setTimeout(() => { this.shown = say; this.badgeSr.textContent = say; }, ANNOUNCE_MS);
    }
}
