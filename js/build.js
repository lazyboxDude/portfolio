// The build "job": three bot cursors construct the page live, one section at a time.
//
// The page is a BLUEPRINT (index.html: everything inside <noscript>). With JS, #site starts out as
// empty section shells, and nothing of the page exists in the DOM until a bot creates it:
//   layout-bot (arrow)  creates every data-box element (nav pill, buttons, cards, chips ...) and drags it out.
//                       A selection frame with handles and a live size tag ("980 × 56") show the drag.
//                       Static content inside the box (images, canvas, buttons) is placed when the drag is done.
//   copy-bot (I-beam)   creates every data-type element and writes its text into real text nodes,
//                       character by character (inline markup like links and the serif accent is created on the way),
//                       with a tag that shows the real typography ("600 · 96px / 1.00 · -0.035em") for data-tag texts.
//   design-bot (pencil) creates the background glow (hero), the underline below data-underline words
//                       and the outline pieces of data-outline shapes.
// The three bots work in parallel lanes and wait for each other only where they must: a text waits
// for the box around it, an underline waits for its text, an outline waits for its box.
//
// Stable layout ("calm build"): every element is created with the size it will end up with
// (min-width/min-height measured from the blueprint), and when an element is created, the elements
// before it exist as invisible stubs. So nothing ever jumps, and the page height is final from the
// start. The reserved sizes are released when a section is done.
//
// Everything bots aim at is measured live and relative to the page (see anchor), so it still works when
// the visitor scrolls during a build. Screen readers get a complete copy of each section (visually
// hidden) until the live section is done; the half-built live section is aria-hidden meanwhile.
// With prefers-reduced-motion everything is created at once, bots parked. If a bot fails, the section
// is replaced by the finished one. Without JS the blueprint is the page.

import { DRAG_DAMPING, prefersReducedMotion } from './cursors.js';

const MIN_SCALE = 0.02; // never scale to exactly 0 (keeps the shape measurable)
const DRAG_MS = 650;
const DRAG_FAST_MS = 380;
const DRAW_MS = 900;
const TAG_GAP = 28;      // inspector tags sit this far above an element (or 8px below it)
const REPLAY_LABEL = 'Build again';
const BOX_EXIT_MS = 400; // keep in sync with .box.is-gone in site.css
const FONT_WAIT_MS = 1500;
const GLOW_FADE_MS = 1500; // keep in sync with .glow transition in site.css
const DEFAULT_TYPE_MS = 4500; // how long typing a whole section may take (data-type-ms overrides)
const SCROLL_TYPE_SPEED = 0.5; // sections the visitor scrolls to are typed faster than the hero
const AVG_CHAR_MS = 42;       // average delay per character at speed 1

// How exactly a bot has to arrive before its job goes on. Close and fast enough is enough: the
// next movement (follow) catches up anyway, and waiting for a full stop made every step crawl.
const ARRIVE = { tolerance: 30, settleSpeed: 600, timeout: 1500 };
const ARRIVE_FAST = { tolerance: 60, settleSpeed: 900, timeout: 900 };
// Typing starts while the copy-bot is still a few steps away: it follows the caret and catches up.
const TYPE_ARRIVE = { tolerance: 90, settleSpeed: 4000, timeout: 900 };

// One job per bot: name pill, colour, pointer shape (see cursors.js) and off-duty personality:
// one shy, one curious, one sociable. Colours stay readable under the dark pill text.
const JOBS = {
    layout: { label: 'layout-bot', color: '#7b95ff', kind: 'arrow', personality: { shyness: 1, curiosity: 0.1, sociability: 0.3 } },
    copy: { label: 'copy-bot', color: '#ff8fb8', kind: 'text', personality: { shyness: 0.1, curiosity: 1, sociability: 0.6 } },
    design: { label: 'design-bot', color: '#ffc766', kind: 'pen', personality: { shyness: 0.3, curiosity: 0.3, sociability: 0.9 } },
};

// Attributes that only mean something to the bots: the built page does not carry them.
const BOT_ATTRS = ['data-section', 'data-box', 'data-type', 'data-tag', 'data-speed', 'data-type-ms', 'data-instant', 'data-underline', 'data-outline'];
// An element with one of these is made by a bot. (data-outline alone only decorates.)
const BUILT = '[data-box],[data-type],[data-underline]';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** A promise that is resolved from outside (the bots wait for each other with these). */
const defer = () => {
    let resolve;
    const promise = new Promise((r) => { resolve = r; });
    return { promise, resolve };
};

// ---- Pause (a test hook: with the bots on hold, the page stays exactly as far as it got) ----------
let gate = null;
export function setPaused(on) {
    if (on && !gate) gate = defer();
    else if (!on && gate) { gate.resolve(); gate = null; }
}
export const isPaused = () => gate !== null;
async function checkpoint() { while (gate) await gate.promise; }

const sleep = async (ms) => {
    await checkpoint();
    await new Promise((resolve) => setTimeout(resolve, ms));
};

