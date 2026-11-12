// The swarm finale: hundreds of small cursor "agents" on a <canvas> that gather into five layers.
//
// Why a canvas: the DOM cursors (cursors.js) are capped at 40, this is the part of the site that is
// about scale. It is drawn from the shared animation loop (CursorSwarm.onFrame), so there is still
// only one requestAnimationFrame loop on the page.
//
//   - "More agents" multiplies the swarm (x3 per click) up to a hard cap. At the cap the agents
//     gather into the five layers on their own. "Stack them up" / "Release" toggles it by hand.
//   - Every layer is one of the skill layers above it. Hover, focus or tap a layer in the list to
//     light it up in the picture.
//   - Real mouse pointer: agents step aside when it comes close.
//   - Frame budget: if drawing gets too slow on this device, the links are dropped and the swarm
//     stops growing (degrade()).
//   - prefers-reduced-motion: one still picture of the stacked layers, no controls.
//
// The canvas is decorative (aria-hidden). The text next to it says the same in words.

import { prefersReducedMotion } from './cursors.js';

const COLORS = ['#7b95ff', '#5fd4f0', '#6fe3a5', '#ffc766', '#ff8fb8']; // one per layer, bottom to top
const WEIGHTS = [0.34, 0.26, 0.2, 0.13, 0.07]; // share of agents per layer (more at the base)
const KINDS = ['agent', 'layout-agent', 'copy-agent', 'a11y-agent', 'motion-agent', 'type-agent'];
const START = 16;           // agents at the beginning
const GROWTH = 3;           // "More agents" multiplies by this
const CAP_WIDE = 720;       // hard upper limits
const CAP_NARROW = 360;
const STILL_COUNT = 240;    // agents in the still picture (reduced motion)
const LABELLED = 14;        // only the first agents show their name (text is expensive to draw)
const SPRITE = 14;          // cursor size in px
const POINTER_RADIUS = 90;
const BUDGET_MS = 10;       // average work per frame that counts as "too slow"
const SLOW_FRAMES = 45;     // ... for this many frames in a row

const rand = (a, b) => a + Math.random() * (b - a);
const ARROW = new Path2D('M2 1.5 L2 17 L6.2 13.2 L9 19.6 L11.8 18.4 L9 12.2 L14.8 12.2 Z');

export class AgentField {
    /**
     * @param {object} o
     * @param {HTMLElement} o.stage      the element that is shown/hidden as a whole
     * @param {HTMLCanvasElement} o.canvas
     * @param {import('./cursors.js').CursorSwarm} o.swarm  its frame loop drives the canvas
     * @param {HTMLElement} o.counter    live region: "16 agents · 5 layers"
     * @param {HTMLButtonElement} o.more
     * @param {HTMLButtonElement} o.stack
     * @param {HTMLButtonElement[]} o.layerButtons  data-layer="0..4" (0 = base)
     */
    constructor({ stage, canvas, swarm, counter, more, stack, layerButtons }) {
        this.stage = stage;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.swarm = swarm;
        this.counter = counter;
        this.more = more;
        this.stack = stack;
        this.layerButtons = layerButtons;

        this.reduced = prefersReducedMotion();
        this.cap = window.innerWidth < 720 ? CAP_NARROW : CAP_WIDE;
        this.agents = [];
        this.byLayer = COLORS.map(() => []);
        this.stacked = false;
        this.progress = 0;     // 0 = scattered, 1 = fully stacked (eases)
        this.focus = -1;       // layer lit up by the list, or -1
        this.pinned = -1;
        this.visible = false;
        this.linesOn = true;
        this.degraded = false;
        this.slow = 0;
        this.avg = 0;
        this.w = 0; this.h = 0; this.dpr = 1;
        this.layers = [];      // geometry per layer, see layout()
        this.sprites = [];

        this.measure();
        this.makeSprites();
        this.bind();

        if (this.reduced) {
            this.spawn(STILL_COUNT, false);
            this.stacked = true;
            this.progress = 1;
            this.snapToTargets();
            this.draw(0);
            this.more.hidden = true;
            this.stack.hidden = true;
            this.say();
            return;
        }

        this.spawn(START, false);
        this.unsubscribe = swarm.onFrame((dt, now) => this.frame(dt, now));
        new IntersectionObserver(([entry]) => {
            this.visible = entry.isIntersecting;
            if (this.visible) swarm.start(); // make sure the shared loop is running
        }, { threshold: 0.05 }).observe(stage);
        this.say();
    }

