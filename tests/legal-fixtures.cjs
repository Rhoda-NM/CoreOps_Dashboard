// Synthetic evidence disposal for isolated tests only; no application retention executor.
async function cleanupLegal(prisma,userIds,adminIds){
 const subjects=await prisma.legalEvidenceSubject.findMany({where:{OR:[{userId:{in:userIds}},{events:{some:{actorAdminId:{in:adminIds},type:'SUBJECT_DETACHED'}}}]},select:{id:true}});const ids=subjects.map(s=>s.id);
 await prisma.legalEvidenceEvent.deleteMany({where:{OR:[{subjectId:{in:ids}},{actorAdminId:{in:adminIds}}]}});
 await prisma.legalAcceptanceEvidence.deleteMany({where:{subjectId:{in:ids}}});await prisma.legalPresentation.deleteMany({where:{subjectId:{in:ids}}});await prisma.legalEvidenceSubject.deleteMany({where:{id:{in:ids}}});
 await prisma.legalPublicationControl.update({where:{id:'REHEARSAL'},data:{publicationId:null,revision:{increment:1}}});
 await prisma.legalPublication.deleteMany({where:{publisherId:{in:adminIds}}});await prisma.legalVersionReview.deleteMany({where:{reviewerId:{in:adminIds}}});await prisma.legalDocumentVersion.deleteMany({where:{createdById:{in:adminIds}}});
}
module.exports={cleanupLegal};
