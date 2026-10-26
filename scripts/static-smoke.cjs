const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
fs.mkdirSync(path.join(root, '.tmp'), {recursive: true});
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'static-files.json'), 'utf8'));
const pages = manifest.filter(name => name.endsWith('.html') && !name.startsWith('assets/'));
const catalogs = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(fs.readFileSync(path.join(root, `assets/i18n/${language}.json`), 'utf8'))]));
const siteConfig = JSON.parse(fs.readFileSync(path.join(root, 'assets/shared/site.json'), 'utf8'));
const navigation = siteConfig.navigation;
const { checkMetadataPaths } = require('./lib/check-metadata.cjs');
for (const language of ['ko','en']) {
  for (const [id,item] of Object.entries(navigation.links)) catalogs[language]['navigation.'+id] = item.label[language];
  for (const group of navigation.groups) catalogs[language]['navigation.submenu.'+group.id] = navigation.submenuLabelFormat[language].replace('{label}',navigation.links[group.root].label[language]);
}
async function checkSharedRendering(page, language, url) {
  const data = await page.evaluate(() => {
    const normalize = value => value.replace(/\s+/g, ' ').trim();
    const names = [...document.querySelectorAll('.company-name')].map(element => {
      const range = document.createRange(); range.selectNodeContents(element);
      const tops = [...range.getClientRects()].filter(rect => rect.width).map(rect => rect.top);
      return {text: element.textContent, nowrap: getComputedStyle(element).whiteSpace, lines: new Set(tops.map(y => Math.round(y))).size};
    });
    const unwrapped = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (/(?:\u321c|\(\uc8fc\))\s*\uc778\uc544\uc774\ud2f0/.test(node.nodeValue) && !node.parentElement.closest('.company-name, script, style')) unwrapped.push(node.nodeValue);
    }
    return {
      names, unwrapped,
      retiredProductMarkup: /\uC778\uB381\uC2A4|in[-_ ]?deps|INIT[- ]Data Editing Platform System/i.test(document.documentElement.outerHTML),
      display: {visibility:getComputedStyle(document.body).visibility,opacity:getComputedStyle(document.body).opacity,inert:document.body.inert},
      translations: [...document.querySelectorAll('[data-i18n]')].map(element => ({key: element.dataset.i18n, text: normalize(element.textContent)})),
      styles: [...document.querySelectorAll('link[rel="stylesheet"]')].map(element => element.href),
      scripts: [...document.querySelectorAll('script[src]')].map(element => element.src),
      contact: [...document.querySelectorAll('#contactFinalTitle > .heading-line')].map(element => {
        const range = document.createRange(); range.selectNodeContents(element);
        return {text: normalize(element.textContent), display: getComputedStyle(element).display, tops: [...new Set([...range.getClientRects()].filter(r => r.width).map(r => Math.round(r.top)))]};
      })
    };
  });
  assert.deepEqual(data.display, {visibility:"visible",opacity:"1",inert:false}, url+": ready page display");
  assert.deepEqual(data.unwrapped, [], `${url}: unwrapped company name`);
  assert.equal(data.retiredProductMarkup, false, `${url}: retired product text, metadata or identifier`);
  for (const name of data.names) {
    assert.equal(name.nowrap, 'nowrap', `${url}: company-name CSS`);
    assert.ok(name.lines <= 1, `${url}: company name split across lines`);
  }
  for (const item of data.translations) assert.equal(item.text, catalogs[language][item.key].replace(/\s+/g, ' ').trim(), `${url} ${language}: ${item.key}`);
  for (const kind of ['styles', 'scripts']) assert.equal(data[kind].length, new Set(data[kind]).size, `${url}: duplicate ${kind}`);
  if (url.includes('/contact/')) {
    assert.equal(data.contact.length, 4, `${url}: contact phrase count`);
    data.contact.forEach((line, i) => {
      assert.equal(line.text, catalogs[language][`contact.final.line${i + 1}`]);
      assert.equal(line.display, language === 'ko' ? 'block' : 'inline');
      if (language === 'ko' && page.viewportSize().width >= 1440) assert.equal(line.tops.length, 1, 'Desktop contact must have four lines');
    });
  }
}
async function checkSharedNavigation(page) {
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height: width === 390 ? 844 : 1000});
    for (const language of ['ko', 'en']) {
      await page.evaluate(language => window.INIT_I18N.setLanguage(language), language);
      await page.locator('[data-menu-toggle]').click();
      const selector = width === 390 ? '[data-mobile-menu]' : '[data-hover-menu]';
      assert.equal(await page.locator(selector).evaluate(menu => menu.hidden), false);
      await page.waitForFunction(selector => {
        const sections = [...document.querySelectorAll(selector + ' section')];
        return sections.length === 5 && sections.every(section => Number(getComputedStyle(section).opacity) > 0.99);
      }, selector);
      const navigation = await page.locator(selector).evaluate(menu => ({
        overflow: menu.scrollWidth > menu.clientWidth + 1,
        labels: [...menu.querySelectorAll('[data-i18n]')].map(element => ({key: element.dataset.i18n, text: element.textContent.trim()}))
      }));
      assert.equal(navigation.overflow, false, 'Open menu overflows at ' + width + ' ' + language);
      for (const item of navigation.labels) assert.equal(item.text, catalogs[language][item.key], item.key);
      if (width === 390) {
        const lineCount = await page.locator('[data-menu-close]').evaluate(button => {
          const text = [...button.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
          const range = document.createRange(); range.selectNodeContents(text);
          return range.getClientRects().length;
        });
        assert.equal(lineCount, 1, 'Menu close label wraps in ' + language);
        await page.locator('[data-menu-close]').click();
      } else await page.keyboard.press('Escape');
      assert.equal(await page.locator(selector).evaluate(menu => menu.hidden), true);
    }
  }
  await page.setViewportSize({width: 1440, height: 1000});
  await page.evaluate(() => window.INIT_I18N.setLanguage('ko'));
}
async function checkSearchMetadata(page, language, url) {
  const data = await page.evaluate(() => {
    const meta = name => document.querySelector(`meta[property="${name}"],meta[name="${name}"]`)?.content || '';
    return {
      title: document.title, description: meta('description'),
      canonical: document.querySelector('link[rel="canonical"]').getAttribute('href'),
      ogTitle: meta('og:title'), ogDescription: meta('og:description'), ogUrl: meta('og:url'),
      siteName: meta('og:site_name'), image: meta('og:image'), imageAlt: meta('og:image:alt'),
      locale: meta('og:locale'), robots: meta('robots'),
      schemas: [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(script => {
        const value = JSON.parse(script.textContent); return value['@graph'] || [value];
      }),
      retiredLinks: [...document.querySelectorAll('a[href]')].filter(a => /\/insights(?:\/|$)/.test(a.pathname)).map(a => a.href),
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1
    };
  });
  assert.deepEqual(data.retiredLinks, [], `${url}: retired navigation`);
  assert.equal(data.overflow, false, `${url} ${language}: horizontal overflow`);
  if (url.endsWith('404.html')) { assert.match(data.robots, /noindex/); return; }
  assert.equal(data.ogTitle, data.title, `${url}: OG title`);
  assert.equal(data.ogDescription, data.description, `${url}: OG description`);
  assert.equal(data.ogUrl, data.canonical, `${url}: OG URL`);
  assert.ok(data.image && data.imageAlt, `${url}: sharing image`);
  assert.equal(data.locale, language === 'en' ? 'en_US' : 'ko_KR');
  if (url.includes('/privacy/')) assert.match(data.robots, /noindex/);
  else {
    const schema = data.schemas.find(node => ['WebPage','AboutPage','CollectionPage','ContactPage'].includes(node['@type']));
    assert.ok(schema, `${url}: page schema`);
    assert.equal(schema.name, data.title, `${url}: schema title`);
    assert.equal(schema.description, data.description, `${url}: schema description`);
    assert.equal(schema.url, data.canonical, `${url}: schema URL`);
    assert.equal(schema.inLanguage, language, `${url}: schema language`);
  }
  if (language === 'en') {
    assert.doesNotMatch([data.title, data.description, data.siteName, data.imageAlt, JSON.stringify(data.schemas)].join(' '), /[\uac00-\ud7a3]/, `${url}: untranslated search text`);
    assert.doesNotMatch(data.image, /_kor\.png$/, `${url}: Korean sharing image in English`);
  } else assert.doesNotMatch(data.image, /_eng\.png$/, `${url}: English sharing image in Korean`);
}
(async () => {
  const browser = await chromium.launch({headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined});
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
        await page.evaluate(() => window.INIT_SITE_READY);
        for (const width of [1440, 390]) {
          await page.setViewportSize({width, height: width === 390 ? 844 : 1000});
          for (const language of ['ko', 'en']) {
            await page.evaluate(language => window.INIT_I18N.setLanguage(language), language);
            await page.locator('img[loading="lazy"]').evaluateAll(images => images.forEach(img => { img.loading = 'eager'; }));
            await page.waitForFunction(() => [...document.images].every(img => img.complete));
            assert.equal(await page.locator('html').getAttribute('lang'), language, url);
            await checkSearchMetadata(page, language, url);
            await checkMetadataPaths(page, siteConfig, file, "http://127.0.0.1:8200/" + prefix);
            await checkSharedRendering(page, language, url);
            const brokenImages = await page.locator('img').evaluateAll(images => images.filter(img => !img.naturalWidth).map(img => img.getAttribute('src')));
            assert.deepEqual(brokenImages, [], `${url} ${language}`);
            const badRefs = await page.locator('[src], [href], [data-image], [data-i18n-image-base]').evaluateAll(elements => elements.flatMap(element => ['src','href','data-image','data-i18n-image-base'].map(name => element.getAttribute(name)).filter(value => value?.startsWith('/'))));
            assert.deepEqual(badRefs, [], url);
            const wrongLanguageImages = await page.locator('img[data-i18n-image-base]').evaluateAll((images, language) => images.filter(img => !img.getAttribute('src').split('?')[0].endsWith(language === 'en' ? '_eng.png' : '_kor.png')).map(img => img.getAttribute('src')), language);
            assert.deepEqual(wrongLanguageImages, [], `${url} localized images`);
          }
        }
        checked++;
      }
      await page.setViewportSize({width: 1440, height: 1000});
      // Directory URL normalization and language persistence across navigation.
      await page.goto(`http://127.0.0.1:8200/${prefix}services/`, {waitUntil: 'load'});
      await page.evaluate(() => window.INIT_SITE_READY);
      assert.equal(await page.locator('html').getAttribute('lang'), 'en');
      assert.equal(await page.locator('[data-page-sub-link][aria-current="page"]').count(), 1);
      await page.locator('[data-page-sub-link][href$="#quality"]').click();
      assert.ok(page.url().endsWith('services/index.html#quality'));
      await page.evaluate(() => window.INIT_SITE_READY);
      await page.goto(`http://127.0.0.1:8200/${prefix}solutions/data-editing-system/index.html`, {waitUntil: 'load'});
      await page.evaluate(() => window.INIT_SITE_READY);
      await page.locator('[data-language="ko"]').click();
      assert.equal(await page.locator('html').getAttribute('lang'), 'ko');
      await page.goto(`http://127.0.0.1:8200/${prefix}`, {waitUntil: 'load'});
      await page.evaluate(() => window.INIT_SITE_READY);
      await checkSharedNavigation(page);
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
    // With JavaScript disabled, authored body content remains available; common modules are runtime features.
    const noJs = await browser.newContext({javaScriptEnabled: false});
    const noJsPage = await noJs.newPage();
    for (const file of pages) {
      await noJsPage.goto('http://127.0.0.1:8200/preview/'+file);
      assert.equal(await noJsPage.locator('h1').count(),1);
      assert.equal(await noJsPage.locator('main').count(),1);
      assert.ok((await noJsPage.locator('main').textContent()).trim());
    }
    await noJs.close();
    const request = await browser.newContext();
    for (const url of ['insights/', 'insights/reports/20260801_01/', 'templates/disabled-content/insights/index.html', 'assets/images/product/login-overview.png', 'assets/brand-2026/assets-manifest.json', 'missing/deep/page.html','main.py','templates/base.html','templates/shared/site-head.json','scripts/sync-head.ps1','.env','.git/config','api/health','healthz']) {
      const response = await request.request.get(`http://127.0.0.1:8200/${url}`);
      assert.equal(response.status(), 404, url);
    }
    for (const file of manifest.filter(name => name !== '.htaccess')) {
      const response = await request.request.head(`http://127.0.0.1:8200/${file}`);
      assert.equal(response.status(), 200, file);
    }
    await request.close();
    assert.deepEqual([...new Set(failures)], []);
    console.log(`PASS: ${checked} page locations x 2 languages x 2 widths; search metadata, retired content, directory URLs, anchors, persistence, localized images, mobile menu, company-name wrapping, contact phrase breaks, explicit translations, unique asset loading, all-page no-JS body content, shared HTML includes, 404 and every public resource.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