/** Pause after a typed character: slightly irregular, longer after punctuation. `speed` < 1 is faster. */
function typingDelay(ch, speed) {
    if (ch === '.') return 300 * speed;
    if (ch === ',') return 180 * speed;
    return (28 + Math.random() * 28) * speed;
}

/** A small decorative element made by a bot (always aria-hidden). */
const part = (className) => {
    const el = document.createElement('span');
    el.className = className;
    el.setAttribute('aria-hidden', 'true');
    return el;
};

/** Wait for the web fonts (the layout must be final before the bots measure it), but never for long. */
const fontsReady = () => Promise.race([document.fonts?.ready ?? Promise.resolve(), sleepRaw(FONT_WAIT_MS)]);
const sleepRaw = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The rect of an element in viewport coordinates that keeps up when the page scrolls.
 * Measure once (before the element is scaled), call the returned function as often as needed.
 */
function anchor(el) {
    const r = el.getBoundingClientRect();
    const x0 = window.scrollX, y0 = window.scrollY;
    return () => {
        const dx = x0 - window.scrollX, dy = y0 - window.scrollY;
        return {
            left: r.left + dx, top: r.top + dy, right: r.right + dx, bottom: r.bottom + dy,
            width: r.width, height: r.height,
        };
    };
}

// ---- Blueprint helpers --------------------------------------------------------

const stripBot = (node) => { for (const a of BOT_ATTRS) node.removeAttribute(a); };

/** The element itself, without children and without the bots' attributes. */
function shallow(el) {
    const copy = el.cloneNode(false);
    stripBot(copy);
    return copy;
}

/** The element with everything inside it, without the bots' attributes. */
function deepClone(el) {
    const copy = el.cloneNode(true);
    stripBot(copy);
    for (const e of copy.querySelectorAll('*')) stripBot(e);
    return copy;
}

/** No bot builds anything in this subtree: it simply comes along with its parent. */
const isStatic = (el) => !el.matches(BUILT) && !el.querySelector(BUILT);

const dropEmptyAttr = (node, name) => { if (!node.getAttribute(name)) node.removeAttribute(name); };

// ---- Text the copy-bot writes -----------------------------------------------

/**
 * A data-type element of the blueprint and the progress of writing it. The copy-bot creates the live
 * element (an empty one, reserved to its final size), then appends the characters to real text nodes.
 * Inline markup inside the text (links, the serif accent) is created the moment its first character is typed.
 */
class Typable {
    constructor(section, el) {
        this.section = section;
        this.el = el; // the blueprint element
        this.segs = [];  // one per text node: { chars, chain (inline ancestors below el), node (live text node) }
        this.chars = [];

        const nodes = [];
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
        nodes.forEach((node, i) => {
            let data = node.data.replace(/\s+/g, ' ');
            if (i === 0) data = data.trimStart();
            if (i === nodes.length - 1) data = data.trimEnd();
            const chars = [...data];
            if (!chars.length) return;
            const chain = [];
            for (let p = node.parentElement; p && p !== el; p = p.parentElement) chain.unshift(p);
            this.segs.push({ chars, chain, node: null });
            this.chars.push(...chars);
        });
        this.text = this.chars.join('');
        this.reset();
    }

    reset() {
        this.count = 0;
        this.si = 0;  // current segment
        this.sp = 0;  // position inside it
        this.nodes = []; // live text nodes, in order
        this.style = null;
        for (const seg of this.segs) seg.node = null;
    }

    /** The empty live element: laid out at its final place and size, but not visible yet. */
    prepare() { return this.section.prepare(this.el); }

    /** The copy-bot starts here: the element becomes visible. */
    node() { return this.section.live(this.el); }

    /** Write characters until n are there. */
    write(n) {
        if (this.section.cancelled) return; // the section was replaced by the finished one
        const end = Math.min(n, this.chars.length);
        while (this.count < end) {
            const seg = this.segs[this.si];
            seg.node ??= this.open(seg);
            seg.node.data += seg.chars[this.sp];
            this.count++;
            if (++this.sp >= seg.chars.length) { this.si++; this.sp = 0; }
        }
    }

    /** A new live text node, inside the inline elements it belongs to (created on demand). */
    open(seg) {
        const { section } = this;
        let at = this.node();
        for (const el of seg.chain) {
            let live = section.map.get(el);
            if (!live) {
                live = shallow(el);
                at.append(live);
                section.map.set(el, live);
            }
            at = live;
        }
        const text = document.createTextNode('');
        at.append(text);
        this.nodes.push(text);
        return text;
    }

    /** Where the I-beam stands: right behind the last typed character, centred on the line. */
    caretPoint = () => {
        for (let k = this.nodes.length - 1; k >= 0; k--) {
            const text = this.nodes[k];
            const range = document.createRange();
            for (let i = text.data.length; i > Math.max(0, text.data.length - 4); i--) {
                range.setStart(text, i - 1);
                range.setEnd(text, i);
                const b = range.getBoundingClientRect();
                if (b.width > 0 || b.height > 0) return { x: b.right + 8, y: b.top + b.height / 2 };
            }
        }
        const node = this.section.map.get(this.el);
        const r = node.getBoundingClientRect();
        const cs = this.style ??= getComputedStyle(node);
        const line = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
        return { x: r.left + (parseFloat(cs.paddingLeft) || 0) - 2, y: r.top + (parseFloat(cs.paddingTop) || 0) + line / 2 };
    };

