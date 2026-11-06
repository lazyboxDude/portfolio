// Spawns fake mouse cursors that burst out of a point and then wander around.
// One requestAnimationFrame loop drives all cursors; each one is a damped
// spring chasing a random target, which gives the motion an organic feel.

const ARROW_SVG = (color) => `
<svg viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
  <path d="M2 1.5 L2 17 L6.2 13.2 L9 19.6 L11.8 18.4 L9 12.2 L14.8 12.2 Z"
        fill="${color}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>
</svg>`;

const SPRING = 11;     // pull towards the target
const DAMPING = 4.2;   // slightly under-damped -> small overshoot
const MAX_DT = 0.05;   // clamp so a background tab doesn't teleport cursors
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

const rand = (min, max) => min + Math.random() * (max - min);

export class CursorSwarm {
    /**
     * @param {HTMLElement} layer   fixed, pointer-events:none container
     * @param {{max?: number}} opts max number of cursors alive at once
     */
    constructor(layer, { max = 40 } = {}) {
        this.layer = layer;
        this.max = max;
        this.cursors = [];
        this.last = 0;
        this.running = false;
        this.tick = this.tick.bind(this);
    }

    get count() { return this.cursors.length; }

    /** Spawn `n` cursors at viewport position (x, y). Returns how many were added. */
    spawn(n, x, y) {
        const room = this.max - this.cursors.length;
        const amount = Math.max(0, Math.min(n, room));
        const hueStart = rand(0, 360);

        for (let i = 0; i < amount; i++) {
            const hue = (hueStart + (this.cursors.length + i) * 47) % 360;
            const el = document.createElement('div');
            el.className = 'fake-cursor is-new';
            el.innerHTML = ARROW_SVG(`hsl(${hue} 85% 62%)`);
            this.layer.appendChild(el);
            el.addEventListener('animationend', () => el.classList.remove('is-new'), { once: true });

            const angle = rand(0, Math.PI * 2);
            const speed = rand(500, 1100);
            const cursor = {
                el, x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                tx: x, ty: y,
                retarget: 0,
            };
            this.pickTarget(cursor);
            this.cursors.push(cursor);

            if (REDUCED_MOTION.matches) {
                // No motion: drop the cursor straight onto its target.
                cursor.x = cursor.tx; cursor.y = cursor.ty;
                cursor.vx = cursor.vy = 0;
                cursor.retarget = Infinity;
                this.render(cursor);
            }
        }

        if (amount > 0) this.start();
        return amount;
    }

    pickTarget(c) {
        const pad = 24;
        c.tx = rand(pad, Math.max(pad + 1, window.innerWidth - pad));
        c.ty = rand(pad, Math.max(pad + 1, window.innerHeight - pad));
        c.retarget = rand(1.2, 3.5); // seconds until the next wander target
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

        for (const c of this.cursors) {
            c.retarget -= dt;
            const dx = c.tx - c.x, dy = c.ty - c.y;
            if (c.retarget <= 0 || (dx * dx + dy * dy < 400 && c.retarget < 1)) this.pickTarget(c);

            c.vx += (dx * SPRING - c.vx * DAMPING) * dt;
            c.vy += (dy * SPRING - c.vy * DAMPING) * dt;
            c.x += c.vx * dt;
            c.y += c.vy * dt;
            this.render(c);
        }

        if (this.running) requestAnimationFrame(this.tick);
    }

    render(c) {
        c.el.style.transform = `translate3d(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px, 0)`;
    }
}
