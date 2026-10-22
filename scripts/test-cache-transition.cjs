const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const files=new Set(JSON.parse(fs.readFileSync(path.join(root,'static-files.json'),'utf8')));
const config=JSON.parse(fs.readFileSync(path.join(root,'assets/shared/site.json'),'utf8'));
const read=file=>fs.readFileSync(path.join(root,file));
const hash=body=>crypto.createHash('sha256').update(body).digest('hex').slice(0,16);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2'};
const origin='http://127.0.0.1:8200/';
const headers={'Content-Security-Policy':"default-src 'self'; base-uri 'self'; object-src 'none'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'"};
function deferred(){let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};}
function revision(name) {
 const buffers=new Map();
 buffers.set('assets/css/site.css',Buffer.from(read('assets/css/site.css')+'\n:root{--cache-proof:'+name+'}\n'));
 buffers.set('assets/js/site.js',Buffer.from(read('assets/js/site.js')+'\nwindow.cacheProof="'+name+'";\n'));
 for(const language of ['ko','en']) {
  const catalog=JSON.parse(read('assets/i18n/'+language+'.json'));
  catalog['cache.proof']=name;
  buffers.set('assets/i18n/'+language+'.json',Buffer.from(JSON.stringify(catalog)));
 }
 buffers.set(config.components,Buffer.from(read(config.components).toString().replace('<div class="shell footer-bottom">','<div class="shell footer-bottom"><span data-cache-proof>'+name+'</span>')));
 const definition=structuredClone(config);
 for(const [file,body] of buffers)definition.assetVersions[file]=hash(body);
 return {buffers,config:definition};
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
  const revisions=[revision('old'),revision('new')];
  const cache=new Map(), hits=[];
  let phase=0, configHold=null, documentHold=null, pendingReport=null;
  await context.exposeBinding('reportPendingNavigation',(_source,record)=>pendingReport?.resolve(record));
  await context.addInitScript(()=>{
   window.unreadyVisibleFrames=[];
   document.addEventListener('click',()=>{
    if(document.documentElement.dataset.navigationPending!=='true')return;
    window.reportPendingNavigation({pending:document.documentElement.dataset.navigationPending,page:document.body.dataset.page,hoverHidden:document.querySelector('[data-hover-menu]')?.hidden,mobileHidden:document.querySelector('[data-mobile-menu]')?.hidden});
   });
   function sample() {
    const h1=document.querySelector('h1');
    if(h1 && h1.getClientRects().length && getComputedStyle(h1).visibility!=='hidden' && Number(getComputedStyle(document.body).opacity)>0 && document.documentElement.dataset.siteReady!=='true')window.unreadyVisibleFrames.push(h1.textContent);
    requestAnimationFrame(sample);
   }
   requestAnimationFrame(sample);
  });
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   assert.equal(url.origin,new URL(origin).origin,'Fixture must stay on the approved origin/port');
   let file=url.pathname.slice(1);if(!file || file.endsWith('/'))file+='index.html';
   if(!files.has(file))return route.fulfill({status:404,body:'Missing'});
   if(documentHold && file===documentHold.file) {
    const gate=documentHold;gate.seen.resolve();await gate.release.promise;documentHold=null;
   }
   if(file==='assets/shared/site.json') {
    if(configHold){const gate=configHold;gate.seen.resolve();await gate.release.promise;configHold=null;}
    return route.fulfill({status:200,contentType:mime['.json'],headers:{...headers,'Cache-Control':'no-cache'},body:JSON.stringify(revisions[phase].config)});
   }
   // A persistent URL-keyed cache deliberately retains the old deployment bytes.
   const key=url.href;
   let body=cache.get(key);
   if(body)hits.push(key);
   else {
    body=revisions[phase].buffers.get(file)||read(file);
    if(url.searchParams.has('v'))cache.set(key,body);
   }
   await route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',headers:{...headers,'Cache-Control':url.searchParams.has('v')?'public, max-age=31536000, immutable':'no-cache'},body});
  });
  const page=await context.newPage();
  const failures=[];
  page.on('pageerror',error=>failures.push(error.message));
  page.on('console',message=>{if(message.type()==='error')failures.push(message.text());});
  const ready=async()=>{
   await page.evaluate(async()=>{
    await INIT_SITE_READY;
    await Promise.all(document.body.getAnimations().map(animation=>animation.finished.catch(()=>{})));
   });
   assert.equal(await page.locator('body').evaluate(node=>getComputedStyle(node).visibility),'visible','Ready page must actually be visible');
   assert.equal(await page.locator('body').evaluate(node=>getComputedStyle(node).opacity),'1','Ready page must not remain transparent');
   assert.equal(await page.locator('body').evaluate(node=>node.inert),false,'Ready page must be interactive');
  };
  const go=async file=>{await page.goto(origin+file,{waitUntil:'domcontentloaded'});await ready();};
  await go('company/');
  await page.evaluate(()=>INIT_I18N.setLanguage('en'));
  const oldCss=await page.locator('link[href*="/css/site.css"]').getAttribute('href');
  const firstKeys=[...cache.keys()];
  await page.reload({waitUntil:'domcontentloaded'});await ready();
  assert.equal(await page.locator('link[href*="/css/site.css"]').getAttribute('href'),oldCss);
  assert.equal(await page.evaluate(()=>cacheProof),'old');
  assert.ok(hits.length,'Unchanged version URLs should reuse retained cache entries');
  phase=1;
  await page.reload({waitUntil:'domcontentloaded'});await ready();
  assert.equal(await page.evaluate(()=>cacheProof),'new','Changed JS must escape old cached bytes');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--cache-proof').trim()),'new');
  assert.equal(await page.evaluate(()=>INIT_I18N.t('cache.proof')),'new');
  assert.equal(await page.locator('[data-cache-proof]').textContent(),'new');
  assert.notEqual(await page.locator('link[href*="/css/site.css"]').getAttribute('href'),oldCss);
  firstKeys.forEach(key=>assert.ok(cache.has(key),'Old cached bytes must still exist during the upgrade test'));
  const secondKeys=[...cache.keys()];
  await page.reload({waitUntil:'domcontentloaded'});await ready();
  assert.deepEqual([...cache.keys()],secondKeys,'A visit without deployment changes must not create new cache versions');
  // Delayed shared response: source body and the wrong initial language must never be exposed.
  configHold={seen:deferred(),release:deferred()};
  const configGate=configHold;
  await page.goto(origin+'projects/',{waitUntil:'domcontentloaded'});
  await configGate.seen.promise;
  assert.equal(await page.locator('html').getAttribute('hidden'),'');
  assert.equal(await page.locator('h1').isVisible(),false);
  configGate.release.resolve();await ready();
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.deepEqual(await page.evaluate(()=>unreadyVisibleFrames),[]);
  // Retain outgoing menu until document commit, at both screen sizes and in both languages.
  for(const width of [1440,390])for(const language of ['ko','en']) {
   await page.setViewportSize({width,height:1000});
   await go('company/');
   await page.evaluate(language=>INIT_I18N.setLanguage(language),language);
   await page.locator('[data-menu-toggle]').click();
   const menu=width===1440?'[data-hover-menu]':'[data-mobile-menu]';
   const link=width===1440?'.desktop-nav [data-nav="services"]':'[data-mobile-menu] .site-map-root:has([data-i18n="navigation.services"])';
   documentHold={file:'services/index.html',seen:deferred(),release:deferred()};
   const documentGate=documentHold;
   pendingReport=deferred();
   await page.locator(link).click({noWaitAfter:true});
   await documentGate.seen.promise;
   const pending=await page.evaluate(()=>({pending:document.documentElement.dataset.navigationPending,page:document.body.dataset.page,hoverHidden:document.querySelector("[data-hover-menu]")?.hidden,mobileHidden:document.querySelector("[data-mobile-menu]")?.hidden}));
   assert.equal(pending.pending,'true');
   assert.equal(width===1440?pending.hoverHidden:pending.mobileHidden,false,'Menu must not disappear and flash the previous body');
   assert.equal(pending.page,'company');
   documentGate.release.resolve();
   await page.waitForURL('**/services/index.html');await ready();
   assert.equal(await page.locator('body').getAttribute('data-page'),'services');
   assert.equal(await page.locator('html').getAttribute('lang'),language);
   assert.deepEqual(await page.evaluate(()=>unreadyVisibleFrames),[]);
   await page.locator('[data-menu-toggle]').click();
   const anchor=width===1440?'[data-hover-menu] a[href$="#quality"]':'[data-mobile-menu] a[href$="#quality"]';
   await page.locator(anchor).click();
   assert.equal(await page.locator(menu).evaluate(node=>node.hidden),true,'Same-document section links should close normally');
   assert.equal(await page.locator('html').getAttribute('data-navigation-pending'),null);
  }
  assert.equal(await page.evaluate(async()=>{
   const link=document.createElement('a');link.href='../company/index.html';link.textContent='Cancelled local action';
   link.addEventListener('click',event=>event.preventDefault());document.body.append(link);link.click();
   await Promise.resolve();link.remove();
   return document.documentElement.dataset.navigationPending||null;
  }),null,'Cancelled navigation must not freeze menus or dialog actions');
  await page.emulateMedia({reducedMotion:'reduce'});
  await go('contact/');
  assert.equal(await page.locator('body').evaluate(node=>getComputedStyle(node).animationName),'none');
  await page.evaluate(()=>{
   document.documentElement.dataset.navigationPending='true';
   window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
  });
  assert.equal(await page.locator('html').getAttribute('data-navigation-pending'),null,'History restoration must unfreeze menus');
  assert.deepEqual(failures,[]);
  await page.screenshot({path:path.join(root,'.tmp','cache-transition-mobile.png')});
  await context.close();
  console.log('PASS: retained old-cache fixture upgrades CSS/JS/catalogs/layout; unchanged visits preserve URLs; delayed responses expose no unready frames; desktop/mobile ko/en navigation retains outgoing menus; section links, reduced motion and history restoration work.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});