    /** Typography the way an inspector would show it: weight · size / line-height · letter-spacing. */
    spec() {
        const cs = getComputedStyle(this.section.map.get(this.el));
        const size = parseFloat(cs.fontSize);
        const line = parseFloat(cs.lineHeight);
        const spacing = parseFloat(cs.letterSpacing);
        let out = `${cs.fontWeight} · ${Math.round(size)}px / ${Number.isFinite(line) ? (line / size).toFixed(2) : 'normal'}`;
        if (Number.isFinite(spacing) && spacing !== 0) out += ` · ${(spacing / size).toFixed(3)}em`;
        return out;
    }
}

// ---- Shapes the layout-bot drags out ----------------------------------------

/** A data-box element: created by the layout-bot, drawn into existence by scaling from the top-left corner. */
class Shape {
    constructor(section, el) {
        this.section = section;
        this.el = el;
        this.fast = el.dataset.box === 'fast'; // repeated small things: quicker, no size tag
        this.frame = null;
        this.node = null;
    }

    /** The live element, laid out at its final place and size but invisible: the bot walks to its corner. */
    prepare() {
        return (this.node = this.section.prepare(this.el));
    }

    /** The bot presses the mouse: the element comes into being (still scaled down by the caller). */
    begin() {
        const node = (this.node = this.section.live(this.el));
        node.style.transformOrigin = '0 0';
        if (!this.fast) {
            // Selection frame with handles, shown while the drag lasts.
            this.frame = part('sel-frame');
            for (const corner of ['tl', 'tr', 'bl', 'br']) this.frame.append(part(`handle handle-${corner}`));
            node.append(this.frame);
        }
        return node;
    }

    select(on) { this.node.classList.toggle('is-selected', on); }

    /** The drag is done: full size, the content that comes along is placed, the frame goes. */
    end() {
        const { node, frame } = this;
        node.style.scale = '';
        node.style.transformOrigin = '';
        dropEmptyAttr(node, 'style');
        this.section.fill(this.el);
        if (frame) setTimeout(() => { frame.remove(); node.classList.remove('is-selected'); dropEmptyAttr(node, 'class'); }, 220);
        this.frame = null;
    }
}

/** The outline the design-bot draws around an element: 8 pieces (4 corners, 4 edges) in drawing order. */
class Outline {
    constructor(node) {
        this.node = node;
        this.pieces = null;
    }

    /** Creates the pieces (once) and returns the points they connect. */
    path() {
        const el = this.node;
        const W = el.offsetWidth, H = el.offsetHeight;
        const R = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, W / 2, H / 2);
        el.style.setProperty('--piece-r', `${R}px`);
        if (!this.pieces) {
            this.pieces = [
                part('corner corner-tl'), part('edge edge-top'),
                part('corner corner-tr'), part('edge edge-right'),
                part('corner corner-br'), part('edge edge-bottom'),
                part('corner corner-bl'), part('edge edge-left'),
            ];
            el.append(...this.pieces);
        }
        const arc = (Math.PI * R) / 2;
        const lens = [arc, W - 2 * R, arc, H - 2 * R, arc, W - 2 * R, arc, H - 2 * R];
        const pts = [[0, R], [R, 0], [W - R, 0], [W, R], [W, H - R], [W - R, H], [R, H], [0, H - R], [0, R]];
        return { lens, pts, total: lens.reduce((a, b) => a + b, 0) };
    }

    /** Reveal the outline up to progress p (0..1). */
    setDrawn(p, path) {
        let dist = p * path.total;
        path.lens.forEach((len, i) => {
            const t = clamp(len > 0 ? dist / len : 1, 0, 1);
            dist -= len;
            const piece = this.pieces[i];
            if (i % 2 === 0) piece.style.opacity = t.toFixed(3);
            else piece.style.scale = i % 4 === 1 ? `${t.toFixed(3)} 1` : `1 ${t.toFixed(3)}`;
        });
    }

    /** Viewport position of the pencil tip at progress p. `r` is the element's rect. */
    drawPoint(p, r, path) {
        let dist = p * path.total;
        let i = 0;
        while (i < path.lens.length - 1 && dist > path.lens[i]) dist -= path.lens[i++];
        const t = clamp(path.lens[i] > 0 ? dist / path.lens[i] : 1, 0, 1);
        const [x0, y0] = path.pts[i];
        const [x1, y1] = path.pts[i + 1];
        return { x: r.left + x0 + (x1 - x0) * t, y: r.top + y0 + (y1 - y0) * t };
    }
}

// ---- One section of the page --------------------------------------------------

/**
 * A top-level data-section of the blueprint and its live counterpart, the shell. The shell is the
 * only element that exists from the start (empty, with its final height reserved); everything inside
 * it is created by the bots (see make/create), or all at once (instantBuild).
 */
