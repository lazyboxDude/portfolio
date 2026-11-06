import { CursorSwarm } from './cursors.js';
import { SiteBuilder } from './build.js';

const box = document.getElementById('box');
const next = document.getElementById('next');
const swarm = new CursorSwarm(document.getElementById('cursor-layer'), { max: 40 });

const builder = new SiteBuilder({
    swarm,
    box,
    build: document.getElementById('build'),
    next,
    cards: [...document.querySelectorAll('#cards .card')],
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
