// Automated checks for the site. Exit code 0 = all green.
//   node tools/check.mjs [--quick]     (--quick skips the animated hero build, ~15 s)
// Covers: build contract (IDs, data attributes), contrast 4.5:1 of all visible text, touch targets >= 40px,
// no horizontal overflow, no external requests on the homepage, the live build (no NaN in the bots),
// prefers-reduced-motion, no-JS, and that the other pages still load.

import { chromium, serve, VIEWPORTS, HERO_BUILT, startBuild } from './lib.mjs';

const quick = process.argv.includes('--quick');
const results = [];
const check = (name, ok, detail = '') => {
    results.push({ name, ok });
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`);
};

const IDS = ['box', 'next', 'cursor-layer', 'site', 'glow', 'status', 'swarm-canvas', 'swarm-count', 'swarm-more', 'swarm-stack', 'headline', 'hello', 'nav', 'nav-cta'];

/** Runs in the page: contrast of every visible text node against the first opaque ancestor background. */
const CONTRAST = () => {
    const parse = (c) => { const m = c.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 }; };
    const lum = ({ r, g, b }) => {
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const bad = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.data.trim()) continue;
        const el = n.parentElement;
        if (el.closest('.sr-only, [hidden], .cursor-layer, canvas, [aria-hidden="true"] .poster, .poster, .mini, .box, .next')) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        if ([...(function* () { for (let a = el; a; a = a.parentElement) yield a; })()].some((a) => getComputedStyle(a).mixBlendMode !== 'normal')) continue; // blended text (h1) is checked by eye
        const r = document.createRange(); r.selectNodeContents(n);
        if (!r.getClientRects().length) continue;
        let bg = null, skip = false;
        for (let a = el; a; a = a.parentElement) {
            const s = getComputedStyle(a);
            if (s.backgroundImage !== 'none') { skip = true; break; }
            const c = parse(s.backgroundColor);
            if (c.a > 0.5) { bg = c; break; }
        }
        if (skip) continue;
        bg ??= parse(getComputedStyle(document.documentElement).backgroundColor);
        const fg = parse(cs.color);
        const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
        const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
        const got = ratio({ ...fg }, bg);
        if (got < need) bad.push(`${el.tagName.toLowerCase()}.${el.className} "${n.data.trim().slice(0, 24)}" ${got.toFixed(2)}<${need}`);
    }
    return bad;
};

/** Runs in the page: interactive things in the hero, nav, buttons and footer that are smaller than 40px. */
const TOUCH = () => {
    const small = [];
    for (const el of document.querySelectorAll('.s-hero a, .btn, .nav-cta, .footer a, .layer-btn, #box, #next')) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (!r.width || cs.visibility === 'hidden' || cs.display === 'none') continue;
        if (Math.min(r.width, r.height) < 40 - 0.5) small.push(`${el.className || el.tagName} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return small;
};

const server = await serve();
const browser = await chromium.launch();
const requests = [];

