/* eslint-disable @typescript-eslint/no-require-imports -- read-only staging preflight */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}});
const path=require('node:path'),Module=require('node:module'),load=Module._load;Module._load=function(n,p,m){if(n==='server-only')return {};if(n.startsWith('@/'))n=path.resolve(__dirname,'../src',n.slice(2));return load.call(this,n,p,m);};
const {prisma}=require('../src/server/db/prisma.ts');
const {requireStagingEnvironment}=require('../src/server/staging/environment.ts');
const {reviewedOperatorTarget}=require('./lib/staging-operator.cjs');
const {approvedCatalog,pricingApproval}=require('../src/config/public-pricing.ts');
(async()=>{
 try{
  const target=await reviewedOperatorTarget();
  const result=await prisma.$transaction(async tx=>{
   await tx.$executeRaw`SET TRANSACTION READ ONLY`;
   const environment=await requireStagingEnvironment(tx,target,false),gateway={merchantId:process.env.PAYSTACK_TEST_MERCHANT_ID};
   const checkoutConfigured=!!process.env.PAYSTACK_TEST_SECRET_KEY?.startsWith('sk_test_')&&!!gateway.merchantId&&process.env.PAYSTACK_TEST_CHECKOUT_ENABLED==='true'&&!!process.env.PAYSTACK_TEST_CHANNELS&&!!process.env.PAYSTACK_TEST_CAPABILITIES_APPROVAL&&!!process.env.PAYSTACK_TEST_SETTLEMENT_APPROVAL;
   const offers=await tx.subscriptionPlanOffer.findMany({where:{stagingEnvironmentId:environment.id,pricingRelease:pricingApproval.release,published:true}});
   const catalogMatches=approvedCatalog.every(expected=>offers.some(row=>row.plan===expected.plan&&row.interval===expected.interval&&(row.amount?.toFixed(2)??null)===expected.amount&&row.businessApprovalRef===pricingApproval.reference&&row.commercialPath===expected.commercialPath));
   const tax=await tx.taxConfiguration.findFirst({where:{effectiveFrom:{lte:new Date()}},orderBy:{effectiveFrom:'desc'}});
   const merchant=await tx.paymentReceivingAccount.findUnique({where:{method_accountIdentifier:{method:'PAYSTACK',accountIdentifier:`paystack:test:${gateway.merchantId}`}}});
   return {readOnly:true,persistentEnvironmentValidated:true,deploymentSpecificAdmissionRequired:false,catalogMatches,checkoutConfigured,approvedCatalogVersions:offers.length,syntheticNonVatScenario:!!tax?.synthetic&&tax.registrationStatus==='NOT_REGISTERED'&&tax.rate.isZero()&&tax.allowedTreatments.includes('NON_VAT_REGISTERED'),testMerchantRegistered:!!merchant?.active&&!!merchant.verifiedAt,activeSuperAdmins:await tx.platformAdmin.count({where:{active:true,role:'SUPER_ADMIN'}}),externalAcceptanceVerified:false};
  });console.log(JSON.stringify(result,null,2));if(!result.checkoutConfigured||!result.catalogMatches||!result.syntheticNonVatScenario||!result.testMerchantRegistered||!result.activeSuperAdmins)process.exitCode=1;
 }catch{console.error('STAGING_READINESS_FAILED: verify protected target, migration, catalog, tax and merchant configuration.');process.exitCode=1;}finally{await prisma.$disconnect();}
})();
