import "server-only";
import { auth } from "@clerk/nextjs/server";
import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv, hkdfSync } from "node:crypto";
import { requireClerkIdentity } from "../auth/clerk-identity";
import { getCurrentUser } from "../auth/get-current-user";
import { requireCentralHost } from "../routing/request-context";
import { lifecycleEnforcementEnabled } from "../lifecycle/config";
import { AccessError } from "../authorization/errors";

export const hash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
export function dataAccessEnabled() {
  return process.env.COREOPS_SECURE_EXPORTS_ENABLED === "true" && lifecycleEnforcementEnabled();
}
export function requireDataAccess() { if (!dataAccessEnabled()) throw new AccessError("FORBIDDEN"); key(); }
function key() {
  const value = process.env.COREOPS_EXPORT_ENCRYPTION_KEY ?? "";
  const decoded = Buffer.from(value, "base64");
  if (decoded.length !== 32 || decoded.toString("base64") !== value) throw new Error("Export encryption configuration unavailable");
  return decoded;
}
export function exportKeyVersion(){return hash(key()).slice(0,24);}
function purposeKey(purpose: string,version?:string) {
 let root=key();if(version&&hash(root).slice(0,24)!==version){
  const previous:unknown=JSON.parse(process.env.COREOPS_EXPORT_PREVIOUS_ENCRYPTION_KEYS??"[]");
  if(!Array.isArray(previous)||previous.length>4)throw new Error("Export key unavailable");
  const match=previous.map(v=>{if(typeof v!=="string")throw new Error("Invalid previous export key");const bytes=Buffer.from(v,"base64");if(bytes.length!==32||bytes.toString("base64")!==v)throw new Error("Invalid previous export key");return bytes;}).find(v=>v.length===32&&hash(v).slice(0,24)===version);if(!match)throw new Error("Export key unavailable");root=match;
 }
 return Buffer.from(hkdfSync("sha256",root,"workspace-export-v1",purpose,32));
}
export function assertExportKeyAvailable(version:string){purposeKey("artifact-encryption",version);}
export function downloadToken(id: string, userId: string) { return createHmac("sha256", purposeKey("download-authorization")).update(`workspace-export-v1:${id}:${userId}`).digest("hex"); }
export function encrypt(bytes: Buffer, id: string) {
  const nonce = randomBytes(12), cipher = createCipheriv("aes-256-gcm", purposeKey("artifact-encryption"), nonce);
  cipher.setAAD(Buffer.from(id));
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), encrypted]);
}
export function decrypt(bytes: Uint8Array, id: string,version?:string) {
  const input = Buffer.from(bytes), cipher = createDecipheriv("aes-256-gcm", purposeKey("artifact-encryption",version), input.subarray(0, 12));
  cipher.setAAD(Buffer.from(id)); cipher.setAuthTag(input.subarray(12, 28));
  return Buffer.concat([cipher.update(input.subarray(28)), cipher.final()]);
}
export class StepUpRequired extends Error {}
export async function sensitiveIdentity(stepUp = true) {
  requireDataAccess(); await requireCentralHost();
  const identity = await requireClerkIdentity(); // Live session and verified primary email.
  const session = await auth(), factors = session.sessionClaims?.fva;
  if (stepUp && !identity.twoFactorEnabled) throw new AccessError("FORBIDDEN");
  if (stepUp && (!Array.isArray(factors) || factors.length !== 2 || !factors.every(age => Number.isInteger(age) && age >= 0) || !session.has({ reverification: "strict_mfa" }))) throw new StepUpRequired();
  const user = await getCurrentUser();
  if (user.externalId !== identity.id || user.email.toLowerCase() !== identity.primaryEmailAddress!.emailAddress.trim().toLowerCase()) throw new AccessError("FORBIDDEN");
  return { user, externalId: identity.id, emailHash: hash(user.email.toLowerCase()) };
}
