// Explicit paid test fixtures, never a production bypass of commercial checks.
const { randomUUID, randomInt } = require('node:crypto');
async function paidWorkspace(prisma, workspace, user) {
  const admin = await prisma.platformAdmin.upsert({where:{userId:user.id},update:{},create:{userId:user.id,role:'SUPER_ADMIN'}});
  const offer=await prisma.subscriptionPlanOffer.create({data:{id:`auth-offer-${randomUUID()}`,plan:'ENTERPRISE',interval:'ANNUAL',version:randomInt(1000,2000000000),name:'Authorization test contract',amount:'100',memberLimit:1000,invitationsEnabled:true,taxTreatment:'INCLUSIVE',features:{clients:true,projects:true,tasks:true,invoices:true,dashboard:true}}});
  const sub=await prisma.subscription.create({data:{workspaceId:workspace.id,status:'ACTIVE',plan:'ENTERPRISE'}});
  const req=await prisma.subscriptionRequest.create({data:{workspaceId:workspace.id,subscriptionId:sub.id,submittedByUserId:user.id,offerId:offer.id,type:'INITIAL',status:'ACTIVATED',idempotencyKey:randomUUID(),payloadHash:'fixture',plan:'ENTERPRISE',interval:'ANNUAL',offerVersion:offer.version,catalogAmount:'100',currency:'KES',memberLimit:1000,invitationsEnabled:true,features:offer.features,taxTreatment:'INCLUSIVE'}});
  const start=new Date(), end=new Date(+start+365*86400000);
  await prisma.subscriptionPeriod.create({data:{workspaceId:workspace.id,subscriptionId:sub.id,sourceRequestId:req.id,plan:'ENTERPRISE',interval:'ANNUAL',startsAt:start,endsAt:end,graceEndsAt:new Date(+end+7*86400000),anchorDay:start.getUTCDate(),memberLimit:1000,invitationsEnabled:true,features:offer.features,agreedAmount:'100',currency:'KES',activatedById:admin.id}});
  await prisma.workspace.update({where:{id:workspace.id},data:{activationStatus:'ACTIVE',activatedAt:start}});
  return offer.id;
}
async function cleanupCommercial(prisma, workspaceIds, userIds, offerIds) {
  await prisma.subscriptionPeriod.deleteMany({where:{workspaceId:{in:workspaceIds}}});
  await prisma.subscriptionRequest.deleteMany({where:{workspaceId:{in:workspaceIds}}});
  await prisma.subscriptionPlanOffer.deleteMany({where:{id:{in:offerIds}}});
  await prisma.platformAdmin.deleteMany({where:{userId:{in:userIds}}});
}
module.exports={paidWorkspace,cleanupCommercial};
