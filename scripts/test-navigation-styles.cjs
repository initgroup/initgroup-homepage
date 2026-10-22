const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),files=new Set(JSON.parse(fs.readFileSync(path.join(root,'static-files.json'),'utf8')));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2'};
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  page.on('console',message=>{if(message.type()==='warning'||message.type()==='error')console.log(message.type(),message.text());});
  await page.addInitScript(()=>{document.startViewTransition=undefined;});
  const css=new Map();
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());let file=url.pathname.slice(1);if(!file||file.endsWith('/'))file+='index.html';
   if(!files.has(file))return route.fulfill({status:404,body:'Missing'});
   if(file.endsWith('.css')){const count=(css.get(file)||0)+1;css.set(file,count);if(count>1)await new Promise(resolve=>setTimeout(resolve,250));}
   await route.fulfill({status:200,body:fs.readFileSync(path.join(root,file)),contentType:mime[path.extname(file)]||'application/octet-stream',headers:{'Cache-Control':'no-store'}});
  });
  await page.goto('http://127.0.0.1:8200/');await page.evaluate(()=>INIT_SITE_READY);
  await page.evaluate(()=>{
   window.styleFrames=[];
   function sample(){
    const header=document.querySelector('.site-header');
    styleFrames.push({page:document.body.dataset.page,position:header&&getComputedStyle(header).position,font:getComputedStyle(document.body).fontFamily,opacity:getComputedStyle(document.body).opacity});
    requestAnimationFrame(sample);
   }
   requestAnimationFrame(sample);
  });
  for(const file of ['company/index.html','solutions/in-surveyone/index.html','contact/index.html'])assert.equal(await page.evaluate(file=>INIT_PAGE_NAVIGATION.navigate(new URL(file,INIT_SITE_ENGINE.rootUrl)),file),true);
  await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,500)));
  const frames=await page.evaluate(()=>styleFrames);
  const bad=frames.filter(frame=>frame.position!=='fixed'||!frame.font.includes('Init Sans')||frame.opacity!=='1');
  assert.equal(bad.length,0,"An unstyled frame was rendered");
  console.log('PASS: '+frames.length+' styled frames with HTTP cache disabled, repeated CSS responses delayed and browser transitions disabled; header, font and opacity remain intact across directory depths.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});