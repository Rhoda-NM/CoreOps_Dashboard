const {test}=require('node:test'),assert=require('node:assert/strict');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}});
const {visibleDashboardNav,groupedDashboardNav,isDashboardNavActive}=require('../src/config/dashboard-nav.ts');
test('grouping retains existing role visibility and destinations without duplicates or empty headings',()=>{
 for(const role of ['OWNER','MANAGER','STAFF']){
  const groups=groupedDashboardNav(role),items=groups.flatMap(g=>g.items);
  assert.ok(groups.every(g=>g.items.length));assert.deepEqual(items.map(i=>i.href),visibleDashboardNav(role).map(i=>i.href));assert.equal(new Set(items.map(i=>i.href)).size,items.length);
 }
 assert.deepEqual(visibleDashboardNav('STAFF').map(i=>i.href),['/dashboard','/projects','/tasks']);
 assert.deepEqual(visibleDashboardNav('MANAGER').map(i=>i.href),['/dashboard','/clients','/projects','/tasks']);
 assert.deepEqual(groupedDashboardNav('STAFF').map(g=>g.title),['Overview','Your work']);
 assert.deepEqual(groupedDashboardNav('OWNER').map(g=>g.title),['Overview','Your work','Business finances','Workspace']);
});
test('active navigation covers nested workspace and subdomain paths without matching unrelated prefixes',()=>{
 for(const path of ['/w/synthetic/projects','/w/synthetic/projects/project-1/edit','/projects/project-1'])assert.equal(isDashboardNavActive(path,'/projects'),true);
 for(const path of ['/w/synthetic/projects-archive','/w/synthetic/clients','/projects-old'])assert.equal(isDashboardNavActive(path,'/projects'),false);
});
test('shared shell palette keeps text and focus readable on white, sage and forest surfaces',()=>{
 const css=require('node:fs').readFileSync(require('node:path').resolve(__dirname,'../src/app/globals.css'),'utf8');
 const values=Object.fromEntries([...css.matchAll(/--workspace-([a-z-]+):\s*(#[A-Fa-f0-9]{6});/g)].map(m=>[m[1],m[2]]));
 const lum=hex=>{const rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
 const check=(fg,bg,min)=>{const a=lum(values[fg]),b=lum(values[bg]);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=min,`${fg}/${bg} contrast below ${min}`);};
 for(const surface of ['bg','surface','surface-secondary']){check('text',surface,4.5);check('text-secondary',surface,4.5);check('focus',surface,3);}
 check('on-brand','brand',4.5);check('brand','surface-secondary',4.5);check('primary','surface-secondary',3);check('focus-on-brand','brand',3);
});
