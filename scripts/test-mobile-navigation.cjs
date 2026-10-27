const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {chromium,webkit,devices}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'assets/shared/site.json'),'utf8'));
const files=new Set(JSON.parse(fs.readFileSync(path.join(root,'static-files.json'),'utf8')));
const base='http://127.0.0.1:8200/';
const output=path.join(root,'.tmp','mobile-navigation');
const slowStyle=Buffer.from(fs.readFileSync(path.join(root,'assets/brand-2026/design.css'),'utf8').replace(/gaon-tower\.webp\?v=[a-f0-9]{16}/,'gaon-tower.webp?probe=slow-mobile'));
fs.mkdirSync(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.ico':'image/x-icon','.woff2':'font/woff2'};
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};};
async function waitForGate(gate) {
 let timer;
 try {await Promise.race([gate.seen.promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Expected request not observed: '+gate.file)),8000);})]);}
 finally{clearTimeout(timer);}
}
const ready=page=>page.evaluate(()=>INIT_SITE_READY);
const go=(page,file)=>page.evaluate(url=>INIT_PAGE_NAVIGATION.navigate(url),base+file);
(async()=>{
 const results=[];
 for(const [name,type,device] of [['iphone-webkit',webkit,'iPhone 13'],['android-chromium',chromium,'Pixel 7']]) {
  if(process.env.MOBILE_BROWSER && process.env.MOBILE_BROWSER!==name)continue;
  const browser=await type.launch({headless:true});
  try {
   const context=await browser.newContext({...devices[device]});
   const page=await context.newPage();
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   let gate=null,brokenImages=false,oldMenu=false,imageRevision=false,documentRequests=0;
   const requests=new Map();
   await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    assert.equal(url.origin,new URL(base).origin);
    let file=url.pathname.slice(1);if(!file||file.endsWith('/'))file+='index.html';
    requests.set(file,(requests.get(file)||0)+1);
    if(route.request().isNavigationRequest())documentRequests++;
    if(gate && file===gate.file && !(gate.skip-- > 0)) {
     const held=gate;gate=null;held.seen.resolve();await held.release.promise;
    }
    try {
     if(!files.has(file))return await route.fulfill({status:404,body:'Missing'});
     if(brokenImages && /\.(png|jpg|webp|svg)$/.test(file))return await route.fulfill({status:503,body:'Image unavailable'});
     let body=fs.readFileSync(path.join(root,file));
     if(file==='assets/shared/site.json' && (oldMenu||imageRevision)) {
      const stale=structuredClone(config);
      if(oldMenu)stale.navigation.links['action-index-1'].label={ko:'역량 보기',en:'View capabilities'};
      if(imageRevision)stale.assetVersions['assets/brand-2026/design.css']=crypto.createHash('sha256').update(slowStyle).digest('hex').slice(0,16);
      body=Buffer.from(JSON.stringify(stale));
     }
     if(file==='assets/brand-2026/design.css' && imageRevision)body=slowStyle;
     await route.fulfill({status:200,body,contentType:mime[path.extname(file)]||'application/octet-stream',headers:{'Cache-Control':'no-store'}});
    }catch(error){if(!/closed|handled|cancel|abort/i.test(error.message))throw error;}
   });
   await page.goto(base);await ready(page);
   await page.evaluate(()=>{
    window.documentProof='mobile';
    window.badFrames=[];
    const sample=()=>{
     const body=document.body,header=document.querySelector('.site-header');
     if(document.documentElement.dataset.siteReady==='true' && body && header) {
      const css=getComputedStyle(body),heading=document.querySelector('h1');
      if(css.opacity!=='1'||css.visibility!=='visible'||!heading?.textContent.trim()||getComputedStyle(header).position!=='fixed')badFrames.push(location.href);
     }
     requestAnimationFrame(sample);
    };requestAnimationFrame(sample);
   });
   let pageChecks=0,menuChecks=0,contentChecks=0;
   const timings=[];
   for(const language of (process.env.MOBILE_EDGE_ONLY?[]:['ko','en'])) {
    await page.locator('button[data-language="'+language+'"]').tap();
    await page.waitForFunction(language=>INIT_LANGUAGE===language,language);
    for(const file of Object.keys(config.pages)) {
     const started=Date.now();assert.equal(await go(page,file),true);timings.push(Date.now()-started);
     assert.equal(await page.locator('html').getAttribute('lang'),language);
     assert.equal(await page.locator('h1').count(),1);
     assert.equal(await page.locator('main').count(),1);
     assert.equal(await page.locator('h1').evaluate(node=>getComputedStyle(node).outlineStyle),'none',file+' touch focus border');
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,file+' overflow');
     const label=config.navigation.mobileActions[file]?.links[0];
     if(label)assert.equal((await page.locator('.mobile-action-bar a').first().innerText()).trim(),config.navigation.links[label].label[language]);
     await page.screenshot({path:path.join(output,name+'-'+language+'-'+file.replace(/[/\.]/g,'-')+'.png'),fullPage:true,scale:'css'});
     const anchorLinks=await page.locator('[data-page-sub-link]').evaluateAll(nodes=>nodes.map(n=>({href:n.getAttribute('href'),hash:n.hash})));
     for(const link of anchorLinks.filter(link=>link.hash)) {
      await page.locator('[data-page-sub-link]').evaluateAll((nodes,href)=>nodes.find(n=>n.getAttribute('href')===href)?.scrollIntoView({block:'nearest',inline:'nearest'}),link.href);
      await page.locator('[data-page-sub-link][href='+JSON.stringify(link.href)+']').tap();await ready(page);
      assert.ok(page.url().endsWith(link.hash));
      assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'none');
      assert.equal(await page.evaluate(()=>document.querySelector('main').inert),false);
      contentChecks++;
     }
     await page.setViewportSize({width:320,height:740});
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,file+' narrow overflow');
     await page.setViewportSize(devices[device].viewport);
     const contentLinks=await page.locator('main a[href], .mobile-action-bar a[href]').evaluateAll(nodes=>[...new Set(nodes.filter(n=>n.getClientRects().length && INIT_SITE_ENGINE.pageFor(new URL(n.href))).map(n=>n.getAttribute('href')))]);
     for(const href of contentLinks) {
      await go(page,file);
      const link=page.locator('main a[href='+JSON.stringify(href)+'], .mobile-action-bar a[href='+JSON.stringify(href)+']').filter({visible:true}).first();
      await link.tap();await ready(page);
      assert.equal(page.url(),new URL(href,base+file).href,file+' content link '+href);
      contentChecks++;
     }
     pageChecks++;
    }
    // Tap every full-menu destination, including product pages and section anchors.
    await go(page,'index.html');
    const menuLinks=await page.locator('[data-mobile-menu] .site-map-grid a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
    for(const href of menuLinks) {
     await go(page,'index.html');
     await page.locator('[data-menu-toggle]').tap();
     const link=page.locator('[data-mobile-menu] a[href='+JSON.stringify(href)+']').first();
     await link.tap();await ready(page);
     assert.equal(page.url(),new URL(href,base).href);
     assert.equal(await page.locator('[data-mobile-menu]').evaluate(node=>node.hidden),true);
     assert.equal(await page.locator('main').evaluate(node=>node.inert),false);
     menuChecks++;
    }
    console.log(name,language,'pages, content links and all menu destinations passed');
   }
   // Repeated taps do not restart the same fetch, and a pending menu remains closable.
   await go(page,'index.html');
   await page.locator('[data-menu-toggle]').tap();
   gate={file:'company/index.html',seen:deferred(),release:deferred()};const held=gate;
   const before=requests.get('company/index.html')||0;
   const companyLink=page.locator('[data-mobile-menu] .site-map-root[href="company/index.html"]');
   await companyLink.tap();await waitForGate(held);
   await companyLink.tap();
   assert.equal(requests.get('company/index.html'),before+1,'Duplicate tap restarted preparation');
   assert.equal(await page.locator('body').getAttribute('data-page'),'home');
   await page.locator('[data-menu-close]').tap();
   assert.equal(await page.locator('[data-mobile-menu]').evaluate(node=>node.hidden),true,'Close blocked during load');
   assert.equal(await page.locator('main').evaluate(node=>node.inert),false);
   await page.locator('[data-menu-toggle]').tap();
   await page.locator('[data-mobile-menu] .site-map-root[href="services/index.html"]').tap();await ready(page);
   held.release.resolve();
   assert.equal(await page.locator('body').getAttribute('data-page'),'services','Latest tap must win');
   // CSS path normalization must not place a frozen screenshot over the new controls.
   await go(page,'index.html');
   gate={file:'assets/css/site.css',skip:1,seen:deferred(),release:deferred()};const cssGate=gate;
   await page.evaluate(url=>{window.cssMove=INIT_PAGE_NAVIGATION.navigate(url);},base+'company/index.html');
   await waitForGate(cssGate);
   assert.equal(await page.locator('body').getAttribute('data-page'),'company');
   await page.locator('[data-menu-toggle]').tap({timeout:2000});
   assert.equal(await page.locator('[data-mobile-menu]').evaluate(node=>node.hidden),false);
   await page.locator('[data-menu-close]').tap({timeout:2000});
   cssGate.release.resolve();assert.equal(await page.evaluate(()=>cssMove),true);
   // Slow optional images have a bounded wait; missing images do not cancel navigation.
   imageRevision=true;
   gate={file:'assets/brand-2026/gaon-tower.webp',seen:deferred(),release:deferred()};const imageGate=gate;
   const start=Date.now();
   await page.evaluate(url=>{window.slowImageMove=INIT_PAGE_NAVIGATION.navigate(url);},base+'company/index.html');
   await waitForGate(imageGate);
   assert.equal(await page.evaluate(()=>slowImageMove),true);
   assert.ok(Date.now()-start<2500,'Slow image blocked navigation');imageGate.release.resolve();imageRevision=false;
   brokenImages=true;assert.equal(await go(page,'solutions/in-surveyone/index.html'),true);brokenImages=false;
   // Restored documents revalidate menu definitions without adding history entries.
   oldMenu=true;await go(page,'index.html');
   assert.match(await page.locator('.mobile-action-bar').innerText(),/역량 보기|View capabilities/);
   const historyLength=await page.evaluate(()=>history.length);
   oldMenu=false;
   await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
   await page.waitForFunction(()=>!INIT_PAGE_NAVIGATION.pending && /서비스 보기|View services/.test(document.querySelector('.mobile-action-bar').textContent));
   assert.equal(await page.evaluate(()=>history.length),historyLength);
   assert.equal(await page.evaluate(()=>documentProof),'mobile');
   assert.equal(documentRequests,1);
   // Keyboard focus and skip-link access remain visible even on a touch-capable device.
   await page.keyboard.press('Tab');
   await page.locator('.skip-link').focus();
   assert.notEqual(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'none',await page.evaluate(()=>document.activeElement.outerHTML));
   await page.keyboard.press('Enter');await ready(page);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'mainContent');
   assert.notEqual(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'none');
   assert.deepEqual(await page.evaluate(()=>badFrames),[]);
   assert.deepEqual(errors,[]);
   const result={name,pageChecks,menuChecks,contentChecks,medianMs:timings.sort((a,b)=>a-b)[Math.floor(timings.length/2)],errors};
   results.push(result);console.log('PASS',JSON.stringify(result));
  }finally{await browser.close();}
 }
 fs.writeFileSync(path.join(output,(process.env.MOBILE_BROWSER?process.env.MOBILE_BROWSER+'-':'')+(process.env.MOBILE_EDGE_ONLY?'edge-results.json':'results.json')),JSON.stringify(results,null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
