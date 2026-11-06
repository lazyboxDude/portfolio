import { CursorSwarm } from './cursors.js';
import { SiteBuilder, setPaused, isPaused } from './build.js';
import { AgentField } from './agents.js';
import { SourcePanel } from './source.js';

const box = document.getElementById('box');
const next = document.getElementById('next');
const site = document.getElementById('site');
const swarm = new CursorSwarm(document.getElementById('cursor-layer'), { max: 40 });

const builder = new SiteBuilder({
    swarm,
    box,
    site,
    next,
    status: document.getElementById('status'),
});

/** Where the bots burst out on the first run: the click, or the button centre for keyboard users. */
function originOf(event, button) {
    const rect = button.getBoundingClientRect();
    const hasPointer = event.detail > 0 && (event.clientX || event.clientY);
    return {
        x: hasPointer ? event.clientX : rect.left + rect.width / 2,
        y: hasPointer ? event.clientY : rect.top + rect.height / 2,
    };
}

box.addEventListener('click', (event) => {
    // Little press animation (also for keyboard / touch users).
    box.classList.add('is-pressed');
    setTimeout(() => box.classList.remove('is-pressed'), 120);
    builder.run(originOf(event, box));
});

next.addEventListener('click', (event) => builder.run(originOf(event, next)));

// The swarm finale: hundreds of agents on a canvas, drawn from the same animation loop as the bots.
// Its section does not exist until the bots have built it, so the field starts when that section stands.
let field = null;
builder.onBuilt = (section) => {
    if (section.src.id !== 'swarm') return;
    const stage = section.shell.querySelector('.swarm');
    if (!stage) return;
    field?.destroy();
    field = new AgentField({
        stage,
        canvas: stage.querySelector('#swarm-canvas'),
        swarm,
        counter: stage.querySelector('#swarm-count'),
        more: stage.querySelector('#swarm-more'),
        stack: stage.querySelector('#swarm-stack'),
        layerButtons: [...stage.querySelectorAll('.layer-btn')],
    });
};
builder.onReset = () => { field?.destroy(); field = null; };

// "Show source": the real DOM, live, while the bots write it.
new SourcePanel({
    site,
    button: document.getElementById('source-toggle'),
    panel: document.getElementById('source'),
});

// Test hook: with the bots on hold the page stays exactly as far as it got (see PLAN.md, step 9).
window.siteBuilder = { builder, pause: () => setPaused(true), resume: () => setPaused(false), get paused() { return isPaused(); } };
