// Shared helpers for the dev tools (tools/shoot.mjs, tools/check.mjs).
// Dev only: nothing here is loaded by the website, and it needs no npm install:
// Playwright comes from the environment (a global install is found via NODE_PATH).

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const VIEWPORTS = {
    desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
    tablet: { width: 820, height: 1180, deviceScaleFactor: 1 },
    mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const TYPES = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

/** Tiny static file server for the repo root (like `python3 -m http.server`, but on a free port). */
export async function serve() {
    const server = createServer(async (req, res) => {
        try {
            let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
            if (path.endsWith('/')) path += 'index.html';
            const file = join(ROOT, path);
            if (!file.startsWith(ROOT)) throw new Error('outside root');
            if (!(await stat(file)).isFile()) throw new Error('not a file');
            res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
            res.end(await readFile(file));
        } catch {
            res.writeHead(404).end('not found');
        }
    });
    await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
    return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

export function loadPlaywright() {
    try {
        return createRequire(import.meta.url)('playwright');
    } catch {
        console.error('Playwright not found. Install it (npm i -g playwright) or run this in the Claude Code cloud environment, where it is preinstalled.');
        process.exit(1);
    }
}

/**
 * Collects page errors, console errors and failed requests of a page.
 * Failures of requests to OTHER hosts (CDNs used by dienstplan.html and the legal pages) are not the
 * site's fault and the sandbox often blocks them, so they are left out.
 */
export function watchProblems(page) {
    const problems = [];
    const local = (url) => url.startsWith('http://127.0.0.1');
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && (!m.location().url || local(m.location().url))) problems.push(`console: ${m.text()}`); });
    page.on('requestfailed', (r) => { if (local(r.url())) problems.push(`request failed: ${r.url()}`); });
    page.on('response', (r) => { if (r.status() >= 400 && local(r.url())) problems.push(`HTTP ${r.status()}: ${r.url()}`); });
    return problems;
}

/**
 * Open the home page in its finished state: with reduced motion the build engine shows everything at once
 * (no bots animating), after the start box is clicked. Lazy images are loaded by scrolling through the page once.
 */
export async function openBuilt(browser, baseUrl, viewport, { reducedMotion = true } = {}) {
    const context = await browser.newContext({ ...viewport, reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    const problems = watchProblems(page);
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.click('#box', { force: true });
    await page.waitForSelector('html.is-live');
    // Scroll through once so lazy images load and the scroll-driven build reaches every section.
    await page.evaluate(async () => {
        const step = Math.max(200, innerHeight * 0.6);
        for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
            scrollTo({ top: y, behavior: 'instant' });
            await new Promise((r) => setTimeout(r, 60));
        }
        scrollTo({ top: 0, behavior: 'instant' });
        await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
    });
    return { context, page, problems };
}
