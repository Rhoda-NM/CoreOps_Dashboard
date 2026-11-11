/* eslint-disable @typescript-eslint/no-require-imports -- offline operator preparation only */
const fs=require('node:fs');
function preparePay1Admission(value){
 const {id,projectId,deploymentId,origin,databaseHost,databaseName,clerkHost,actorExternalIds,approvalReference,notBefore,expiresAt,nonProductionVerified,syntheticActorsVerified}=value;
 const canonicalOrigin=new URL(origin);
 if(nonProductionVerified!==true||syntheticActorsVerified!==true||!/^https:$/.test(canonicalOrigin.protocol)||canonicalOrigin.origin!==origin||!/^prj_[a-zA-Z0-9]+$/.test(projectId)||!/^dpl_[a-zA-Z0-9]+$/.test(deploymentId)||!/^[a-zA-Z0-9_-]{8,100}$/.test(id)||!/^[-a-zA-Z0-9.]+:[0-9]{1,5}$/.test(databaseHost)||/^(localhost|127\.0\.0\.1):/.test(databaseHost)||typeof databaseName!=='string'||databaseName.length<1||databaseName.length>63||!/^[a-z0-9-]+\.clerk\.accounts\.dev$/.test(clerkHost)||!Array.isArray(actorExternalIds)||actorExternalIds.length<1||actorExternalIds.length>20||new Set(actorExternalIds).size!==actorExternalIds.length||actorExternalIds.some(a=>!/^user_[a-zA-Z0-9]+$/.test(a))||typeof approvalReference!=='string'||approvalReference.length<10||approvalReference.length>300||!/^\d{4}-\d\d-\d\dT/.test(notBefore)||!/^\d{4}-\d\d-\d\dT/.test(expiresAt)||!Number.isFinite(Date.parse(notBefore))||!Number.isFinite(Date.parse(expiresAt))||Date.parse(expiresAt)<=Date.parse(notBefore))throw Error('INVALID_ADMISSION');
 const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
 return '-- PREPARED ONLY: review actual deployment, database isolation, actors, backup and release authorization before execution.\nBEGIN;\nINSERT INTO "Pay1PreviewAdmission" ("id","projectId","deploymentId","origin","databaseHost","databaseName","clerkHost","actorExternalIds","approvalReference","notBefore","expiresAt")\nVALUES ('+[id,projectId,deploymentId,origin,databaseHost,databaseName,clerkHost].map(quote).join(',')+',ARRAY['+actorExternalIds.map(quote).join(',')+'],'+quote(approvalReference)+','+quote(new Date(notBefore).toISOString())+','+quote(new Date(expiresAt).toISOString())+');\nCOMMIT;\n';
}
module.exports={preparePay1Admission};
if(require.main===module){try{
 if(process.argv.length!==4)throw Error();
 const value=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const sql=preparePay1Admission(value);
 fs.writeFileSync(process.argv[3],sql,{flag:'wx',mode:0o600});
 console.log('PAY1_ADMISSION_SQL_PREPARED: protected file created; no database connection or execution.');
 }catch{console.error('PAY1_ADMISSION_SQL_FAILED: invalid input or output already exists; no database call was made.');process.exitCode=1;}}
