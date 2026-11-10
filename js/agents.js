// The swarm finale: hundreds of small cursor "agents" on a <canvas> that gather into five layers.
//
// Why a canvas: the DOM cursors (cursors.js) are capped at 40, this is the part of the site that is
// about scale. It is drawn from the shared animation loop (CursorSwarm.onFrame), so there is still
// only one requestAnimationFrame loop on the page.
//
//   - "More agents" multiplies the swarm (x3 per click) up to a hard cap. At the cap the agents
//     gather into the five layers on their own. "Stack them up" / "Release" toggles it by hand.
//   - Every layer is one of the skill layers above it, and every agent IS one skill: its name tag is
//     the skill ("3D modeling", "Unity", ...). Click (or tap) an agent and a card opens next to it with
//     what I can do with that skill. The skills live in the markup (index.html, .layer-skills), this
//     file only reads them, so without JS they are simply listed.
//   - Keyboard / screen reader path (the canvas is aria-hidden): the layer buttons open the card for
//     the first skill of a layer, the chips in the card switch between the skills of that layer.
//   - Hover, focus or tap a layer in the list to light it up in the picture.
//   - Real mouse pointer: agents step aside when it comes close, but the one under the pointer stays put
//     so it can be clicked.
//   - Frame budget: if drawing gets too slow on this device, the links are dropped and the swarm
//     stops growing (degrade()).
//   - prefers-reduced-motion: one still picture of the stacked layers, no controls.
//
// The canvas is decorative (aria-hidden). The text next to it says the same in words.

import { prefersReducedMotion } from './cursors.js';

const COLORS = ['#7b95ff', '#5fd4f0', '#6fe3a5', '#ffc766', '#ff8fb8']; // one per layer, bottom to top
const WEIGHTS = [0.34, 0.26, 0.2, 0.13, 0.07]; // share of agents per layer (more at the base)
const START = 16;           // agents at the beginning
const GROWTH = 3;           // "More agents" multiplies by this
const CAP_WIDE = 720;       // hard upper limits
const CAP_NARROW = 360;
const STILL_COUNT = 240;    // agents in the still picture (reduced motion)
const SPRITE = 14;          // cursor size in px
const POINTER_RADIUS = 48;  // agents step aside this far from the real pointer ...
const POINTER_PUSH = 260;   // ... with this strength (kept gentle: the agents have to stay clickable)
const HIT = 16;             // how close a click has to be to an agent's body (px)
const HIT_TOUCH = 24;       // fingers are bigger
const BODY_X = 4, BODY_Y = 6; // the middle of the arrow, measured from its tip (the agent's x/y)
const CARD_W = 300;         // skill card
const CARD_GAP = 18;        // between agent and card
const CARD_DOCK_BELOW = 560; // canvas narrower than this: the card docks to the bottom edge instead
const BUDGET_MS = 10;       // average work per frame that counts as "too slow"
const SLOW_FRAMES = 45;     // ... for this many frames in a row

const rand = (a, b) => a + Math.random() * (b - a);
const ARROW = new Path2D('M2 1.5 L2 17 L6.2 13.2 L9 19.6 L11.8 18.4 L9 12.2 L14.8 12.2 Z');

/**
 * The skills from the markup: one entry per layer, { title, skills: [{ layer, name, text }] }.
 * Each `.layer-item` holds its layer button and the list of skills (`<li><strong>Name</strong> text</li>`).
 */
