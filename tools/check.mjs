#!/usr/bin/env node
// Guard rails for visual changes. Run after every design edit:   node tools/check.mjs
//
//   1. Console/page errors and failed requests on every page (home, cv, dienstplan, legal pages)
//   2. No horizontal scrolling on the home page (desktop, tablet, mobile)
//   3. Home page without JS: all text visible, the start box and the replay pill hidden
//   4. Home page after the build: nothing stays hidden (data-box shown, every typed character on)
//   5. Contrast of the text colour tokens against --bg (WCAG AA, 4.5:1)
//
// Exit code 1 if something fails. Needs Playwright (preinstalled in the cloud environment).

import { VIEWPORTS, loadPlaywright, openBuilt, serve, watchProblems } from './lib.mjs';

const { chromium } = loadPlaywright();
const server = await serve();
const browser = await chromium.launch();
let failed = 0;
const report = (ok, text) => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`); };

// WCAG relative luminance and contrast ratio for #rrggbb colours.
const luminance = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
};

try {
    // 1. Every page loads cleanly.
    for (const file of ['index.html', 'cv.html', 'dienstplan.html', 'datenschutz.html', 'nutzungsbedingungen.html']) {
        const page = await browser.newPage();
        const problems = watchProblems(page);
        await page.goto(`${server.url}/${file}`, { waitUntil: 'load' });
        await page.waitForTimeout(300);
        report(problems.length === 0, `${file} loads without errors${problems.length ? `\n       ${problems.join('\n       ')}` : ''}`);
        await page.close();
    }

    // 2 + 4. Finished home page per viewport.
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
        const { context, page, problems } = await openBuilt(browser, server.url, viewport);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        report(overflow <= 0, `${name}: no horizontal scrolling${overflow > 0 ? ` (${overflow}px too wide)` : ''}`);
        const hidden = await page.evaluate(() => ({
            boxes: [...document.querySelectorAll('[data-box]')].filter((e) => !e.classList.contains('is-shown')).length,
            chars: document.querySelectorAll('.ch:not(.on)').length,
        }));
        report(hidden.boxes === 0 && hidden.chars === 0, `${name}: finished page has nothing hidden (${hidden.boxes} boxes, ${hidden.chars} characters)`);
        report(problems.length === 0, `${name}: no errors while building${problems.length ? `\n       ${problems.join('\n       ')}` : ''}`);
        await context.close();
    }

    // 3. Without JS the page is the CV: all text readable.
    {
        const context = await browser.newContext({ ...VIEWPORTS.desktop, javaScriptEnabled: false });
        const page = await context.newPage();
        await page.goto(`${server.url}/index.html`, { waitUntil: 'load' });
        const state = await page.evaluate(() => {
            const shown = (el) => !!el && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
            return {
                site: shown(document.getElementById('site')),
                headline: shown(document.getElementById('headline')),
                box: shown(document.getElementById('box')),
                next: shown(document.getElementById('next')),
            };
        });
        report(state.site && state.headline && !state.box && !state.next, `no JS: page visible, start box and replay pill hidden ${JSON.stringify(state)}`);
        await context.close();
    }

    // 5. Contrast of the colour tokens that carry text.
    {
        const page = await browser.newPage();
        await page.goto(`${server.url}/index.html`);
        const tokens = await page.evaluate(() => {
            const css = getComputedStyle(document.documentElement);
            const read = (n) => css.getPropertyValue(n).trim();
            return Object.fromEntries(['--bg', '--fg', '--muted', '--subtle', '--accent', '--accent-soft'].map((n) => [n, read(n)]));
        });
        for (const name of ['--fg', '--muted', '--subtle', '--accent', '--accent-soft']) {
            if (!/^#[0-9a-f]{6}$/i.test(tokens[name]) || !/^#[0-9a-f]{6}$/i.test(tokens['--bg'])) {
                report(false, `${name}: not a #rrggbb colour (${tokens[name]}), contrast not checked`);
                continue;
            }
            const ratio = contrast(tokens[name], tokens['--bg']);
            report(ratio >= 4.5, `contrast ${name} ${tokens[name]} on --bg ${tokens['--bg']}: ${ratio.toFixed(2)}:1`);
        }
        await page.close();
    }
} finally {
    await browser.close();
    server.close();
}

console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
