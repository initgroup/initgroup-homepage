const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
let browser;
async function ready(page){await page.evaluate(()=>window.INIT_SITE_READY);}
async function playing(page,suffix){
 await page.waitForFunction(()=>{const v=document.querySelector('[data-promo-dialog] video');return v.currentTime>.35&&!v.paused&&!v.error;},null,{timeout:15000});
 const before=await page.locator('video').evaluate(v=>v.currentTime);
 await page.waitForFunction(t=>document.querySelector('video').currentTime>t+.2,before,{timeout:5000});
 assert.match(await page.locator('video').getAttribute('src'),new RegExp('_'+suffix+'\\.mp4\\?v=[a-f0-9]{16}$'));
 assert.ok(!(await page.locator('video').getAttribute('src')).startsWith('http'));
 assert.equal(await page.locator('[data-promo-error]').isHidden(),true);
}
(async()=>{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 let cases=0;
 for(const base of ['http://127.0.0.1:8200/','http://127.0.0.1:8200/preview/','https://initgroup.kr/team/site/']){
  for(const width of [1440,390])for(const soft of [false,true]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   let failFilm=false;
   if(base.startsWith('https:'))await context.route('https://initgroup.kr/**',async route=>{
    const url=new URL(route.request().url()),relative=decodeURIComponent(url.pathname.slice('/team/site/'.length));
    const file=path.resolve(root,relative.endsWith('/')?relative+'index.html':relative||'index.html');
    if(!file.startsWith(root+path.sep)){await route.fulfill({status:404});return;}
    if(failFilm&&file.endsWith('.mp4')){await route.fulfill({status:503,body:'Retry fixture'});return;}
    if(!fs.existsSync(file)){await route.fulfill({status:404});return;}
    const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.mp4':'video/mp4','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon'};
    const body=fs.readFileSync(file),range=route.request().headers().range?.match(/^bytes=(\d+)-(\d*)$/);
    const headers={'content-type':mime[path.extname(file)]||'application/octet-stream','accept-ranges':'bytes'};
    if(range){const start=Number(range[1]),end=Math.min(Number(range[2]||body.length-1),body.length-1);await route.fulfill({status:206,headers:{...headers,'content-range':'bytes '+start+'-'+end+'/'+body.length},body:body.subarray(start,end+1)});}
    else await route.fulfill({status:200,headers,body});
   });
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+(soft?'solutions/in-surveyone/':''));await ready(page);
   if(soft)assert.equal(await page.evaluate(()=>INIT_PAGE_NAVIGATION.navigate(new URL('index.html',INIT_SITE_ENGINE.rootUrl))),true);
   for(const [language,suffix]of[['ko','kor'],['en','eng']]){
    await page.evaluate(l=>INIT_I18N.setLanguage(l),language);
    await page.locator('[data-promo-open]').click();
    await playing(page,suffix);cases++;
    // Reapplying the same language must not restart playback.
    const before=await page.locator('video').evaluate(v=>v.currentTime);
    await page.evaluate(l=>INIT_I18N.setLanguage(l),language);
    assert.ok(await page.locator('video').evaluate((v,t)=>v.currentTime>=t,before));
    await page.locator('[data-promo-close]').click();
    await page.waitForFunction(()=>!document.querySelector('video').hasAttribute('src'));
    assert.equal(await page.locator('[data-promo-open]').evaluate(n=>document.activeElement===n),true);
   }
   // A policy rejection has no MediaError. The retry is a new explicit user action.
   await page.evaluate(()=>{window.testNativePlay=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){return Promise.reject(new DOMException('Policy fixture','NotAllowedError'));};});
   await page.locator('[data-promo-open]').click();
   await page.locator('[data-promo-retry]').waitFor({state:'visible'});
   assert.equal(await page.locator('video').evaluate(v=>v.error),null);
   assert.equal(await page.locator('[data-promo-retry]').innerText(),'Play again');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.evaluate(()=>{HTMLMediaElement.prototype.play=window.testNativePlay;});
   await page.locator('[data-promo-retry]').click();await playing(page,'eng');
   // Language switches in both playing and paused states.
   await page.evaluate(()=>INIT_I18N.setLanguage('ko'));await playing(page,'kor');
   await page.locator('video').evaluate(v=>v.pause());
   await page.evaluate(()=>INIT_I18N.setLanguage('en'));
   assert.equal(await page.locator('video').evaluate(v=>v.paused),true);
   await page.locator('video').evaluate(v=>v.play());await playing(page,'eng');
   const oldVideo=await page.$('video');
   assert.equal(await page.evaluate(()=>INIT_PAGE_NAVIGATION.navigate(new URL('services/index.html',INIT_SITE_ENGINE.rootUrl))),true);
   assert.equal(await oldVideo.evaluate(v=>v.paused),true);
   assert.equal(await oldVideo.getAttribute('src'),null);
   assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('promo-video-open')),false);
   if(base.startsWith('https:')&&width===390&&soft){
    assert.equal(await page.evaluate(()=>INIT_PAGE_NAVIGATION.navigate(new URL('index.html',INIT_SITE_ENGINE.rootUrl))),true);
    failFilm=true;
    await page.locator('[data-promo-open]').click();await page.locator('[data-promo-retry]').waitFor({state:'visible'});
    failFilm=false;
    await page.locator('[data-promo-retry]').click();await playing(page,'eng');
   }
   assert.deepEqual(errors,[]);await context.close();
  }
 }
 console.log('PASS: '+cases+' actual progressing playback cases across local root/subfolder and production-origin relocated paths; ko/en desktop/mobile, direct/prepared entry, policy and HTTP-failure retries, active/paused language changes, repeat language, close/reopen and navigation cleanup.');
 await browser.close();
})().catch(async error=>{console.error(error);await browser?.close();process.exitCode=1;});
