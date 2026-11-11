import "server-only";
import { prisma } from "../db/prisma";
import { requireSimulation } from "./simulation-config";
import type { FakeResendProvider } from "./fake-provider";
// Local proof of the restore boundary, not production independently durable admission.
export async function assertSimulationAdmission(provider:FakeResendProvider){
 const c=requireSimulation();if((await prisma.notificationSimulationInstance.findUnique({where:{id:c.instance}}))?.scope!==c.scope||!await provider.admitted())throw new Error("Restored instance quarantined");
 const records=await provider.records();if(records.length>5000)throw new Error("Simulation restore review bound exceeded");
 for(let offset=0;offset<records.length;offset+=100){const page=records.slice(offset,offset+100);const rows=await prisma.notificationOutbox.findMany({where:{id:{in:page.map(r=>r.notification)},simulated:true,providerScope:c.scope},select:{id:true,providerKey:true,payloadHash:true,dispatchedAttempts:true}});
  if(page.some(r=>!rows.some(o=>o.id===r.notification&&o.providerKey===r.key&&o.payloadHash===r.hash&&o.dispatchedAttempts>0))){await provider.admission(false);throw new Error("Restored provider history mismatch");}
 }
 const evidence=await provider.evidence();if(evidence.length>5000)throw new Error("Simulation evidence bound exceeded");
 for(let offset=0;offset<evidence.length;offset+=100){const page=evidence.slice(offset,offset+100),events=await prisma.notificationProviderEvent.findMany({where:{providerScope:c.scope,providerEventId:{in:page.map(e=>e.id)}},select:{providerEventId:true,bodyDigest:true}});
  const missing=page.filter(e=>!events.some(r=>r.providerEventId===e.id&&r.bodyDigest===e.digest));if(missing.length){if(missing.some(e=>e.acknowledged))await provider.admission(false);throw new Error("Callback reconciliation required before dispatch");}
 }
 const suppressed=await prisma.notificationOutbox.findMany({where:{simulated:true,providerScope:c.scope,OR:[{bouncedAt:{not:null}},{complainedAt:{not:null}}]},select:{identityKeyVersion:true,destinationDigest:true},take:5001});
 if(suppressed.length>5000)throw new Error("Suppression restore bound exceeded");
 for(const o of suppressed)if(!await prisma.notificationSuppression.findFirst({where:{providerScope:c.scope,active:true,digestKeyVersion:o.identityKeyVersion!,destinationDigest:o.destinationDigest!},select:{id:true}})){await provider.admission(false);throw new Error("Restored suppression history mismatch");}
}
