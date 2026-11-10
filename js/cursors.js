// Fake mouse cursors that behave like little bots.
//
// One requestAnimationFrame loop (in CursorSwarm) drives every cursor. Each
// cursor is a damped spring chasing a target point, and it is in one of three
// modes:
//   hold   - chase a fixed point (moveTo) and stay there
//   follow - chase a point that is recomputed every frame (follow)
//   idle   - off duty: roam around and react (see Cursor.think)
// Jobs (see build.js) are written as async functions that await moveTo()/click().
//
// Visual language: every bot has a job colour and a name pill ("layout-bot"), the pointer shape
// tells the job (arrow = layout, I-beam = copy, pencil = design), and while working a bot can show
// an inspector tag with the real numbers it is touching.
//
// Off duty (idle mode) a bot either roams (no `at` given: currently not used by the build job, bots whirling
// around while the visitor scrolls hurt the UX) or waits calmly where the next work is (`idle({ at })`, see
// SiteBuilder.rest). After a while without a job it walks home: to the box in the corner (goHome), shrinks at its
// opening and disappears inside. Shy bots go home earlier. callBack() brings it out again (emerge).
// The roaming comes from a small personality per cursor:
//   shyness     > 0.5  keeps its distance from the real mouse pointer and flees when it comes close
//   curiosity   > 0.5  walks over to the real mouse pointer and circles it
//   sociability        chance to hang out near another idle cursor instead of roaming alone
// Idle cursors also keep a little distance from each other and click now and then.

// Pointer shapes. `hot` is the point inside the 22px SVG that "points", so x/y mean the click position.
const KINDS = {
    arrow: {
        hot: [2, 1.5],
        svg: `
<svg viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
  <path d="M2 1.5 L2 17 L6.2 13.2 L9 19.6 L11.8 18.4 L9 12.2 L14.8 12.2 Z"
        fill="var(--cursor-color)" stroke="var(--fg)" stroke-width="1.4" stroke-linejoin="round"/>
</svg>`,
    },
    text: {
        hot: [11, 11],
        svg: `
<svg viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-linecap="round">
  <path d="M7.5 3.5 H14.5 M11 3.5 V18.5 M7.5 18.5 H14.5" stroke="var(--fg)" stroke-width="4.2"/>
  <path d="M7.5 3.5 H14.5 M11 3.5 V18.5 M7.5 18.5 H14.5" stroke="var(--cursor-color)" stroke-width="2"/>
</svg>`,
    },
    pen: {
        hot: [3, 19.5],
        svg: `
<svg viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 19.5 L4.2 14.6 L15 3.8 Q16.2 2.6 17.6 3.8 L18.2 4.4 Q19.4 5.8 18.2 7 L7.4 17.8 Z"
        fill="var(--cursor-color)" stroke="var(--fg)" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M4.2 14.6 L7.4 17.8" stroke="var(--fg)" stroke-width="1.2" stroke-linecap="round"/>
</svg>`,
    },
};

const SPRING = 11;                          // pull towards the target
const DAMPING = 4.2;                        // slightly under-damped -> small overshoot
const DRAG_DAMPING = 2 * Math.sqrt(SPRING); // critically damped -> no overshoot while dragging
const MAX_DT = 0.05;                        // clamp so a background tab doesn't teleport cursors
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

const POINTER_ATTENTION_MS = 4000; // the real pointer counts as "there" this long after its last move
const SEPARATION = 64;             // idle cursors push each other apart below this distance (px)
const ORBIT_RADIUS = 110;          // how closely a curious cursor circles the real pointer (px)
const HOME_DELAY_MS = 6000;        // idle this long and a bot walks home (shy ones sooner, see homeDelay)
const HOME_HOVER = 18;             // the bot stops this far above the box opening, then sinks in (px)
const ENTER_MS = 420;              // shrinking into the box; keep in sync with .is-entering in site.css

const rand = (min, max) => min + Math.random() * (max - min);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const prefersReducedMotion = () => REDUCED_MOTION.matches;
export { DRAG_DAMPING };

/** A small mono label that shows real numbers ("640 × 92", "500 · 22px / 1.55"). Moves with transform only. */
class InspectorTag {
    constructor(layer, color) {
        this.el = document.createElement('div');
        this.el.className = 'inspector-tag';
        this.el.style.setProperty('--cursor-color', color);
        layer.appendChild(this.el);
        this.text = '';
        this.visible = false;
    }

    show(text, x, y) {
        if (text !== this.text) {
            this.text = text;
            this.el.textContent = text;
        }
        this.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        this.el.classList.add('is-visible');
        this.visible = true;
    }

    hide() {
        this.el.classList.remove('is-visible');
        this.visible = false;
    }
}

