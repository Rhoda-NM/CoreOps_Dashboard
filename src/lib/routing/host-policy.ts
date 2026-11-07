import { assertWorkspaceSlug, workspaceSlugProblem } from "./workspace-slug";

export type RoutingPolicy = Readonly<{
  mode: "path" | "subdomain";
  environment: "development" | "preview" | "production";
  marketingOrigin: string;
  appOrigin: string;
  tenantRootDomain?: string;
  previewHosts: readonly string[];
  developmentHosts: readonly string[];
}>;
type PolicyInput = Omit<RoutingPolicy, "previewHosts" | "developmentHosts"> & {
  previewHosts?: readonly string[]; developmentHosts?: readonly string[];
};
export type HostResolution =
  | { kind: "marketing" | "app" | "preview" | "development"; authority: string }
  | { kind: "tenant-candidate"; authority: string; slug: string }
  | { kind: "rejected"; reason: "invalid-host" | "forwarded-host-mismatch" | "unknown-host" | "reserved-or-invalid-tenant" };

function authority(value: string): string {
  if (value.length > 259 || !/^[a-zA-Z0-9.-]+(?::[0-9]{1,5})?$/.test(value)) throw new Error("Invalid host.");
  const [hostname, port] = value.toLowerCase().split(":");
  if (hostname.length > 253 || hostname.split(".").some(label => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) throw new Error("Invalid host.");
  if (port && (Number(port) < 1 || Number(port) > 65535 || String(Number(port)) !== port)) throw new Error("Invalid host port.");
  return port === "443" ? hostname : `${hostname}${port ? `:${port}` : ""}`;
}
function origin(value: string, environment: RoutingPolicy["environment"]) {
  const url = new URL(value);
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash || value.includes("\\") || /\s/.test(value)) throw new Error("Expected a bare application origin.");
  if (url.protocol !== "https:" && !(environment === "development" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("HTTPS is required.");
  authority(url.host);
  return url.origin;
}
export function createRoutingPolicy(input: PolicyInput): RoutingPolicy {
  if (!["path", "subdomain"].includes(input.mode) || !["development", "preview", "production"].includes(input.environment)) throw new Error("Invalid routing mode/environment.");
  const appOrigin = origin(input.appOrigin, input.environment);
  const marketingOrigin = origin(input.marketingOrigin, input.environment);
  const root = input.tenantRootDomain;
  if (root && (authority(root) !== root || root.includes(":") || !root.includes(".") || /^[\d.]+$/.test(root) || root.endsWith(".vercel.app") || root === "vercel.app")) throw new Error("Invalid tenant root domain.");
  if (input.mode === "subdomain") {
    if (!root || input.environment === "preview" || appOrigin !== `https://app.${root}` || marketingOrigin !== `https://${root}`) throw new Error("Subdomain mode requires dedicated HTTPS app and apex origins, outside preview.");
  }
  const previewHosts = (input.previewHosts ?? []).map(authority);
  if (previewHosts.some(host => host.includes(":") || !host.endsWith(".vercel.app") || host === "vercel.app")) throw new Error("Preview hosts must be explicit Vercel deployment hostnames.");
  if (input.environment === "preview" && (!previewHosts.includes(new URL(appOrigin).host) || !previewHosts.includes(new URL(marketingOrigin).host))) throw new Error("Preview origins must belong to the explicit preview host allowlist.");
  const developmentHosts = (input.developmentHosts ?? []).map(authority);
  if (developmentHosts.some(host => !["localhost", "127.0.0.1"].includes(host.split(":")[0]))) throw new Error("Development hosts must be local.");
  return Object.freeze({ ...input, appOrigin, marketingOrigin, tenantRootDomain: root, previewHosts: Object.freeze(previewHosts), developmentHosts: Object.freeze(developmentHosts) });
}
export function routingPolicyFromEnvironment(env: Record<string, string | undefined> = process.env): RoutingPolicy {
  const environment = env.VERCEL_ENV === "preview" ? "preview" : env.NODE_ENV === "production" || env.VERCEL_ENV === "production" ? "production" : "development";
  const mode = env.COREOPS_ROUTING_MODE ?? "path";
  if (mode !== "path" && mode !== "subdomain") throw new Error("Invalid COREOPS_ROUTING_MODE.");
  const local = environment === "development" ? "http://localhost:3000" : undefined;
  const appOrigin = env.COREOPS_APP_ORIGIN ?? local;
  const marketingOrigin = env.COREOPS_MARKETING_ORIGIN ?? local;
  if (!appOrigin || !marketingOrigin) throw new Error("Application and marketing origins must be explicitly configured.");
  return createRoutingPolicy({ mode, environment, appOrigin, marketingOrigin, tenantRootDomain: env.COREOPS_TENANT_ROOT_DOMAIN, previewHosts: env.COREOPS_PREVIEW_HOSTS?.split(",").filter(Boolean), developmentHosts: environment === "development" ? [new URL(appOrigin).host, "localhost:3000", "127.0.0.1:3000"].filter(host => ["localhost", "127.0.0.1"].includes(host.split(":")[0])) : [] });
}
// Syntax classification only. A candidate is not an existing workspace and
// never confers membership, a platform role, or commercial access.
export function classifyHost(policy: RoutingPolicy, host: string | null, forwardedHost?: string | null): HostResolution {
  let normalized: string;
  try {
    normalized = authority(host ?? "");
    if (forwardedHost !== undefined && forwardedHost !== null && authority(forwardedHost) !== normalized) return { kind: "rejected", reason: "forwarded-host-mismatch" };
  } catch { return { kind: "rejected", reason: "invalid-host" }; }
  if (policy.environment === "preview") return policy.previewHosts.includes(normalized) ? { kind: "preview", authority: normalized } : { kind: "rejected", reason: "unknown-host" };
  if (normalized === authority(new URL(policy.appOrigin).host)) return { kind: "app", authority: normalized };
  if (normalized === authority(new URL(policy.marketingOrigin).host)) return { kind: "marketing", authority: normalized };
  if (policy.environment === "development" && policy.developmentHosts.includes(normalized)) return { kind: "development", authority: normalized };
  if (policy.mode === "subdomain" && policy.tenantRootDomain && normalized.endsWith(`.${policy.tenantRootDomain}`)) {
    const slug = normalized.slice(0, -(policy.tenantRootDomain.length + 1));
    if (workspaceSlugProblem(slug)) return { kind: "rejected", reason: "reserved-or-invalid-tenant" };
    return { kind: "tenant-candidate", authority: normalized, slug };
  }
  return { kind: "rejected", reason: "unknown-host" };
}

const workspaceSections = new Set(["dashboard", "clients", "projects", "tasks", "invoices", "settings", "activity", "subscription"]);
function safePath(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\s\u0000-\u001f\u007f#]/.test(path)) throw new Error("Invalid application path.");
  const pathname = path.split("?")[0];
  for (const segment of pathname.slice(1).split("/")) {
    if (segment && !/^[a-zA-Z0-9_-]+$/.test(segment)) throw new Error("Invalid path segment.");
  }
  if (pathname.includes("//")) throw new Error("Invalid application path.");
  return path;
}
function workspaceRoute(path: string) {
  safePath(path);
  if (!workspaceSections.has(path.slice(1).split(/[/?]/)[0])) throw new Error("Not a workspace route.");
  return path;
}
export function internalWorkspacePath(slug: string, path = "/dashboard") {
  return `/w/${assertWorkspaceSlug(slug)}${workspaceRoute(path)}`;
}
export function workspaceUrl(policy: RoutingPolicy, slug: string, path = "/dashboard") {
  const internal = internalWorkspacePath(slug, path);
  return policy.mode === "subdomain" ? `https://${slug}.${policy.tenantRootDomain}${path}` : `${policy.appOrigin}${internal}`;
}
export function centralUrl(policy: RoutingPolicy, path: string) { return `${policy.appOrigin}${safePath(path)}`; }
export function marketingUrl(policy: RoutingPolicy, path = "/") { return `${policy.marketingOrigin}${safePath(path)}`; }
// Validate return destinations against memberships already verified by the
// caller. This is not an identity/permission check and never accepts a host
// merely because it has a valid suffix. Keep the list request-local.
export function verifiedWorkspaceReturnUrl(policy: RoutingPolicy, value: string, memberSlugs: readonly string[]) {
  if (!value.startsWith("https://") && !value.startsWith("http://")) throw new Error("Expected an absolute workspace return URL.");
  const url = new URL(value);
  if (url.username || url.password || url.hash) throw new Error("Invalid workspace return URL.");
  if (url.href !== value) throw new Error("Return URL must be canonical.");
  const path = `${url.pathname}${url.search}`;
  if (policy.mode === "subdomain") {
    const host = classifyHost(policy, url.host);
    if (url.protocol !== "https:" || host.kind !== "tenant-candidate" || !memberSlugs.includes(host.slug)) throw new Error("Unverified workspace destination.");
    return workspaceUrl(policy, host.slug, workspaceRoute(path));
  }
  const match = url.pathname.match(/^\/w\/([^/]+)(\/.*)$/);
  if (url.origin !== policy.appOrigin || !match || !memberSlugs.includes(match[1])) throw new Error("Unverified workspace destination.");
  return workspaceUrl(policy, match[1], workspaceRoute(`${match[2]}${url.search}`));
}
