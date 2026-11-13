import { classifyHost, centralUrl, internalWorkspacePath, workspaceUrl, type RoutingPolicy, type HostResolution } from "./host-policy";
import { workspaceSlugProblem } from "./workspace-slug";
export type RoutingPlan = {
  action: "next" | "rewrite" | "redirect" | "deny";
  internalPath?: string; workspaceSlug?: string; location?: string;
  host: HostResolution; public: boolean; infrastructure?: boolean;
};
const publicPages = new Set(["/", "/features", "/pricing", "/demo", "/terms", "/privacy", "/auth-help"]);
const assets = new Set(["/favicon.ico", "/icon.svg", "/apple-icon", "/opengraph-image", "/manifest.webmanifest", "/robots.txt", "/sitemap.xml", "/sw.js", "/dashboard.png", "/next.svg", "/vercel.svg", "/file.svg", "/globe.svg", "/window.svg"]);
const centralPath = (path: string) => /^\/(sign-in|sign-up|onboarding|dashboard|account|invitations|platform|payments)(\/|$)/.test(path) || path === "/auth-help" || path === "/terms" || path === "/privacy";
const publicCentral = (path: string) => /^\/(sign-in|sign-up)(\/|$)/.test(path) || /^\/platform\/(sign-in(?:\/|$)|access-denied$)/.test(path);
const webhook = (path: string) => /^\/api\/payments\/paystack\/(test|live)\/webhook$/.test(path);
const section = (path: string) => {
  if (!/^\/(dashboard|clients|projects|tasks|invoices|settings|activity|subscription)(\/|$)/.test(path)) return false;
  try { internalWorkspacePath("valid-workspace", path); return true; } catch { return false; }
};
export function planRequest(policy: RoutingPolicy, input: { host: string | null; forwardedHost?: string | null; pathname: string; search?: string; method: string }): RoutingPlan {
  const host = classifyHost(policy, input.host, input.forwardedHost);
  const deny: RoutingPlan = { action: "deny", host, public: false };
  if (host.kind === "rejected") return deny;
  const path = input.pathname;
  const read = input.method === "GET" || input.method === "HEAD";
  // Handler independently rejects deployed use and requires genuine Svix verification.
  if(path==="/api/notifications/resend/webhook"){
    if(input.method!=="POST"||(policy.mode==="subdomain"&&host.kind!=="app"))return deny;
    return {action:"next",host,public:true,infrastructure:true,internalPath:path};
  }
  // Paystack is a machine POST authenticated by raw-body signature and an
  // independent provider verification, never an interactive Clerk session.
  if (webhook(path)) {
    if (input.method !== "POST" || (policy.mode === "subdomain" && host.kind !== "app")) return deny;
    return { action: "next", host, public: true, infrastructure: true, internalPath: path };
  }
  // Machine authentication is enforced by the handler, never by User-Agent.
  // Explicitly bypass interactive Clerk only on this exact central GET route.
  if (path === "/api/lifecycle/process" || path === "/api/lifecycle/export-cleanup" || path === "/api/notifications/capture") {
    if (input.method !== "GET" || (policy.mode === "subdomain" && host.kind !== "app")) return deny;
    return { action: "next", host, public: true, infrastructure: true, internalPath: path };
  }
  if (/[%\\\s\u0000-\u001f\u007f]/.test(path) || path.includes("//") || path.split("/").some(p => p === "." || p === "..")) return deny;
  const asset = assets.has(path) || path.startsWith("/_next/") || /^\/(brand|screenshots)\/[a-zA-Z0-9_./-]+$/.test(path);
  if (asset) return read ? { action: "next", host, public: true, infrastructure: true } : deny;
  // No Clerk FAPI proxy is enabled here. Reserve its documented namespace;
  // route handlers/Clerk remain responsible for any future endpoint handling.
  if (path === "/__clerk" || path.startsWith("/__clerk/")) return { action: "next", host, public: true };
  const scoped = path.match(/^\/w\/([^/]+)(\/.*)?$/);
  const scopedSlug = scoped?.[1];
  if (scopedSlug && workspaceSlugProblem(scopedSlug)) return deny;
  const scopedPath = scoped ? scoped[2] || "/dashboard" : undefined;
  if (scopedPath && !section(scopedPath)) return deny;
  if (policy.mode === "path") {
    return { action: "next", host, public: publicPages.has(path) || publicCentral(path) || webhook(path), internalPath: scoped ? internalWorkspacePath(scopedSlug!, scopedPath!) : path, workspaceSlug: scopedSlug };
  }
  if (host.kind === "marketing") {
    // Existing public Get access links can reach central authentication without
    // exposing an auth page on the apex or redirecting a mutation cross-host.
    if (read && /^\/(sign-in|sign-up)(\/|$)/.test(path)) return { action: "redirect", host, public: true, location: centralUrl(policy, `${path}${input.search ?? ""}`) };
    return read && publicPages.has(path) ? { action: "next", host, public: true, internalPath: path } : deny;
  }
  if (host.kind === "app") {
    if (scoped) return read ? { action: "redirect", host, public: false, workspaceSlug: scopedSlug, location: workspaceUrl(policy, scopedSlug!, `${scopedPath}${input.search ?? ""}`) } : deny;
    if (path === "/") return read ? { action: "redirect", host, public: false, location: centralUrl(policy, "/dashboard") } : deny;
    if (centralPath(path) || webhook(path)) return { action: "next", host, public: publicCentral(path) || publicPages.has(path) || webhook(path), internalPath: path };
    return deny;
  }
  if (host.kind !== "tenant-candidate") return deny;
  if (scoped && scopedSlug !== host.slug) return deny;
  if (scoped) {
    if (read) return { action: "redirect", host, public: false, workspaceSlug: host.slug, location: workspaceUrl(policy, host.slug, `${scopedPath}${input.search ?? ""}`) };
    return { action: "rewrite", host, public: false, workspaceSlug: host.slug, internalPath: internalWorkspacePath(host.slug, scopedPath!) };
  }
  // Explicit GET navigation only. Platform is always denied on tenant hosts.
  if (/^\/platform(\/|$)/.test(path)) return deny;
  if (centralPath(path) && !section(path)) return read ? { action: "redirect", host, public: false, location: centralUrl(policy, `${path}${input.search ?? ""}`) } : deny;
  const visiblePath = path === "/" && read ? "/dashboard" : path;
  if (!section(visiblePath)) return deny;
  return { action: "rewrite", host, public: false, workspaceSlug: host.slug, internalPath: internalWorkspacePath(host.slug, visiblePath) };
}
