import "server-only";
import { timingSafeEqual } from "node:crypto";
import { requireCentralHost } from "../routing/request-context";
import { runNotificationCapture } from "./worker";
export async function notificationCaptureHandler(request:Request){
 const headers={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"};
 const secret=process.env.CRON_SECRET,actual=Buffer.from(request.headers.get("authorization")??""),expected=Buffer.from(`Bearer ${secret??""}`);
 if(!secret||secret.length<32||actual.length!==expected.length||!timingSafeEqual(actual,expected))return Response.json({error:"Unauthorized"},{status:401,headers});
 try{
  await requireCentralHost();const url=new URL(request.url),dry=url.searchParams.get("dryRun"),limit=Number(url.searchParams.get("limit")??10);
  if((dry!==null&&dry!=="true"&&dry!=="false")||!Number.isInteger(limit)||limit<1||limit>25)return Response.json({error:"Invalid parameters"},{status:400,headers});
  return Response.json(await runNotificationCapture({dryRun:dry!=="false",limit}),{headers});
 }catch{return Response.json({error:"Notification capture unavailable"},{status:503,headers});}
}
