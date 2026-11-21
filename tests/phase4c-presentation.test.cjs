const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const css=fs.readFileSync(require('node:path').resolve(__dirname,'../src/app/globals.css'),'utf8');
const variables=Object.fromEntries([...css.matchAll(/--(workspace-[a-z-]+):\s*(#[A-Fa-f0-9]{6})/g)].map(m=>[m[1],m[2]]));
function luminance(hex){const rgb=hex.slice(1).match(/../g).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];}
function ratio(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('semantic status text and primary controls meet normal-text contrast',()=>{
 for(const state of ['success','warning','danger','info'])assert.ok(ratio(variables['workspace-'+state],variables['workspace-'+state+'-surface'])>=4.5,state);
 for(const surface of ['workspace-surface','workspace-bg','workspace-surface-secondary'])for(const text of ['workspace-text','workspace-text-secondary'])assert.ok(ratio(variables[text],variables[surface])>=4.5,text+' on '+surface);
 assert.ok(ratio(variables['workspace-primary'],'#FFFFFF')>=4.5);
});
test('essential field edges and focus contrast against the light surfaces',()=>{
 assert.ok(ratio(variables['workspace-control-border'],variables['workspace-surface'])>=3);
 for(const surface of ['workspace-surface','workspace-bg','workspace-surface-secondary'])assert.ok(ratio(variables['workspace-focus'],variables[surface])>=3);
});