class Section {
    constructor(src) {
        this.src = src;           // the blueprint element
        this.isHero = src.dataset.section === 'hero';
        this.instant = src.hasAttribute('data-instant');
        this.state = 'idle';      // idle -> building -> built
        this.cancelled = false;

        this.shell = shallow(src);
        this.map = new Map([[src, this.shell]]); // blueprint node -> live node (only what exists)
        this.locks = [];          // live elements with reserved sizes
        this.sizes = null;        // blueprint element -> measured size (set by SiteBuilder.measure)
        this.height = 0;

        // The complete text for screen readers, until the live section stands (ids dropped: no duplicates).
        this.sr = document.createElement('div');
        this.sr.className = 'sr-only';
        this.sr.dataset.sr = '';
        const copy = deepClone(src);
        for (const e of [copy, ...copy.querySelectorAll('[id]')]) e.removeAttribute('id');
        for (const e of copy.querySelectorAll('a, button')) e.tabIndex = -1;
        this.sr.append(copy);

        this.shapes = [...src.querySelectorAll('[data-box]')].map((e) => new Shape(this, e));
        this.shapeOf = new Map(this.shapes.map((s) => [s.el, s]));
        this.texts = [...src.querySelectorAll('[data-type]')].map((e) => new Typable(this, e));
        this.textOf = new Map(this.texts.map((t) => [t.el, t]));

        // What the design-bot draws: an underline below data-underline words, an outline around data-outline elements.
        this.decos = [];
        for (const e of src.querySelectorAll('[data-underline]')) {
            this.decos.push({ kind: 'underline', el: e, text: this.textOf.get(e.closest('[data-type]')) });
        }
        for (const e of src.querySelectorAll('[data-outline]')) {
            const shape = this.shapeOf.get(e);
            const text = shape ? null : this.textOf.get(e.querySelector('[data-type]'));
            const around = shape || text ? null : this.shapeOf.get(e.parentElement.closest('[data-box]'));
            this.decos.push({ kind: 'outline', el: e, shape, text, around });
        }
    }

    // ---- Making elements ----------------------------------------------------

    /** The live element for a blueprint element, created invisible ("stub"), at its final place. */
    prepare(el) { return this.make(el, true); }

    /** The live element, created or made visible. */
    live(el) { return this.make(el, false); }

    /**
     * Make an element exist, with everything it needs: its ancestors, and its siblings as invisible
     * stubs (empty, at their final size), so that grid and flex layouts put it exactly where it
     * belongs from the first moment, whatever order the bots work in.
     */
    make(el, stub) {
        const have = this.map.get(el);
        if (have) {
            if (!stub) this.activate(el);
            return have;
        }
        this.make(el.parentElement, stub);
        for (const s of el.parentElement.children) if (s !== el && !this.map.has(s) && !isStatic(s)) this.create(s, true);
        return this.create(el, stub);
    }

    /** A stub (and its ancestors) becomes visible. */
    activate(el) {
        for (let e = el; e; e = e.parentElement) {
            const node = this.map.get(e);
            if (node?.classList.contains('is-stub')) {
                node.classList.remove('is-stub');
                dropEmptyAttr(node, 'class');
            }
        }
    }

    create(el, stub) {
        const parent = this.map.get(el.parentElement);
        if (isStatic(el)) return this.placeStatic(el, parent);
        const node = shallow(el);
        if (stub) node.classList.add('is-stub');
        this.insert(node, parent, el);
        this.map.set(el, node);
        this.reserve(el, node);
        // Boxes get their static content when the drag is done, text elements are written by the copy-bot.
        if (!el.matches('[data-box],[data-type]')) this.fillStatic(el, node);
        return node;
    }

    /** Put a live node at the place of its blueprint node: before the next later sibling that exists. */
    insert(node, parent, src) {
        for (let s = src.nextSibling; s; s = s.nextSibling) {
            const later = this.map.get(s);
            if (later && later.parentNode === parent) {
                parent.insertBefore(node, later);
                return;
            }
        }
        parent.append(node);
    }

    /** A subtree no bot builds: copied as a whole, every element registered. */
    placeStatic(el, parent) {
        const copy = deepClone(el);
        this.insert(copy, parent, el);
        this.map.set(el, copy);
        const from = el.querySelectorAll('*'), to = copy.querySelectorAll('*');
        from.forEach((e, i) => this.map.set(e, to[i]));
        return copy;
    }

    /** What comes along with an element: static children and the white space between them. */
    fillStatic(el, node, fade = false) {
        for (const child of el.childNodes) {
            if (this.map.has(child)) continue;
            if (child.nodeType === 3) {
                const text = child.cloneNode();
                this.insert(text, node, child);
                this.map.set(child, text);
            } else if (child.nodeType === 1 && isStatic(child)) {
                const copy = this.placeStatic(child, node);
                if (fade && !prefersReducedMotion()) {
                    copy.classList.add('bp-in');
                    copy.addEventListener('animationend', () => { copy.classList.remove('bp-in'); dropEmptyAttr(copy, 'class'); }, { once: true });
                }
            }
        }
    }

    /** The content of a box, placed when the layout-bot is done dragging it. */
    fill(el) { this.fillStatic(el, this.map.get(el), true); }

