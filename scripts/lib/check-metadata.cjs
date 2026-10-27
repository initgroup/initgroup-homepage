const assert = require('node:assert/strict');

// Search metadata stays on the official HTTPS origin even in a relocated preview.
async function checkMetadataPaths(page, config, file, deploymentBase) {
  const data = await page.evaluate(() => ({
    base: document.baseURI,
    language: document.documentElement.lang,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ogUrl: document.querySelector('meta[property="og:url"]')?.content,
    ogImage: document.querySelector('meta[property="og:image"]')?.content,
    graphs: [...document.querySelectorAll('script[type="application/ld+json"]')].map(node => JSON.parse(node.textContent))
  }));
  function check(raw, target, label) {
    assert.equal(typeof raw,'string',file+': missing '+label);
    assert.ok(raw.length,file+': empty '+label);
    assert.match(raw,/^https:\/\//i,file+': non-absolute '+label);
    assert.doesNotMatch(raw,/\\/,file+': invalid '+label);
    assert.equal(raw,new URL(target,config.sitemapBaseUrl).href,file+': incorrect '+label);
  }
  const definition = config.pages[file];
  check(data.canonical,definition.canonicalPath,'canonical');
  if(definition.openGraph) {
    check(data.ogUrl,definition.canonicalPath,'og:url');
    const target=(definition.ogImage || config.defaults.ogImage).replace(/_kor\.png$/,data.language==='en'?'_eng.png':'_kor.png');
    check(data.ogImage,target,'og:image');
  } else {
    assert.equal(data.ogUrl,undefined,file+': unexpected OG URL');
    assert.equal(data.ogImage,undefined,file+': unexpected OG image');
  }
  const definitions=(definition.schemas || []).map(node=>node.shared?config.sharedSchemas[node.shared]:node);
  assert.equal(data.graphs.length,definitions.length?1:0,file+': JSON-LD blocks');
  if(!definitions.length)return;
  assert.equal(data.graphs[0]['@context'],'https://schema.org','Vocabulary remains an external identifier');
  assert.equal(data.graphs[0]['@graph'].length,definitions.length,file+': JSON-LD nodes');
  function walk(source, actual, label) {
    if(source && typeof source==='object' && Object.hasOwn(source,'sitePath')) {
      let target=source.sitePath;
      if(label.endsWith('.image') && data.language==='en')target=target.replace(/_kor\.png$/,'_eng.png');
      check(actual,target,label);
    } else if(source==='{canonical}') {
      check(actual,definition.canonicalPath,label);
    } else if(source && typeof source==='object') {
      for(const [key,value] of Object.entries(source))walk(value,actual?.[key],label+'.'+key);
    }
  }
  definitions.forEach((node,index)=>walk(node,data.graphs[0]['@graph'][index],'JSON-LD.'+index));
}
module.exports={checkMetadataPaths};
