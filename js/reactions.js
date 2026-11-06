// How idle bots (cursors in "wander" mode) react to the visitor and to each other.
//
//   dodge   - the real pointer comes close: the bot hops out of the way
//   curious - now and then a bot walks over to the real pointer and hovers next to it
//   meetup  - now and then two bots walk towards each other and greet with a click
//
// It only steers bots that are off duty (cursor.detour() ignores everyone else) and runs inside
// the swarm's own frame loop, so there is no extra requestAnimationFrame. Nothing happens with
// prefers-reduced-motion, and touch input is ignored (there is no hovering pointer).

import { prefersReducedMotion } from './cursors.js';

const POINTER_FRESH_MS = 1500;   // the pointer counts as "present" this long after its last move
const DODGE_RADIUS = 80;
const DODGE_DISTANCE = 170;
const DODGE_COOLDOWN_MS = 900;
const CURIOUS_EVERY_MS = [4000, 9000];
const CURIOUS_FOR_MS = 3200;
const CURIOUS_OFFSET = 100;      // stays this far from the pointer (outside the dodge radius)
const MEETUP_EVERY_MS = [7000, 12000];
const MEETUP_GAP = 16;           // half the distance between the two greeters
const GREET_RADIUS = 38;
const GREET_COOLDOWN_MS = 6000;

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function enableReactions(swarm) {
    const pointer = { x: -1e4, y: -1e4, t: -1e9 };
    const states = new WeakMap(); // per cursor: when it may dodge / greet again, how long it is curious
    const stateOf = (c) => {
        let s = states.get(c);
        if (!s) states.set(c, (s = { dodgeAfter: 0, greetAfter: 0, curiousUntil: 0, ox: 0, oy: 0 }));
        return s;
    };

    window.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        pointer.t = performance.now();
    }, { passive: true });

    let nextCurious = performance.now() + rand(...CURIOUS_EVERY_MS);
    let nextMeetup = performance.now() + rand(...MEETUP_EVERY_MS);

    swarm.onFrame((dt, now) => {
        if (prefersReducedMotion()) return;
        const idle = swarm.cursors.filter((c) => c.idle);
        if (!idle.length) return;
        const present = now - pointer.t < POINTER_FRESH_MS;

        // Curious bots shadow the pointer; everyone else dodges it.
        for (const c of idle) {
            const s = stateOf(c);
            if (now < s.curiousUntil) {
                c.detour(pointer.x + s.ox, pointer.y + s.oy, 1);
                continue;
            }
            if (!present || now < s.dodgeAfter) continue;
            const dx = c.x - pointer.x, dy = c.y - pointer.y;
            const dist = Math.hypot(dx, dy);
            if (dist >= DODGE_RADIUS) continue;
            const angle = dist > 1 ? Math.atan2(dy, dx) : rand(0, Math.PI * 2);
            c.detour(c.x + Math.cos(angle) * DODGE_DISTANCE, c.y + Math.sin(angle) * DODGE_DISTANCE, 1.2);
            s.dodgeAfter = now + DODGE_COOLDOWN_MS;
        }

        if (present && now > nextCurious) {
            nextCurious = now + rand(...CURIOUS_EVERY_MS);
            const c = pick(idle);
            const s = stateOf(c);
            const angle = rand(0, Math.PI * 2);
            s.curiousUntil = now + CURIOUS_FOR_MS;
            s.ox = Math.cos(angle) * CURIOUS_OFFSET;
            s.oy = Math.sin(angle) * CURIOUS_OFFSET;
        }

        if (idle.length >= 2 && now > nextMeetup) {
            nextMeetup = now + rand(...MEETUP_EVERY_MS);
            const a = pick(idle);
            const b = pick(idle.filter((c) => c !== a));
            const mx = rand(120, Math.max(121, window.innerWidth - 120));
            const my = rand(120, Math.max(121, window.innerHeight - 120));
            a.detour(mx - MEETUP_GAP, my, 3);
            b.detour(mx + MEETUP_GAP, my, 3);
        }

        // Two idle bots that end up next to each other say hello (a click each, with ripples).
        for (let i = 0; i < idle.length; i++) {
            for (let j = i + 1; j < idle.length; j++) {
                const a = idle[i], b = idle[j];
                const sa = stateOf(a), sb = stateOf(b);
                if (now < sa.greetAfter || now < sb.greetAfter) continue;
                if (Math.hypot(a.x - b.x, a.y - b.y) > GREET_RADIUS) continue;
                sa.greetAfter = sb.greetAfter = now + GREET_COOLDOWN_MS;
                a.click();
                b.click();
                // Part ways afterwards.
                const angle = rand(0, Math.PI * 2);
                a.detour(a.x + Math.cos(angle) * 140, a.y + Math.sin(angle) * 140, 2);
                b.detour(b.x - Math.cos(angle) * 140, b.y - Math.sin(angle) * 140, 2);
            }
        }
    });
}
