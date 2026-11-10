// Small helpers shared by the build engine (js/build.js) and the layout tools (js/layout.js).

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/** A decorative, aria-hidden span injected by the bots. `data-fx` keeps it out of every "children of" check. */
export const part = (className) => {
    const el = document.createElement('span');
    el.className = className;
    el.setAttribute('aria-hidden', 'true');
    el.dataset.fx = '';
    return el;
};

/**
 * The rect of an element in viewport coordinates that keeps up when the page scrolls.
 * Measure once, call the returned function as often as needed.
 */
export function anchor(el) {
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

/** A rect in page coordinates (stays valid while the visitor scrolls). */
export function pageRect(r) {
    const x = window.scrollX, y = window.scrollY;
    return { left: r.left + x, top: r.top + y, right: r.right + x, bottom: r.bottom + y };
}
