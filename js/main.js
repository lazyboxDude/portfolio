import { CursorSwarm } from './cursors.js';
import { SiteBuilder } from './build.js';
import { AgentField, toolNames } from './agents.js';
import { Dock } from './dock.js';

// The swarm's agents are named after the skills: read the tools from the Skills section now, before the
// builder wraps its text into single characters (layer 1 = the first skill = the base of the stack).
const skillNames = [...document.querySelectorAll('.skills .skill')]
    .map((skill) => toolNames(skill.querySelector('h3 + p')?.textContent ?? ''));

const box = document.getElementById('box');
const swarm = new CursorSwarm(document.getElementById('cursor-layer'), { max: 40 });

// The box is the start button, then the bots' home in the corner (js/dock.js).
const dock = new Dock({ wrap: document.getElementById('box-wrap'), button: box, swarm });

const builder = new SiteBuilder({
    swarm,
    dock,
    site: document.getElementById('site'),
    glow: document.getElementById('glow'),
    status: document.getElementById('status'),
});

// First click: the bots burst out of the box and build the page while it travels to the corner.
// Later clicks on the docked box call every bot out and build everything again (not while a build runs).
box.addEventListener('click', () => {
    if (dock.disabled) return;
    // Little press animation (also for keyboard / touch users).
    box.classList.add('is-pressed');
    setTimeout(() => box.classList.remove('is-pressed'), 120);
    builder.run();
});

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
        names: skillNames,
    });
}

// Nav: mark the link of the section in view (aria-current). Home is the default at the top.
const navLinks = [...document.querySelectorAll('.nav-links a')];
const navTargets = navLinks.map((a) => ({ a, el: a.hash.length > 1 ? document.querySelector(a.hash) : null }));

function markNav() {
    const line = window.innerHeight * 0.4; // a section counts once its top has passed this line
    let current = navLinks[0];
    for (const { a, el } of navTargets) {
        if (el && el.getBoundingClientRect().top <= line) current = a;
    }
    for (const a of navLinks) {
        if (a === current) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
    }
}

window.addEventListener('scroll', markNav, { passive: true });
window.addEventListener('resize', markNav, { passive: true });
