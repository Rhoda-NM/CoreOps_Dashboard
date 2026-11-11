// Synthetic test cleanup only; application has no retention/deletion executor.
async function cleanupMarket(prisma, userIds) {
 const apps=await prisma.marketApplication.findMany({where:{applicantUserId:{in:userIds}},select:{id:true}});const ids=apps.map(a=>a.id);
 await prisma.platformAuditEvent.deleteMany({where:{resourceType:'MarketApplication',resourceId:{in:ids}}});
 await prisma.$transaction(async tx=>{
  await tx.marketDecision.deleteMany({where:{applicationId:{in:ids}}});
  await tx.marketSubmission.deleteMany({where:{applicationId:{in:ids}}});
  await tx.marketApplication.deleteMany({where:{id:{in:ids}}});
 });
}
module.exports={cleanupMarket};
