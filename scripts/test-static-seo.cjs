const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const config=JSON.parse(read('assets/shared/site.json')),ko=JSON.parse(read('assets/i18n/ko.json'));
const files=new Set(JSON.parse(read('static-files.json'))),pages=Object.keys(config.pages);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2'};
const expectedPages=['index.html','company/index.html','services/index.html','solutions/index.html','projects/index.html','careers/index.html','contact/index.html','solutions/data-editing-system/index.html','solutions/inbups/index.html','solutions/in-surveyone/index.html'];
const authored=source=>source.replace(/    <!-- site:seo:start -->[\s\S]*?    <!-- site:seo:end -->\n/g,'').replace(/<!-- site:header:start -->\n<header data-site-include="([^"]+)"[\s\S]*?<!-- site:header:end -->/g,(_,include)=>'<template data-site-include="'+include+'"></template>');
(async()=>{
 assert.deepEqual(config.sitemapPages,expectedPages);
 const sitemap=[...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
 assert.deepEqual(sitemap,expectedPages.map(file=>new URL(config.pages[file].canonicalPath,config.sitemapBaseUrl).href));
 assert.doesNotMatch(read('sitemap.xml'),/<(?:lastmod|priority|changefreq)>/);
 assert.match(read('robots.txt'),/Allow: \/\s/);assert.doesNotMatch(read('robots.txt'),/^Disallow:\s*\/\s*$/m);
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({javaScriptEnabled:false});
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());let file=url.pathname.slice(1);if(!file||file.endsWith('/'))file+='index.html';
   if(!files.has(file))return route.fulfill({status:404,body:'Missing'});
   return route.fulfill({body:fs.readFileSync(path.join(root,file)),contentType:mime[path.extname(file)]||'application/octet-stream'});
  });
  const page=await context.newPage(),titles=[],descriptions=[];
  for(const file of pages){
   const source=read(file),definition=config.pages[file];
   assert.ok(source.indexOf('charset="utf-8"')<1024,file+' early encoding');
   assert.doesNotMatch(source,/in[-_ ]?deps|인뎁스/i,file+' old public product name');
   assert.equal((source.match(/<script\b[^>]*\bsrc=/g)||[]).length,1,file+' executable bootstrap');
   await page.goto('http://127.0.0.1:8200/'+file+'?from=seo#ignored');
   for(const selector of ['title','meta[name="description"]','meta[name="viewport"]','link[rel="canonical"]'])assert.equal(await page.locator(selector).count(),1,file+' '+selector);
   const expectedTitle=ko[definition.titleKey||config.defaults.titleKey],expectedDescription=ko[definition.descriptionKey||config.defaults.descriptionKey];
   assert.equal(await page.title(),expectedTitle);assert.equal(await page.locator('meta[name="description"]').getAttribute('content'),expectedDescription);
   assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),new URL(definition.canonicalPath,config.sitemapBaseUrl).href);
   if(definition.openGraph)for(const [property,value] of [['title',expectedTitle],['description',expectedDescription],['url',new URL(definition.canonicalPath,config.sitemapBaseUrl).href]])assert.equal(await page.locator('meta[property="og:'+property+'"]').getAttribute('content'),value);
   if(definition.robots)assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),definition.robots);
   const links=await page.locator('header[data-site-prerender] a').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,raw:n.getAttribute('href'),url:n.href})));
   assert.equal(links.length,10);assert.ok(links.every(link=>link.text.trim()&&!/^(?:https?:|\/)/.test(link.raw)));
   assert.deepEqual(links.map(link=>link.url),expectedPages.map(f=>new URL(config.pages[f].canonicalPath,'http://127.0.0.1:8200/').href));
   assert.equal(links.find(link=>link.url.endsWith('/solutions/data-editing-system/')).text,'인에디타원 IN-EDITAONE');
   assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('main').count(),1);
   for(const raw of await page.locator('script[type="application/ld+json"]').allTextContents()){
    const graph=JSON.parse(raw);assert.equal(graph['@context'],'https://schema.org');assert.ok(Array.isArray(graph['@graph']));
    assert.equal(graph['@graph'].length,(definition.schemas||[]).length);
   }
   if(!definition.robots){titles.push(expectedTitle);descriptions.push(expectedDescription);}
  }
  assert.equal(new Set(titles).size,10,'Unique indexable titles');assert.equal(new Set(descriptions).size,10,'Unique indexable descriptions');
  await context.close();
 }finally{await browser.close();}
 // Isolated build fixture: SEO edits must never rewrite authored content or timestamps unnecessarily.
 const fixture=fs.mkdtempSync(path.join(root,'.tmp','seo-build-'));
 for(const file of [...pages,'static-files.json','assets/shared/site.json','assets/i18n/ko.json','assets/i18n/en.json','sitemap.xml','robots.txt','scripts/build-site.ps1','scripts/sync-seo.ps1']){
  const target=path.join(fixture,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target);
 }
 const build=(check=false)=>execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(fixture,'scripts/build-site.ps1'),...(check?['-Check']:[])],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
 const snapshots=()=>Object.fromEntries(pages.map(file=>{const p=path.join(fixture,file);return [file,{body:authored(fs.readFileSync(p,'utf8')),hash:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),mtime:fs.statSync(p).mtimeMs}];}));
 const initial=snapshots();build();build(true);assert.deepEqual(snapshots(),initial,'Unchanged build must preserve bytes and mtimes');
 const next=structuredClone(config);next.navigation.links.services.label={ko:'서비스 시험',en:'Services fixture'};
 fs.writeFileSync(path.join(fixture,'assets/shared/site.json'),JSON.stringify(next));
 assert.throws(()=>build(true),/Static SEO is stale/);build();
 const changed=snapshots();for(const file of pages){assert.equal(changed[file].body,initial[file].body,file+' authored body changed');assert.notEqual(changed[file].hash,initial[file].hash,file+' static navigation did not update');}
 const stable=snapshots();build();assert.deepEqual(snapshots(),stable,'Repeated SEO build must be stable');
 console.log('PASS: 12 raw no-JS pages expose unique SEO, current product links and valid JSON-LD; 10 sitemap URLs; isolated generation preserves authored HTML and unchanged byte/mtime state.');
})().catch(error=>{console.error(error);process.exitCode=1;});
