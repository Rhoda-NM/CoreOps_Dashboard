import "server-only";
import { requireSimulation } from "../simulation-config";
// A reviewed code/release change is required. No environment flag overrides this.
export const EXTERNAL_RESEND_RELEASE_APPROVED = false;
export function createLiveResendTransport():never {throw new Error("External Resend release is not approved");}
export function requireResendEngineering(){
 const c=requireSimulation();
 if(process.env.COREOPS_RESEND_ENGINEERING_ENABLED!=="true"||!/^\/coreops_auth_rehearsal_notifications_nd_[a-z0-9_]+$/.test(new URL(process.env.DATABASE_URL!).pathname))throw new Error("Isolated Resend engineering disabled");
 return {...c,account:process.env.COREOPS_NOTIFICATION_SIM_ACCOUNT!,environment:"HTTP_MOCK" as const};
}
