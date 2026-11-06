import { CursorSwarm } from './cursors.js';
import { SiteBuilder } from './build.js';
import { AgentField } from './agents.js';

const box = document.getElementById('box');
const next = document.getElementById('next');
const swarm = new CursorSwarm(document.getElementById('cursor-layer'), { max: 40 });

const builder = new SiteBuilder({
    swarm,
    box,
    site: document.getElementById('site'),
    glow: document.getElementById('glow'),
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
const swarmStage = document.querySelector('.swarm');
if (swarmStage) {
    new AgentField({
        stage: swarmStage,
        canvas: document.getElementById('swarm-canvas'),
        swarm,
        counter: document.getElementById('swarm-count'),
        more: document.getElementById('swarm-more'),
        stack: document.getElementById('swarm-stack'),
        layerButtons: [...swarmStage.querySelectorAll('.layer-btn')],
    });
}