class Cursor {
    constructor(swarm, { x, y, color, label, burst, kind, personality }) {
        this.swarm = swarm;
        this.color = color;
        this.x = x; this.y = y;
        this.tx = x; this.ty = y;
        this.vx = 0; this.vy = 0;
        this.mode = 'hold';
        this.damping = DAMPING;
        this.follower = null;
        this.retarget = 0;
        this.arrival = null;
        this.tag = null;
        this.tagAt = null; // () => {x, y}: where the inspector tag sits (re-evaluated every frame)
        this.stayAt = null;  // () => {x, y}: off duty but not roaming: wait here
        this.idleSince = 0;
        this.state = 'work'; // 'work' | 'walking' (on its way home) | 'entering' (sinking in) | 'home' (inside the box)
        this.trip = 0;       // bumps whenever a walk home is cancelled
        this.entered = null; // promise of the sinking-in, so a call-back can wait for it

        this.personality = {
            shyness: rand(0, 1), curiosity: rand(0, 1), sociability: rand(0, 1), ...personality,
        };
        this.orbit = rand(0, Math.PI * 2);
        this.clickTimer = rand(4, 9); // seconds until the next idle click

        const el = document.createElement('div');
        el.className = 'fake-cursor is-new';
        el.style.setProperty('--cursor-color', this.color);
        el.innerHTML = '<div class="fake-cursor-body"></div>';
        if (label) {
            const tag = document.createElement('span');
            tag.className = 'fake-cursor-tag';
            tag.textContent = label;
            el.appendChild(tag);
        }
        el.addEventListener('animationend', () => el.classList.remove('is-new'), { once: true });
        swarm.layer.appendChild(el);
        this.el = el;
        this.body = el.firstElementChild;
        this.setKind(kind);

        if (burst && !REDUCED_MOTION.matches) {
            const angle = rand(0, Math.PI * 2);
            const speed = rand(350, 750);
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
        }
        this.render();
    }

    /** Swap the pointer shape: 'arrow', 'text' (I-beam) or 'pen'. */
    setKind(kind = 'arrow') {
        const shape = KINDS[kind] ?? KINDS.arrow;
        this.kind = kind;
        this.hot = shape.hot;
        this.body.innerHTML = shape.svg;
        this.el.style.setProperty('--hx', `${shape.hot[0]}px`);
        this.el.style.setProperty('--hy', `${shape.hot[1]}px`);
    }

    /** Glide to (x, y). Resolves once the cursor is within `tolerance` px and slower than `settleSpeed` px/s. */
    moveTo(x, y, { tolerance = 4, settleSpeed = 40, damping = DAMPING, timeout = 5000 } = {}) {
        this.settle();
        this.stayAt = null;
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
        this.stayAt = null;
        this.mode = 'follow';
        this.damping = damping;
        this.follower = getPoint;
        this.swarm.start();
    }

    /**
     * Like follow(), but resolves once the cursor is close and slow enough (see moveTo). Use it
     * for targets that are measured against the page: they keep up when the visitor scrolls.
     */
    chase(getPoint, { damping = DAMPING, tolerance = 4, settleSpeed = 40, timeout = 5000 } = {}) {
        this.follow(getPoint, { damping });
        if (REDUCED_MOTION.matches) return Promise.resolve();
        return new Promise((resolve) => {
            this.arrival = { resolve, tolerance, settleSpeed, deadline: performance.now() + timeout };
        });
    }

    /**
     * Go off duty. Without `at` the bot roams around and reacts to the real pointer and to other idle cursors.
     * With `at` (a function returning {x, y}) it waits there instead, calmly. Either way, once it has had nothing
     * to do for homeDelay() and the box says it can take a bot, it walks home.
     */
    idle({ at = null } = {}) {
        this.settle();
        this.mode = 'idle';
        this.damping = DAMPING;
        this.retarget = 0;
        this.stayAt = at;
        this.idleSince = performance.now();
        this.swarm.start();
    }

    /** How long this bot idles before it goes home: shy bots leave sooner, bold ones stay longer. */
    homeDelay() {
        return HOME_DELAY_MS * (1.4 - 0.8 * this.personality.shyness);
    }

    setState(state) {
        this.state = state;
        this.swarm.homeChanged();
    }

    /**
     * Walk to the box, shrink at its opening and disappear inside. `home` is the box:
     * { entry(): {x, y} the opening in viewport coordinates, bump?(): called when the bot is inside }.
     * Calling the bot back (callBack) on the way cancels the walk.
     */
    async goHome(home) {
        if (this.state !== 'work') return;
        const trip = ++this.trip;
        this.setState('walking');
        this.hideTag();
        this.release();
        await this.chase(() => { const e = home.entry(); return { x: e.x, y: e.y - HOME_HOVER }; },
            { tolerance: 14, settleSpeed: 500, timeout: 9000 });
        if (trip !== this.trip) return; // sent back to work on the way

        this.setState('entering');
        this.el.classList.add('is-entering');
        this.follow(() => home.entry()); // sink into the opening
        this.entered = sleep(ENTER_MS).then(() => {
            this.el.classList.add('is-home');
            this.mode = 'hold';
            this.setState('home');
            home.bump?.();
        });
        await this.entered;
    }

