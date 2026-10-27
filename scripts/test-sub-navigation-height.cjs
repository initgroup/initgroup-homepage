const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit,devices}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:8200/';
const config=JSON.parse(fs.readFileSync(path.join(root,'assets/shared/site.json'),'utf8'));
const files=new Set(JSON.parse(fs.readFileSync(path.join(root,'static-files.json'),'utf8')));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const output=path.join(root,'.tmp/sub-navigation-height');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const results=[];
 for(const [name,type,device] of [['iphone-webkit',webkit,'iPhone 13'],['android-chromium',chromium,'Pixel 7']]){
  const browser=await type.launch({headless:true});let checks=0,frames=0;
  try{for(const width of [320,390,768,810,1440]){
   const page=await browser.newPage(width<1100?{...devices[device],viewport:{width,height:900}}:{viewport:{width,height:900}});
   const errors=[],requests=new Map();page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url());let file=url.pathname.slice(1);if(!file||file.endsWith('/'))file+='index.html';
    if(!files.has(file))return route.fulfill({status:404,body:'Missing'});
    const count=(requests.get(file)||0)+1;requests.set(file,count);
    if(file.endsWith('.css')&&count>1)await new Promise(resolve=>setTimeout(resolve,90));
    try{await route.fulfill({body:fs.readFileSync(path.join(root,file)),contentType:mime[path.extname(file)]||'application/octet-stream',headers:{'Cache-Control':'no-store'}});}
    catch(error){if(!/closed|handled|cancel|abort/i.test(error.message))throw error;}
   });
   await page.goto(base);await page.evaluate(()=>INIT_SITE_READY);
   await page.evaluate(()=>{
    window.chromeFrames=[];
    window.measureChrome=()=>{const r=document.querySelector('[data-page-sub-navigation]').getBoundingClientRect();return {top:r.top,height:r.height,bottom:r.bottom,padding:parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)};};
    function sample(){chromeFrames.push(measureChrome());requestAnimationFrame(sample);}requestAnimationFrame(sample);
   });
   const expected=await page.evaluate(()=>measureChrome());
   async function verify(file){
    await page.waitForFunction(()=>!document.querySelector('[data-site-staged]'));
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const current=await page.evaluate(()=>measureChrome());
    for(const key of Object.keys(expected))assert.ok(Math.abs(current[key]-expected[key])<=0.1,name+' '+width+' '+file+' '+key+': '+current[key]+' vs '+expected[key]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,name+' '+width+' horizontal overflow');
    const bad=await page.locator('[data-page-sub-link]').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).whiteSpace!=='nowrap'||n.scrollHeight>n.clientHeight+1).map(n=>n.textContent));
    assert.deepEqual(bad,[],name+' '+width+' wrapped or vertically clipped sub-menu text');checks++;
   }
   const touch=locator=>width<1100?locator.tap():locator.click();
   for(const language of ['ko','en']){
    await page.evaluate(language=>INIT_I18N.setLanguage(language),language);
    for(const file of Object.keys(config.pages).filter(file=>file!=='404.html')){
     assert.equal(await page.evaluate(url=>INIT_PAGE_NAVIGATION.navigate(url),base+file),true);await verify(file);
    }
    // Tap through the actual lower-button sequence that exposed the height jump.
    if(width<768){
     await page.evaluate(()=>INIT_PAGE_NAVIGATION.navigate(INIT_SITE_ENGINE.rootUrl));
     for(const target of ['services/index.html','solutions/index.html','projects/index.html','careers/index.html']){
      await page.locator('.mobile-action-bar a').first().tap();await page.evaluate(()=>INIT_SITE_READY);assert.equal(page.url(),base+target);await verify(target);
     }
    }
    // Long product names remain readable by horizontal scrolling in the same row.
    await page.evaluate(url=>INIT_PAGE_NAVIGATION.navigate(url),base+'solutions/index.html');
    for(const id of config.navigation.groups.find(group=>group.id==='solutions').items.slice(1)){
     const link=page.locator('[data-page-sub-link][data-i18n="navigation.'+id+'"]');
     await link.evaluate(node=>node.closest('.page-sub-navigation-links').scrollTo({left:node.offsetLeft,behavior:'instant'}));
     await touch(link);await page.evaluate(()=>INIT_SITE_READY);assert.equal(page.url(),base+config.navigation.links[id].path);await verify(config.navigation.links[id].path);
    }
    await page.screenshot({path:path.join(output,name+'-'+width+'-'+language+'.png'),scale:'css'});
   }
   const samples=await page.evaluate(()=>chromeFrames);frames+=samples.length;
   for(const frame of samples)for(const key of Object.keys(expected))assert.ok(Math.abs(frame[key]-expected[key])<=0.1,name+' '+width+' a displayed frame changed '+key);
   assert.deepEqual(errors,[]);await page.close();
   console.log('PASS '+name+' '+width+'px: all page rows, sequential mobile buttons and product tabs share one height in ko/en.');
  }}finally{await browser.close();}
  results.push({name,checks,frames});
 }
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');console.log('PASS '+JSON.stringify(results));
})().catch(error=>{console.error(error);process.exitCode=1;});
