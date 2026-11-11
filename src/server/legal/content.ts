import "server-only";
import { createHash } from "node:crypto";
export const legalHash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
export function canonicalLegalText(bytes: Uint8Array) {
  if (bytes.byteLength < 1 || bytes.byteLength > 262144) throw new Error("LEGAL_CONTENT_INVALID");
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  // No silent normalization: accept LF-only, no BOM/NUL. Include all authoritative
  // headings/wording in these exact bytes; HTML/Markdown are not interpreted.
  if (text.startsWith("\uFEFF") || /[\u0000\r]/.test(text) || !Buffer.from(text, "utf8").equals(Buffer.from(bytes))) throw new Error("LEGAL_CONTENT_INVALID");
  return text;
}
export function reconstructLegalVersion(row: { content: Uint8Array; contentHash: string; byteLength: number; hashAlgorithm: string; format: string; rendererVersion: string }) {
  if (row.content.byteLength !== row.byteLength || legalHash(row.content) !== row.contentHash || row.hashAlgorithm !== "SHA-256" || row.format !== "TEXT_UTF8" || row.rendererVersion !== "PLAIN_UTF8-v1") throw new Error("LEGAL_CONTENT_INVALID");
  return canonicalLegalText(row.content);
}
