// "Show source": a small panel that shows the page's real, live DOM while the bots write it.
//
// It does not fake anything: it observes #site with a MutationObserver and pretty-prints the section
// that was changed last (the newest lines at the bottom). What you read here is what is in the DOM.
// The panel is decorative for assistive tech (aria-hidden); the toggle is a real button.

const TAIL_LINES = 34;   // how many lines of the section's markup are shown (the newest ones)
const MAX_VALUE = 52;    // attribute values and text lines are shortened to this
const RENDER_MS = 120;   // at most one render per this many ms

const VOID = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'source']);
const OPAQUE = new Set(['svg', 'canvas', 'picture']); // shown as one line, no children

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function openTag(el) {
    let out = `<span class="s-tg">&lt;${esc(el.localName)}</span>`;
    for (const { name, value } of el.attributes) {
        out += ` <span class="s-at">${esc(name)}</span>`;
        if (value !== '') out += `=<span class="s-av">"${esc(cut(value, MAX_VALUE))}"</span>`;
    }
    return `${out}<span class="s-tg">&gt;</span>`;
}

const closeTag = (el) => `<span class="s-tg">&lt;/${esc(el.localName)}&gt;</span>`;

/** The markup of a node as lines (HTML strings), indented two spaces per level. */
function pretty(node, depth, out) {
    const pad = '  '.repeat(depth);
    if (node.nodeType === 3) {
        const text = node.data.replace(/\s+/g, ' ').trim();
        if (text) out.push(`${pad}<span class="s-tx">${esc(cut(text, 90))}</span>`);
        return;
    }
    if (node.nodeType !== 1) return;
    if (VOID.has(node.localName)) { out.push(pad + openTag(node)); return; }
    if (OPAQUE.has(node.localName)) { out.push(`${pad}${openTag(node)}<span class="s-tx">…</span>${closeTag(node)}`); return; }

    const kids = [...node.childNodes].filter((n) => (n.nodeType === 3 ? n.data.trim() : n.nodeType === 1));
    if (!kids.length) { out.push(`${pad}${openTag(node)}${closeTag(node)}`); return; }
    if (kids.length === 1 && kids[0].nodeType === 3) {
        out.push(`${pad}${openTag(node)}<span class="s-tx">${esc(cut(kids[0].data.replace(/\s+/g, ' ').trim(), 90))}</span>${closeTag(node)}`);
        return;
    }
    out.push(pad + openTag(node));
    for (const child of kids) pretty(child, depth + 1, out);
    out.push(pad + closeTag(node));
}

export class SourcePanel {
    constructor({ site, button, panel }) {
        this.site = site;
        this.button = button;
        this.panel = panel;
        this.title = panel.querySelector('.source-title');
        this.count = panel.querySelector('.source-count');
        this.code = panel.querySelector('code');
        this.open = false;
        this.focus = null; // the top-level element of #site that changed last
        this.timer = 0;

        button.addEventListener('click', () => this.toggle());
        panel.querySelector('.source-close')?.addEventListener('click', () => this.toggle(false));
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.open) this.toggle(false); });

        new MutationObserver((records) => this.changed(records)).observe(site, { childList: true, subtree: true, characterData: true });
    }

    toggle(on = !this.open) {
        this.open = on;
        this.button.setAttribute('aria-expanded', String(on));
        clearTimeout(this.hideTimer);
        if (on) {
            this.panel.hidden = false;
            this.render();
            void this.panel.offsetWidth; // style flush, so that the panel grows out of its toggle
            this.panel.classList.add('is-open');
        } else {
            this.panel.classList.remove('is-open');
            this.hideTimer = setTimeout(() => { if (!this.open) this.panel.hidden = true; }, 450); // after the exit transition
        }
    }

    changed(records) {
        for (const r of records) {
            let n = r.target;
            while (n && n.parentNode !== this.site) n = n.parentNode;
            if (!n || n.classList.contains('sr-only') || n.classList.contains('glow')) continue;
            this.focus = n;
        }
        if (this.open && !this.timer) this.timer = setTimeout(() => { this.timer = 0; this.render(); }, RENDER_MS);
    }

    render() {
        const root = this.focus ?? this.site.querySelector('.s-hero, section, footer');
        if (!root) { this.code.textContent = ''; return; }
        const lines = [];
        pretty(root, 0, lines);
        const shown = lines.slice(-TAIL_LINES);
        this.code.innerHTML = shown.map((l) => `<span class="s-ln">${l}</span>`).join('') + '<span class="s-caret"></span>';
        this.title.textContent = root.id ? `#${root.id}` : `<${root.localName}>`;
        this.count.textContent = `${this.site.querySelectorAll('*').length} nodes`;
    }
}
