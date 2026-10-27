const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../.htaccess'),'utf8');
// Evaluate the deployed production-alias rules; actual Cafe24 HTTP checks are separate.
function redirect(host,https,forwarded,pathname,query){
 const values={HTTP_HOST:host,HTTPS:https,'HTTP:X-Forwarded-Proto':forwarded||'',REQUEST_URI:pathname};let conditions=[];
 for(const raw of source.split(/\r?\n/)){
  const line=raw.trim(),condition=line.match(/^RewriteCond\s+%\{([^}]+)\}\s+(\S+)(?:\s+\[([^\]]+)\])?/);
  if(condition){conditions.push(condition);continue;}
  const rule=line.match(/^RewriteRule\s+(\S+)\s+(\S+)(?:\s+\[([^\]]+)\])?/);if(!rule)continue;
  const current=conditions;conditions=[];
  if(!rule[2].startsWith('https://initgroup.kr'))continue;
  assert.match(rule[3],/R=301/);assert.match(rule[3],/\bL\b/);assert.match(rule[3],/\bNE\b/);
  const matches=current.every(([,key,pattern,flags])=>{const value=values[key]||'';if(pattern.startsWith('!='))return value!==pattern.slice(2);const inverse=pattern.startsWith('!');return new RegExp(inverse?pattern.slice(1):pattern,flags?.includes('NC')?'i':'').test(value)!==inverse;});
  if(matches)return rule[2].replace(/%\{([^}]+)\}/g,(_,name)=>values[name]||'')+(query?'?'+query:'');
 }
 return null;
}
let cases=0;
for(const pathname of ['/','/solutions/data-editing-system/','/preview/deep/page%20name.html'])for(const query of ['','from=seo&term=data%20quality']){
 for(const [host,https,forwarded,expected] of [['initgroup.kr','off','',true],['www.initgroup.kr','off','',true],['www.initgroup.kr','on','',true],['initgroup.kr','on','',false],['initgroup.kr','off','https',false],['www.initgroup.kr','off','https',true],['INITGROUP.KR:80','off','',true],['localhost:8200','off','',false],['moved.example','off','',false]]){
  assert.equal(redirect(host,https,forwarded,pathname,query),expected?'https://initgroup.kr'+pathname+(query?'?'+query:''):null);cases++;
 }
}
assert.match(source,/RewriteRule \^insights.*\[G,L\]/);assert.match(source,/indeps_.*\[G,L,NC\]/);
assert.match(source,/Cache-Control "no-cache, must-revalidate"/);assert.match(source,/public, max-age=31536000, immutable/);
console.log('PASS: '+cases+' Apache-rule fixtures retain path/query, avoid proxy loops and unrelated hosts, and preserve 410/cache rules. Production HTTP status still requires upload verification.');
