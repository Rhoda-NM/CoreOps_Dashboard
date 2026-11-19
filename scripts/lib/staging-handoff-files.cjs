/* eslint-disable @typescript-eslint/no-require-imports -- protected external operator helper */
// Private operator state is kept outside the repository. No session-token file.
const fs=require('node:fs'),path=require('node:path');
const {createRequest,validateRequest,handoffTarget,canonical,digest,openSession}=require('../../src/server/staging/setup-handoff.ts');
function read(file,privateInput=false){
 const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{const s=fs.fstatSync(fd);if(!s.isFile()||s.size>65000||(privateInput&&((s.mode&0o077)||s.uid!==process.getuid())))throw Error('PROTECTED_INPUT_REQUIRED');return fs.readFileSync(fd,'utf8');}finally{fs.closeSync(fd);}
}
function privateDestination(file){
 const absolute=path.join(fs.realpathSync(path.dirname(path.resolve(file))),path.basename(file)),root=fs.realpathSync(path.resolve(__dirname,'../..')),relative=path.relative(root,absolute);
 if(!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative))throw Error('OUTSIDE_REPOSITORY_REQUIRED');
 const directory=fs.statSync(path.dirname(absolute));if((directory.mode&0o077)||directory.uid!==process.getuid())throw Error('PRIVATE_DIRECTORY_REQUIRED');
 return absolute;
}
function prepare(file,manifest,target){
 file=privateDestination(file);const {request,privateKey,fingerprint}=createRequest(manifest,handoffTarget(target));
 const state=file+'.private.json';fs.writeFileSync(state,JSON.stringify({requestHash:fingerprint,privateKey}),{mode:0o600,flag:'wx'});
 try{fs.writeFileSync(file,JSON.stringify(request,null,2)+'\n',{mode:0o600,flag:'wx'});}catch(e){fs.unlinkSync(state);throw e;}
 return {fingerprint,id:request.id,expiresAt:request.expiresAt};
}
async function consume(requestFile,authorizationFile,manifest,target,wait=false,authorizationDirectory){
 requestFile=privateDestination(requestFile);
 const request=validateRequest(JSON.parse(read(requestFile,true)),handoffTarget(target));
 if(canonical(request.manifest)!==canonical(manifest))throw Error('MANIFEST_CHANGED');
 if(authorizationDirectory){if(authorizationFile)throw Error('ONE_AUTHORIZATION_SOURCE_REQUIRED');authorizationFile=path.join(path.resolve(authorizationDirectory),'workflowconnect-staging-'+request.id+'.authorization.json');}
 if(!authorizationFile)throw Error('AUTHORIZATION_FILE_REQUIRED');
 if(wait){console.log('WAITING_FOR_ENCRYPTED_BROWSER_AUTHORIZATION');while(!fs.existsSync(authorizationFile)){if(Date.now()>=request.expiresAt)throw Error('AUTHORIZATION_WAIT_EXPIRED');await new Promise(resolve=>setTimeout(resolve,1000));}}
 const encrypted=JSON.parse(read(authorizationFile));
 const state=requestFile+'.private.json';const privateState=JSON.parse(read(state,true));
 if(privateState.requestHash!==digest(canonical(request)))throw Error('REQUEST_CHANGED');
 // Exclusive persistent latch rejects racing processes and replay, even if the
 // private state was accidentally copied. Failed attempts require a new request.
 const latch=fs.openSync(state+'.used',fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_WRONLY,0o600);fs.closeSync(latch);
 try{return {...openSession(encrypted,request,privateState.privateKey),handoffId:request.id,reviewedRevision:request.target.revision,requestHash:privateState.requestHash};}finally{fs.unlinkSync(state);}
}
module.exports={read,prepare,consume};
