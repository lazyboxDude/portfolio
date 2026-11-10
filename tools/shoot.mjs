#!/usr/bin/env node
// Screenshots of the finished home page, so a (design) bot can SEE what it changes.
//
//   node tools/shoot.mjs                                  all viewports: full page + every section -> screenshots/
//   node tools/shoot.mjs mobile                           one viewport (desktop | tablet | mobile)
//   node tools/shoot.mjs desktop --only hero,projects     only some sections (ids, the first one is "hero")
//   node tools/shoot.mjs --out /some/folder               other output folder
//   node tools/shoot.mjs --bots                           keep the parked bot cursors (hidden by default: they cover content)
//
// The page builds itself with animated bot cursors. Here it is captured in its FINISHED state
// (prefers-reduced-motion: the build engine shows everything at once). To judge the animation itself,
// see the Playwright notes in PLAN.md ("Arbeitsweise"). Files of earlier runs with the same name are overwritten.

import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ROOT, VIEWPORTS, loadPlaywright, openBuilt, serve } from './lib.mjs';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i < 0 ? null : args.splice(i, 2)[1]; };
const withBots = args.includes('--bots') && args.splice(args.indexOf('--bots'), 1).length > 0;
const out = resolve(flag('--out') ?? join(ROOT, 'screenshots'));
const only = flag('--only')?.split(',');
const wanted = args.length ? args : Object.keys(VIEWPORTS);
for (const w of wanted) {
    if (!VIEWPORTS[w]) { console.error(`Unknown viewport "${w}". Use: ${Object.keys(VIEWPORTS).join(', ')}`); process.exit(1); }
}

const { chromium } = loadPlaywright();
const server = await serve();
const browser = await chromium.launch();

try {
    for (const name of wanted) {
        const dir = join(out, name);
        await mkdir(dir, { recursive: true });
        const { context, page, problems } = await openBuilt(browser, server.url, VIEWPORTS[name]);
        // The parked bots (and their name tags) sit on top of content; hide them unless asked for.
        if (!withBots) await page.addStyleTag({ content: '#cursor-layer { visibility: hidden !important; }' });

        if (!only) await page.screenshot({ path: join(dir, '00-full-page.png'), fullPage: true });

        const sections = await page.$$('[data-section]');
        let n = 0;
        for (const el of sections) {
            n++;
            const label = (await el.getAttribute('id')) || (await el.getAttribute('data-section')) || (await el.evaluate((e) => e.tagName.toLowerCase()));
            if (only && !only.includes(label)) continue;
            await el.scrollIntoViewIfNeeded();
            await el.screenshot({ path: join(dir, `${String(n).padStart(2, '0')}-${label}.png`) });
        }
        console.log(`${name} (${VIEWPORTS[name].width}px): ${n} sections -> ${dir}`);
        for (const p of problems) console.log(`  ! ${p}`);
        await context.close();
    }
} finally {
    await browser.close();
    server.close();
}