    // ---- Setup ------------------------------------------------------------

    bind() {
        new ResizeObserver(() => {
            this.measure();
            this.layout();
            if (this.reduced) { this.snapToTargets(); this.draw(0); }
        }).observe(this.canvas);

        this.more.addEventListener('click', () => this.grow());
        this.stack.addEventListener('click', () => this.setStacked(!this.stacked));

        for (const btn of this.layerButtons) {
            const layer = Number(btn.dataset.layer);
            const light = (on) => { if (this.pinned < 0) this.focus = on ? layer : -1; if (this.reduced) this.draw(0); };
            btn.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') light(true); });
            btn.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') light(false); });
            btn.addEventListener('focus', () => light(true));
            btn.addEventListener('blur', () => light(false));
            btn.addEventListener('click', () => {
                // Tap (or Enter) pins a layer; again unpins it. Works without a hover.
                this.pinned = this.pinned === layer ? -1 : layer;
                this.focus = this.pinned;
                for (const b of this.layerButtons) b.setAttribute('aria-pressed', String(Number(b.dataset.layer) === this.pinned));
                if (this.reduced) this.draw(0);
            });
        }
    }

    /** Canvas size follows its CSS box; drawing is in CSS pixels, scaled for the screen. */
    measure() {
        // clientWidth/Height are layout sizes: they do not change while the stage is scaled by the layout-bot.
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.w = Math.max(1, this.canvas.clientWidth);
        this.h = Math.max(1, this.canvas.clientHeight);
        this.canvas.width = Math.round(this.w * this.dpr);
        this.canvas.height = Math.round(this.h * this.dpr);
        this.makeSprites();
    }

    /** One pre-drawn cursor per layer colour: drawing hundreds of paths per frame would be slower than drawImage. */
    makeSprites() {
        const px = Math.ceil(SPRITE * this.dpr) + 4;
        const s = (SPRITE * this.dpr) / 22;
        // Where the arrow tip is inside the sprite, and the sprite's size, both in CSS pixels.
        this.hotX = (2 + 2 * s) / this.dpr;
        this.hotY = (2 + 1.5 * s) / this.dpr;
        this.spriteSize = px / this.dpr;
        this.sprites = COLORS.map((color) => {
            const c = document.createElement('canvas');
            c.width = c.height = px;
            const g = c.getContext('2d');
            g.translate(2, 2);
            g.scale(s, s);
            g.fillStyle = color;
            g.strokeStyle = '#0b0c10'; // ink outline: the stage is light
            g.lineWidth = 1.4;
            g.lineJoin = 'round';
            g.fill(ARROW);
            g.stroke(ARROW);
            return c;
        });
    }

    /** Geometry of the five layers: flat diamonds stacked upwards, the base the widest. */
    layout() {
        const { w, h } = this;
        const cx = w / 2;
        const baseHalf = Math.min(w * 0.42, h * 0.78);
        const step = h * 0.15;
        const baseY = h * 0.78;
        this.layers = COLORS.map((color, i) => {
            const half = baseHalf * (1 - i * 0.17);
            return { color, cx, cy: baseY - i * step, rx: half, ry: half * 0.42 };
        });
        for (const a of this.agents) this.target(a);
    }

    /** Where an agent sits on its layer (u, v are fixed per agent, so the picture scales with the canvas). */
    target(a) {
        const L = this.layers[a.layer];
        if (!L) return;
        a.tx = L.cx + a.u * L.rx;
        a.ty = L.cy + a.v * L.ry;
    }

    snapToTargets() {
        for (const a of this.agents) { a.x = a.tx; a.y = a.ty; a.vx = a.vy = 0; }
    }

