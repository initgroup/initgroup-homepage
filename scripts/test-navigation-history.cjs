const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit,devices}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:8200/';
const files=new Set(JSON.parse(fs.readFileSync(path.join(root,'static-files.json'),'utf8')));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
(async()=>{
 for(const [name,type,device] of [['iphone',webkit,'iPhone 13'],['android',chromium,'Pixel 7']]){
  const browser=await type.launch({headless:true});
  try{for(const language of ['ko','en']){
   const page=await browser.newPage({...devices[device]});const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>{
    const replace=history.replaceState;window.historyWrites=0;
    history.replaceState=function(...args){historyWrites++;return replace.apply(this,args);};
   });
   await page.route('**/*',route=>{
    const url=new URL(route.request().url());if(!/^https?:$/.test(url.protocol))return route.continue();
    let file=url.pathname.slice(1);if(!file||file.endsWith('/'))file+='index.html';
    if(!files.has(file))return route.fulfill({status:404,body:'Missing'});
    return route.fulfill({body:fs.readFileSync(path.join(root,file)),contentType:mime[path.extname(file)]||'application/octet-stream'});
   });
   await page.goto(base);await page.evaluate(()=>INIT_SITE_READY);
   await page.evaluate(language=>INIT_I18N.setLanguage(language),language);
   assert.equal(await page.evaluate(url=>INIT_PAGE_NAVIGATION.navigate(url),base+'company/index.html'),true);
   await page.evaluate(()=>scrollTo({top:600,behavior:'instant'}));
   assert.equal(await page.evaluate(url=>INIT_PAGE_NAVIGATION.navigate(url),base+'contact/index.html'),true);
   const stress=await page.evaluate(()=>new Promise(resolve=>{
    historyWrites=0;let frame=0;const start=performance.now();
    function scroll(){scrollTo({top:100+frame*3,behavior:'instant'});frame++;if(frame<160)requestAnimationFrame(scroll);else resolve({frames:frame,writes:historyWrites,elapsed:performance.now()-start,y:scrollY});}
    requestAnimationFrame(scroll);
   }));
   assert.ok(stress.writes<=Math.ceil(stress.elapsed/500)+2,name+' excessive history writes: '+JSON.stringify(stress));
   // Back immediately, before the delayed history write has to run.
   await page.goBack();await page.waitForFunction(()=>INIT_SITE_ENGINE.file==='company/index.html');await page.evaluate(()=>INIT_SITE_READY);
   assert.ok(Math.abs(await page.evaluate(()=>scrollY)-600)<=1,name+' back scroll position');
   await page.goForward();await page.waitForFunction(()=>INIT_SITE_ENGINE.file==='contact/index.html');await page.evaluate(()=>INIT_SITE_READY);
   assert.ok(Math.abs(await page.evaluate(()=>scrollY)-stress.y)<=1,name+' forward latest scroll position');
   await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));
   assert.ok(Math.abs(await page.evaluate(()=>history.state.initStaticPage.scroll.y)-stress.y)<=1,name+' persisted scroll position');
   assert.deepEqual(errors,[]);
   console.log('PASS '+name+' '+language+': '+stress.frames+' scroll frames, '+stress.writes+' history writes, immediate back/forward and pagehide retain the latest position.');
   await page.close();
  }}finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