    /** Back to work: cancel a walk home, wait for a bot that is sinking in, bring one out of the box. */
    async callBack(home) {
        if (this.state === 'walking') {
            this.trip++;
            this.stayAt = null;
            this.setState('work');
            return;
        }
        if (this.state === 'entering') await this.entered;
        if (this.state === 'home') this.emerge(home.entry());
    }

    /** Pop out of the box at (x, y), flung up and to the left (the box sits in the bottom-right corner). */
    emerge({ x, y }) {
        this.trip++;
        this.settle();
        this.stayAt = null;
        this.x = this.tx = x;
        this.y = this.ty = y;
        const angle = rand(Math.PI * 1.05, Math.PI * 1.65), speed = REDUCED_MOTION.matches ? 0 : rand(350, 650);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.mode = 'hold';
        this.el.classList.add('is-emerging');
        this.el.classList.remove('is-home');
        void this.el.offsetWidth; // flush: the shrunken look is the starting point of the transition
        this.el.classList.remove('is-entering');
        setTimeout(() => this.el.classList.remove('is-emerging'), ENTER_MS);
        this.render();
        this.setState('work');
        this.swarm.start();
    }

    /** Inside the box at once (reduced motion: no walking, no animation). */
    setHome() {
        this.settle();
        this.stayAt = null;
        this.mode = 'hold';
        this.hideTag();
        this.el.classList.add('is-entering', 'is-home');
        this.setState('home');
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

    /**
     * Show an inspector tag in the bot's colour. `at` is a point {x, y} or a function returning one;
     * a function is re-evaluated every frame, so the tag stays on its element while the page scrolls.
     */
    inspect(text, at) {
        if (REDUCED_MOTION.matches) return;
        this.tag ??= new InspectorTag(this.swarm.layer, this.color);
        this.tagAt = typeof at === 'function' ? at : () => at;
        const p = this.tagAt();
        this.tag.show(text, p.x, p.y);
    }

    hideTag() {
        this.tag?.hide();
        this.tagAt = null;
    }

    /** Aim at (x, y), kept inside the viewport. */
    aim(x, y) {
        const pad = 24;
        this.tx = Math.min(Math.max(x, pad), Math.max(pad + 1, window.innerWidth - pad));
        this.ty = Math.min(Math.max(y, pad), Math.max(pad + 1, window.innerHeight - pad));
    }

    /** Roam: usually a random spot, sometimes next to another idle cursor. */
    pickWanderTarget() {
        const others = this.swarm.cursors.filter((c) => c !== this && c.mode === 'idle');
        if (others.length && Math.random() < this.personality.sociability) {
            const buddy = others[Math.floor(Math.random() * others.length)];
            const angle = rand(0, Math.PI * 2), radius = rand(80, 160);
            this.aim(buddy.x + Math.cos(angle) * radius, buddy.y + Math.sin(angle) * radius);
        } else {
            this.aim(rand(0, window.innerWidth), rand(0, window.innerHeight));
        }
        this.retarget = rand(1.2, 3.5); // seconds until the next target
    }

    /** Off-duty decisions, once per frame. */
    think(dt, now) {
        const { shyness, curiosity } = this.personality;
        const p = this.swarm.pointer;

        // Waiting calmly at a fixed spot (off duty between jobs); after a while: home.
        if (this.stayAt) {
            const at = this.stayAt();
            this.tx = at.x; this.ty = at.y;
            const home = this.swarm.home;
            if (this.state === 'work' && home?.canReceive() && now - this.idleSince > this.homeDelay()) this.goHome(home);
            return;
        }

        // Don't stack on top of each other.
        for (const o of this.swarm.cursors) {
            if (o === this || o.mode !== 'idle') continue;
            const dx = this.x - o.x, dy = this.y - o.y;
            const d = Math.hypot(dx, dy) || 1;
            if (d < SEPARATION) {
                const push = (SEPARATION - d) * 30 * dt;
                this.vx += (dx / d) * push;
                this.vy += (dy / d) * push;
            }
        }

        // Click into the void every now and then.
        this.clickTimer -= dt;
        if (this.clickTimer <= 0) {
            this.clickTimer = rand(6, 14);
            this.click();
        }

        // React to the real mouse pointer while it is moving.
        if (p.active && now - p.lastMove < POINTER_ATTENTION_MS) {
            const dx = this.x - p.x, dy = this.y - p.y;
            const d = Math.hypot(dx, dy) || 1;
            const scare = 170 + Math.min(p.speed, 1500) * 0.12; // a fast pointer is scarier
            if (shyness > 0.5 && d < scare) {
                this.flee(dx / d, dy / d, p);
                return;
            }
            if (curiosity > 0.5) {
                this.orbit += dt * 1.1;
                this.aim(p.x + Math.cos(this.orbit) * ORBIT_RADIUS, p.y + Math.sin(this.orbit) * ORBIT_RADIUS);
                return;
            }
        }

        this.retarget -= dt;
        if (this.retarget <= 0) this.pickWanderTarget();
    }

    /** Run away from the pointer; along the wall if the way straight away is blocked. */
    flee(ux, uy, p) {
        const dist = 240;
        const pad = 24;
        const w = window.innerWidth, h = window.innerHeight;
        const options = [[ux, uy], [-uy, ux], [uy, -ux]].map(([ax, ay]) => ({
            x: Math.min(Math.max(this.x + ax * dist, pad), Math.max(pad + 1, w - pad)),
            y: Math.min(Math.max(this.y + ay * dist, pad), Math.max(pad + 1, h - pad)),
        }));
        let best = options[0];
        for (const o of options) {
            if (Math.hypot(o.x - p.x, o.y - p.y) > Math.hypot(best.x - p.x, best.y - p.y)) best = o;
        }
        this.tx = best.x;
        this.ty = best.y;
    }

    /** Resolve a pending moveTo() promise (arrived, superseded or timed out). */
    settle() {
        if (!this.arrival) return;
        const { resolve } = this.arrival;
        this.arrival = null;
        resolve();
    }

    step(dt, now) {
        if (this.state === 'home') return; // inside the box
        if (this.mode === 'follow') {
            const p = this.follower();
            this.tx = p.x; this.ty = p.y;
        } else if (this.mode === 'idle') {
            this.think(dt, now);
        }

        const dx = this.tx - this.x, dy = this.ty - this.y;
        this.vx += (dx * SPRING - this.vx * this.damping) * dt;
        this.vy += (dy * SPRING - this.vy * this.damping) * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.render();
        if (this.tagAt && this.tag?.visible) {
            const p = this.tagAt();
            this.tag.show(this.tag.text, p.x, p.y);
        }

        const a = this.arrival;
        if (a) {
            const near = dx * dx + dy * dy <= a.tolerance * a.tolerance;
            const slow = this.vx * this.vx + this.vy * this.vy < a.settleSpeed * a.settleSpeed;
            if ((near && slow) || now > a.deadline) this.settle();
        }
    }

    render() {
        this.el.style.transform =
            `translate3d(${(this.x - this.hot[0]).toFixed(1)}px, ${(this.y - this.hot[1]).toFixed(1)}px, 0)`;
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
        this.home = null;            // the box bots walk home to (see Dock in dock.js)
        this.stateHooks = new Set(); // called whenever a bot's home state changes
        // The real mouse pointer (touch is ignored: there is no hover on touch screens).
        this.pointer = { x: 0, y: 0, speed: 0, lastMove: 0, active: false };
        this.last = 0;
        this.running = false;
        this.tick = this.tick.bind(this);

        window.addEventListener('pointermove', (e) => {
            if (e.pointerType === 'touch') return;
            const p = this.pointer;
            const now = performance.now();
            const dt = Math.max(1, now - p.lastMove) / 1000;
            p.speed += (Math.hypot(e.clientX - p.x, e.clientY - p.y) / dt - p.speed) * 0.3;
            p.x = e.clientX;
            p.y = e.clientY;
            p.lastMove = now;
            p.active = true;
        }, { passive: true });
        document.documentElement.addEventListener('pointerleave', () => { this.pointer.active = false; });
    }

    get count() { return this.cursors.length; }

    /** Bots by whereabouts: inside the box, on their way home (walking or sinking in), or at work/waiting. */
    counts() {
        const c = { home: 0, away: 0, work: 0 };
        for (const cursor of this.cursors) {
            if (cursor.state === 'home') c.home++;
            else if (cursor.state === 'work') c.work++;
            else c.away++;
        }
        return c;
    }

    homeChanged() { for (const fn of this.stateHooks) fn(); }

    /** Add a cursor at (x, y). `burst` flings it outwards. Returns null when full. */
    add({ x, y, color = '#6c8cff', label = '', kind = 'arrow', burst = false, personality }) {
        if (this.cursors.length >= this.max) return null;
        const cursor = new Cursor(this, { x, y, color, label, kind, burst, personality });
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
        this.pointer.speed *= Math.pow(0.05, dt); // the pointer "calms down" when it stops moving

        for (const c of this.cursors) c.step(dt, now);
        for (const hook of this.hooks) hook(dt, now);

        if (this.running) requestAnimationFrame(this.tick);
    }
}
