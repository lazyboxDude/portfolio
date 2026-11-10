// The layout-bot's real layout work (used by js/build.js).
//
// Nothing here is a trick with `scale`:
//   Shell   the box the bot drags out has a real width and height. It is a child of the element that
//           wears the element's own classes (same background, border, radius), positioned outside the
//           flow. The element itself keeps its finished size the whole time, so nothing around it moves.
//           Afterwards the bot sets padding and gap for real: the element is pinned to its final size
//           (`contain: layout size`) and its children flow while the numbers count up.
//   Grid    columns of a [data-grid] container, read from the real grid, drawn before the cards.
//   Guides  snap lines for edges that really line up in the finished layout.
// Only the element being built ever changes width, height, padding or gap, and only inside a pinned,
// contained box. Everything is restored to the stylesheet's values afterwards.

import { clamp, part } from './geometry.js';

export const MIN_SIZE = 4;           // the dragged box never gets smaller than this (px)
const SIDES = ['Top', 'Right', 'Bottom', 'Left'];
const ALIGN_TOLERANCE = 1.25;        // edges closer than this count as aligned (px)
const SNAP_RANGE = 16;               // a snap line shows while the dragged edge is this close (px)
const START_LINE_MS = 420;           // lines at the start corner (left/top) show this long

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const sum = (list) => list.reduce((a, b) => a + b, 0);

/** An inspector prints a padding as "24", "24 32" or "8 16 8 24". */
function boxLabel([t, r, b, l]) {
    [t, r, b, l] = [t, r, b, l].map(Math.round);
    if (t === r && r === b && b === l) return `${t}`;
    if (t === b && r === l) return `${t} ${r}`;
    return `${t} ${r} ${b} ${l}`;
}

// ---- Shell: real size, then real padding and gap -------------------------------------------

export class Shell {
    constructor(el) {
        this.el = el;
        this.m = null;           // measured finished geometry, see measure()
        this.node = null;        // the box that is being dragged out
        this.band = null;        // tinted padding area while padding is set
        this.saved = new Map();  // inline styles we touched, put back by restore()
    }

    set(prop, value) {
        if (!this.saved.has(prop)) this.saved.set(prop, this.el.style.getPropertyValue(prop));
        this.el.style.setProperty(prop, value);
    }

    unset(prop) {
        if (!this.saved.has(prop)) return;
        const old = this.saved.get(prop);
        if (old) this.el.style.setProperty(prop, old);
        else this.el.style.removeProperty(prop);
        this.saved.delete(prop);
    }

    restore() {
        for (const prop of [...this.saved.keys()]) this.unset(prop);
    }

    /** The finished geometry. Call while the element is in its final state (before anything is changed). */
    measure() {
        const { el } = this;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const kids = [...el.children].filter((c) => !c.hasAttribute('data-fx')).length;
        const pad = SIDES.map((s) => num(cs[`padding${s}`]));
        const gap = [num(cs.rowGap), num(cs.columnGap)]; // "normal" counts as 0
        this.m = {
            w: r.width, h: r.height,
            border: [num(cs.borderTopWidth), num(cs.borderLeftWidth)],
            pad, gap, kids,
            isStatic: cs.position === 'static',
            // Containers with several children get the auto-layout step. data-frame="none" opts out
            // (the swarm stage: its canvas would be resized on every frame).
            frames: el.dataset.frame !== 'none' && kids >= 2 && sum(pad) + sum(gap) > 0,
        };
        return this.m;
    }

    /** Start the drag: the element is "there" (but looks empty), the shell is a few pixels big. */
    begin() {
        const { el, m } = this;
        if (m.isStatic) this.set('position', 'relative');

        const node = document.createElement('div');
        // Same classes, same look. Inline styles make it a free-floating box of exactly the size we say.
        node.className = `${[...el.classList].filter((c) => !c.startsWith('is-')).join(' ')} shell`;
        node.setAttribute('aria-hidden', 'true');
        node.dataset.fx = '';
        node.style.cssText = [
            'position:absolute', `left:${-m.border[1]}px`, `top:${-m.border[0]}px`,
            `width:${MIN_SIZE}px`, `height:${MIN_SIZE}px`,
            'margin:0', 'padding:0', 'min-width:0', 'min-height:0', 'max-width:none', 'max-height:none',
            'display:block', 'transition:none', 'animation:none', 'pointer-events:none',
        ].join(';');

        // Selection frame with handles, as an editor shows it.
        const frame = part('sel-frame');
        for (const corner of ['tl', 'tr', 'bl', 'br']) frame.append(part(`handle handle-${corner}`));
        node.append(frame);

        el.append(node);
        this.node = node;
        el.classList.add('is-shown', 'is-building');
    }

