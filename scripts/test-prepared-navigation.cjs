const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {checkMetadataPaths}=require('./lib/check-metadata.cjs');
const root=path.resolve(__dirname,'..');
const manifest=new Set(JSON.parse(fs.readFileSync(path.join(root,'static-files.json'),'utf8')));
const config=JSON.parse(fs.readFileSync(path.join(root,'assets/shared/site.json'),'utf8'));
const pages=Object.keys(config.pages);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2','.mp4':'video/mp4'};
const defer=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
(async()=>{
 const browser=await chromium.launch({headless:true});
 let checks=0,frames=0;
 try{
  for(const prefix of (process.env.NAVIGATION_QUICK?['']:['', 'preview/']))for(const fallback of (process.env.NAVIGATION_QUICK?[false]:[false,true])) {
   const base='http://127.0.0.1:8200/'+prefix;
   const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
   if(fallback)await context.addInitScript(()=>{document.startViewTransition=undefined;});
   let gate=null,failFile=null,topNavigations=0;
   await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    assert.equal(url.origin,'http://127.0.0.1:8200');
    assert.ok(url.pathname.startsWith('/'+prefix),'Request escaped deployed folder: '+url.href);
    let file=url.pathname.slice(prefix.length+1);if(!file || file.endsWith('/'))file+='index.html';
    if(route.request().isNavigationRequest())topNavigations++;
    if(!manifest.has(file))return route.fulfill({status:404,body:'Missing'});
    if(gate && file===gate.file) {
     const held=gate;gate=null;held.seen.resolve();await held.release.promise;
    }
    try {
     if(file===failFile)return await route.fulfill({status:503,body:'Temporary failure'});
     await route.fulfill({status:200,body:fs.readFileSync(path.join(root,file)),contentType:mime[path.extname(file)]||'application/octet-stream',headers:{
      'Cache-Control':'no-cache',
      'Content-Security-Policy':"default-src 'self'; base-uri 'self'; object-src 'none'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'"
     }});
    }catch(error){if(!/closed|handled|cancel|abort/i.test(error.message))throw error;}
   });
   const page=await context.newPage();
   const failures=[], warnings=[];page.on('pageerror',error=>failures.push(error.message));
   page.on('console',message=>{if(message.type()==='warning')warnings.push(message.text());});
   await page.goto(base);await page.evaluate(()=>INIT_SITE_READY);
   await page.evaluate(()=>{
    window.documentProof='preserved';
    window.navigationFrames=[];
    function sample(){
     const heading=document.querySelector('h1'),body=document.body;
     if(body && document.documentElement.dataset.siteReady==='true') {
      let visible=!!heading;const problem=[];
      for(let node=heading;node;node=node.parentElement) {
       const css=getComputedStyle(node);
       if(css.visibility==='hidden' || css.display==='none' || Number(css.opacity)===0){visible=false;problem.push({tag:node.tagName,classes:node.className,visibility:css.visibility,display:css.display,opacity:css.opacity,top:node.getBoundingClientRect().top});}
      }
      navigationFrames.push({visible,text:heading?.textContent||'',page:body.dataset.page,problem});
     }
     requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
   });
   const ready=async()=>{await page.evaluate(()=>INIT_SITE_READY);assert.equal(await page.evaluate(()=>INIT_PAGE_NAVIGATION.pending),false);};
   const widthLabel=()=>JSON.stringify({viewport:page.viewportSize(),prefix,fallback});
   const navigate=async file=>{assert.equal(await page.evaluate(url=>INIT_PAGE_NAVIGATION.navigate(url),base+file),true,'Preparation failed for '+file+' '+widthLabel()+' '+warnings.slice(-2).join(' | '));await ready();};
   // A real menu click must keep the old DOM and URL until delayed HTML is available.
   await page.locator('[data-menu-toggle]').click();
   gate={file:'company/index.html',seen:defer(),release:defer()};const held=gate;
   await page.locator('.desktop-nav [data-nav="company"]').click();
   await held.seen.promise;
   assert.equal(page.url(),base);
   assert.equal(await page.locator('body').getAttribute('data-page'),'home');
   assert.equal(await page.locator('[data-hover-menu]').evaluate(node=>node.hidden),false);
   assert.equal(await page.locator('body').evaluate(node=>getComputedStyle(node).opacity),'1');
   await page.screenshot({path:path.join(root,'.tmp','navigation-before-ready.png')});
   gate={file:'assets/brand-2026/gaon-tower.webp',seen:defer(),release:defer()};const heldImage=gate;
   held.release.resolve();
   await heldImage.seen.promise;
   assert.equal(page.url(),base,'Image preparation must finish before the address and body change');
   assert.equal(await page.locator('body').getAttribute('data-page'),'home');
   assert.equal(await page.locator('body').evaluate(node=>getComputedStyle(node).opacity),'1');
   heldImage.release.resolve();
   await page.waitForURL(base+'company/index.html');await ready();
   assert.equal(await page.evaluate(()=>documentProof),'preserved');
   assert.equal(topNavigations,1,'Internal menu navigation must not open another document');
   // Repeat current-page and anchor links without a document reload.
   await page.locator('.desktop-nav [data-nav="company"]').click();await ready();
   await page.locator('[data-page-sub-link][href$="#missionTitle"]').click();
   assert.ok(page.url().endsWith('#missionTitle'));
   assert.equal(topNavigations,1);
   await page.locator('.desktop-nav [data-nav="company"]').click();await ready();
   assert.ok(!page.url().includes('#'));
   for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    for(const language of ['ko','en']) {
     await page.evaluate(language=>INIT_I18N.setLanguage(language),language);
     for(const file of pages) {
      await navigate(file);
      assert.equal(await page.evaluate(()=>documentProof),'preserved');
      assert.equal(await page.locator('html').getAttribute('lang'),language);
      assert.equal(await page.locator('h1').count(),1);
      assert.equal(await page.locator('main').count(),1);
      assert.equal(await page.locator('body').evaluate(node=>getComputedStyle(node).opacity),'1');
      assert.equal(await page.locator('body').evaluate(node=>node.inert),false);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      const assets=await page.evaluate(()=>({
       css:[...document.querySelectorAll('link[rel="stylesheet"]')].map(node=>node.href),
       js:[...document.querySelectorAll('script[src]')].map(node=>node.src)
      }));
      for(const values of Object.values(assets))assert.equal(values.length,new Set(values).size);
      await checkMetadataPaths(page,config,file,base);
      checks++;
     }
    }
   }
   // Submenu page links and repeated behavior mounts remain functional.
   await page.setViewportSize({width:1440,height:1000});
   await navigate('solutions/index.html');
   await page.locator('[data-page-sub-link][href="in-surveyone/index.html"]').click();
   await page.waitForURL(base+'solutions/in-surveyone/index.html');await ready();
   await navigate('company/index.html');
   await page.evaluate(()=>scrollTo({top:850,behavior:'instant'}));
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await navigate('services/index.html');
   await page.evaluate(()=>history.back());
   await page.waitForFunction(()=>INIT_SITE_ENGINE.file==='company/index.html'&&!INIT_PAGE_NAVIGATION.pending);
   assert.ok(Math.abs(await page.evaluate(()=>scrollY)-850)<2,'History should restore scroll position');
   await page.evaluate(()=>history.forward());
   await page.waitForFunction(()=>INIT_SITE_ENGINE.file==='services/index.html'&&!INIT_PAGE_NAVIGATION.pending);
   // Superseded and failed preparation must retain the live page and discard staged CSS.
   gate={file:'company/index.html',seen:defer(),release:defer()};const stale=gate;
   await page.evaluate(url=>{window.staleNavigation=INIT_PAGE_NAVIGATION.navigate(url);},base+'company/index.html');
   await stale.seen.promise;
   await navigate('projects/index.html');
   stale.release.resolve();await page.evaluate(()=>staleNavigation);
   assert.ok(page.url().endsWith('projects/index.html'));
   failFile='contact/index.html';
   assert.equal(await page.evaluate(url=>INIT_PAGE_NAVIGATION.navigate(url),base+'contact/index.html'),false);
   failFile=null;
   assert.equal(await page.locator('body').getAttribute('data-page'),'projects');
   assert.equal(await page.locator('link[data-site-staged]').count(),0);
   assert.ok(await page.locator('[data-page-status]').textContent());
   await navigate('contact/index.html');
   assert.equal(await page.locator('[data-page-status]').textContent(),'');
   await page.emulateMedia({reducedMotion:'reduce'});
   await navigate('index.html');
   assert.equal(await page.locator('body').evaluate(node=>getComputedStyle(node).animationName),'none');
   const samples=await page.evaluate(()=>navigationFrames);
   assert.ok(samples.length);
   assert.ok(samples.every(sample=>sample.visible && sample.text.trim()),'An intermediate frame was empty or hidden '+JSON.stringify({prefix,fallback,bad:samples.filter(sample=>!sample.visible||!sample.text.trim()).slice(0,2)}));
   frames+=samples.length;
   assert.equal(topNavigations,1);
   assert.deepEqual(failures,[]);
   await page.screenshot({path:path.join(root,'.tmp','navigation-after-ready.png')});
   await context.close();
  }
  console.log('PASS: '+checks+' prepared page/language/width checks across root/subfolder and native/fallback swaps; '+frames+' rendered DOM frames contain visible content; actual menu/submenu/current-page links, history/scroll, latest-click wins and failure cleanup keep one live document.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});