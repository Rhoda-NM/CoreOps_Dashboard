import { centralUrl, internalWorkspacePath, marketingUrl, type RoutingPolicy } from "./host-policy";

// Carry intent as a central, relative path. Membership is checked later by the
// continuation handler; neither a query parameter nor a cookie grants access.
export function workspaceContinuation(slug: string, path = "/dashboard") {
  if (path.length > 2048) throw new Error("Invalid continuation path.");
  internalWorkspacePath(slug, path);
  return `/dashboard/continue?${new URLSearchParams({ workspace: slug, path })}`;
}
export function paymentReturnReference(query: { attempt?: unknown; reference?: unknown; trxref?: unknown }) {
  const reference = query.attempt ?? query.reference;
  if (typeof reference !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(reference)) return undefined;
  if ([query.attempt, query.reference, query.trxref].some(value => value !== undefined && value !== reference)) return undefined;
  return reference;
}
export function safeAuthReturn(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return fallback;
  if (["/dashboard", "/onboarding", "/account"].includes(value)) return value;
  if (/^\/invitations\/[A-Za-z0-9_-]{43}$/.test(value)) return value;
  try {
    const url = new URL(value, "https://intent.invalid");
    if (url.origin !== "https://intent.invalid" || url.hash) return fallback;
    if (url.pathname === "/payments/paystack/return") {
      if ([...url.searchParams.keys()].some(key => !["attempt", "reference", "trxref"].includes(key))) return fallback;
      const field = (key: string) => url.searchParams.getAll(key).length > 1 ? [] : url.searchParams.get(key) ?? undefined;
      const reference = paymentReturnReference({ attempt: field("attempt"), reference: field("reference"), trxref: field("trxref") });
      return reference ? `/payments/paystack/return?${new URLSearchParams({ reference })}` : fallback;
    }
    if (url.pathname !== "/dashboard/continue") return fallback;
    const slug = url.searchParams.get("workspace"), path = url.searchParams.get("path");
    if (!slug || !path || url.searchParams.size !== 2) return fallback;
    return workspaceContinuation(slug, path);
  } catch { return fallback; }
}
export function authReturnForPath(path: string) {
  const match = path.match(/^\/w\/([^/]+)(\/.*)$/);
  if (match) {
    try { return workspaceContinuation(match[1], match[2]); } catch { return "/dashboard"; }
  }
  return safeAuthReturn(path);
}
export function signInDestination(policy: RoutingPolicy, intent: string) {
  return centralUrl(policy, `/sign-in?${new URLSearchParams({ returnTo: safeAuthReturn(intent) })}`);
}
// Public links may include an anchor; URL authority always comes from config.
export function siteHref(policy: RoutingPolicy, path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const [base, hash] = path.split("#");
  if (hash && !/^[a-zA-Z0-9_-]+$/.test(hash)) throw new Error("Invalid anchor.");
  const marketing = /^\/(?:features|pricing|demo|terms|privacy|auth-help)(?:[/?]|$)/.test(base) || base === "/";
  const url = marketing ? marketingUrl(policy, base) : centralUrl(policy, base);
  return `${url}${hash ? `#${hash}` : ""}`;
}
