// Re-take the social preview image (images/og.jpg, 1200 x 630) from the finished hero.
//   node tools/og.mjs
// Uses prefers-reduced-motion, so the page is built at once and the shot is the same every time.

import path from 'node:path';
import { chromium, serve, ROOT } from './lib.mjs';

const server = await serve();
const browser = await chromium.launch();
try {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(server.url + '/index.html');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#box').click({ force: true });
    await page.waitForFunction(() => document.getElementById('status').textContent === 'Website built.');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ROOT, 'images', 'og.jpg'), type: 'jpeg', quality: 82 });
} finally {
    await browser.close();
    await server.close();
}
