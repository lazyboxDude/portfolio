// Shared helpers for tools/check.mjs and tools/shoot.mjs: a tiny static file server (no dependencies)
// and a Playwright loader. Playwright is not a dependency of the site; it is pre-installed in the dev environment.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const { chromium } = createRequire(import.meta.url)('playwright');

const TYPES = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
    '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain', '.ico': 'image/x-icon',
};

/** Serve the repo root on a free port. Resolves to { url, close }. */
export function serve() {
    const server = http.createServer((req, res) => {
        let file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
        if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
        if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
        fs.readFile(file, (err, data) => {
            if (err) { res.writeHead(404).end('not found'); return; }
            res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' }).end(data);
        });
    });
    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => resolve({
            url: `http://127.0.0.1:${server.address().port}`,
            close: () => new Promise((r) => server.close(r)),
        }));
    });
}

export const VIEWPORTS = {
    desktop: { width: 1440, height: 900 },
    mobile: { width: 390, height: 844 },
};

/** True once the hero is fully built (every character typed, every shape dragged out, underline drawn). */
export const HERO_BUILT = () => {
    const hero = document.querySelector('.s-hero');
    if (!hero) return false;
    const typed = [...hero.querySelectorAll('.ch')].every((c) => c.classList.contains('on'));
    const shown = [...hero.querySelectorAll('[data-box]')].every((e) => e.classList.contains('is-shown'));
    const line = [...hero.querySelectorAll('.underline')].every((u) => parseFloat(u.style.scale) === 1);
    return typed && shown && line;
};

/** Click the start box the way a visitor does. */
export async function startBuild(page) {
    await page.locator('#box').click({ force: true });
}