    /** Reserve the final size, so that nothing around it ever moves while it is being built. */
    reserve(el, node) {
        const m = this.sizes?.get(el);
        if (!m || m.display === 'inline' || m.display === 'contents' || m.display === 'none' || !(m.h > 0)) return;
        node.style.minHeight = `${m.h.toFixed(2)}px`;
        if (m.flexItem || m.display.startsWith('inline-')) node.style.minWidth = `${m.w.toFixed(2)}px`;
        this.locks.push(node);
    }

    // ---- Lifecycle ----------------------------------------------------------

    /** Typing speed (1 = full, smaller = faster) so that the whole section takes about data-type-ms. */
    typingSpeed() {
        const budget = Number(this.src.dataset.typeMs) || DEFAULT_TYPE_MS;
        const chars = this.texts.reduce((sum, t) => sum + t.chars.length, 0);
        return clamp(budget / (Math.max(chars, 1) * AVG_CHAR_MS), 0.08, this.isHero ? 1 : SCROLL_TYPE_SPEED);
    }

    /** Reserve the final height of the whole section (it is empty until built). */
    reserveHeight() {
        if (this.state === 'idle' && this.height) this.shell.style.minHeight = `${this.height.toFixed(2)}px`;
    }

    /** Empty again: just the shell, with the text for screen readers back. */
    reset() {
        this.shell.replaceChildren();
        this.map.clear();
        this.map.set(this.src, this.shell);
        this.locks = [];
        for (const t of this.texts) t.reset();
        this.state = 'idle';
        this.cancelled = false;
        this.shell.setAttribute('aria-hidden', 'true');
        if (this.shell.isConnected) this.shell.before(this.sr);
        this.reserveHeight();
    }

    /** The finished section, instantly (reduced motion, scrolled past, or a bot failed). */
    instantBuild() {
        this.shell.replaceChildren();
        this.map.clear();
        this.map.set(this.src, this.shell);
        this.locks = [];
        for (const child of this.src.childNodes) {
            const copy = child.nodeType === 1 ? deepClone(child) : child.cloneNode();
            this.shell.append(copy);
            this.map.set(child, copy);
        }
        const from = this.src.querySelectorAll('*'), to = this.shell.querySelectorAll('*');
        from.forEach((e, i) => this.map.set(e, to[i]));

        for (const d of this.decos) {
            const node = this.map.get(d.el);
            if (d.kind === 'underline') {
                const line = part('underline');
                line.style.scale = '1 1';
                node.append(line);
            } else {
                const outline = new Outline(node);
                outline.setDrawn(1, outline.path());
            }
        }
    }

    /** Done: the reserved sizes go, the live section replaces the text for screen readers. */
    release() {
        for (const node of this.locks) {
            node.style.minHeight = '';
            node.style.minWidth = '';
            dropEmptyAttr(node, 'style');
        }
        this.locks = [];
        this.shell.style.minHeight = '';
        dropEmptyAttr(this.shell, 'style');
        this.shell.removeAttribute('aria-hidden');
        this.sr.remove();
    }
}

// ---- The builder -------------------------------------------------------------

