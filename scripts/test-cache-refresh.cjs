const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {chromium,webkit,devices}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),origin='http://127.0.0.1:8200/';
const files=new Set(JSON.parse(fs.readFileSync(path.join(root,'static-files.json'),'utf8')));
const sourceConfig=JSON.parse(fs.readFileSync(path.join(root,'assets/shared/site.json'),'utf8'));
const read=file=>fs.readFileSync(path.join(root,file));
const hash=body=>crypto.createHash('sha256').update(body).digest('hex').slice(0,16);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2'};
(async()=>{
 for(const [name,type,device] of [['iphone',webkit,'iPhone 13'],['android',chromium,'Pixel 7']]) {
  const browser=await type.launch({headless:true});
  try {for(const language of ['ko','en']) {
   const context=await browser.newContext({...devices[device]});
   let config=structuredClone(sourceConfig),offline=false,documents=0,configRequests=0,htmlRequests=0;
   config.navigation.links['action-index-1'].label={ko:'역량 보기',en:'View capabilities'};
   const overrides=new Map(),cache=new Map(),downloads=[];
   await context.route('**/*',async route=>{
    const url=new URL(route.request().url());assert.equal(url.origin,new URL(origin).origin);
    let file=url.pathname.slice(1);if(!file||file.endsWith('/'))file+='index.html';
    if(route.request().isNavigationRequest())documents++;
    if(file==='assets/shared/site.json') {
     configRequests++;
     return route.fulfill({status:offline?503:200,body:offline?'Offline':JSON.stringify(config),contentType:mime['.json'],headers:{'Cache-Control':'no-cache'}});
    }
    if(!files.has(file))return route.fulfill({status:404,body:'Missing'});
    if(file.endsWith('.html')&&!file.startsWith('assets/'))htmlRequests++;
    let body;
    if(url.searchParams.has('v') && cache.has(url.href))body=cache.get(url.href);
    else {
     body=overrides.get(file)||read(file);
     if(url.searchParams.has('v')){cache.set(url.href,body);downloads.push(file);}
    }
    await route.fulfill({status:200,body,contentType:mime[path.extname(file)]||'application/octet-stream',headers:{'Cache-Control':url.searchParams.has('v')?'public, max-age=31536000, immutable':'no-cache'}});
   });
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.clock.install();
   await page.goto(origin);await page.evaluate(()=>INIT_SITE_READY);
   await page.evaluate(language=>INIT_I18N.setLanguage(language),language);
   // Prime both catalogs and optional images, as an earlier complete visit would.
   await page.evaluate(async()=>{
    await Promise.all([...document.images].map(image=>{image.loading='eager';return image.decode().catch(()=>{});}));
    const prepared=await INIT_SITE_ENGINE.prepare(new URL(location.href),new AbortController().signal);prepared.discard();
   });
   await page.evaluate(()=>{window.documentProof='kept';window.swaps=0;document.addEventListener('init:pagechange',()=>swaps++);});
   const refresh=()=>page.evaluate(()=>INIT_PAGE_NAVIGATION.refresh());
   const baseline={downloads:downloads.length,html:htmlRequests,config:configRequests};
   await page.evaluate(()=>Promise.all([INIT_PAGE_NAVIGATION.refresh(),INIT_PAGE_NAVIGATION.refresh(),INIT_PAGE_NAVIGATION.refresh()]));
   assert.equal(configRequests,baseline.config+1,'Concurrent checks should share one configuration request');
   assert.equal(downloads.length,baseline.downloads,'Unchanged checks must not download assets');
   assert.equal(htmlRequests,baseline.html,'Unchanged checks must not fetch HTML');
   assert.equal(await page.evaluate(()=>swaps),0);
   // An edit to another page must not replace the current page or invalidate assets.
   config.pageVersions['company/index.html']='1111111111111111';
   await refresh();assert.equal(htmlRequests,baseline.html);assert.equal(await page.evaluate(()=>swaps),0);
   // An HTML-only edit is found by the scheduled check, with no user refresh.
   const html=Buffer.from(read('index.html').toString().replace('<body ','<body data-cache-refresh-proof="body-v2" '));
   overrides.set('index.html',html);config.pageVersions['index.html']=hash(html);
   await page.evaluate(()=>scrollTo({top:450,behavior:'instant'}));
   const historyLength=await page.evaluate(()=>history.length);
   await page.clock.fastForward(61000);
   await page.waitForFunction(()=>document.body.dataset.cacheRefreshProof==='body-v2'&&!INIT_PAGE_NAVIGATION.pending);
   assert.equal(await page.evaluate(()=>documentProof),'kept');
   assert.equal(await page.evaluate(()=>history.length),historyLength);
   assert.ok(Math.abs(await page.evaluate(()=>scrollY)-450)<2);
   assert.equal(await page.locator('html').getAttribute('lang'),language);
   assert.equal(downloads.length,baseline.downloads,'HTML-only update must reuse CSS/JS/images/catalogs');
   // A restored old menu uses the new configuration without clearing retained assets.
   config.navigation.links['action-index-1'].label=structuredClone(sourceConfig.navigation.links['action-index-1'].label);
   await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
   await page.waitForFunction(label=>document.querySelector('.mobile-action-bar a').textContent.trim()===label&&!INIT_PAGE_NAVIGATION.pending,config.navigation.links['action-index-1'].label[language]);
   assert.equal(downloads.length,baseline.downloads);
   // A changed stylesheet downloads once. Every unchanged version stays in cache.
   const cssFile='assets/css/site.css',css=Buffer.from(read(cssFile)+'\n:root{--cache-refresh-proof:updated}\n');
   overrides.set(cssFile,css);config.assetVersions[cssFile]=hash(css);
   const beforeCss=downloads.length;await refresh();
   assert.deepEqual(downloads.slice(beforeCss),[cssFile]);
   assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--cache-refresh-proof').trim()),'updated');
   const stableUrls=[...cache.keys()];await refresh();assert.deepEqual([...cache.keys()],stableUrls);
   // Updates wait for an open menu, and offline checks leave the current page usable.
   await page.locator('[data-menu-toggle]').tap();
   config.defaults.themeColor='#123456';const beforeMenu=await page.evaluate(()=>swaps);
   await refresh();assert.equal(await page.evaluate(()=>swaps),beforeMenu);
   assert.equal(await page.locator('[data-mobile-menu]').evaluate(node=>node.hidden),false);
   await page.locator('[data-menu-close]').tap();await refresh();
   assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'),'#123456');
   offline=true;const offlineSwaps=await page.evaluate(()=>swaps);await refresh();
   assert.equal(await page.evaluate(()=>swaps),offlineSwaps);offline=false;
   // Hidden tabs stop periodic checks; becoming visible immediately checks again.
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
   const beforeHidden=configRequests;await page.clock.fastForward(120000);assert.equal(configRequests,beforeHidden);
   config.defaults.themeColor='#654321';
   await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
   await page.waitForFunction(()=>document.querySelector('meta[name="theme-color"]').content==='#654321'&&!INIT_PAGE_NAVIGATION.pending);
   // Only a JS revision requires a new document; unchanged cached files survive it.
   const jsFile='assets/js/site.js',js=Buffer.from(read(jsFile)+'\nwindow.cacheRefreshScript="updated";\n');
   overrides.set(jsFile,js);config.assetVersions[jsFile]=hash(js);
   const jsPosition=await page.evaluate(()=>({y:scrollY,history:history.length}));
   const beforeJs=downloads.length;await refresh();
   await page.waitForFunction(()=>window.cacheRefreshScript==='updated'&&document.documentElement.dataset.siteReady==='true');
   await page.evaluate(()=>INIT_SITE_READY);
   assert.equal(documents,2,'A script revision should replace the document exactly once');
   assert.deepEqual(downloads.slice(beforeJs),[jsFile]);
   assert.equal(await page.locator('html').getAttribute('lang'),language);
   assert.ok(Math.abs(await page.evaluate(()=>scrollY)-jsPosition.y)<2,'Script update must preserve reading position '+JSON.stringify({before:jsPosition,after:await page.evaluate(()=>({y:scrollY,state:history.state}))}));
   assert.equal(await page.evaluate(()=>history.length),jsPosition.history);
   const finalDownloads=downloads.length;await refresh();assert.equal(downloads.length,finalDownloads);
   assert.equal(documents,2);assert.deepEqual(errors,[]);
   console.log('PASS: '+name+' '+language+' — unchanged cache reuse, HTML-only timed refresh, old-menu restore, CSS-only download, hidden/offline/interaction deferral, single JS upgrade.');
   await context.close();
  }}finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
