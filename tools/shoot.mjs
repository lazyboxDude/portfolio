// Screenshots of the homepage for design review.
//   node tools/shoot.mjs [--out <dir>] [--fast]
// Per viewport (desktop 1440, mobile 390): the start (box), the name over the box, the box in flight, the hero after the bots built it, and the
// finished page (full height, built instantly with prefers-reduced-motion). --fast skips the animated hero.
// Default output: <tmpdir>/portfolio-shots

import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { chromium, serve, VIEWPORTS, HERO_BUILT, startBuild } from './lib.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const out = args.includes('--out') ? path.resolve(args[args.indexOf('--out') + 1]) : path.join(os.tmpdir(), 'portfolio-shots');
fs.mkdirSync(out, { recursive: true });

const server = await serve();
const browser = await chromium.launch();
const written = [];
const save = async (page, name, opts = {}) => {
    const file = path.join(out, name);
    await page.screenshot({ path: file, ...opts });
    written.push(file);
};

try {
    for (const [label, viewport] of Object.entries(VIEWPORTS)) {
        if (!flag('--fast')) {
            const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
            const page = await ctx.newPage();
            await page.goto(server.url + '/index.html');
            await page.evaluate(() => document.fonts.ready);
            await save(page, `${label}-1-start.png`);
            await startBuild(page);
            // The name is typed in front of the box (it flips light over it), then the box flies to its corner.
            await page.waitForFunction(() => [...document.querySelectorAll('#headline .ch')].every((c) => c.classList.contains('on')), null, { timeout: 60000 });
            await page.waitForTimeout(200);
            await save(page, `${label}-1b-name-over-box.png`);
            await page.waitForTimeout(900);
            await save(page, `${label}-1c-flight.png`);
            await page.waitForFunction(HERO_BUILT, null, { timeout: 60000 });
            await page.waitForTimeout(800);
            await save(page, `${label}-2-hero.png`);
            await ctx.close();
        }

        // The finished page: reduced motion builds everything at once.
        const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
        const page = await ctx.newPage();
        await page.goto(server.url + '/index.html');
        await page.evaluate(() => document.fonts.ready);
        await startBuild(page);
        await page.waitForFunction(() => document.getElementById('status').textContent === 'Website built.');
        await page.waitForTimeout(500);
        await save(page, `${label}-3-hero-static.png`);
        // Scroll once through the page so lazy images load before the full-page shot.
        await page.evaluate(async () => {
            for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) {
                scrollTo({ top: y, behavior: 'instant' });
                await new Promise((r) => setTimeout(r, 60));
            }
            scrollTo({ top: 0, behavior: 'instant' });
        });
        await page.waitForTimeout(500);
        await save(page, `${label}-4-full.png`, { fullPage: true });
        await ctx.close();
    }
} finally {
    await browser.close();
    await server.close();
}
console.log(written.join('\n'));
