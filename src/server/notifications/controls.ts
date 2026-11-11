import "server-only";
import { prisma } from "../db/prisma";
import { requirePlatform } from "../commercial/platform-auth";
import { KINDS, type NotificationKind } from "./registry";
import { NOTIFICATION_POLICY, requireNotificationRehearsal } from "./config";
// No public action or enabled external transport. Administrative changes preserve
// the existing central-host, current identity and recent-MFA checks.
export async function configureNotificationCapture(kinds:NotificationKind[],captureEnabled:boolean,reason:string){
 requireNotificationRehearsal();const admin=await requirePlatform("activate");
 if(kinds.length>KINDS.length||kinds.some(k=>!KINDS.includes(k))||reason.trim().length<10||reason.length>300)throw new Error("Invalid capture configuration");
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "PlatformAdmin" WHERE id=${admin.id} FOR UPDATE`;
  const current=await tx.platformAdmin.findUniqueOrThrow({where:{id:admin.id}});
  if(!current.active||current.role!=="SUPER_ADMIN")throw new Error("Capture administration forbidden");
  for(const key of ["GLOBAL",...KINDS.map(k=>`kind:${k}`)]){
   const on=key==="GLOBAL"?captureEnabled:captureEnabled&&kinds.includes(key.slice(5) as NotificationKind);
   await tx.notificationControl.upsert({where:{key},create:{key,captureEnabled:on,policyVersion:NOTIFICATION_POLICY,settings:{}},update:{captureEnabled:on,configRevision:{increment:1}}});
  }
  await tx.platformAuditEvent.create({data:{actorAdminId:admin.id,action:"NOTIFICATION_CAPTURE_CONFIGURED",resourceType:"NotificationControl",resourceId:"GLOBAL",reason,metadata:{captureEnabled,kinds}}});
 });
}