try {
    // ---- Static contract -----------------------------------------------------------------------
    {
        const ctx = await browser.newContext({ viewport: VIEWPORTS.desktop, reducedMotion: 'reduce' });
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('request', (r) => { if (!r.url().startsWith(server.url)) requests.push(r.url()); });
        await page.goto(server.url + '/index.html');
        await page.evaluate(() => document.fonts.ready);

        const missing = await page.evaluate((ids) => ids.filter((id) => !document.getElementById(id)), IDS);
        check('IDs of the build contract exist', !missing.length, missing.join(', '));
        const contract = await page.evaluate(() => ({
            sections: document.querySelectorAll('[data-section]').length,
            boxes: document.querySelectorAll('[data-box]').length,
            types: document.querySelectorAll('[data-type]').length,
            h1: document.querySelectorAll('h1').length,
            underline: document.querySelectorAll('[data-underline]').length,
            outline: document.querySelectorAll('[data-outline]').length,
        }));
        check('data-section / data-box / data-type present, one h1', contract.sections >= 8 && contract.boxes > 10 && contract.types > 50 && contract.h1 === 1 && contract.underline >= 2 && contract.outline >= 3, JSON.stringify(contract));
        check('no script errors on load', !errors.length, errors.join(' | '));
        check('Space Grotesk and Instrument Serif are loaded', await page.evaluate(() => document.fonts.check('700 20px "Space Grotesk"') && document.fonts.check('italic 20px "Instrument Serif"')));

        // Tokens: contrast pairs from the :root custom properties.
        const tokens = await page.evaluate(() => {
            const cs = getComputedStyle(document.documentElement);
            return Object.fromEntries(['--bg', '--surface', '--fg', '--muted', '--subtle', '--accent'].map((k) => [k, cs.getPropertyValue(k).trim()]));
        });
        const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
        const L = (h) => { const [r, g, b] = hex(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
        const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
        const pairs = [['--fg', '--bg'], ['--muted', '--bg'], ['--subtle', '--bg'], ['--subtle', '--surface'], ['--accent', '--bg'], ['--accent', '--surface']];
        const lows = pairs.filter(([a, b]) => ratio(tokens[a], tokens[b]) < 4.5).map(([a, b]) => `${a} on ${b} ${ratio(tokens[a], tokens[b]).toFixed(2)}`);
        check('token pairs reach 4.5:1', !lows.length, lows.join(', ') || pairs.map(([a, b]) => `${a}/${b} ${ratio(tokens[a], tokens[b]).toFixed(1)}`).join('  '));
        check('white on accent reaches 4.5:1', ratio('#ffffff', tokens['--accent']) >= 4.5, ratio('#ffffff', tokens['--accent']).toFixed(2));
        await ctx.close();
    }

    // ---- Built page per viewport (reduced motion = built at once) --------------------------------
    for (const [label, viewport] of Object.entries(VIEWPORTS)) {
        const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce' });
        const page = await ctx.newPage();
        await page.goto(server.url + '/index.html');
        await page.evaluate(() => document.fonts.ready);
        await startBuild(page);
        await page.waitForFunction(() => document.getElementById('status').textContent === 'Website built.');
        await page.waitForTimeout(300);

        const low = await page.evaluate(CONTRAST);
        check(`[${label}] text contrast`, !low.length, low.slice(0, 6).join(' | '));
        const small = await page.evaluate(TOUCH);
        check(`[${label}] touch targets >= 40px`, !small.length, small.slice(0, 6).join(' | '));
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        check(`[${label}] no horizontal scroll`, overflow <= 0, `${overflow}px`);
        const hero = await page.evaluate(() => {
            const h1 = document.querySelector('h1'), hero = document.querySelector('.hero');
            const cs = getComputedStyle(h1), hs = getComputedStyle(hero);
            return { blend: cs.mixBlendMode, iso: hs.isolation, lines: Math.round(h1.getBoundingClientRect().height / parseFloat(cs.lineHeight)), size: parseFloat(cs.fontSize), weight: cs.fontWeight, text: h1.textContent.replace(/\s+/g, ' ').trim(), navH: document.querySelector('.nav').getBoundingClientRect().height };
        });
        check(`[${label}] h1 is the name, one line, 700, hero isolated`, hero.lines === 1 && hero.weight === '700' && hero.iso === 'isolate' && hero.text.includes('Micael Gomes Fernandes'), JSON.stringify(hero));
        check(`[${label}] blend only on desktop`, label === 'desktop' ? hero.blend === 'difference' : hero.blend === 'normal', hero.blend);
        if (label === 'desktop') check('[desktop] nav is 72px high', Math.abs(hero.navH - 73) <= 1.5, `${hero.navH}px incl. line`);
        const radius = await page.evaluate(() => [...document.querySelectorAll('.btn, .nav-cta, .layer-btn, .next, .box')].filter((e) => parseFloat(getComputedStyle(e).borderTopLeftRadius) !== 0).map((e) => e.className));
        check(`[${label}] buttons are square`, !radius.length, radius.join(', '));
        await ctx.close();
    }

    // ---- Live build (animated) ------------------------------------------------------------------
    if (!quick) {
        const ctx = await browser.newContext({ viewport: VIEWPORTS.desktop });
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
        await page.goto(server.url + '/index.html');
        await page.evaluate(() => document.fonts.ready);
        const before = await page.evaluate(() => getComputedStyle(document.getElementById('site')).visibility);
        check('before the click the page is hidden (nothing to tab to)', before === 'hidden');
        await startBuild(page);
        let built = true;
        try { await page.waitForFunction(HERO_BUILT, null, { timeout: 60000 }); } catch { built = false; }
        check('hero builds itself (chars typed, shapes dragged, underline drawn)', built);
        const nan = await page.evaluate(() => [...document.querySelectorAll('.fake-cursor, .inspector-tag')].filter((e) => /NaN/.test(e.style.transform + e.style.cssText)).length);
        check('no NaN positions on the bots (square outlines)', nan === 0, String(nan));
        check('no console or script errors during the build', !errors.length, errors.join(' | '));
        await ctx.close();
    }

    // ---- No JS -----------------------------------------------------------------------------------
    {
        const ctx = await browser.newContext({ viewport: VIEWPORTS.mobile, javaScriptEnabled: false });
        const page = await ctx.newPage();
        await page.goto(server.url + '/index.html');
        await page.waitForTimeout(300);
        const state = await page.evaluate(() => ({
            hidden: [...document.querySelectorAll('[data-type], [data-box]')].filter((e) => { const s = getComputedStyle(e); return s.visibility === 'hidden' || s.opacity === '0'; }).length,
            box: getComputedStyle(document.getElementById('box')).display,
            h1: getComputedStyle(document.querySelector('h1')).color,
        }));
        check('without JS everything is visible, no start box', state.hidden === 0 && state.box === 'none', JSON.stringify(state));
        await ctx.close();
    }

    // ---- Homepage makes no third-party requests -------------------------------------------------
    check('homepage requests only same-origin files (no Google)', !requests.length, requests.join(', '));

    // ---- Other pages still load -----------------------------------------------------------------
    for (const file of ['dienstplan.html', 'datenschutz.html', 'nutzungsbedingungen.html', 'cv.html']) {
        const ctx = await browser.newContext({ viewport: VIEWPORTS.desktop });
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        const resp = await page.goto(`${server.url}/${file}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
        check(`${file} loads`, resp.status() === 200 && !errors.length, errors.join(' | '));
        await ctx.close();
    }
} finally {
    await browser.close();
    await server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
