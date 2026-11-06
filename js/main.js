import { CursorSwarm } from './cursors.js';

const box = document.getElementById('box');
const label = box.querySelector('.box-label');
const swarm = new CursorSwarm(document.getElementById('cursor-layer'), { max: 40 });

const BATCH = 6;

box.addEventListener('click', (event) => {
    // Keyboard activation reports (0, 0): fall back to the box centre.
    const rect = box.getBoundingClientRect();
    const hasPointer = event.detail > 0 && (event.clientX || event.clientY);
    const x = hasPointer ? event.clientX : rect.left + rect.width / 2;
    const y = hasPointer ? event.clientY : rect.top + rect.height / 2;

    swarm.spawn(BATCH, x, y);

    // Little press animation (also for keyboard / touch users).
    box.classList.add('is-pressed');
    setTimeout(() => box.classList.remove('is-pressed'), 120);

    label.textContent = swarm.count >= swarm.max ? 'Enough!' : `${swarm.count} cursors`;
});
