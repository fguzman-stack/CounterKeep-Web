import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, stat, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const origin = process.env.WEB_URL || 'http://127.0.0.1:4321';
const base = (process.env.BASE_PATH || '/').replace(/\/$/, '');
const browser = await chromium.launch();
await mkdir('test-results', { recursive: true });
try {
  for (const locale of ['', 'es/']) {
    for (const width of [1440, 768, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
      await page.goto(`${origin}${base}/${locale}`, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('html').getAttribute('lang'), locale ? 'es' : 'en');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(overflow <= 1, `Horizontal overflow: ${width}, ${locale}, ${overflow}`);
      for (let i = 0; i < 5; i++) {
        await page.locator(`[data-tab="${i}"]`).click();
        assert.equal(await page.locator(`#panel-${i}`).isVisible(), true);
        assert.equal(await page.locator(`[data-tab="${i}"]`).getAttribute('aria-selected'), 'true');
        const img = page.locator(`#panel-${i} img`);
        await img.evaluate(image => image.decode());
        assert.ok(await img.evaluate(image => image.naturalWidth === 1920 && image.naturalHeight === 1080));
        await page.locator(`#panel-${i} .screen-open`).click();
        assert.equal(await page.locator('dialog').isVisible(), true);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('dialog').isVisible(), false);
      }
      await page.locator('[data-tab="0"]').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('[data-tab="1"]').getAttribute('aria-selected'), 'true');
      await page.locator('details').first().locator('summary').click();
      assert.equal(await page.locator('details').first().getAttribute('open'), '');
      const links = await page.locator('a[href]').evaluateAll(links => links.map(a => a.getAttribute('href')));
      for (const href of new Set(links)) {
        if (href.startsWith('#')) assert.ok(await page.locator(href).count(), `Missing anchor ${href}`);
        else if (href.startsWith('/')) {
          const res = await page.request.get(`${origin}${href.split('#')[0]}`);
          assert.equal(res.status(), 200, `Broken link: ${href}`);
        }
      }
      assert.deepEqual(errors, []);
      await page.locator('[data-tab="0"]').click();
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
      await page.screenshot({ path: `test-results/site-${locale ? 'es' : 'en'}-${width}.png`, fullPage: true });
      await page.close();
    }
  }
  const page = await browser.newPage();
  for (const locale of ['', 'es/']) for (const name of ['help', 'privacy', 'terms']) {
    const res = await page.goto(`${origin}${base}/${locale}${name}/`);
    assert.equal(res.status(), 200);
    assert.equal(await page.locator('h1').count(), 1);
    await page.locator('.language-switch').click();
    assert.ok(page.url().includes(`/${name}/`));
    assert.equal(await page.locator('html').getAttribute('lang'), locale ? 'en' : 'es');
  }
  for (const route of ['robots.txt', 'sitemap.xml']) assert.equal((await page.request.get(`${origin}${base}/${route}`)).status(), 200);
  const manifest = JSON.parse(await readFile('public/images/capture-manifest.json', 'utf8'));
  assert.equal(manifest.length, 10);
  for (const shot of manifest) assert.ok((await stat(resolve('public/images', shot.file))).size < 5 * 1024 * 1024, `${shot.file} exceeds AppSumo size limit`);
  console.log('PASS: 8 responsive/language combinations, 40 gallery/modal checks, keyboard navigation, FAQs, local links, 6 information pages, SEO endpoints and 10 AppSumo-sized screenshots.');
} finally { await browser.close(); }
