// Shared by the server-only approval action and the external operator CLI.
// Encryption transports an ordinary Clerk session; it never replaces Clerk authorization.
import { createHash, generateKeyPairSync, randomBytes, randomUUID, publicEncrypt, privateDecrypt, createCipheriv, createDecipheriv, createPublicKey, constants } from "node:crypto";
import { z } from "zod";
export const setupAdministrator = "user_3LykI0tFI8Me3PRkkxOuLTUo5M2";
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([key,v]) => `${JSON.stringify(key)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
const evidence = z.string().trim().min(10).max(1000);
export const setupManifestSchema = z.object({
  approved: z.literal(true), stagingId: z.string().min(1).max(200), clerkUserId: z.literal(setupAdministrator),
  pricingApproval: z.literal("FOUNDER-2026-11-12-FINAL-PRICING-DECISION"), syntheticTaxStatus: z.literal("NOT_REGISTERED"),
  syntheticTaxApprovalReference: evidence, targetSeparationEvidence: evidence, backupReference: evidence,
  syntheticDataEvidenceReference: evidence, approvalReference: evidence, validFrom: z.string().datetime({offset:true}), validUntil: z.string().datetime({offset:true}),
}).strict();
export const targetSchema = z.object({ id:z.string().min(1).max(200), projectId:z.string().min(1).max(200), origin:z.string().url().max(500), databaseHost:z.string().min(1).max(500), databaseName:z.string().min(1).max(200), clerkHost:z.string().min(1).max(200), branch:z.string().min(1).max(200), revision:z.string().regex(/^[a-f0-9]{40}$/) }).strict();
export type SetupTarget = z.infer<typeof targetSchema>;
export function handoffTarget(target: Pick<SetupTarget,"id"|"projectId"|"origin"|"databaseHost"|"databaseName"|"clerkHost"> & {local?:boolean;revision?:string}): SetupTarget {
  const {id,projectId,origin,databaseHost,databaseName,clerkHost}=target;
  return targetSchema.parse({id,projectId,origin,databaseHost,databaseName,clerkHost,branch:process.env.COREOPS_STAGING_BRANCH || (target.local ? "isolated-fixture" : ""),revision:target.revision || process.env.VERCEL_GIT_COMMIT_SHA || (target.local ? "0".repeat(40) : "")});
}
const requestSchema = z.object({ version:z.literal(1), purpose:z.literal("STAGING_SETUP"), id:z.string().uuid(), nonce:z.string().regex(/^[\w-]{43}$/), createdAt:z.number().int(), expiresAt:z.number().int(), target:targetSchema, manifest:setupManifestSchema, manifestHash:z.string().regex(/^[a-f0-9]{64}$/), publicKey:z.string().min(100).max(2048) }).strict();
export type SetupRequest = z.infer<typeof requestSchema>;
export function validateRequest(value: unknown, target: SetupTarget, now=Date.now()) {
  const request=requestSchema.parse(value);
  if (canonical(request.target)!==canonical(target) || request.manifest.stagingId!==target.id || digest(canonical(request.manifest))!==request.manifestHash || request.createdAt>now+5000 || request.expiresAt<=now || request.expiresAt-request.createdAt>600000 || request.expiresAt<=request.createdAt || Date.parse(request.manifest.validFrom)>now || Date.parse(request.manifest.validUntil)<=now) throw Error("SETUP_REQUEST_INVALID");
  const key=createPublicKey(request.publicKey);
  if(key.asymmetricKeyType!=="rsa" || key.asymmetricKeyDetails?.modulusLength!==3072) throw Error("SETUP_KEY_INVALID");
  return request;
}
export function createRequest(manifest: unknown, target: SetupTarget, now=Date.now()) {
  const keys=generateKeyPairSync("rsa",{modulusLength:3072,publicKeyEncoding:{type:"spki",format:"pem"},privateKeyEncoding:{type:"pkcs8",format:"pem"}});
  const approved=setupManifestSchema.parse(manifest);
  const request=validateRequest({version:1,purpose:"STAGING_SETUP",id:randomUUID(),nonce:randomBytes(32).toString("base64url"),createdAt:now,expiresAt:Math.min(now+600000,Date.parse(approved.validUntil)),target,manifest:approved,manifestHash:digest(canonical(approved)),publicKey:keys.publicKey},target,now);
  return {request,privateKey:keys.privateKey,fingerprint:digest(canonical(request))};
}
const sealSchema=z.object({version:z.literal(1),id:z.string().uuid(),wrappedKey:z.string().max(1024),iv:z.string().max(32),tag:z.string().max(32),ciphertext:z.string().min(1).max(50000)}).strict();
export type SetupSeal=z.infer<typeof sealSchema>;
export function sealSession(request: SetupRequest, token: string, expiresAt: number, now=Date.now()): SetupSeal {
  if (!token || token.length>20000 || !Number.isFinite(expiresAt) || expiresAt<=now || expiresAt>now+60000) throw Error("SETUP_SESSION_EXPIRED");
  const key=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key,iv);
  cipher.setAAD(Buffer.from(canonical({id:request.id,fingerprint:digest(canonical(request))})));
  const plaintext=Buffer.from(JSON.stringify({token,expiresAt,issuedAt:now,nonce:request.nonce,requestHash:digest(canonical(request))}));
  try { const encrypted=Buffer.concat([cipher.update(plaintext),cipher.final()]);return {version:1,id:request.id,wrappedKey:publicEncrypt({key:request.publicKey,oaepHash:"sha256",padding:constants.RSA_PKCS1_OAEP_PADDING},key).toString("base64"),iv:iv.toString("base64"),tag:cipher.getAuthTag().toString("base64"),ciphertext:encrypted.toString("base64")}; }
  finally { key.fill(0);plaintext.fill(0); }
}
export function openSession(value: unknown, request: SetupRequest, privateKey: string, now=Date.now()) {
  const seal=sealSchema.parse(value);
  if(seal.id!==request.id)throw Error("SETUP_HANDOFF_MISMATCH");
  const key=privateDecrypt({key:privateKey,oaepHash:"sha256",padding:constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(seal.wrappedKey,"base64"));
  let plaintext:Buffer|undefined;
  try {
    const decipher=createDecipheriv("aes-256-gcm",key,Buffer.from(seal.iv,"base64"));
    decipher.setAAD(Buffer.from(canonical({id:request.id,fingerprint:digest(canonical(request))})));
    decipher.setAuthTag(Buffer.from(seal.tag,"base64"));plaintext=Buffer.concat([decipher.update(Buffer.from(seal.ciphertext,"base64")),decipher.final()]);
    const payload=z.object({token:z.string().min(1).max(20000),expiresAt:z.number().int(),issuedAt:z.number().int(),nonce:z.string(),requestHash:z.string()}).strict().parse(JSON.parse(plaintext.toString("utf8")));
    if(payload.requestHash!==digest(canonical(request)) || payload.nonce!==request.nonce || payload.expiresAt<=now || payload.issuedAt>now+5000 || payload.expiresAt-payload.issuedAt>60000 || request.expiresAt<=now)throw Error("SETUP_HANDOFF_EXPIRED");
    return payload;
  }finally{key.fill(0);plaintext?.fill(0);}
}
