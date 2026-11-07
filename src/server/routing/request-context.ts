import "server-only";
import { headers } from "next/headers";
import { classifyHost, internalWorkspacePath, workspaceUrl } from "@/lib/routing/host-policy";
import { runtimeRoutingPolicy } from "./config";
import { AccessError } from "../authorization/errors";
export async function requestRoutingContext() {
  const requestHeaders = await headers();
  const policy = runtimeRoutingPolicy();
  const host = classifyHost(policy, requestHeaders.get("host"), requestHeaders.get("x-forwarded-host"));
  if (host.kind === "rejected") throw new AccessError("NOT_FOUND");
  return { requestHeaders, policy, host };
}
export async function requireCentralHost() {
  const context = await requestRoutingContext();
  if (context.policy.mode === "subdomain" && context.host.kind !== "app") throw new AccessError("FORBIDDEN");
  return context;
}
export async function workspaceRoutingContext() {
  const context = await requestRoutingContext();
  const slug = context.requestHeaders.get("x-coreops-workspace");
  const internalPath = context.requestHeaders.get("x-coreops-path");
  if (!slug || !internalPath) throw new AccessError("FORBIDDEN");
  if (context.policy.mode === "subdomain" && (context.host.kind !== "tenant-candidate" || context.host.slug !== slug)) throw new AccessError("FORBIDDEN");
  const prefix = `/w/${slug}`;
  if (!internalPath.startsWith(`${prefix}/`)) throw new AccessError("FORBIDDEN");
  try {
    if (internalWorkspacePath(slug, internalPath.slice(prefix.length)) !== internalPath) throw new Error();
  } catch { throw new AccessError("FORBIDDEN"); }
  return { ...context, slug, internalPath };
}
export async function workspaceNavigationPath(path: string) {
  const context = await workspaceRoutingContext();
  const url = workspaceUrl(context.policy, context.slug, path);
  // Tenant redirects stay on the same visible origin. Path mode keeps /w/.
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}`;
}