    resize(w, h) {
        if (!this.node) return;
        this.node.style.width = `${w.toFixed(1)}px`;
        this.node.style.height = `${h.toFixed(1)}px`;
    }

    select(on) { this.node?.classList.toggle('is-selected', on); }

    /** The drag is over: the shell makes way for the element itself (same size, same look, no fade). */
    swap() {
        const { el } = this;
        this.set('transition', 'none');
        el.classList.remove('is-building');
        this.node?.remove();
        this.node = null;
        void el.offsetWidth; // style flush while transitions are off
        this.unset('transition');
    }

    // ---- Padding and gap ---------------------------------------------------------------

    /** Pin the element to its final size, contain it, and start from padding 0 and gap 0. */
    frameBegin() {
        const { el, m } = this;
        this.set('width', `${m.w}px`);
        this.set('height', `${m.h}px`);
        this.set('flex', 'none');
        this.set('min-width', '0');
        this.set('min-height', '0');
        this.set('contain', 'layout size');
        this.set('padding', '0');
        this.set('gap', '0');
        this.band = part('pad-band');
        el.append(this.band);
        el.classList.add('is-framing');
    }

    /** fp / fg: how far padding / gap have come (0..1). */
    frameStep(fp, fg) {
        const { el, m, band } = this;
        const pad = m.pad.map((v) => `${(v * fp).toFixed(2)}px`).join(' ');
        el.style.padding = pad;
        el.style.gap = `${(m.gap[0] * fg).toFixed(2)}px ${(m.gap[1] * fg).toFixed(2)}px`;
        band.style.borderWidth = pad;
    }

    /** What the inspector tag says: "pad 24 32 · gap 16". */
    label(fp, fg) {
        const { pad, gap } = this.m;
        const parts = [];
        if (sum(pad) > 0) parts.push(`pad ${boxLabel(pad.map((v) => v * fp))}`);
        if (sum(gap) > 0) {
            const [row, col] = gap.map((v) => Math.round(v * fg));
            parts.push(`gap ${row === col ? row : `${row} ${col}`}`);
        }
        return parts.join(' · ');
    }

    /** Release the element: the stylesheet's own padding and gap are the same numbers, so nothing changes. */
    frameEnd() {
        const { el } = this;
        this.band?.remove();
        this.band = null;
        el.classList.remove('is-framing');
        this.restore();
        el.classList.add('is-filled'); // the children fade in (CSS)
        setTimeout(() => el.classList.remove('is-filled'), 500);
    }

    /** Back to the plain element, whatever state it was in. */
    cleanup() {
        this.node?.remove();
        this.node = null;
        this.band?.remove();
        this.band = null;
        this.el.classList.remove('is-building', 'is-framing', 'is-filled');
        this.restore();
    }
}

// ---- Grid: columns first, then the cards ---------------------------------------------------

/** A [data-grid] container. The bot draws its real columns before the cards (its children) are dragged out. */
export class Grid {
    constructor(el, shapes) {
        this.el = el;
        this.shapes = shapes;
        this.pending = shapes.length; // cards still to be built
        this.opened = false;
        this.bands = [];
        this.cols = [];
        this.savedPosition = null;
    }

    /** Create the column bands from the real grid and return what the tag says. */
    open() {
        const { el } = this;
        const cs = getComputedStyle(el);
        const widths = cs.gridTemplateColumns.split(/\s+/).map(parseFloat).filter(Number.isFinite);
        const gap = num(cs.columnGap);
        if (cs.position === 'static') {
            this.savedPosition = el.style.getPropertyValue('position');
            el.style.position = 'relative';
        }
        let x = num(cs.paddingLeft);
        this.cols = widths.map((w) => {
            const col = { x, w };
            x += w + gap;
            return col;
        });
        this.bands = this.cols.map((c) => {
            const band = part('grid-col');
            band.style.left = `${c.x}px`;
            band.style.width = `${c.w}px`;
            el.append(band);
            return band;
        });
        this.opened = true;
        return { count: widths.length, gap: Math.round(gap) };
    }

    /** Bands grow downwards as the bot passes them: p is how far along the top edge it is (0..1). */
    progress(p) {
        const total = this.el.clientWidth || 1;
        this.cols.forEach((c, i) => {
            const k = clamp((p * total - c.x) / Math.max(c.w * 0.6, 1), 0, 1);
            this.bands[i].style.scale = `1 ${k.toFixed(3)}`;
        });
    }

