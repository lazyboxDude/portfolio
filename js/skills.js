// The Skills section: six abilities, every tool by layer, and the proof where each tool was used.
//
// The content lives in index.html (#skills-data) as plain lists, which is also the version without JS.
// initSkills() reads those lists and replaces them by the picker. It has to run BEFORE the SiteBuilder is
// created: the bots build exactly what it makes (data-grid / data-box / data-type, see index.html).
//
//   abilities (buttons) -> pick one: its tools get a blue bar, the first of them is selected
//   tools (buttons)     -> pick one: the proof card shows the layer, the name and where it was used
// Only classes and aria-pressed change after the build; no text is touched (the copy-bot wraps it in spans).

const SMALL = '(max-width: 1000px)'; // index and card stand on top of each other
const NO_PROOF = 'No single project is listed for this tool. It belongs to the daily toolkit of this layer.';

/** Element with a class and optional attributes. */
function el(tag, className, attrs = {}) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
}

function readData(data) {
    const proofs = new Map([...data.querySelectorAll('.proofs-data > li')].map((li) => [li.id, {
        when: li.querySelector('.when').textContent,
        title: li.querySelector('strong').textContent,
        text: li.querySelector('p').textContent,
    }]));

    const tools = new Map();
    const layers = [...data.querySelectorAll('.layers-data > li')].map((li) => {
        const layer = { label: li.querySelector('h4').textContent, color: li.dataset.color, tools: [] };
        for (const t of li.querySelectorAll('li[data-tool]')) {
            const tool = {
                id: t.dataset.tool,
                label: t.textContent.trim(),
                layer,
                proofs: (t.dataset.proofs ?? '').split(' ').filter(Boolean).map((id) => proofs.get(id)).filter(Boolean),
            };
            layer.tools.push(tool);
            tools.set(tool.id, tool);
        }
        return layer;
    });

    const abilities = [...data.querySelectorAll('.abilities-data > li')].map((li, i) => ({
        id: li.dataset.ability,
        n: String(i + 1).padStart(2, '0'),
        heading: li.querySelector('h3').innerHTML.trim(),
        text: li.querySelector('p').textContent.trim(),
        tools: li.dataset.tools.split(' ').filter((id) => tools.has(id)),
    }));

    return { abilities, layers, tools };
}

export function initSkills(section) {
    const data = section?.querySelector('#skills-data');
    if (!data) return;
    const { abilities, layers, tools } = readData(data);

    // ---- Markup the bots build ---------------------------------------------------------------
    const ui = el('div', 'skills-ui');

    const grid = el('div', 'abilities', { 'data-grid': '' });
    const abilityButtons = abilities.map((a) => {
        const b = el('button', 'ability', { type: 'button', 'data-box': 'fast', 'aria-pressed': 'false' });
        const n = el('span', 'ability-n', { 'data-type': '' });
        n.textContent = a.n;
        const h = el('span', 'ability-h', { 'data-type': '' });
        h.innerHTML = a.heading;
        const t = el('span', 'ability-t', { 'data-type': '' });
        t.textContent = a.text;
        b.append(n, h, t);
        grid.append(b);
        return b;
    });

    const head = el('div', 'proof-head');
    const title = el('h3', 'proof-title', { 'data-type': '' });
    title.innerHTML = 'Pick a tool, <em class="accent">see the proof.</em>';
    const legend = el('p', 'proof-legend', { 'data-type': '' });
    legend.textContent = 'blue bar = used for the ability above';
    head.append(title, legend);

    const body = el('div', 'proof-body');
    const index = el('div', 'tool-index', { 'data-box': '' });
    const toolButtons = new Map();
    for (const layer of layers) {
        const row = el('div', 'tool-row');
        const label = el('p', 'tool-layer', { 'data-type': '' });
        label.style.setProperty('--c', layer.color);
        label.textContent = layer.label;
        const chips = el('div', 'tool-chips');
        for (const tool of layer.tools) {
            const b = el('button', 'tool', { type: 'button', 'aria-pressed': 'false', 'data-tool': tool.id, 'data-type': '' });
            b.textContent = tool.label;
            chips.append(b);
            toolButtons.set(tool.id, b);
        }
        row.append(label, chips);
        index.append(row);
    }

    const card = el('aside', 'proof-card', { 'data-box': '', 'data-outline': '', 'aria-live': 'polite' });
    const cardLayer = el('p', 'proof-layer');
    const cardName = el('h3', 'proof-name');
    const cardLabel = el('p', 'proof-label', { 'data-type': '' });
    cardLabel.textContent = 'Where I used it';
    const cardItems = el('div', 'proof-items');
    card.append(cardLayer, cardName, cardLabel, cardItems);

    body.append(index, card);
    ui.append(grid, head, body);
    data.replaceWith(ui);

    // ---- Behaviour ------------------------------------------------------------------------------
    let ability = null;
    let tool = null;
    const small = window.matchMedia(SMALL);
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

    function render() {
        abilities.forEach((a, i) => abilityButtons[i].setAttribute('aria-pressed', String(a === ability)));
        for (const [id, b] of toolButtons) {
            b.setAttribute('aria-pressed', String(tools.get(id) === tool));
            b.classList.toggle('is-related', !!ability?.tools.includes(id));
        }
        cardLayer.style.setProperty('--c', tool.layer.color);
        cardLayer.textContent = tool.layer.label;
        cardName.textContent = tool.label;
        cardItems.replaceChildren(...(tool.proofs.length ? tool.proofs : [{ when: '', title: 'Part of the layer', text: NO_PROOF }]).map((p) => {
            const item = el('div', 'proof-item');
            const when = el('p', 'proof-when');
            when.textContent = p.when;
            const t = el('p', 'proof-item-title');
            t.textContent = p.title;
            const text = el('p', 'proof-text');
            text.textContent = p.text;
            item.append(...(p.when ? [when] : []), t, text);
            return item;
        }));
    }

    abilityButtons.forEach((b, i) => b.addEventListener('click', () => {
        ability = abilities[i];
        tool = tools.get(ability.tools[0]);
        render();
    }));

    for (const [id, b] of toolButtons) {
        b.addEventListener('click', () => {
            tool = tools.get(id);
            render();
            // Index and card are stacked: bring the card into view when it is not.
            if (small.matches) {
                const r = card.getBoundingClientRect();
                if (r.top < 0 || r.bottom > window.innerHeight) card.scrollIntoView({ block: 'nearest', behavior: calm.matches ? 'auto' : 'smooth' });
            }
        });
    }

    // Start with a real example: Build -> JavaScript (the Dienstplan).
    ability = abilities.find((a) => a.id === 'build') ?? abilities[0];
    tool = tools.get(ability.tools[0]);
    render();
}
