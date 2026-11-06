import { CursorSwarm } from './cursors.js';
import { SiteBuilder } from './build.js';

const box = document.getElementById('box');
const swarm = new CursorSwarm(document.getElementById('cursor-layer'), { max: 40 });

const builder = new SiteBuilder({
    swarm,
    label: box.querySelector('.box-label'),
    cards: [...document.querySelectorAll('#cards .card')],
    status: document.getElementById('status'),
});

box.addEventListener('click', (event) => {
    // Busy or finished: the button stays focusable, it just does nothing.
    if (box.getAttribute('aria-disabled') === 'true') return;

    // Keyboard activation reports (0, 0): fall back to the box centre.
    const rect = box.getBoundingClientRect();
    const hasPointer = event.detail > 0 && (event.clientX || event.clientY);
    const x = hasPointer ? event.clientX : rect.left + rect.width / 2;
    const y = hasPointer ? event.clientY : rect.top + rect.height / 2;

    // Little press animation (also for keyboard / touch users).
    box.classList.add('is-pressed');
    setTimeout(() => box.classList.remove('is-pressed'), 120);

    box.setAttribute('aria-disabled', 'true');
    builder.run({ x, y }).finally(() => {
        if (!builder.parked) box.removeAttribute('aria-disabled');
    });
});