export class SiteBuilder {
    constructor({ swarm, box, site, next, status }) {
        this.swarm = swarm;
        this.box = box;   // start box: gone after the first click
        this.site = site; // the page
        this.next = next; // pill that builds everything again
        this.nextLabel = next.querySelector('.next-label');
        this.status = status;

        // The blueprint: the whole page, as the browser would render it without JS.
        const blueprint = site.querySelector('noscript');
        const template = document.createElement('template');
        template.innerHTML = blueprint?.textContent ?? '';
        blueprint?.remove();
        const top = [...template.content.children];
        this.glowSrc = top.find((e) => e.classList.contains('glow')) ?? null;
        this.sections = top.filter((e) => e.hasAttribute('data-section')).map((e) => new Section(e));
        this.hero = this.sections.find((s) => s.isHero) ?? this.sections[0];
        for (const s of this.sections) {
            site.append(s.sr, s.shell);
            s.reset();
        }

        this.glow = null;     // live glow, created by the design-bot
        this.builder = null;  // layout-bot
        this.typist = null;   // copy-bot
        this.designer = null; // design-bot
        this.busy = false;    // the hero is being (re)built
        this.pumping = false; // a later section is being built
        this.started = false; // the start box has been clicked
        this.live = false;    // the hero stands: the other sections follow the scrolling
        this.parked = false;  // reduced motion: built once, no replay
        this.current = null;  // the section being built right now
        this.frame = 0;
        this.resizeTimer = 0;
        this.onBuilt = null;  // (section) => void, a section just stands
        this.onReset = null;  // () => void, everything is torn down for a new build

        const onScroll = () => {
            if (this.frame) return;
            this.frame = requestAnimationFrame(() => { this.frame = 0; this.pump(); });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => {
                if (this.live && !this.busy && !this.pumping) { this.measure(); for (const s of this.sections) s.reserveHeight(); }
            }, 200);
        });
    }

    /**
     * Measure the blueprint at the real page width: the size of every element, and the height of every
     * section. This is what the bots reserve while they build. (A throw-away copy, gone within the same task.)
     */
    measure() {
        const host = document.createElement('div');
        host.className = 'site';
        host.inert = true;
        host.setAttribute('aria-hidden', 'true');
        Object.assign(host.style, {
            position: 'absolute', left: '0', top: '0', zIndex: '-1', visibility: 'hidden', pointerEvents: 'none',
            width: `${this.site.clientWidth}px`,
        });
        const copies = this.sections.map((s) => s.src.cloneNode(true));
        host.append(...copies);
        document.body.append(host);

        this.sections.forEach((s, i) => {
            const from = [s.src, ...s.src.querySelectorAll('*')];
            const to = [copies[i], ...copies[i].querySelectorAll('*')];
            s.sizes = new Map();
            from.forEach((el, k) => {
                const r = to[k].getBoundingClientRect();
                const cs = getComputedStyle(to[k]);
                const parent = to[k].parentElement && k > 0 ? getComputedStyle(to[k].parentElement).display : 'block';
                s.sizes.set(el, { w: r.width, h: r.height, display: cs.display, flexItem: /flex|grid/.test(parent) });
            });
            s.height = s.sizes.get(s.src).h;
        });
        host.remove();
    }

    /** Measure at the real width (with the scrollbar, which only exists once the page has its full height). */
    reserve() {
        const width = this.site.clientWidth;
        this.measure();
        for (const s of this.sections) s.reserveHeight();
        if (this.site.clientWidth !== width) {
            this.measure();
            for (const s of this.sections) s.reserveHeight();
        }
    }

    /** Start (or restart) the build. `origin` is where the bots burst out (first run only). */
    async run(origin) {
        if (this.busy || this.pumping || this.parked) return;
        this.busy = true;
        this.next.classList.remove('is-ready');
        this.hideBox();
        if (this.started) this.reset();
        this.started = true;
        document.documentElement.classList.add('is-live');
        this.site.classList.add('is-live');
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        this.site.focus({ preventScroll: true }); // keep keyboard focus somewhere sensible while building
        try {
            await fontsReady(); // the layout must be final before anything is measured
            this.reserve();
            if (prefersReducedMotion()) this.buildStatic(origin);
            else await this.buildSection(this.hero, origin);
        } finally {
            this.busy = false;
            this.live = true;
            this.parked = prefersReducedMotion();
        }
        this.pump();
    }

    /** The start box dissolves on the first click and never comes back. */
    hideBox() {
        const { box } = this;
        if (box.hidden || box.classList.contains('is-gone')) return;
        box.classList.add('is-gone');
        if (prefersReducedMotion()) box.hidden = true;
        else setTimeout(() => { box.hidden = true; }, BOX_EXIT_MS);
    }

    /** Back to the empty page (the glow fades out on its own). */
    reset() {
        this.live = false;
        for (const s of this.sections) s.reset();
        this.hideGlow();
        this.onReset?.();
    }

    /** Build every section that has scrolled into view, in order. */
    async pump() {
        if (this.pumping || this.busy || !this.live) return;
        this.pumping = true;
        try {
            for (;;) {
                const next = this.sections.find((s) => s.state === 'idle');
                if (!next || !this.wanted(next)) break;
                await this.buildSection(next);
            }
        } finally {
            this.pumping = false;
        }
        this.updateUi();
    }

    /** A section is wanted once it has come into the viewport (or lies above it). */
    wanted(section) {
        const r = section.shell.getBoundingClientRect();
        const vh = window.innerHeight;
        return r.top < Math.max(vh * 0.8, vh - 120);
    }

    /** Announce the result and offer to build again, once everything stands. */
    updateUi() {
        if (this.sections.some((s) => s.state !== 'built')) return;
        this.status.textContent = 'Website built.';
        if (this.parked) return;
        this.nextLabel.textContent = REPLAY_LABEL;
        this.next.classList.add('is-ready');
    }

    ensureBots(origin, burst) {
        this.builder ??= this.swarm.add({ ...origin, ...JOBS.layout, burst });
        this.typist ??= this.swarm.add({ ...origin, ...JOBS.copy, burst });
        this.designer ??= this.swarm.add({ ...origin, ...JOBS.design, burst });
    }

    // ---- The glow (made by the design-bot) ----------------------------------

    showGlow() {
        if (this.glow || !this.glowSrc) return;
        const node = deepClone(this.glowSrc);
        this.site.prepend(node);
        this.glow = node;
        void node.offsetWidth; // style flush, so that the fade-in runs
        node.classList.add('is-on');
    }

    hideGlow() {
        const node = this.glow;
        if (!node) return;
        this.glow = null;
        node.classList.remove('is-on');
        setTimeout(() => node.remove(), GLOW_FADE_MS);
    }

    // ---- Instant builds -----------------------------------------------------

    /** A section is done: reserved sizes go, screen readers get the live section. */
    complete(section) {
        if (section.state === 'built' && !section.shell.hasAttribute('aria-hidden')) return;
        section.release();
        section.state = 'built';
        this.onBuilt?.(section);
    }

    /** Show a section at once (reduced motion, or it was scrolled past before its turn). */
    showSection(section) {
        section.instantBuild();
        if (section.isHero) this.showGlow();
        this.complete(section);
    }

    /** Reduced motion: the whole page at once, the bots parked next to the hero. */
    buildStatic(origin) {
        this.ensureBots(origin, false);
        for (const s of this.sections) this.showSection(s);
        this.status.textContent = 'Website built.';

        const hero = this.hero;
        const rect = (el) => hero.map.get(el)?.getBoundingClientRect();
        const last = rect(hero.shapes.at(-1).el);
        if (last) this.builder.place(last.right, last.bottom);
        const lede = rect(hero.texts.find((t) => t.el.classList.contains('lede'))?.el);
        if (lede) this.typist.place(lede.right - 40, lede.bottom - 12);
        const accent = rect(hero.decos.find((d) => d.kind === 'underline')?.el);
        if (accent) this.designer.place(accent.right, accent.bottom);
    }

    // ---- Animated builds ----------------------------------------------------

    /** Build one section with the bots (instantly if it is already behind the visitor). */
    async buildSection(section, origin) {
        section.state = 'building';
        this.current = section;
        try {
            const scrolledPast = !section.isHero && section.shell.getBoundingClientRect().bottom < 0;
            if (prefersReducedMotion() || scrolledPast || section.instant) this.showSection(section);
            else await this.animate(section, origin);
        } catch (error) {
            // Whatever went wrong: the visitor must never be left with a half-built page.
            console.error(error);
            section.cancelled = true;
            this.showSection(section);
        }
        this.complete(section);
        this.current = null;
        if (section.isHero) this.status.textContent = 'The first screen is built. Scroll down for the rest.';
    }

    async animate(section, origin) {
        this.status.textContent = 'Building the website…';
        this.ensureBots(origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 }, true);
        const { builder, typist, designer } = this;

        const boxReady = new Map(section.shapes.map((s) => [s, defer()]));
        const typed = new Map(section.texts.map((t) => [t, defer()]));
        const speed = section.typingSpeed();

        // layout-bot: creates and drags out the shapes, in page order.
        const layout = (async () => {
            for (const shape of section.shapes) {
                if (section.cancelled) return;
                await this.dragOut(shape);
                boxReady.get(shape).resolve();
            }
            builder.idle();
        })();

        // copy-bot: writes the texts, in page order. A text waits for the shape around it.
        const copy = (async () => {
            for (const t of section.texts) {
                if (section.cancelled) return;
                const around = section.shapeOf.get(t.el.closest('[data-box]'));
                if (around) await boxReady.get(around).promise;
                const override = parseFloat(t.el.dataset.speed);
                await this.typeText(t, { speed: Number.isFinite(override) ? override : speed, tag: t.el.hasAttribute('data-tag') });
                typed.get(t).resolve();
            }
            typist.idle();
        })();

        // design-bot: creates the glow (hero), then draws whatever is ready first.
        const design = (async () => {
            if (section.isHero) await this.lightUp();
            const pending = section.decos.map((d) => ({
                d,
                // An underline waits for its text. An outline waits for its box, or (no box) for its text,
                // or for the box around it, or goes right away.
                ready: d.kind === 'underline'
                    ? typed.get(d.text).promise
                    : (boxReady.get(d.shape) ?? typed.get(d.text) ?? boxReady.get(d.around))?.promise ?? Promise.resolve(),
            }));
            while (pending.length) {
                const item = await Promise.race(pending.map((p) => p.ready.then(() => p)));
                pending.splice(pending.indexOf(item), 1);
                if (section.cancelled) return;
                if (item.d.kind === 'underline') await this.drawUnderline(section, item.d);
                else await this.drawOutline(section, item.d);
            }
            designer.idle();
        })();

        await Promise.all([layout, copy, design]);
    }

    /** design-bot walks into the page and clicks: it creates the background glow. */
    async lightUp() {
        const { designer } = this;
        await designer.chase(() => ({ x: window.innerWidth * 0.3, y: window.innerHeight * 0.4 }), ARRIVE);
        await designer.click();
        await checkpoint();
        this.showGlow();
    }

    /** layout-bot walks to the top-left corner of a shape, creates it there and drags to the bottom-right corner. */
    async dragOut(shape) {
        const { builder, swarm } = this;
        const fast = shape.fast;
        const ms = fast ? DRAG_FAST_MS : DRAG_MS;
        const node = shape.prepare();
        const a = anchor(node); // measured now, while the shape is not scaled yet

        await builder.chase(() => { const r = a(); return { x: r.left, y: r.top }; }, fast ? ARRIVE_FAST : ARRIVE);
        await checkpoint();
        if (shape.section.cancelled) return;

        const t0 = performance.now();
        node.style.scale = `${MIN_SCALE} ${MIN_SCALE}`;
        shape.begin(); // the element comes into being
        if (!fast) shape.select(true);
        const from = a();
        swarm.ripple(from.left, from.top, builder.color); // the "mouse down" of the drag
        builder.press();

        builder.follow(() => {
            const p = easeInOut(clamp((performance.now() - t0) / ms, 0, 1));
            const r = a();
            return { x: r.left + r.width * p, y: r.top + r.height * p };
        }, { damping: DRAG_DAMPING });

        // The far corner is glued to the cursor, so the scale follows its real position.
        const stop = swarm.onFrame(() => {
            const r = a();
            const sx = clamp((builder.x - r.left) / r.width, MIN_SCALE, 1);
            const sy = clamp((builder.y - r.top) / r.height, MIN_SCALE, 1);
            node.style.scale = `${sx.toFixed(3)} ${sy.toFixed(3)}`;
            if (!fast) builder.inspect(`${Math.round(r.width * sx)} × ${Math.round(r.height * sy)}`, () => { const q = a(); return { x: q.left, y: Math.max(4, q.top - TAG_GAP) }; });
        });

        await sleep(ms);
        // Small repeated shapes do not wait for the bot to come to a stop: the next shape is next.
        if (!fast) {
            await builder.chase(() => { const r = a(); return { x: r.right, y: r.bottom }; },
                { tolerance: 6, settleSpeed: 200, timeout: 1000, damping: DRAG_DAMPING });
        }
        stop();

        builder.release();
        const to = a();
        swarm.ripple(to.right, to.bottom, builder.color);
        if (!fast) {
            await sleep(150); // let the final size sink in before the tag goes
            builder.hideTag();
            shape.select(false);
        }
        shape.end();
    }

    /** copy-bot walks to the start of a text, then writes it while following the last character. */
    async typeText(t, { speed = 1, tag = false } = {}) {
        const { typist } = this;
        const slow = speed > 0.3; // fast typing does not wait for the bot to arrive

        const node = t.prepare();
        if (slow) await typist.chase(t.caretPoint, TYPE_ARRIVE);
        else typist.follow(t.caretPoint);
        await checkpoint();
        if (t.section.cancelled) return;
        t.node(); // the empty element becomes visible
        if (tag) {
            typist.inspect(t.spec(), () => {
                const r = node.getBoundingClientRect();
                return { x: r.left, y: Math.max(4, r.top - TAG_GAP) };
            });
        }
        if (slow) await sleep(60);

        // Very fast typing writes a few characters per tick (timers cannot go much below 4ms).
        const step = speed < 0.15 ? 3 : speed < 0.3 ? 2 : 1;
        const n = t.chars.length;
        for (let i = 0; i < n; i += step) {
            if (this.current?.cancelled) return;
            const end = Math.min(i + step, n);
            t.write(end);
            await sleep(typingDelay(t.text[end - 1], speed));
        }

        if (slow) await sleep(120);
        if (tag) typist.hideTag();
    }

    /** design-bot creates the underline below a word and draws it from left to right. */
    async drawUnderline(section, { el }) {
        const { designer, swarm } = this;
        const node = section.map.get(el);
        const a = anchor(node);
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        const y = () => a().bottom - 2;

        await designer.chase(() => ({ x: a().left, y: y() }), ARRIVE);
        await checkpoint();
        if (section.cancelled) return;
        const line = part('underline');
        node.append(line);
        designer.inspect(`underline 2px ${accent}`, () => { const r = a(); return { x: r.left, y: r.bottom + 10 }; });
        designer.press();

        const t0 = performance.now();
        const progress = () => easeInOut(clamp((performance.now() - t0) / DRAW_MS, 0, 1));
        designer.follow(() => { const r = a(); return { x: r.left + r.width * progress(), y: y() }; }, { damping: DRAG_DAMPING });
        const stop = swarm.onFrame(() => { line.style.scale = `${progress().toFixed(3)} 1`; });

        await sleep(DRAW_MS);
        stop();
        line.style.scale = '1 1';
        designer.release();
        swarm.ripple(a().right, y(), designer.color);
        await sleep(200);
        designer.hideTag();
    }

    /** design-bot creates the outline pieces of an element and draws them, corner by corner. */
    async drawOutline(section, { el }) {
        const { designer, swarm } = this;
        const node = section.map.get(el);
        const outline = new Outline(node);
        const a = anchor(node);
        const path = outline.path();
        const accent = getComputedStyle(node).getPropertyValue('--outline').trim()
            || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

        await designer.chase(() => outline.drawPoint(0, a(), path), ARRIVE);
        await checkpoint();
        if (section.cancelled) return;
        designer.inspect(`border 1.5px ${accent}`, () => { const r = a(); return { x: r.left, y: r.bottom + 8 }; });
        designer.press();

        const ms = DRAW_MS * 1.5;
        const t0 = performance.now();
        const progress = () => clamp((performance.now() - t0) / ms, 0, 1);
        designer.follow(() => outline.drawPoint(progress(), a(), path), { damping: DRAG_DAMPING });
        const stop = swarm.onFrame(() => outline.setDrawn(progress(), path));

        await sleep(ms);
        stop();
        outline.setDrawn(1, path);
        designer.release();
        const start = outline.drawPoint(0, a(), path);
        swarm.ripple(start.x, start.y, designer.color);
        await sleep(200);
        designer.hideTag();
    }
}
