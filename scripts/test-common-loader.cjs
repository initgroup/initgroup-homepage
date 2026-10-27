const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const files = new Set(JSON.parse(read('static-files.json')));
const original = JSON.parse(read('assets/shared/site.json'));
const pages = Object.keys(original.pages);
const originalLayout = read(original.components);
const { checkMetadataPaths } = require('./lib/check-metadata.cjs');
const hashes = () => pages.map(file => crypto.createHash('sha256').update(read(file)).digest('hex'));
const mime = {'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2'};
(async () => {
  const initial = hashes();
  for(const file of pages) {
    const source = read(file);
    assert.equal((source.match(/<script\b[^>]*\bsrc=/g)||[]).length,1,file);
    assert.match(source,/<!-- site:seo:start -->/,file);
    assert.match(source,/<meta name="description"/,file);
    assert.match(source,/<link rel="canonical" href="https:\/\//,file);
    assert.match(source,/data-site-prerender="navigation"/,file);
    assert.doesNotMatch(source,/<\?php/,file);
    assert.match(source,/assets\/js\/common\.js/,file);
  }
  const browser = await chromium.launch({headless:true});
  try {
    let config = structuredClone(original);
    let layout = originalLayout;
    let bodyEdit = false;
    const extras = {
      'assets/css/common-regression.css': ':root { --common-regression: passed; }',
      'assets/js/common-regression.js': 'window.commonRegressionRuns=(window.commonRegressionRuns||0)+1;window.commonDependencyReady=!!window.INIT_I18N;'
    };
    const context = await browser.newContext({reducedMotion:'reduce'});
    await context.route('**/*',async route => {
      const url = new URL(route.request().url());
      assert.equal(url.origin,'http://127.0.0.1:8200');
      let file = url.pathname.slice(1);
      if(!file || file.endsWith('/'))file+='index.html';
      if(!files.has(file) && !Object.hasOwn(extras,file))return route.fulfill({status:404,body:'Missing'});
      let body;
      if(file==='assets/shared/site.json')body=JSON.stringify(config);
      else if(file===config.components)body=layout;
      else if(Object.hasOwn(extras,file))body=extras[file];
      else if(bodyEdit && file==='contact/index.html')body=read(file).replace('<main ','<main data-body-edit="true" ');
      else body=fs.readFileSync(path.join(root,file));
      await route.fulfill({status:200,body,contentType:mime[path.extname(file)]||'application/octet-stream',headers:{
        'Cache-Control':'no-cache',
        'Content-Security-Policy':"default-src 'self'; base-uri 'self'; object-src 'none'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'"
      }});
    });
    const page = await context.newPage();
    const go = async file => {
      await page.goto('http://127.0.0.1:8200/'+file,{waitUntil:'load'});
      await page.evaluate(()=>window.INIT_SITE_READY);
    };
    await go('index.html');
    config.navigation.links.services.label={ko:'Menu change KO',en:'Menu change EN'};
    config.meta.push({name:'application-name',content:'Common metadata update'});
    config.styles.push({path:'assets/css/common-regression.css'});
    config.scripts.push({path:'assets/js/common-regression.js'});
    // The official search base changes metadata, never UI/resource paths.
    config.sitemapBaseUrl='https://sitemap-only.example/deploy/';
    layout=layout.replace('<div class="shell footer-bottom">','<div class="shell footer-bottom"><span data-common-regression>Shared footer</span>');
    for(const file of pages) {
      await go(file);
      await page.evaluate(()=>INIT_I18N.setLanguage('ko'));
      const labels=await page.locator('[data-i18n="navigation.services"]').allTextContents();
      assert.ok(labels.length);
      labels.forEach(text=>assert.equal(text,'Menu change KO'));
      await page.evaluate(()=>INIT_I18N.setLanguage('en'));
      (await page.locator('[data-i18n="navigation.services"]').allTextContents()).forEach(text=>assert.equal(text,'Menu change EN'));
      assert.equal(await page.locator('meta[name="application-name"]').count(),1);
      assert.equal(await page.locator('meta[name="application-name"]').getAttribute('content'),'Common metadata update');
      assert.equal(await page.locator('[data-common-regression]').count(),1);
      assert.equal(await page.locator('template[data-site-include]').count(),0);
      assert.equal(await page.locator('.site-header').count(),1);
      assert.equal(await page.locator('[data-site-prerender]').count(),0);
      for(const selector of ['title','meta[name="viewport"]','meta[name="description"]','link[rel="canonical"]'])assert.equal(await page.locator(selector).count(),1,file+' duplicate '+selector);
      assert.equal(await page.locator('.site-footer').count(),1);
      assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--common-regression').trim()),'passed');
      assert.equal(await page.evaluate(()=>window.commonRegressionRuns),1);
      assert.equal(await page.evaluate(()=>window.commonDependencyReady),true);
      await checkMetadataPaths(page, config, file, 'http://127.0.0.1:8200/');
      const assets=await page.evaluate(()=>({
        css:[...document.querySelectorAll('link[rel="stylesheet"]')].map(el=>el.href),
        js:[...document.querySelectorAll('script[src]')].map(el=>el.src)
      }));
      for(const paths of Object.values(assets))assert.equal(new Set(paths).size,paths.length);
    }
    // Explicit index URLs, directory URLs, and incoming query/hash must canonicalize identically.
    for (const file of pages) {
      for (const address of [file, file.replace(/index\.html$/, '')]) {
        await go(address+'?from=regression#incoming');
        await checkMetadataPaths(page, config, file, 'http://127.0.0.1:8200/');
      }
    }
    bodyEdit=true;
    await go('contact/index.html');
    assert.equal(await page.locator('main[data-body-edit]').count(),1);
    await go('company/index.html');
    assert.equal(await page.locator('main[data-body-edit]').count(),0);
    // A duplicate loader must not bind menus/scripts a second time.
    await page.evaluate(()=>new Promise(resolve=>{
      const node=document.createElement('script');node.src='../assets/js/common.js';node.dataset.pageFile='company/index.html';node.onload=resolve;document.head.append(node);
    }));
    assert.equal(await page.evaluate(()=>window.commonRegressionRuns),1);
    assert.equal(await page.locator('.site-header').count(),1);
    config=structuredClone(original);
    layout=originalLayout.replace('<template id="footer">','<template id="footer">{{include:footer}}');
    await page.goto('http://127.0.0.1:8200/index.html');
    await page.waitForFunction(()=>document.documentElement.dataset.siteError==='true');
    const failure=await page.evaluate(()=>INIT_SITE_READY.then(()=>'',error=>error.message));
    assert.match(failure,/Recursive HTML include/);
    assert.equal(await page.locator('main').isVisible(),true);
    assert.equal(await page.locator('.site-header').count(),0,'Failed include must not partially replace placeholders');
    await context.close();
    assert.deepEqual(hashes(),initial,'Runtime changes must never rewrite public HTML files');
    console.log('PASS: 12 static-SEO source pages; shared metadata upserts and bilingual UI changes propagate without runtime file writes; header/footer uniqueness, script order, domain migration, body isolation, duplicate-loader guard and recursive-include failure.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
