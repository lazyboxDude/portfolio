// Fake mouse cursors that behave like little bots.
//
// One requestAnimationFrame loop (in CursorSwarm) drives every cursor. Each
// cursor is a damped spring chasing a target point, and it is in one of three
// modes:
//   hold   - chase a fixed point (moveTo) and stay there
//   follow - chase a point that is recomputed every frame (follow)
//   wander - roam around the viewport at random
// Jobs (see intro.js) are written as async functions that await moveTo()/click().

const HOT_X = 2;   // arrow tip inside the 22px SVG, so x/y mean "where it points"
const HOT_Y = 1.5;

const SPRING = 11;                          // pull towards the target
const DAMPING = 4.2;                        // slightly under-damped -> small overshoot
const DRAG_DAMPING = 2 * Math.sqrt(SPRING); // critically damped -> no overshoot while dragging
const MAX_DT = 0.05;                        // clamp so a background tab doesn't teleport cursors
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

const rand = (min, max) => min + Math.random() * (max - min);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const prefersReducedMotion = () => REDUCED_MOTION.matches;
export { DRAG_DAMPING };

const ARROW_SVG = `
<svg viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
  <path d="M2 1.5 L2 17 L6.2 13.2 L9 19.6 L11.8 18.4 L9 12.2 L14.8 12.2 Z"
        fill="var(--cursor-color)" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>
</svg>`;

class Cursor {
    constructor(swarm, { x, y, hue, label, burst }) {
        this.swarm = swarm;
        this.color = `hsl(${hue} 85% 62%)`;
        this.x = x; this.y = y;
        this.tx = x; this.ty = y;
        this.vx = 0; this.vy = 0;
        this.mode = 'hold';
        this.damping = DAMPING;
        this.follower = null;
        this.retarget = 0;
        this.arrival = null;

        const el = document.createElement('div');
        el.className = 'fake-cursor is-new';
        el.style.setProperty('--cursor-color', this.color);
        el.innerHTML = `<div class="fake-cursor-body">${ARROW_SVG}</div>`;
        if (label) {
            const tag = document.createElement('span');
            tag.className = 'fake-cursor-tag';
            tag.textContent = label;
            el.appendChild(tag);
        }
        el.addEventListener('animationend', () => el.classList.remove('is-new'), { once: true });
        swarm.layer.appendChild(el);
        this.el = el;

        if (burst && !REDUCED_MOTION.matches) {
            const angle = rand(0, Math.PI * 2);
            const speed = rand(350, 750);
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
        }
        this.render();
    }

    /** Glide to (x, y). Resolves once the cursor is within `tolerance` px and slower than `settleSpeed` px/s. */
    moveTo(x, y, { tolerance = 4, settleSpeed = 40, damping = DAMPING, timeout = 5000 } = {}) {
        this.settle();
        this.mode = 'hold';
        this.damping = damping;
        this.tx = x; this.ty = y;
        if (REDUCED_MOTION.matches) {
            this.place(x, y);
            return Promise.resolve();
        }
        this.swarm.start();
        return new Promise((resolve) => {
            this.arrival = { resolve, tolerance, settleSpeed, deadline: performance.now() + timeout };
        });
    }

    /** Chase the point returned by `getPoint()`, re-evaluated every frame. */
    follow(getPoint, { damping = DAMPING } = {}) {
        this.settle();
        this.mode = 'follow';
        this.damping = damping;
        this.follower = getPoint;
        this.swarm.start();
    }

    /** Roam around the viewport (the "off duty" behaviour). */
    wander() {
        this.settle();
        this.mode = 'wander';
        this.damping = DAMPING;
        this.pickTarget();
        this.swarm.start();
    }

    /** Jump to (x, y) without animation. */
    place(x, y) {
        this.settle();
        this.mode = 'hold';
        this.x = this.tx = x;
        this.y = this.ty = y;
        this.vx = this.vy = 0;
        this.render();
    }

    press() { this.el.classList.add('is-down'); }
    release() { this.el.classList.remove('is-down'); }

    /** Press, release and leave a ripple behind. */
    async click() {
        this.press();
        await sleep(110);
        this.release();
        this.swarm.ripple(this.x, this.y, this.color);
        await sleep(120);
    }

    pickTarget() {
        const pad = 24;
        this.tx = rand(pad, Math.max(pad + 1, window.innerWidth - pad));
        this.ty = rand(pad, Math.max(pad + 1, window.innerHeight - pad));
        this.retarget = rand(1.2, 3.5); // seconds until the next wander target
    }

    /** Resolve a pending moveTo() promise (arrived, superseded or timed out). */
    settle() {
        if (!this.arrival) return;
        const { resolve } = this.arrival;
        this.arrival = null;
        resolve();
    }

    step(dt, now) {
        if (this.mode === 'follow') {
            const p = this.follower();
            this.tx = p.x; this.ty = p.y;
        } else if (this.mode === 'wander') {
            this.retarget -= dt;
            if (this.retarget <= 0) this.pickTarget();
        }

        const dx = this.tx - this.x, dy = this.ty - this.y;
        this.vx += (dx * SPRING - this.vx * this.damping) * dt;
        this.vy += (dy * SPRING - this.vy * this.damping) * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.render();

        const a = this.arrival;
        if (a) {
            const near = dx * dx + dy * dy <= a.tolerance * a.tolerance;
            const slow = this.vx * this.vx + this.vy * this.vy < a.settleSpeed * a.settleSpeed;
            if ((near && slow) || now > a.deadline) this.settle();
        }
    }

    render() {
        this.el.style.transform =
            `translate3d(${(this.x - HOT_X).toFixed(1)}px, ${(this.y - HOT_Y).toFixed(1)}px, 0)`;
    }
}

export class CursorSwarm {
    /**
     * @param {HTMLElement} layer   fixed, pointer-events:none container
     * @param {{max?: number}} opts max number of cursors alive at once
     */
    constructor(layer, { max = 40 } = {}) {
        this.layer = layer;
        this.max = max;
        this.cursors = [];
        this.hooks = new Set();
        this.last = 0;
        this.running = false;
        this.tick = this.tick.bind(this);
    }

    get count() { return this.cursors.length; }

    /** Add a cursor at (x, y). `burst` flings it outwards. Returns null when full. */
    add({ x, y, hue = 220, label = '', burst = false }) {
        if (this.cursors.length >= this.max) return null;
        const cursor = new Cursor(this, { x, y, hue, label, burst });
        this.cursors.push(cursor);
        return cursor;
    }

    /** Run `fn(dt, now)` once per frame, after the cursors moved. Returns an unsubscribe function. */
    onFrame(fn) {
        this.hooks.add(fn);
        return () => this.hooks.delete(fn);
    }

    /** A ring that expands where a cursor clicked. */
    ripple(x, y, color) {
        if (REDUCED_MOTION.matches) return;
        const ring = document.createElement('div');
        ring.className = 'ripple';
        ring.style.setProperty('--cursor-color', color);
        ring.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        ring.addEventListener('animationend', () => ring.remove(), { once: true });
        this.layer.appendChild(ring);
    }

    start() {
        if (this.running || REDUCED_MOTION.matches) return;
        this.running = true;
        this.last = performance.now();
        requestAnimationFrame(this.tick);
    }

    tick(now) {
        const dt = Math.min(MAX_DT, (now - this.last) / 1000);
        this.last = now;

        for (const c of this.cursors) c.step(dt, now);
        for (const hook of this.hooks) hook(dt, now);

        if (this.running) requestAnimationFrame(this.tick);
    }
}
