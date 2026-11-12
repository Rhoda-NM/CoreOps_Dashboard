const {test}=require('node:test'),assert=require('node:assert/strict');
const Module=require('node:module'),path=require('node:path');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}});
const load=Module._load;let signedIn=false,ready=false,readinessCalls=0;
function SignIn(){}function SignUp(){}function SignOutButton(){}
const policy={mode:'path',appOrigin:'https://preview.example.test',marketingOrigin:'https://preview.example.test'};
Module._load=function(name,parent,main){
 if(name==='server-only')return {};
 if(name==='@clerk/nextjs/server')return {auth:async()=>({userId:signedIn?'user_Synthetic':null})};
 if(name==='@clerk/nextjs')return {SignIn,SignUp,SignOutButton};
 if(name==='@/server/auth/clerk-configuration')return {isRegistrationReady:async()=>{readinessCalls++;return ready;}};
 if(name==='@/server/routing/request-context')return {requireCentralHost:async()=>({policy})};
 if(name.includes('/db/prisma')||name.includes('/preview/pay1-admission'))throw Error('AUTH_FORM_MUST_NOT_LOAD_DATABASE');
 if(name.startsWith('@/'))name=path.resolve(__dirname,'../src',name.slice(2));
 return load.call(this,name,parent,main);
};
const SignInPage=require('../src/app/(auth)/sign-in/[[...signin]]/page.tsx').default;
const SignUpPage=require('../src/app/(auth)/sign-up/[[...signup]]/page.tsx').default;
const {ExistingAuthSession}=require('../src/components/auth/ExistingAuthSession.tsx');
function find(tree,type){if(!tree)return [];if(Array.isArray(tree))return tree.flatMap(x=>find(x,type));if(typeof tree!=='object')return [];return [...(tree.type===type?[tree]:[]),...find(tree.props?.children,type)];}
function text(tree){if(tree==null)return '';if(typeof tree==='string')return tree;if(Array.isArray(tree))return tree.map(text).join(' ');return text(tree.props?.children);}
function reset(){signedIn=false;ready=false;readinessCalls=0;process.env.COREOPS_PAY1_PREVIEW_ENABLED='true';process.env.VERCEL='1';process.env.VERCEL_ENV='preview';process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY='pk_test_'+Buffer.from('synthetic.clerk.accounts.dev$').toString('base64');}
test('authentication forms are separate from application admission and existing sessions',async t=>{
 const saved={...process.env};try{
 await t.test('unsigned preview signup displays Clerk without admission or readiness queries',async()=>{reset();const tree=await SignUpPage({searchParams:Promise.resolve({})});assert.equal(find(tree,SignUp).length,1);assert.equal(readinessCalls,0);assert.match(text(tree),/Payment testing only/);});
 await t.test('unsigned sign-in displays Clerk regardless of registration readiness',async()=>{reset();const tree=await SignInPage({searchParams:Promise.resolve({})});assert.equal(find(tree,SignIn).length,1);assert.equal(readinessCalls,0);});
 await t.test('existing session shows an explicit choice rather than mounting auto-redirecting widgets',async()=>{
  reset();signedIn=true;
  for(const Page of [SignInPage,SignUpPage]){const tree=await Page({searchParams:Promise.resolve({returnTo:'/onboarding'})});const notice=find(tree,ExistingAuthSession);assert.equal(notice.length,1);assert.equal(notice[0].props.destination,policy.appOrigin+'/onboarding');assert.equal(find(tree,SignIn).length+find(tree,SignUp).length,0);}
  assert.equal(readinessCalls,0);
 });
 await t.test('session choice permits only explicit continuation or user-initiated signout',()=>{const tree=ExistingAuthSession({destination:policy.appOrigin+'/dashboard',restartUrl:policy.appOrigin+'/sign-in'});assert.match(text(tree),/session alone does not grant workspace access/);const exit=find(tree,SignOutButton);assert.equal(exit.length,1);assert.equal(exit[0].props.redirectUrl,policy.appOrigin+'/sign-in');});
 await t.test('ordinary production signup retains its existing readiness gate',async()=>{reset();process.env.VERCEL_ENV='production';let tree=await SignUpPage({searchParams:Promise.resolve({})});assert.equal(find(tree,SignUp).length,0);assert.match(text(tree),/Registration is temporarily unavailable/);ready=true;tree=await SignUpPage({searchParams:Promise.resolve({})});assert.equal(find(tree,SignUp).length,1);assert.equal(readinessCalls,2);});
 await t.test('unsigned and signed-in pages preserve validated invitations and reject foreign destinations',async()=>{
  reset();const invitation='/invitations/'+'x'.repeat(43);
  let tree=await SignUpPage({searchParams:Promise.resolve({returnTo:invitation})});assert.equal(find(tree,SignUp)[0].props.forceRedirectUrl,policy.appOrigin+invitation);
  signedIn=true;tree=await SignInPage({searchParams:Promise.resolve({returnTo:'https://evil.example'})});assert.equal(find(tree,ExistingAuthSession)[0].props.destination,policy.appOrigin+'/dashboard');
 });
 }finally{process.env=saved;}
});