    // ---- Agents -----------------------------------------------------------

    /** Add `n` agents (up to the cap), flung out of the middle of the stage. */
    spawn(n, burst = true) {
        if (!this.layers.length) this.layout();
        const room = Math.max(0, this.cap - this.agents.length);
        for (let i = 0; i < Math.min(n, room); i++) {
            // Pick a layer by weight, then a point inside its diamond.
            let r = Math.random(), layer = 0;
            for (; layer < WEIGHTS.length - 1; layer++) { r -= WEIGHTS[layer]; if (r <= 0) break; }
            let u = rand(-1, 1), v = rand(-1, 1);
            if (Math.abs(u) + Math.abs(v) > 1) { u = Math.sign(u) - u; v = Math.sign(v) - v; }

            const peers = this.byLayer[layer];
            const above = this.byLayer[layer + 1];
            const a = {
                x: this.w / 2 + rand(-20, 20), y: this.h / 2 + rand(-20, 20),
                vx: 0, vy: 0, h: rand(0, Math.PI * 2), speed: rand(24, 70),
                layer, u, v, tx: 0, ty: 0,
                link: above?.length && Math.random() < 0.12 ? above[Math.floor(Math.random() * above.length)]
                    : peers.length ? peers[Math.floor(Math.random() * peers.length)] : null,
                label: null, labelW: 0,
                wob: rand(0, Math.PI * 2),
            };
            if (this.agents.length < LABELLED) {
                const kind = KINDS[Math.floor(Math.random() * KINDS.length)];
                a.label = kind === 'agent' ? `agent-${100 + Math.floor(Math.random() * 900)}` : kind;
            }
            if (burst) {
                const angle = rand(0, Math.PI * 2), s = rand(120, 320);
                a.vx = Math.cos(angle) * s; a.vy = Math.sin(angle) * s;
            } else {
                a.x = rand(0, this.w); a.y = rand(0, this.h);
            }
            this.target(a);
            this.agents.push(a);
            peers.push(a);
        }
    }

    grow() {
        if (this.agents.length >= this.cap || this.degraded) return;
        this.spawn(this.agents.length * (GROWTH - 1));
        if (this.agents.length >= this.cap) {
            this.setStacked(true); // the finale: all of them gather
            this.more.disabled = true;
            this.more.textContent = 'That is all of them';
        }
        this.say();
    }

    setStacked(on) {
        this.stacked = on;
        // The label stays the same; assistive tech gets the state from aria-pressed.
        this.stack.setAttribute('aria-pressed', String(on));
        this.swarm.start();
    }

    say() {
        const n = this.agents.length.toLocaleString('en-US');
        this.counter.textContent = `${n} agents · 5 layers`;
    }

    // ---- Per frame --------------------------------------------------------

    frame(dt, now) {
        if (!this.visible) return;
        const t0 = performance.now();
        dt = Math.min(dt, 0.05);
        this.update(dt);
        this.draw(now);
        this.watch(performance.now() - t0);
    }

