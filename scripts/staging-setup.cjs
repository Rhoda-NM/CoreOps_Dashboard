/* eslint-disable @typescript-eslint/no-require-imports -- guarded operator CLI */
// Dry-run by default. Never provisions a database, role, user or workspace.
const fs=require('node:fs'),path=require('node:path');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}});
const Module=require('node:module'),load=Module._load;
Module._load=function(name,parent,main){if(name==='server-only')return {};return load.call(this,name,parent,main);};
const {createClerkClient}=require('@clerk/backend');
const {reviewedOperatorTarget}=require('./lib/staging-operator.cjs');
const {approvedCatalog,pricingApproval}=require('../src/config/public-pricing.ts');
const {TARGET,verifyMfa,sha}=require('./lib/staging-mfa.cjs');
const {prisma}=require('../src/server/db/prisma.ts');
function protectedRead(file){const s=fs.lstatSync(file);if(!s.isFile()||s.isSymbolicLink()||(s.mode&0o077))throw Error('PROTECTED_INPUT_REQUIRED');return fs.readFileSync(file);}
async function main(){
 let phase='INPUT';
 try{
  const args=process.argv.slice(2),apply=args.includes('--apply');
  const get=key=>{const i=args.indexOf(key);return i<0?null:args[i+1];};
  if(args.some(value=>value.startsWith('--')&&!['--manifest','--session-token-file','--report','--apply'].includes(value)))throw Error('ARGUMENTS');
  const report=get('--report');if(!report||fs.existsSync(report)||(fs.statSync(path.dirname(path.resolve(report))).mode&0o077))throw Error('PROTECTED_REPORT_REQUIRED');
  const manifest=JSON.parse(protectedRead(get('--manifest'))),target=await reviewedOperatorTarget();
  if(['syntheticTaxApprovalReference','backupReference','targetSeparationEvidence','syntheticDataEvidenceReference'].some(k=>typeof manifest[k]!=='string'||manifest[k].trim().length<10)||manifest.stagingId!==target.id||manifest.pricingApproval!==pricingApproval.reference||manifest.syntheticTaxStatus!=='NOT_REGISTERED'||!manifest.syntheticTaxApprovalReference||!manifest.backupReference||!manifest.targetSeparationEvidence||manifest.clerkUserId!==TARGET)throw Error('REVIEWED_MANIFEST_REQUIRED');
  phase='READ_ONLY_PREFLIGHT';
  const preflight=await prisma.$transaction(async tx=>{
   await tx.$executeRaw`SET TRANSACTION READ ONLY`;
   const current=await tx.stagingEnvironment.findUnique({where:{id:target.id}});
   if(current&&(!current.active||['projectId','origin','databaseHost','databaseName','clerkHost'].some(k=>current[k]!==target[k])))throw Error('TARGET_MISMATCH');
   const admin=await tx.platformAdmin.findFirst({where:{active:true,role:'SUPER_ADMIN',user:{externalId:TARGET}}});
   if(!admin)throw Error('EXISTING_SUPER_ADMIN_REQUIRED');
   const history=await tx.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE migration_name='20261112000500_staging_user_controls' AND finished_at IS NOT NULL AND rolled_back_at IS NULL`;
   if(history.length!==1)throw Error('MIGRATION_REQUIRED');
   return {adminId:admin.id,environmentExists:!!current,offerCount:await tx.subscriptionPlanOffer.count(),workspaceCount:await tx.workspace.count()};
  });
  let proof;
  if(apply){
   phase='STRICT_MFA';
   if(manifest.approved!==true||typeof manifest.approvalReference!=='string'||manifest.approvalReference.trim().length<10||!Number.isFinite(Date.parse(manifest.validUntil))||!Number.isFinite(Date.parse(manifest.validFrom))||Date.parse(manifest.validUntil)<=Date.now()||Date.parse(manifest.validFrom)>Date.now())throw Error('APPROVAL_REQUIRED');
   const token=protectedRead(get('--session-token-file')).toString().trim();
   const clerk=createClerkClient({secretKey:process.env.CLERK_SECRET_KEY,publishableKey:process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY});
   const state=await clerk.authenticateRequest(new Request(target.origin+'/platform',{headers:{Authorization:'Bearer '+token}}),{authorizedParties:[target.origin],acceptsToken:'session_token'});
   if(state.status!=='signed-in')throw Error('SESSION_REQUIRED');
   const auth=state.toAuth();
   proof=verifyMfa(auth,await clerk.users.getUser(TARGET),await clerk.sessions.getSession(auth.sessionId),{origin:target.origin,clerkHost:target.clerkHost,scopeId:target.id,validUntil:manifest.validUntil});
   phase='APPROVED_STAGING_SETUP';
   await prisma.$transaction(async tx=>{
    await tx.$executeRaw`LOCK TABLE "StagingEnvironment", "SubscriptionPlanOffer", "TaxConfiguration" IN SHARE ROW EXCLUSIVE MODE`;
    await tx.$queryRaw`SELECT id FROM "PlatformAdmin" WHERE id=${preflight.adminId} FOR UPDATE`;
    const admin=await tx.platformAdmin.findUniqueOrThrow({where:{id:preflight.adminId},include:{user:true}});
    const [{now}]=await tx.$queryRaw`SELECT clock_timestamp() AS now`;
    if(!admin.active||admin.role!=='SUPER_ADMIN'||admin.user.externalId!==TARGET||new Date(proof.proofExpiresAt)<=now)throw Error('AUTHORITY_EXPIRED');
    const environment=await tx.stagingEnvironment.upsert({where:{id:target.id},update:{},create:{id:target.id,projectId:target.projectId,origin:target.origin,databaseHost:target.databaseHost,databaseName:target.databaseName,clerkHost:target.clerkHost,approvalReference:manifest.approvalReference}});
    if(!environment.active||['projectId','origin','databaseHost','databaseName','clerkHost'].some(k=>environment[k]!==target[k]))throw Error('TARGET_CHANGED');
    let lastTax=await tx.taxConfiguration.findFirst({orderBy:{version:'desc'}});
    if(lastTax&&lastTax.effectiveFrom>now)throw Error('FUTURE_TAX_REVIEW_REQUIRED');
    if(!lastTax?.synthetic||lastTax.registrationStatus!=='NOT_REGISTERED'||!lastTax.rate.isZero()||!lastTax.allowedTreatments.includes('NON_VAT_REGISTERED')){
     lastTax=await tx.taxConfiguration.create({data:{version:(lastTax?.version??0)+1,registrationStatus:'NOT_REGISTERED',effectiveFrom:now,rate:'0',allowedTreatments:['NON_VAT_REGISTERED'],approvalReference:manifest.syntheticTaxApprovalReference,synthetic:true,approvedById:admin.id}});
    }
    for(const entry of approvedCatalog){
     const prior=await tx.subscriptionPlanOffer.findFirst({where:{stagingEnvironmentId:target.id,pricingRelease:pricingApproval.release,plan:entry.plan,interval:entry.interval}});
     if(prior){if((prior.amount?.toFixed(2)??null)!==entry.amount||prior.memberLimit!==entry.memberLimit||prior.commercialPath!==entry.commercialPath||prior.currency!==entry.currency||prior.projectLimit!==entry.projectLimit||prior.invitationsEnabled!==entry.invitationsEnabled||prior.taxTreatment!=='NON_VAT_REGISTERED'||Object.keys(entry.features).some(k=>prior.features[k]!==entry.features[k])||Object.keys(prior.features).length!==Object.keys(entry.features).length||!prior.published||prior.businessApprovalRef!==pricingApproval.reference)throw Error('CATALOG_CONFLICT');continue;}
     const latest=await tx.subscriptionPlanOffer.findFirst({where:{plan:entry.plan,interval:entry.interval},orderBy:{version:'desc'}});
     await tx.subscriptionPlanOffer.create({data:{...entry,version:(latest?.version??0)+1,pricingRelease:pricingApproval.release,stagingEnvironmentId:target.id,taxTreatment:'NON_VAT_REGISTERED',published:true,businessApprovedAt:now,businessApprovalRef:pricingApproval.reference,approvedById:admin.id}});
    }
    const priorEvent=await tx.platformAuditEvent.findFirst({where:{action:'STAGING_CATALOG_SETUP',resourceId:target.id,reason:manifest.approvalReference}});
    if(!priorEvent)await tx.platformAuditEvent.create({data:{actorAdminId:admin.id,action:'STAGING_CATALOG_SETUP',resourceType:'StagingEnvironment',resourceId:target.id,reason:manifest.approvalReference,metadata:{pricingRelease:pricingApproval.release,pricingApproval:pricingApproval.reference,manifestHash:sha(JSON.stringify(manifest)),mfaPolicy:"strict_mfa",mfaProofExpiresAt:proof.proofExpiresAt,sessionEvidenceHash:proof.sessionEvidenceHash,syntheticTax:true,backupReference:manifest.backupReference,separationReference:manifest.targetSeparationEvidence,syntheticDataEvidenceReference:manifest.syntheticDataEvidenceReference}}});
   });
  }
  const result={mode:apply?'APPLIED_REVIEWED_STAGING_SETUP':'READ_ONLY_DRY_RUN',...preflight,pricingRelease:pricingApproval.release,configuredOffers:approvedCatalog.length,merchantVerification:'REQUIRED_SEPARATELY',productionChanged:false};
  fs.writeFileSync(report,JSON.stringify(result,null,2)+'\n',{mode:0o600,flag:'wx'});
  console.log('STAGING_SETUP_REPORT_WRITTEN');
 }catch{console.error(JSON.stringify({event:'STAGING_SETUP_FAILED',phase}));process.exitCode=1;}finally{await prisma.$disconnect();}
}
main();
