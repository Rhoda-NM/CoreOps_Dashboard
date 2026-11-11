"use server";
import { revalidatePath } from "next/cache";
import { requirePlatform } from "@/server/commercial/platform-auth";
import { configureSimulation, initializeSimulationInstance, replaceRejectedSimulation } from "@/server/notifications/simulation-admin";
import type { CommercialState } from "@/components/commercial/CommercialForm";
export async function notificationAction(_state:CommercialState,data:FormData):Promise<CommercialState>{
 try{
  await requirePlatform("activate");const v=(k:string)=>String(data.get(k)??"");
  switch(v("operation")){
   case "control":await configureSimulation(v("kind"),v("on")==="true",v("reason"));break;
   case "admission":await initializeSimulationInstance(v("reason"));break;
   case "replace":await replaceRejectedSimulation(v("id"),v("reason"));break;
   default:return {error:"Unsupported simulation action."};
  }
  revalidatePath("/platform/notifications");return {success:"Simulation change recorded in platform audit."};
 }catch{return {error:"Simulation change unavailable. Check your current authorization, MFA and review conditions."};}
}