    /** Page rects of the columns: the cards snap to these. */
    targets() {
        const r = this.el.getBoundingClientRect();
        const x = window.scrollX, y = window.scrollY;
        return this.cols.map((c) => ({
            left: r.left + c.x + x, right: r.left + c.x + c.w + x, top: r.top + y, bottom: r.bottom + y,
        }));
    }

    /** All cards stand: the columns fade out. */
    close() {
        const bands = this.bands;
        for (const b of bands) b.classList.add('is-closing');
        setTimeout(() => { for (const b of bands) b.remove(); }, 450);
        this.bands = [];
        this.reposition();
    }

    reposition() {
        if (this.savedPosition === null) return;
        if (this.savedPosition) this.el.style.position = this.savedPosition;
        else this.el.style.removeProperty('position');
        this.savedPosition = null;
    }

    /** Back to "not built yet". */
    cleanup() {
        for (const b of this.bands) b.remove();
        this.bands = [];
        this.cols = [];
        this.opened = false;
        this.pending = this.shapes.length;
        this.reposition();
    }
}

// ---- Guides: snap lines --------------------------------------------------------------------

/**
 * Which edges of the finished shape line up with something that already stands? `mine` and all
 * `targets` are page rects. Only real alignments get a line, so what you see is what the layout is.
 */
export function guidePlan(mine, targets, centersX = []) {
    const xs = (r) => [r.left, (r.left + r.right) / 2, r.right];
    const ys = (r) => [r.top, (r.top + r.bottom) / 2, r.bottom];
    const kindsX = ['left', 'cx', 'right'];
    const kindsY = ['top', 'cy', 'bottom'];
    const plan = [];
    const seen = new Set();

    const add = (axis, kind, pos, lo, hi) => {
        const key = axis + kind;
        if (seen.has(key)) return; // one line per edge keeps the picture calm
        seen.add(key);
        plan.push({ axis, kind, pos, from: lo - 12, to: hi + 12, start: kind === 'left' || kind === 'top' });
    };

    for (const t of targets) {
        xs(mine).forEach((p, i) => {
            for (const q of xs(t)) {
                if (Math.abs(p - q) <= ALIGN_TOLERANCE) add('x', kindsX[i], q, Math.min(mine.top, t.top), Math.max(mine.bottom, t.bottom));
            }
        });
        ys(mine).forEach((p, i) => {
            for (const q of ys(t)) {
                if (Math.abs(p - q) <= ALIGN_TOLERANCE) add('y', kindsY[i], q, Math.min(mine.left, t.left), Math.max(mine.right, t.right));
            }
        });
    }
    for (const c of centersX) {
        if (Math.abs((mine.left + mine.right) / 2 - c) <= ALIGN_TOLERANCE) add('x', 'cx', c, mine.top, mine.bottom);
    }
    return plan;
}

/** The thin lines themselves: a small pool in the cursor layer, moved with transform only. */
export class Guides {
    constructor(layer) {
        this.layer = layer;
        this.lines = [];
        this.plan = [];
        this.token = 0;
    }

    arm(plan) {
        this.clear();
        this.plan = plan;
    }

    line(i) {
        if (!this.lines[i]) {
            const el = document.createElement('div');
            el.className = 'snap-line';
            this.layer.append(el);
            this.lines[i] = el;
        }
        return this.lines[i];
    }

    /** `cur`: the dragged box's current edges in page coordinates; `elapsed`: ms since the drag began. */
    update(cur, elapsed) {
        const sx = window.scrollX, sy = window.scrollY;
        this.plan.forEach((g, i) => {
            const on = g.start ? elapsed < START_LINE_MS : Math.abs(cur[g.kind] - g.pos) <= SNAP_RANGE;
            const el = this.line(i);
            el.classList.toggle('is-visible', on);
            if (!on) return;
            const len = g.to - g.from;
            el.style.transform = g.axis === 'x'
                ? `translate3d(${(g.pos - sx).toFixed(1)}px, ${(g.from - sy).toFixed(1)}px, 0) scale(1, ${len.toFixed(1)})`
                : `translate3d(${(g.from - sx).toFixed(1)}px, ${(g.pos - sy).toFixed(1)}px, 0) scale(${len.toFixed(1)}, 1)`;
        });
    }

    /** Fade the lines out after `ms` (unless a new drag has armed them again by then). */
    hold(ms) {
        const token = ++this.token;
        setTimeout(() => { if (token === this.token) this.clear(); }, ms);
    }

    clear() {
        this.token++;
        for (const el of this.lines) el.classList.remove('is-visible');
        this.plan = [];
    }
}
