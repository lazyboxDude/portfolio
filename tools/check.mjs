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

const BOTS = 5; // layout, copy, design, a11y, motion
const IDS = ['box', 'box-wrap', 'box-count', 'cursor-layer', 'site', 'glow', 'status', 'swarm-canvas', 'swarm-count', 'swarm-more', 'swarm-stack', 'headline', 'hello', 'nav', 'nav-cta'];

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
        if (el.closest('.sr-only, [hidden], .cursor-layer, canvas, [aria-hidden="true"] .poster, .poster, .mini, .box')) continue;
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
    for (const el of document.querySelectorAll('.s-hero a, .btn, .nav-cta, .footer a, .layer-btn, #box')) {
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
        const radius = await page.evaluate(() => [...document.querySelectorAll('.btn, .nav-cta, .layer-btn, .box')].filter((e) => parseFloat(getComputedStyle(e).borderTopLeftRadius) !== 0).map((e) => e.className));
        check(`[${label}] buttons are square`, !radius.length, radius.join(', '));

        // Reduced motion: the box is docked at once, every bot is at home, nothing to call.
        const dock = await page.evaluate(() => {
            const w = document.getElementById('box-wrap'), r = w.getBoundingClientRect(), cs = getComputedStyle(w);
            return {
                parent: w.parentElement.tagName, position: cs.position, w: Math.round(r.width),
                right: Math.round(innerWidth - r.right), bottom: Math.round(innerHeight - r.bottom),
                home: document.querySelectorAll('.fake-cursor.is-home').length, badge: document.querySelector('.box-count-n').textContent,
                role: document.getElementById('box-count').getAttribute('role'), disabled: document.getElementById('box').getAttribute('aria-disabled'),
                label: document.getElementById('box').getAttribute('aria-label'), art: document.querySelector('.box-art').getAttribute('aria-hidden'),
                next: !!document.getElementById('next'),
            };
        });
        const m = label === 'desktop' ? { w: 120, edge: 24 } : { w: 72, edge: 16 };
        check(`[${label}] box docked bottom right (${m.w}px, ${m.edge}px margin), no replay pill`, dock.parent === 'BODY' && dock.position === 'fixed' && dock.w === m.w && dock.right === m.edge && dock.bottom === m.edge && !dock.next, JSON.stringify(dock));
        check(`[${label}] reduced motion: all bots home, box locked, status role, graphic hidden`, dock.home === BOTS && dock.badge === String(BOTS) && dock.role === 'status' && dock.disabled === 'true' && dock.art === 'true', `${dock.home} home, label "${dock.label}"`);
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

        // The box: the lid opens at the click, it flies to the corner once the name is typed, it is not clickable while building.
        const early = await page.evaluate(() => ({ cls: document.getElementById('box-wrap').className, disabled: document.getElementById('box').getAttribute('aria-disabled') }));
        check('the box is not clickable while the bots build', early.disabled === 'true', early.cls);
        let flew = true;
        try { await page.waitForFunction(() => document.getElementById('box-wrap').classList.contains('is-home'), null, { timeout: 20000 }); } catch { flew = false; }
        const landed = await page.evaluate(() => { const r = document.getElementById('box-wrap').getBoundingClientRect(); return { right: Math.round(innerWidth - r.right), bottom: Math.round(innerHeight - r.bottom), w: Math.round(r.width), parent: document.getElementById('box-wrap').parentElement.tagName }; });
        check('the box flew to the bottom-right corner and stays there', flew && landed.right === 24 && landed.bottom === 24 && landed.w === 120 && landed.parent === 'BODY', JSON.stringify(landed));

        // Idle bots walk home one by one; the badge, the tooltip and the (calm) live region follow.
        let home = true;
        try { await page.waitForFunction((n) => document.querySelectorAll('.fake-cursor.is-home').length === n && document.getElementById('box').getAttribute('aria-disabled') === 'false', BOTS, { timeout: 90000 }); } catch { home = false; }
        check('idle bots walk home into the box (all at home, box clickable again)', home);
        await page.hover('#box');
        await page.waitForTimeout(300); // the tooltip fades in
        const shown = await page.evaluate(() => ({ badge: document.querySelector('.box-count-n').textContent, tip: document.querySelector('.box-tip').textContent, tipOpacity: getComputedStyle(document.querySelector('.box-tip')).opacity }));
        check('badge and tooltip count the bots at home, the tooltip shows on hover', shown.badge === String(BOTS) && shown.tip === `${BOTS} home` && shown.tipOpacity === '1', JSON.stringify(shown));
        await page.waitForTimeout(1200);
        const said = await page.evaluate(() => document.querySelector('#box-count .sr-only').textContent);
        check('live region says it once, calmly', said === `${BOTS} bots are at home.`, said);

        // A section that comes into reach calls only the bots it needs out of the box.
        await page.evaluate(() => window.scrollTo({ top: document.getElementById('experience').offsetTop - 100, behavior: 'instant' }));
        let out = true;
        try { await page.waitForFunction((n) => document.querySelectorAll('.fake-cursor.is-home').length < n, BOTS, { timeout: 8000 }); } catch { out = false; }
        const homeNow = await page.evaluate(() => document.querySelectorAll('.fake-cursor.is-home').length);
        check('a section being built calls bots out of the box (not all of them)', out && homeNow >= 1, `${homeNow} still home`);
        let calm = true;
        try { await page.waitForFunction((n) => document.querySelectorAll('.fake-cursor.is-home').length === n, BOTS, { timeout: 90000 }); } catch { calm = false; }
        check('after the work they all go home again', calm);

        // Click on the docked box: all bots out, everything is built again; the box ignores clicks meanwhile.
        await page.locator('#box').click();
        await page.waitForTimeout(300);
        const replay = await page.evaluate(() => ({ disabled: document.getElementById('box').getAttribute('aria-disabled'), y: scrollY, built: [...document.querySelectorAll('.s-hero .ch.on')].length }));
        await page.locator('#box').click({ force: true }); // ignored while building (aria-disabled)
        await page.waitForTimeout(300);
        check('click on the docked box builds everything again, then it is disabled while building', replay.disabled === 'true' && replay.y === 0, JSON.stringify(replay));
        let again = true;
        try { await page.waitForFunction(HERO_BUILT, null, { timeout: 60000 }); } catch { again = false; }
        check('the replay builds the hero again', again);
        check('no console or script errors during the build', !errors.length, errors.join(' | '));
        await ctx.close();
    }

    // ---- Scrolling through while the bots build must never hang the build ------------------------
    if (!quick) {
        const ctx = await browser.newContext({ viewport: VIEWPORTS.desktop });
        const page = await ctx.newPage();
        await page.goto(server.url + '/index.html');
        await page.evaluate(() => document.fonts.ready);
        await startBuild(page);
        await page.waitForFunction(HERO_BUILT, null, { timeout: 60000 });
        await page.evaluate(() => window.scrollTo({ top: document.getElementById('projects').offsetTop - 60, behavior: 'instant' }));
        await page.waitForTimeout(5000); // stand still in the middle of a build, then run past everything
        for (let y = 0; y < 12000; y += 500) {
            await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
            await page.waitForTimeout(600);
        }
        let done = true;
        try { await page.waitForFunction(() => document.getElementById('box').getAttribute('aria-disabled') === 'false', null, { timeout: 90000 }); } catch { done = false; }
        const left = await page.evaluate(() => document.querySelectorAll('#site [data-section] .ch:not(.on)').length);
        check('scrolling past the building sections does not hang the build (box clickable, all text there)', done && left === 0, `${left} characters missing`);
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
            box: getComputedStyle(document.querySelector('.box-slot')).display,
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
