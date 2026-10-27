const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit,devices}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:8200/';
const config=JSON.parse(fs.readFileSync(path.join(root,'assets/shared/site.json'),'utf8'));
const files=new Set(JSON.parse(fs.readFileSync(path.join(root,'static-files.json'),'utf8')));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2'};
const output=path.join(root,'.tmp/navigation-stability');fs.mkdirSync(output,{recursive:true});
const profiles=[['iphone',webkit,'iPhone 13'],['android',chromium,'Pixel 7'],['ipad',webkit,'iPad (gen 7)'],['android-tablet',chromium,'Galaxy Tab S4']];
(async()=>{
 const report=[];
 for(const [name,type,device] of profiles){
  if(process.env.STABILITY_BROWSER && process.env.STABILITY_BROWSER!==name)continue;
  const browser=await type.launch({headless:true});
  try{
   const page=await browser.newPage({...devices[device]});
   const errors=[],requests=new Map();page.on('pageerror',e=>errors.push(e.message));
   // Delayed replacement sheets expose the intermediate cascade for several frames.
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url());assert.equal(url.origin,new URL(base).origin);
    let file=url.pathname.slice(1);if(!file||file.endsWith('/'))file+='index.html';
    if(!files.has(file))return route.fulfill({status:404,body:'Missing'});
    const count=(requests.get(file)||0)+1;requests.set(file,count);
    if(file.endsWith('.css')&&count>1)await new Promise(resolve=>setTimeout(resolve,180));
    try{await route.fulfill({body:fs.readFileSync(path.join(root,file)),contentType:mime[path.extname(file)]||'application/octet-stream',headers:{'Cache-Control':'no-store'}});}
    catch(error){if(!/closed|handled|cancel|abort/i.test(error.message))throw error;}
   });
   await page.goto(base);await page.evaluate(()=>INIT_SITE_READY);
   await page.evaluate(()=>{
    window.stability={frames:[],railScrolls:0,viewport:document.querySelector('meta[name="viewport"]'),sequence:0};
    const into=Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView=function(...args){if(this.closest('.page-sub-navigation-links'))stability.railScrolls++;return into.apply(this,args);};
    document.addEventListener('init:pagechange',()=>stability.sequence++);
    document.addEventListener('click',()=>{stability.frames=[];},true);
    function sample(){
     const h1=document.querySelector('h1').getBoundingClientRect();
     const target=location.hash?document.getElementById(decodeURIComponent(location.hash.slice(1))):null;
     stability.frames.push({sequence:stability.sequence,y:scrollY,h1:[h1.top+scrollY,h1.height],target:target?.getBoundingClientRect().top,scale:visualViewport.scale,width:innerWidth,
      viewport:document.querySelector('meta[name="viewport"]')===stability.viewport&&document.querySelectorAll('meta[name="viewport"]').length===1,
      styles:[...document.querySelectorAll('link[data-site-style]:not([data-site-staged])')].map(n=>n.dataset.siteStyle)});
     requestAnimationFrame(sample);
    }requestAnimationFrame(sample);
   });
   let count=0,maxMovement=0,menuChecks=0,sectionChecks=0,actionChecks=0;
   async function check(file,action,smooth = false){
    await page.evaluate(()=>{stability.frames=[];});
    if(action){await action();await page.evaluate(()=>INIT_SITE_READY);}
    else assert.equal(await page.evaluate(url=>INIT_PAGE_NAVIGATION.navigate(url),base+file),true);
    await page.waitForFunction(()=>!document.querySelector('[data-site-staged]'));
    await page.waitForFunction(()=>stability.frames.filter(f=>f.sequence===stability.sequence).length>=6);
    await page.waitForTimeout(220);
    if(smooth)await page.waitForFunction(()=>{
     const frames=stability.frames.filter(f=>f.sequence===stability.sequence).slice(-6);
     return frames.length===6&&Math.max(...frames.map(f=>f.y))-Math.min(...frames.map(f=>f.y))<=1;
    });
    const data=await page.evaluate(()=>({...stability,viewport:undefined,frames:stability.frames.filter(f=>f.sequence===stability.sequence)}));
    const group=config.pages[file.split('#')[0]].group;
    const expected=config.styles.filter(s=>!s.group||s.group===group).map(s=>s.path);
    assert.ok(data.frames.length>=3,name+' '+file+' insufficient frame samples');
    for(const f of data.frames){assert.deepEqual(f.styles,expected,name+' '+file+' CSS cascade');assert.equal(f.viewport,true,name+' viewport replaced');assert.equal(f.scale,1,name+' viewport zoom changed');}
    for(const measure of [...(smooth?[]:[f=>f.y]),f=>f.h1[0],f=>f.h1[1],...(file.includes('#')?[f=>f.target+(smooth?f.y:0)]:[])]){
     const values=data.frames.map(measure);assert.ok(values.every(Number.isFinite),name+' '+file+' missing position');
     const movement=Math.max(...values)-Math.min(...values);maxMovement=Math.max(maxMovement,movement);
     if(movement>1)fs.writeFileSync(path.join(output,'failure-'+name+'.json'),JSON.stringify({file,values,data},null,2));
     assert.ok(movement<=1,name+' '+file+' moved '+movement+'px after navigation');
    }
    if(smooth){
     const ys=data.frames.map(f=>f.y),direction=Math.sign(ys.at(-1)-ys[0]);
     for(let i=1;i<ys.length;i++)assert.ok((ys[i]-ys[i-1])*direction>=-1,name+' '+file+' reversed during smooth scrolling');
     assert.ok(Math.max(...ys.slice(-6))-Math.min(...ys.slice(-6))<=1,name+' '+file+' did not settle');
    }
    assert.equal(data.railScrolls,0,name+' menu rail scrolled page ancestors');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,name+' '+file+' horizontal overflow');
    count++;
   }
   for(const language of ['ko','en']){
    await page.evaluate(language=>INIT_I18N.setLanguage(language),language);await page.waitForTimeout(120);
    // Cross stylesheet groups and directory depths, including every public page.
    for(const file of [...Object.keys(config.pages),'solutions/data-editing-system/index.html','company/index.html#historyTitle','services/index.html#quality','projects/index.html#business-research'])await check(file);
    // Every full-menu entry: roots, overview links, section links and all products.
    const menuIds=config.navigation.groups.flatMap(group=>[group.root,...group.items]);
    for(const id of menuIds){
     await page.evaluate(url=>INIT_PAGE_NAVIGATION.navigate(url),base);
     await page.evaluate(()=>scrollTo({top:500,behavior:'instant'}));
     await page.locator('[data-menu-toggle]').tap();
     await check(config.navigation.links[id].path,()=>page.locator('[data-mobile-menu] [data-i18n="navigation.'+id+'"]').tap());
     menuChecks++;
    }
    console.log(name+' '+language+' all full-menu destinations stable');
    // Every sub-menu entry, including intentional same-document smooth scrolling.
    for(const group of config.navigation.groups)for(const id of group.items){
     const source=config.navigation.links[group.root].path,target=config.navigation.links[id].path;
     await page.evaluate(url=>INIT_PAGE_NAVIGATION.navigate(url),base+source);
     await page.evaluate(()=>scrollTo({top:500,behavior:'instant'}));await page.waitForTimeout(80);
     const link=page.locator('[data-page-sub-link][data-i18n="navigation.'+id+'"]');
     await link.evaluate(node=>{const rail=node.closest('.page-sub-navigation-links');rail.scrollTo({left:node.offsetLeft,behavior:'instant'});});
     await check(target,()=>link.tap(),target.split('#')[0]===source);
     sectionChecks++;
    }
    console.log(name+' '+language+' all sub-menu destinations stable');
    // The requested left-button sequence must work through real taps in both languages.
    const actionViewport=page.viewportSize();
    const splitView=!(await page.locator('.mobile-action-bar').isVisible());
    if(splitView){await page.setViewportSize({width:712,height:actionViewport.height});await page.waitForTimeout(120);}
    const chain=[
     ['index.html','services/index.html',{ko:'서비스 보기',en:'View services'}],
     ['services/index.html','solutions/index.html',{ko:'솔루션 보기',en:'View solutions'}],
     ['solutions/index.html','projects/index.html',{ko:'사업분야 보기',en:'View business areas'}],
     ['projects/index.html','careers/index.html',{ko:'채용 보기',en:'View careers'}],
     ...['inbups','in-surveyone','data-editing-system'].map(product=>['solutions/'+product+'/index.html','projects/index.html',{ko:'사업분야 보기',en:'View business areas'}])
    ];
    for(const [source,target,labels] of chain){
     await page.evaluate(url=>INIT_PAGE_NAVIGATION.navigate(url),base+source);
     const link=page.locator('.mobile-action-bar a').first();
     assert.equal((await link.innerText()).trim(),labels[language]);
     assert.equal(await link.evaluate(node=>node.href),base+target);
     assert.equal(await link.evaluate(node=>node.scrollWidth>node.clientWidth+1),false,name+' '+source+' action text overflow');
     await page.screenshot({path:path.join(output,name+'-'+language+'-'+source.replace(/[/\.]/g,'-')+'-actions.png'),scale:'css'});
     await check(target,()=>link.tap());assert.equal(page.url(),base+target);actionChecks++;
    }
    console.log(name+' '+language+' sequential mobile actions passed');
    if(splitView){await page.setViewportSize(actionViewport);await page.waitForTimeout(120);}
    // Actual touch menu selection from a scrolled document.
    await page.evaluate(()=>scrollTo({top:700,behavior:'instant'}));
    await page.locator('[data-menu-toggle]').tap();
    await check('company/index.html',()=>page.locator('[data-menu-section="company"] .site-map-root').tap());
    await page.evaluate(()=>scrollTo({top:600,behavior:'instant'}));await page.waitForTimeout(100);
    const saved=await page.evaluate(()=>scrollY);
    await check('contact/index.html');
    const sequence=await page.evaluate(()=>stability.sequence);
    await check('company/index.html',async()=>{await page.goBack();await page.waitForFunction(n=>stability.sequence>n,sequence);});
    assert.ok(Math.abs(await page.evaluate(()=>scrollY)-saved)<=1,name+' history scroll restoration');
    const size=page.viewportSize();await page.setViewportSize({width:size.height,height:size.width});
    await page.waitForTimeout(120);await check('services/index.html');await check('company/index.html#historyTitle');
    await page.setViewportSize(size);await page.waitForTimeout(120);
   }
   assert.deepEqual(errors,[]);
   const result={name,checks:count,menuChecks,sectionChecks,actionChecks,maxMovement};report.push(result);console.log('PASS '+JSON.stringify(result));
   await page.screenshot({path:path.join(output,name+'.png'),scale:'css'});
  }finally{await browser.close();}
 }
 fs.writeFileSync(path.join(output,(process.env.STABILITY_BROWSER?process.env.STABILITY_BROWSER+'-':'')+'results.json'),JSON.stringify(report,null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
