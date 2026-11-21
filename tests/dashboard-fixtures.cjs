// Synthetic presentation fixtures only. Never seed these into a shared database.
function dashboardFixture(role='OWNER',scenario='populated') {
 const empty=scenario==='empty',zero=scenario==='zero',large=scenario==='large';
 const client={id:'fixture-client',name:large?'A very long client name '+ 'LongClientName'.repeat(18):'Sample client'};
 const recentProjects=empty?[]:[0,1,2,3,4].map(n=>({id:'fixture-project-'+n,name:large?'Project '+ 'VeryLongProjectTitle'.repeat(20):'Project '+(n+1),client,createdAt:new Date(Date.UTC(2026,10,21,8-n,0))}));
 const recentTasks=empty?[]:[0,1,2,3,4].map(n=>({id:'fixture-task-'+n,title:'Task '+(n+1),project:{id:'fixture-project-0',name:'Sample project',client},createdAt:new Date(Date.UTC(2026,10,21,8-n,30))}));
 const recentInvoices=empty?[]:[0,1,2,3,4].map(n=>({id:'fixture-invoice-'+n,invoiceNo:'PRIVATE_INVOICE_SENTINEL-'+n,status:n===0?'DRAFT':'PAID',client,createdAt:new Date(Date.UTC(2026,10,21,8-n,45))}));
 return {role,canQuickAdd:role!=='STAFF'&&scenario!=='readonly',totalClients:empty||zero?0:8,activeProjects:empty||zero?0:4,pendingTasks:empty||zero?0:12,overdueTasks:empty||zero?0:2,
  // Deliberately include financial sentinels even for other roles in the bad-data
  // presentation fixture; the real service must never query or return them.
  revenueThisMonth:empty||zero?0:large?9876543210.45:91827364.19,outstandingInvoices:empty||zero?0:large?8765432109.87:83726154.28,
  recentProjects,recentTasks,recentInvoices};
}
module.exports={dashboardFixture};
