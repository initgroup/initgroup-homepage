const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit,devices}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:8200/';
const config=JSON.parse(fs.readFileSync(path.join(root,'assets/shared/site.json'),'utf8'));
const files=new Set(JSON.parse(fs.readFileSync(path.join(root,'static-files.json'),'utf8')));
const font='assets/brand-2026/init-sans.woff2',style='assets/brand-2026/design.css';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};};
async function waitFor(gate){let timer;try{await Promise.race([gate.seen.promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Font request not observed')),8000);})]);}finally{clearTimeout(timer);}}
(async()=>{
 for(const [name,type,device] of [['iphone',webkit,'iPhone 13'],['android',chromium,'Pixel 7']]){
  const browser=await type.launch({headless:true});
  try{
   for(const language of ['ko','en']){
    const page=await browser.newPage({...devices[device]});
    let revision=0,failFonts=false,gate=null,fontRequests=0;
    const fontCache=new Map();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',async route=>{
     const url=new URL(route.request().url());if(!/^https?:$/.test(url.protocol))return route.continue();
     let file=url.pathname.slice(1);if(!file||file.endsWith('/'))file+='index.html';
     if(!files.has(file))return route.fulfill({status:404,body:'Missing'});
     if(file===font){
      // Model Cafe24's immutable response cache; routing disables native HTTP cache.
      if(fontCache.has(url.href))return route.fulfill({body:fontCache.get(url.href),contentType:mime['.woff2']});
      fontRequests++;
      if(failFonts)return route.fulfill({status:503,body:'Font unavailable'});
      if(gate){const held=gate;gate=null;held.seen.resolve();await held.release.promise;}
      fontCache.set(url.href,fs.readFileSync(path.join(root,file)));
     }
     let body=fs.readFileSync(path.join(root,file));
     const version=String(revision).padStart(16,'a');
     if(file==='assets/shared/site.json'&&revision){
      const next=structuredClone(config);next.assetVersions[font]=version;next.assetVersions[style]=version;body=JSON.stringify(next);
     }
     if(file===style&&revision)body=body.toString().replace(/init-sans\.woff2\?v=[a-f0-9]{16}/,'init-sans.woff2?v='+version);
     try{await route.fulfill({body,contentType:mime[path.extname(file)]||'application/octet-stream',headers:{'Cache-Control':'no-store'}});}
     catch(error){if(!/closed|handled|cancel|abort/i.test(error.message))throw error;}
    });
    await page.goto(base);assert.equal(await page.evaluate(()=>INIT_SITE_READY),true);
    await page.evaluate(language=>INIT_I18N.setLanguage(language),language);
    await page.evaluate(()=>{window.originalFont=[...document.fonts].filter(face=>face.status==='loaded').at(-1);});
    const initialRequests=fontRequests;
    for(const file of ['solutions/inbups/index.html','company/index.html','solutions/data-editing-system/index.html','index.html']){
     assert.equal(await page.evaluate(url=>INIT_PAGE_NAVIGATION.navigate(url),base+file),true);
     assert.equal(await page.evaluate(()=>document.fonts.has(originalFont)&&originalFont.status==='loaded'),true);
    }
    assert.equal(fontRequests,initialRequests,'Unchanged navigation downloaded the font again');
    revision=1;gate={seen:deferred(),release:deferred()};const held=gate;
    const before=page.url();
    await page.evaluate(url=>{window.fontMove=INIT_PAGE_NAVIGATION.navigate(url);},base+'company/index.html');
    await waitFor(held);
    assert.equal(page.url(),before,'Pending font changed the current address');
    assert.equal(await page.evaluate(()=>document.fonts.has(originalFont)),true);
    await page.locator('[data-menu-toggle]').tap();await page.locator('[data-menu-close]').tap();
    held.release.resolve();assert.equal(await page.evaluate(()=>fontMove),true);
    assert.equal(fontRequests,initialRequests+1,'Font-only update fetched more than the new font');
    assert.equal(await page.evaluate(()=>document.fonts.has(originalFont)),false,'Old pinned font retained after new font activation');
    await page.evaluate(()=>{window.updatedFont=[...document.fonts].filter(face=>face.status==='loaded').at(-1);});
    revision=2;failFonts=true;
    const source=page.url();assert.equal(await page.evaluate(url=>INIT_PAGE_NAVIGATION.navigate(url),base+'services/index.html'),false);
    assert.equal(page.url(),source);assert.equal(await page.evaluate(()=>document.fonts.has(updatedFont)),true);
    failFonts=false;revision=3;gate={seen:deferred(),release:deferred()};const cancelled=gate;
    await page.evaluate(url=>{window.cancelledFontMove=INIT_PAGE_NAVIGATION.navigate(url);},base+'solutions/inbups/index.html');
    await waitFor(cancelled);
    revision=1;assert.equal(await page.evaluate(()=>INIT_PAGE_NAVIGATION.navigate(location.href)),true);
    assert.equal(await page.evaluate(()=>cancelledFontMove),false);
    cancelled.release.resolve();assert.equal(page.url(),source);
    assert.equal(await page.evaluate(()=>document.fonts.has(updatedFont)),true);
    assert.deepEqual(errors,[]);await page.close();
    // Initial direct entry still exposes the usable site with a CSS fallback font.
    const fallback=await browser.newPage({...devices[device]});
    await fallback.route('**/*',route=>{
     const url=new URL(route.request().url());if(!/^https?:$/.test(url.protocol))return route.continue();
     let file=url.pathname.slice(1);if(!file||file.endsWith('/'))file+='index.html';
     if(!files.has(file))return route.fulfill({status:404,body:'Missing'});
     return file===font?route.fulfill({status:503,body:'Font unavailable'}):route.fulfill({body:fs.readFileSync(path.join(root,file)),contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    await fallback.goto(base);assert.equal(await fallback.evaluate(()=>INIT_SITE_READY),true);
    await fallback.evaluate(language=>INIT_I18N.setLanguage(language),language);
    assert.equal(await fallback.locator('h1').count(),1);await fallback.locator('[data-menu-toggle]').tap();
    assert.equal(await fallback.locator('[data-mobile-menu]').isVisible(),true);await fallback.close();
    console.log('PASS '+name+' '+language+': stable font identity/cache reuse, changed-font handover, responsive pending menu, failure/cancel rollback and initial fallback.');
   }
  }finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
