// What the a11y-bot looks at: the real contrast of an element's text (WCAG 2.x) and its click target,
// plus a focus ring that is drawn on top of the page while the bot checks it.
//
// Nothing here is made up: the colours come from getComputedStyle, the background is composited from
// the element's ancestors (semi-transparent layers included). Gradients and images are not looked at;
// the checked elements sit on solid colours (see data-a11y in index.html).

const parse = (value) => {
    const nums = value.match(/-?\d*\.?\d+/g)?.map(Number);
    if (!nums || nums.length < 3) return { r: 0, g: 0, b: 0, a: 0 };
    // Computed colours are rgb()/rgba(); the CSS Color 4 form color(srgb 0.1 0.2 0.3 / 0.5) is handled too.
    const unit = value.startsWith('color(') ? 255 : 1;
    return { r: nums[0] * unit, g: nums[1] * unit, b: nums[2] * unit, a: nums[3] ?? 1 };
};

const over = (top, below) => ({
    r: top.r * top.a + below.r * (1 - top.a),
    g: top.g * top.a + below.g * (1 - top.a),
    b: top.b * top.a + below.b * (1 - top.a),
    a: 1,
});

/** The colour behind an element: its own and its ancestors' backgrounds, composited until one is opaque. */
function backdrop(el) {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c.a > 0) layers.push(c);
        if (c.a >= 1) break;
    }
    let out = { r: 0, g: 0, b: 0, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) out = over(layers[i], out);
    return out;
}

const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const luminance = ({ r, g, b }) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

/** WCAG contrast ratio between the text of `el` and what is behind it, with the level it reaches. */
export function contrast(el) {
    const cs = getComputedStyle(el);
    const bg = backdrop(el);
    const fg = over(parse(cs.color), bg);
    const a = luminance(fg), b = luminance(bg);
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
    let level = 'FAIL';
    if (ratio >= 7) level = 'AAA';
    else if (ratio >= 4.5) level = 'AA';
    else if (large && ratio >= 3) level = 'AA large';
    return { ratio, level };
}

/** The tag text: "contrast 17.2 : 1 · AAA", and for links and buttons the size of the click target. */
export function describe(el) {
    const { ratio, level } = contrast(el);
    let out = `contrast ${ratio.toFixed(1)} : 1 · ${level}`;
    if (el.matches('a[href], button')) {
        const r = el.getBoundingClientRect();
        out += ` · target ${Math.round(el.offsetWidth || r.width)} × ${Math.round(el.offsetHeight || r.height)}`;
    }
    return out;
}

/**
 * A focus ring drawn in the bot's colour around whatever it is checking. It lives in the cursor layer
 * (aria-hidden, fixed), so the checked element is not touched. The size is set once per target, afterwards
 * it only moves with `translate`; `at` is called every frame so the ring follows the page when it scrolls.
 */
export class FocusRing {
    constructor(layer, color) {
        this.el = document.createElement('div');
        this.el.className = 'a11y-ring';
        this.el.style.setProperty('--cursor-color', color);
        layer.appendChild(this.el);
        this.at = null;
    }

    show(el, at) {
        const pad = 5;
        const cs = getComputedStyle(el);
        const r = parseFloat(cs.borderTopLeftRadius) || 0;
        this.el.style.width = `${el.offsetWidth + pad * 2}px`;
        this.el.style.height = `${el.offsetHeight + pad * 2}px`;
        this.el.style.borderRadius = `${Math.min(r + pad, 999)}px`;
        this.pad = pad;
        this.at = at;
        this.move();
        this.el.classList.add('is-visible');
    }

    /** Re-position (call once per frame while visible). */
    move() {
        if (!this.at) return;
        const r = this.at();
        this.el.style.translate = `${(r.left - this.pad).toFixed(1)}px ${(r.top - this.pad).toFixed(1)}px`;
    }

    hide() {
        this.el.classList.remove('is-visible');
        this.at = null;
    }
}
