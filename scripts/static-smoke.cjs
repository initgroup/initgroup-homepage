const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
fs.mkdirSync(path.join(root, '.tmp'), {recursive: true});
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'static-files.json'), 'utf8'));
const pages = manifest.filter(name => name.endsWith('.html'));
(async () => {
  const browser = await chromium.launch({headless: true});
  const failures = [];
  let checked = 0;
  try {
    for (const prefix of ['', 'preview/']) {
      const context = await browser.newContext({ viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.on('pageerror', error => failures.push(error.message));
      page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
      page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
      for (const file of pages) {
        const url = `http://127.0.0.1:8200/${prefix}${file}`;
        const response = await page.goto(url, {waitUntil: 'load'});
        assert.equal(response.status(), 200, url);
        await page.evaluate(() => window.INIT_I18N.ready);
        for (const language of ['ko', 'en']) {
          await page.evaluate(language => window.INIT_I18N.setLanguage(language), language);
          await page.locator('img[loading="lazy"]').evaluateAll(images => images.forEach(img => { img.loading = 'eager'; }));
          await page.waitForFunction(() => [...document.images].every(img => img.complete));
          assert.equal(await page.locator('html').getAttribute('lang'), language, url);
          const brokenImages = await page.locator('img').evaluateAll(images => images.filter(img => !img.naturalWidth).map(img => img.getAttribute('src')));
          assert.deepEqual(brokenImages, [], `${url} ${language}`);
          const badRefs = await page.locator('[src], [href], [data-image], [data-i18n-image-base]').evaluateAll(elements => elements.flatMap(element => ['src','href','data-image','data-i18n-image-base'].map(name => element.getAttribute(name)).filter(value => value?.startsWith('/'))));
          assert.deepEqual(badRefs, [], url);
          const wrongLanguageImages = await page.locator('img[data-i18n-image-base]').evaluateAll((images, language) => images.filter(img => !img.getAttribute('src').endsWith(language === 'en' ? '_eng.png' : '_kor.png')).map(img => img.getAttribute('src')), language);
          assert.deepEqual(wrongLanguageImages, [], `${url} localized images`);
        }
        checked++;
      }
      // Directory URL normalization and language persistence across navigation.
      await page.goto(`http://127.0.0.1:8200/${prefix}services/`, {waitUntil: 'load'});
      await page.evaluate(() => window.INIT_I18N.ready);
      assert.equal(await page.locator('html').getAttribute('lang'), 'en');
      assert.equal(await page.locator('[data-page-sub-link][aria-current="page"]').count(), 1);
      await page.locator('[data-page-sub-link][href$="#quality"]').click();
      assert.ok(page.url().endsWith('services/index.html#quality'));
      await page.goto(`http://127.0.0.1:8200/${prefix}solutions/data-editing-system/index.html`, {waitUntil: 'load'});
      await page.evaluate(() => window.INIT_I18N.ready);
      await page.locator('[data-language="ko"]').click();
      assert.equal(await page.locator('html').getAttribute('lang'), 'ko');
      await page.goto(`http://127.0.0.1:8200/${prefix}`, {waitUntil: 'load'});
      await page.screenshot({path: path.join(root, '.tmp', prefix ? 'static-subdirectory.png' : 'static-desktop.png')});
      await page.setViewportSize({width: 390, height: 844});
      await page.locator('[data-menu-toggle]').click();
      assert.equal(await page.locator('[data-mobile-menu]').evaluate(menu => menu.hidden), false);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('[data-mobile-menu]').evaluate(menu => menu.hidden), true);
      await page.screenshot({path: path.join(root, '.tmp', prefix ? 'static-mobile-subdirectory.png' : 'static-mobile.png')});
      await context.close();
      console.log(`Checked ${pages.length} pages in Korean and English under /${prefix}`);
    }
    const context = await browser.newContext({javaScriptEnabled: false});
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:8200/preview/company/');
    assert.equal(await page.locator('h1').count(), 1);
    await page.locator('.brand').click();
    assert.equal(page.url(), 'http://127.0.0.1:8200/preview/index.html');
    await context.close();
    const request = await browser.newContext();
    for (const url of ['missing/deep/page.html','main.py','templates/base.html','.env','.git/config','api/health','healthz']) {
      const response = await request.request.get(`http://127.0.0.1:8200/${url}`);
      assert.equal(response.status(), 404, url);
    }
    for (const file of manifest.filter(name => name !== '.htaccess')) {
      const response = await request.request.head(`http://127.0.0.1:8200/${file}`);
      assert.equal(response.status(), 200, file);
    }
    await request.close();
    assert.deepEqual([...new Set(failures)], []);
    console.log(`PASS: ${checked} page locations x 2 languages; directory URLs, anchors, persistence, localized images, mobile menu, no-JS links, 404 and every public resource.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