function readSkills(stage) {
    const sets = COLORS.map(() => ({ n: '', title: '', skills: [] }));
    for (const item of stage.querySelectorAll('.layer-item')) {
        const btn = item.querySelector('.layer-btn');
        const layer = Number(btn?.dataset.layer);
        if (!sets[layer]) continue;
        const n = btn.querySelector('.layer-n')?.textContent ?? '';
        sets[layer].n = n;
        sets[layer].title = btn.textContent.replace(n, '').trim();
        sets[layer].skills = [...item.querySelectorAll('.layer-skills li')].map((li) => {
            const name = li.querySelector('strong')?.textContent.trim() ?? '';
            return { layer, name, text: li.textContent.replace(name, '').trim() };
        }).filter((s) => s.name);
    }
    return sets;
}

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
     * @param {HTMLElement} o.card       the skill card (hidden until an agent or a layer is picked)
     */
    constructor({ stage, canvas, swarm, counter, more, stack, layerButtons, card }) {
        this.stage = stage;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.swarm = swarm;
        this.counter = counter;
        this.more = more;
        this.stack = stack;
        this.layerButtons = layerButtons;
        this.card = card;

        // Skills: every agent carries one. The first agents cover every skill once, so the first
        // "More agents" click shows all of them (layers interleaved, so a small swarm is mixed).
        this.sets = readSkills(stage);
        this.queue = [];
        for (let i = 0, found = true; found; i++) {
            found = false;
            for (const set of this.sets) if (set.skills[i]) { this.queue.push(set.skills[i]); found = true; }
        }
        this.queued = 0;       // how many of the queue have been handed out
        this.named = [];       // agents that always show their name (one per skill, at most queue.length)
        this.selected = null;  // the agent whose card is open
        this.skill = null;     // the skill of the open card (an agent may not exist, see select())
        this.hover = null;     // the agent under the real pointer
        this.opener = null;    // the layer button that opened the card with the keyboard
        this.cardLayer = -1;   // layer the chips in the card were built for
        this.cardAt = { x: -99, y: -99 };

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
            this.placeCard(true);
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
            btn.addEventListener('click', (e) => {
                // Tap (or Enter) pins a layer and opens its first skill; again closes it. Works without a hover.
                const first = this.sets[layer].skills[0];
                if (this.pinned === layer || !first) { this.close(); return; }
                this.opener = btn;
                this.select(first, null, { focusCard: e.detail === 0 }); // detail 0 = keyboard
            });
        }

        // The agents themselves: hover shows the name and holds the agent still, a click opens its card.
        // (Keyboard and screen reader users get the same through the layer buttons and the chips.)
        this.canvas.addEventListener('pointermove', (e) => {
            if (e.pointerType !== 'touch') this.setHover(this.hit(e, HIT));
        });
        this.canvas.addEventListener('pointerleave', () => this.setHover(null));
        this.canvas.addEventListener('click', (e) => {
            const agent = this.hit(e, e.pointerType === 'touch' ? HIT_TOUCH : HIT);
            this.opener = null;
            if (agent) this.select(agent.skill, agent); else this.close();
        });
        this.card.querySelector('.skill-close').addEventListener('click', () => this.close(true));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.card.hidden) this.close(true);
        });
    }

    // ---- Skill card ---------------------------------------------------------

    /** The agent closest to a pointer event (within `radius` px of its body), or null. Only agents with a skill count. */
    hit(e, radius) {
        const rect = this.canvas.getBoundingClientRect();
        if (!rect.width) return null;
        const px = (e.clientX - rect.left) * (this.w / rect.width);
        const py = (e.clientY - rect.top) * (this.h / rect.height);
        let best = null, bestD = radius * radius;
        for (const a of this.agents) { // later agents sit on top of earlier ones, so "<=" lets them win a tie
            if (!a.skill) continue;
            const dx = a.x + BODY_X - px, dy = a.y + BODY_Y - py, d = dx * dx + dy * dy;
            if (d <= bestD) { best = a; bestD = d; }
        }
        return best;
    }

    setHover(agent) {
        if (agent === this.hover) return;
        this.hover = agent;
        this.canvas.style.cursor = agent ? 'pointer' : '';
        if (this.reduced) this.draw(0);
    }

    /** The first agent that carries this skill, or null. */
    agentFor(skill) {
        return this.byLayer[skill.layer].find((a) => a.skill === skill) ?? null;
    }

    /**
     * Open the card for a skill. Without an agent given the skill's own agent is used; a skill that
     * has no agent yet (a small swarm) gets one, flung out of the middle, as long as there is room.
     */
    select(skill, agent = null, { focusCard = false } = {}) {
        agent ??= this.agentFor(skill);
        if (!agent) {
            const before = this.agents.length;
            this.spawn(1, true, skill);
            if (this.agents.length > before) { agent = this.agents[this.agents.length - 1]; this.say(); }
        }
        this.selected = agent;
        this.skill = skill;

        // The picked layer is pinned (lit, the others fade), like a press on its button.
        this.pinned = this.focus = skill.layer;
        for (const b of this.layerButtons) b.setAttribute('aria-pressed', String(Number(b.dataset.layer) === skill.layer));

        const card = this.card;
        card.hidden = false;
        card.style.setProperty('--c', COLORS[skill.layer]);
        card.querySelector('.skill-layer').textContent = `agent · ${this.sets[skill.layer].n}`;
        card.querySelector('.skill-name').textContent = skill.name;
        card.querySelector('.skill-text').textContent = skill.text;
        this.fillChips(skill);
        this.placeCard(true);
        card.classList.add('is-open');
        if (focusCard) card.querySelector('.skill-chip[aria-pressed="true"]')?.focus();
        this.swarm.start();
        if (this.reduced) this.draw(0);
    }

    /** One chip per skill of the layer (real buttons: the way into the skills without a mouse). */
    fillChips(skill) {
        const list = this.card.querySelector('.skill-peers');
        if (this.cardLayer !== skill.layer) {
            this.cardLayer = skill.layer;
            list.replaceChildren(...this.sets[skill.layer].skills.map((s) => {
                const li = document.createElement('li');
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'skill-chip';
                b.textContent = s.name;
                b.addEventListener('click', () => this.select(s));
                li.append(b);
                return li;
            }));
        }
        const skills = this.sets[skill.layer].skills;
        list.setAttribute('aria-label', `More skills in ${this.sets[skill.layer].title}`);
        [...list.querySelectorAll('.skill-chip')].forEach((b, i) => b.setAttribute('aria-pressed', String(skills[i] === skill)));
    }

    close(returnFocus = false) {
        const opener = this.opener;
        this.selected = this.skill = null;
        this.pinned = this.focus = -1;
        this.cardLayer = -1;
        for (const b of this.layerButtons) b.setAttribute('aria-pressed', 'false');
        this.card.classList.remove('is-open');
        this.card.hidden = true;
        this.opener = null;
        if (returnFocus && opener) opener.focus(); // keyboard users land back on the layer button they came from
        if (this.reduced) this.draw(0);
    }

    /**
     * Put the card next to its agent (wide canvas) or dock it to the bottom of the canvas (narrow one).
     * `force` places it even if the agent has hardly moved. Positions are CSS variables for `translate`,
     * so nothing but the card's compositing layer is touched.
     */
    placeCard(force = false) {
        const card = this.card;
        if (card.hidden) return;
        const a = this.selected;
        if (!force && a && Math.abs(a.x - this.cardAt.x) < 3 && Math.abs(a.y - this.cardAt.y) < 3) return;
        const ox = this.canvas.offsetLeft, oy = this.canvas.offsetTop;
        const w = Math.min(CARD_W, this.w - 16);
        const h = card.offsetHeight;
        let x, y;
        if (this.w < CARD_DOCK_BELOW || !a) {
            x = (this.w - w) / 2;
            y = a && a.y > this.h / 2 ? 8 : this.h - h - 8; // dock on the side the agent is not on
        } else {
            x = a.x + CARD_GAP + w > this.w - 8 ? a.x - CARD_GAP - w : a.x + CARD_GAP;
            y = a.y - h / 2;
        }
        x = Math.max(8, Math.min(x, this.w - w - 8));
        y = Math.max(8, Math.min(y, this.h - h - 8));
        this.cardAt = { x: a ? a.x : -99, y: a ? a.y : -99 };
        card.style.setProperty('--cw', `${w}px`);
        card.style.setProperty('--cx', `${Math.round(ox + x)}px`);
        card.style.setProperty('--cy', `${Math.round(oy + y)}px`);
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
            g.strokeStyle = '#ffffff';
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

    /**
     * Add `n` agents (up to the cap), flung out of the middle of the stage. Every agent gets a skill:
     * first the queue (each skill once), then a random skill of a layer picked by weight. `forced` makes
     * one agent for exactly that skill (it does not use up the queue).
     */
    spawn(n, burst = true, forced = null) {
        if (!this.layers.length) this.layout();
        const room = Math.max(0, this.cap - this.agents.length);
        for (let i = 0; i < Math.min(n, room); i++) {
            let skill = forced, named = false;
            if (!skill && this.queued < this.queue.length) { skill = this.queue[this.queued++]; named = true; }
            // Pick a layer by weight (or take the skill's own), then a point inside its diamond.
            let r = Math.random(), layer = 0;
            if (skill) layer = skill.layer;
            else for (; layer < WEIGHTS.length - 1; layer++) { r -= WEIGHTS[layer]; if (r <= 0) break; }
            if (!skill) { const own = this.sets[layer].skills; skill = own.length ? own[Math.floor(Math.random() * own.length)] : null; }
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
                skill, labelW: 0,
                wob: rand(0, Math.PI * 2),
            };
            if (named && skill) this.named.push(a);
            if (burst) {
                const angle = rand(0, Math.PI * 2), s = rand(120, 320);
                a.vx = Math.cos(angle) * s; a.vy = Math.sin(angle) * s;
            } else {
                a.x = rand(0, this.w); a.y = rand(0, this.h);
            }
            this.target(a);
            if (this.reduced) { a.x = a.tx; a.y = a.ty; a.vx = a.vy = 0; } // still picture: no loop to carry it there
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
            // The agent under the pointer and the one whose card is open stand still (so they can be clicked and read).
            const held = a === this.selected || a === this.hover;
            if (held && !this.stacked) {
                const slow = Math.max(0, 1 - dt * 12);
                a.vx *= slow; a.vy *= slow;
            } else if (this.stacked) {
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
            if (near && !held) {
                const dx = a.x - px, dy = a.y - py, d2 = dx * dx + dy * dy;
                if (d2 < r2 && d2 > 1) {
                    const d = Math.sqrt(d2), push = (1 - d / POINTER_RADIUS) * POINTER_PUSH * dt;
                    a.vx += (dx / d) * push; a.vy += (dy / d) * push;
                }
            }
            a.x += a.vx * dt;
            a.y += a.vy * dt;
        }
        if (this.selected) this.placeCard(); // follows its agent (only when it has moved a few pixels)
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
                ctx.globalAlpha = prog * (lit ? 0.5 : 0.14);
                ctx.fillStyle = L.color;
                ctx.fill();
                ctx.globalAlpha = prog * (lit ? 1 : 0.55);
                ctx.strokeStyle = L.color;
                ctx.lineWidth = lit ? 2 : 1;
                ctx.stroke();
            }
        }

        // Links between agents of a layer (and a few to the layer above): one path, one stroke.
        if (this.linesOn && prog > 0.05) {
            ctx.globalAlpha = 0.22 * prog;
            ctx.strokeStyle = '#9fb4ff';
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

        // Names: one agent per skill always shows its skill. In the stack that would be a pile of overlapping
        // tags, so there only the lit layer shows them (plus the agent under the pointer and the open one).
        ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textBaseline = 'middle';
        const crowded = prog > 0.5;
        for (const a of this.named) {
            if (a === this.selected || a === this.hover) continue; // drawn last, on top
            if (crowded && this.focus !== a.layer) continue;
            this.drawName(a);
        }
        for (const a of [this.hover, this.selected]) {
            if (!a) continue;
            ctx.globalAlpha = a === this.selected ? 1 : 0.7;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(a.x + BODY_X, a.y + BODY_Y, 11, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
            this.drawName(a);
        }
    }

    /** The name tag of an agent: its skill, in the colour of its layer. */
    drawName(a) {
        if (!a.skill) return;
        const { ctx } = this;
        if (!a.labelW) a.labelW = ctx.measureText(a.skill.name).width + 10;
        const x = Math.max(2, Math.min(a.x + 9, this.w - a.labelW - 2));
        ctx.fillStyle = COLORS[a.layer];
        ctx.fillRect(x, a.y + 7, a.labelW, 13);
        ctx.fillStyle = '#06080d';
        ctx.fillText(a.skill.name, x + 5, a.y + 13.5);
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