    update(dt) {
        this.progress += ((this.stacked ? 1 : 0) - this.progress) * Math.min(1, dt * 2.2);

        // The real mouse pointer, in canvas coordinates (agents step aside).
        const p = this.swarm.pointer;
        const rect = this.canvas.getBoundingClientRect();
        const px = p.x - rect.left, py = p.y - rect.top;
        const near = p.active && px > -POINTER_RADIUS && px < this.w + POINTER_RADIUS && py > -POINTER_RADIUS && py < this.h + POINTER_RADIUS;
        const r2 = POINTER_RADIUS * POINTER_RADIUS;

        const k = 16, damp = 2 * Math.sqrt(k) * 0.85;
        for (const a of this.agents) {
            if (this.stacked) {
                // A little bob so the stack stays alive.
                a.wob += dt * 2;
                const bx = Math.cos(a.wob) * 1.5, by = Math.sin(a.wob * 1.3) * 1.5;
                a.vx += ((a.tx + bx - a.x) * k - a.vx * damp) * dt;
                a.vy += ((a.ty + by - a.y) * k - a.vy * damp) * dt;
            } else {
                // Roam: a slowly turning heading, steered back from the edges.
                a.h += (Math.random() - 0.5) * 3 * dt;
                const m = 24;
                if (a.x < m) a.h = 0; else if (a.x > this.w - m) a.h = Math.PI;
                if (a.y < m) a.h = Math.PI / 2; else if (a.y > this.h - m) a.h = -Math.PI / 2;
                a.vx += (Math.cos(a.h) * a.speed - a.vx) * 2 * dt;
                a.vy += (Math.sin(a.h) * a.speed - a.vy) * 2 * dt;
            }
            if (near) {
                const dx = a.x - px, dy = a.y - py, d2 = dx * dx + dy * dy;
                if (d2 < r2 && d2 > 1) {
                    const d = Math.sqrt(d2), push = (1 - d / POINTER_RADIUS) * 900 * dt;
                    a.vx += (dx / d) * push; a.vy += (dy / d) * push;
                }
            }
            a.x += a.vx * dt;
            a.y += a.vy * dt;
        }
    }

    draw() {
        const { ctx, dpr, w, h } = this;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const prog = this.progress;

        // The layers as flat diamonds (they fade in while the agents gather).
        if (prog > 0.01) {
            for (let i = 0; i < this.layers.length; i++) {
                const L = this.layers[i];
                const lit = this.focus === i;
                ctx.beginPath();
                ctx.moveTo(L.cx, L.cy - L.ry);
                ctx.lineTo(L.cx + L.rx, L.cy);
                ctx.lineTo(L.cx, L.cy + L.ry);
                ctx.lineTo(L.cx - L.rx, L.cy);
                ctx.closePath();
                ctx.globalAlpha = prog * (lit ? 0.5 : 0.18);
                ctx.fillStyle = L.color;
                ctx.fill();
                ctx.globalAlpha = prog * (lit ? 1 : 0.85);
                ctx.strokeStyle = L.color;
                ctx.lineWidth = lit ? 2 : 1;
                ctx.stroke();
            }
        }

        // Links between agents of a layer (and a few to the layer above): one path, one stroke.
        if (this.linesOn && prog > 0.05) {
            ctx.globalAlpha = 0.2 * prog;
            ctx.strokeStyle = '#3355ff';
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            for (const a of this.agents) {
                if (!a.link) continue;
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(a.link.x, a.link.y);
            }
            ctx.stroke();
        }

        // The agents, layer by layer (so a lit layer can stand out without switching alpha per agent).
        for (let i = 0; i < this.byLayer.length; i++) {
            ctx.globalAlpha = this.focus >= 0 && this.focus !== i ? 0.3 : 1;
            const sp = this.sprites[i];
            for (const a of this.byLayer[i]) ctx.drawImage(sp, a.x - this.hotX, a.y - this.hotY, this.spriteSize, this.spriteSize);
        }
        ctx.globalAlpha = 1;

        // Names for the first few.
        ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < Math.min(LABELLED, this.agents.length); i++) {
            const a = this.agents[i];
            if (!a.label) continue;
            if (!a.labelW) a.labelW = ctx.measureText(a.label).width + 10;
            ctx.fillStyle = COLORS[a.layer];
            ctx.fillRect(a.x + 9, a.y + 7, a.labelW, 13);
            ctx.fillStyle = '#06080d';
            ctx.fillText(a.label, a.x + 14, a.y + 13.5);
        }
    }

    /** Frame budget: if this device cannot keep up, drop the links and stop growing. */
    watch(ms) {
        this.avg += (ms - this.avg) * 0.1;
        this.slow = this.avg > BUDGET_MS ? this.slow + 1 : 0;
        if (this.slow > SLOW_FRAMES && !this.degraded) this.degrade();
    }

    degrade() {
        this.degraded = true;
        this.linesOn = false;
        this.cap = Math.min(this.cap, this.agents.length);
        this.more.disabled = true;
        this.more.textContent = 'Enough for this device';
    }
}
