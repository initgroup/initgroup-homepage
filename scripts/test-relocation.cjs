const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const files = new Set(JSON.parse(fs.readFileSync(path.join(root, 'static-files.json'), 'utf8')));
const pages = [...files].filter(file => file.endsWith('.html') && !file.startsWith('assets/'));
const base = new URL('https://moved.example/team/site/');
const siteConfig = JSON.parse(fs.readFileSync(path.join(root,'assets/shared/site.json'),'utf8'));
const { checkMetadataPaths } = require('./lib/check-metadata.cjs');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2','.mp4':'video/mp4'};
const sourceAttributes = ['href','src','poster','action','formaction','data-image','data-i18n-config','data-i18n-image-base','data-history-fallback','data-promo-src-ko','data-promo-src-en'];
(async () => {
  const browser = await chromium.launch({headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined});
  const failures = [];
  let checks = 0;
  try {
    const context = await browser.newContext({viewport: {width:1440,height:1000}, reducedMotion:'reduce', serviceWorkers:'block'});
    // Emulate a different domain plus two directory levels without a server or another local port.
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) {
        failures.push(`Escaped deployment: ${url.href}`);
        return route.abort();
      }
      let file = decodeURIComponent(url.pathname.slice(base.pathname.length));
      if (!file || file.endsWith('/')) file += 'index.html';
      if (!files.has(file) || file === '.htaccess') {
        failures.push(`Missing public resource: ${file}`);
        return route.fulfill({status:404, body:'Not found'});
      }
      await route.fulfill({status:200, contentType:mime[path.extname(file)] || 'application/octet-stream',
        headers:{'Content-Security-Policy':"default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'"},
        body:fs.readFileSync(path.join(root,file))});
    });
    const page = await context.newPage();
    page.on('pageerror', error => failures.push(error.message));
    page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
    for (const file of pages) {
      const url = new URL(file.replace(/index\.html$/, ''), base).href;
      const response = await page.goto(url, {waitUntil:'load'});
      assert.equal(response.status(),200,url);
      await page.evaluate(() => window.INIT_SITE_READY);
      for (const width of [1440,390]) {
        await page.setViewportSize({width,height:1000});
        for (const language of ['ko','en']) {
          await page.evaluate(language => INIT_I18N.setLanguage(language),language);
          await page.locator('img[loading="lazy"]').evaluateAll(images => images.forEach(img => {img.loading='eager';}));
          await page.waitForFunction(() => [...document.images].every(img => img.complete));
          const result = await page.evaluate(({attributes,baseUrl}) => {
            const base = new URL(baseUrl);
            const invalid=[];
            for(const element of document.querySelectorAll('*')) {
              if(element.matches('link[rel="canonical"]'))continue;
              for(const attribute of attributes) {
                const raw=element.getAttribute(attribute);
                if(!raw || /^(mailto:|tel:|data:|#)/i.test(raw))continue;
                const url=new URL(raw,document.baseURI);
                if(element.matches('a') && /^(?:https?:)?\/\//.test(raw) && url.origin!==base.origin && !/(?:^|\.)initgroup\.kr$/.test(url.hostname))continue;
                if(url.origin!==base.origin || !url.pathname.startsWith(base.pathname) || raw.startsWith('/')) invalid.push(`${attribute}=${raw}`);
              }
            }
            return {invalid,language:document.documentElement.lang,overflow:document.documentElement.scrollWidth>innerWidth+1,broken:[...document.images].filter(img=>!img.naturalWidth).map(img=>img.src)};
          },{attributes:sourceAttributes,baseUrl:base.href});
          assert.deepEqual(result.invalid,[],`${url}: deployment paths`);
          assert.deepEqual(result.broken,[],`${url}: images`);
          assert.equal(result.overflow,false,`${url}: horizontal overflow`);
          assert.equal(result.language,language);
          await checkMetadataPaths(page, siteConfig, file, base.href);
          checks++;
        }
      }
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(new URL('solutions/',base).href);
    await page.evaluate(() => window.INIT_SITE_READY);
    const survey=page.locator('main a[href="in-surveyone/index.html"]').first();
    await survey.click();
    await page.waitForURL(new URL("solutions/in-surveyone/index.html",base).href);
    assert.equal(page.url(),new URL('solutions/in-surveyone/index.html',base).href);
    await page.evaluate(() => window.INIT_SITE_READY);
    assert.equal(await page.locator('html').getAttribute('lang'),'en');
    await page.locator('.brand').click();
    await page.waitForURL(new URL('index.html',base).href);
    await page.evaluate(()=>INIT_SITE_READY);
    assert.equal(page.url(),new URL('index.html',base).href);
    assert.deepEqual([...new Set(failures)],[]);
    console.log(`PASS: ${checks} page/language/width checks on a simulated different domain under /team/site/; all requests stay within the deployment, images and language resources load, product/home navigation stays local.`);
    await context.close();
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
