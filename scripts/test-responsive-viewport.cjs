const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit,devices}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:8200/';
const config=JSON.parse(fs.readFileSync(path.join(root,'assets/shared/site.json'),'utf8'));
const output=path.join(root,'.tmp/responsive-viewport');fs.mkdirSync(output,{recursive:true});
const frames=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function check(page,label,mobile) {
 await frames(page);
 const data=await page.evaluate(()=>{
  const bar=document.querySelector('.mobile-action-bar'),v=visualViewport;
  const rect=node=>{const b=node.getBoundingClientRect();return {left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
  return {bar:bar&&{...rect(bar),display:getComputedStyle(bar).display},links:bar&&[...bar.querySelectorAll('a')].map(link=>{
   const b=rect(link),x=(b.left+b.right)/2,y=(b.top+b.bottom)/2;
   return {...b,hit:link.contains(document.elementFromPoint(x,y)),text:link.textContent.trim()};
  }),view:v?{left:v.offsetLeft,top:v.offsetTop,right:v.offsetLeft+v.width,bottom:v.offsetTop+v.height}:{left:0,top:0,right:innerWidth,bottom:innerHeight},padding:parseFloat(getComputedStyle(document.body).paddingBottom),overflow:document.documentElement.scrollWidth>innerWidth+1,
   hiddenReveals:[...document.querySelectorAll('.reveal:not(.is-visible)')].filter(node=>{const r=node.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight-1&&r.width&&r.height;}).length};
 });
 assert.equal(data.overflow,false,label+' horizontal overflow');
 if(!data.bar)return data;
 if(!mobile){assert.equal(data.bar.display,'none',label+' desktop bar hidden');return data;}
 assert.equal(data.bar.display,'grid',label+' mobile bar must appear without reload');
 assert.ok(Math.abs(data.bar.bottom-data.view.bottom)<1,label+' bar outside visual bottom: '+JSON.stringify(data));
 assert.ok(data.bar.top>=data.view.top-1,label+' bar above visible area');
 assert.ok(Math.abs(data.bar.left-data.view.left)<1&&Math.abs(data.bar.right-data.view.right)<1,label+' bar outside visual width');
 assert.ok(data.padding+1>=data.bar.height,label+' footer clearance smaller than bar');
 assert.equal(data.links.length,2,label+' two actions');
 for(const link of data.links){assert.ok(link.top>=data.view.top&&link.bottom<=data.view.bottom+1,label+' clipped action '+link.text);assert.ok(link.hit,label+' action cannot receive a pointer '+link.text);}
 assert.equal(data.hiddenReveals,0,label+' responsive content needs a reload to appear');
 return data;
}
(async()=>{
 const results=[];
 for(const [name,type,device] of [['android',chromium,'Pixel 7'],['iphone',webkit,'iPhone 13']]){
  const browser=await type.launch({headless:true});
  try{
   const context=await browser.newContext({...devices[device],viewport:{width:1440,height:900}}),page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base);await page.evaluate(()=>INIT_SITE_READY);await page.evaluate(()=>{window.responsiveDocument=crypto.randomUUID();});
   const documentId=await page.evaluate(()=>responsiveDocument);let checks=0;
   for(const language of ['ko','en']){
    await page.evaluate(language=>INIT_I18N.setLanguage(language),language);
    for(const file of Object.keys(config.pages)){
     await page.setViewportSize({width:1440,height:900});
     assert.equal(await page.evaluate(url=>INIT_PAGE_NAVIGATION.navigate(url),base+file),true);
     await check(page,name+' '+language+' '+file+' desktop',false);checks++;
     for(const size of [{width:390,height:695},{width:320,height:480},{width:810,height:600},{width:695,height:390},{width:390,height:844}]){
      await page.setViewportSize(size);
      await check(page,name+' '+language+' '+file+' '+size.width+'x'+size.height,size.width<=800);checks++;
     }
     await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
     await check(page,name+' '+language+' '+file+' footer',true);checks++;
     const footerClear=await page.evaluate(()=>{
      const footer=document.querySelector('.site-footer'),bar=document.querySelector('.mobile-action-bar');
      return !footer||!bar||footer.getBoundingClientRect().bottom<=bar.getBoundingClientRect().top+1;
     });
     assert.ok(footerClear,name+' '+file+' footer covered by fixed actions');
     await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
     await page.setViewportSize({width:1440,height:900});await check(page,name+' '+file+' returned desktop',false);checks++;
     assert.equal(await page.evaluate(()=>responsiveDocument),documentId,'Resize or navigation reloaded the document');
    }
   }
   // The Chromium DevTools device-mode switch must work on an already loaded PC page.
   if(type===chromium){
    const session=await context.newCDPSession(page);
    for(const language of ['ko','en']){
     await page.evaluate(language=>INIT_I18N.setLanguage(language),language);
     for(const file of Object.keys(config.pages)){
      await session.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
      await page.evaluate(url=>INIT_PAGE_NAVIGATION.navigate(url),base+file);
      await session.send('Emulation.setDeviceMetricsOverride',{width:390,height:695,screenWidth:390,screenHeight:695,deviceScaleFactor:1,mobile:true,scale:0.8});
      await check(page,'DevTools '+language+' '+file,true);checks++;
      await session.send('Emulation.setPageScaleFactor',{pageScaleFactor:1.25});
      await check(page,'reduced visible viewport '+language+' '+file,true);checks++;
      await session.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});await check(page,'zoom reset '+language+' '+file,true);checks++;
     }
    }
    await session.detach();
   }
   await page.setViewportSize({width:390,height:695});
   await page.evaluate(()=>INIT_I18N.setLanguage('ko'));await page.evaluate(url=>INIT_PAGE_NAVIGATION.navigate(url),base);
   // Click coordinates, rather than forced clicks, verify the painted buttons' hit boxes.
   for(const file of ['services/index.html','solutions/index.html','projects/index.html','careers/index.html']){
    await check(page,name+' sequential '+file,true);
    const link=page.locator('.mobile-action-bar a').first(),box=await link.boundingBox();
    await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
    await page.waitForFunction(file=>INIT_SITE_ENGINE.file===file,file);
    await check(page,name+' clicked '+file,true);checks++;
   }
   assert.equal(await page.evaluate(()=>responsiveDocument),documentId,'Button click reloaded the document');
   assert.deepEqual(errors,[]);
   results.push({name,checks,errors});console.log('PASS '+JSON.stringify(results.at(-1)));await context.close();
  }finally{await browser.close();}
 }
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
