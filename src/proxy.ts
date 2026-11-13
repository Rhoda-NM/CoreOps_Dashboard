import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { runtimeRoutingPolicy } from "./server/routing/config";
import { authReturnForPath, signInDestination } from "./lib/routing/navigation";
import { planRequest } from "./lib/routing/request-plan";
import { centralUrl, workspaceUrl } from "./lib/routing/host-policy";

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  let policy, plan;
  try {
    policy = runtimeRoutingPolicy();
    plan = planRequest(policy, { host: request.headers.get("host"), forwardedHost: request.headers.get("x-forwarded-host"), pathname: request.nextUrl.pathname, search: request.nextUrl.search, method: request.method });
  } catch {
    return new NextResponse("Service unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (plan.action === "deny") return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  if (policy.mode === "subdomain" && plan.workspaceSlug) {
    try {
      const { tenantExists } = await import("./server/routing/tenant-existence");
      if (!await tenantExists(plan.workspaceSlug)) return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    } catch {
      return new NextResponse("Service unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  }
  if (plan.action === "redirect") return NextResponse.redirect(plan.location!, 307);
  const requestHeaders = new Headers(request.headers);
  for (const header of ["x-coreops-workspace", "x-coreops-path", "x-coreops-visible-path", "x-coreops-host-kind", "x-coreops-routing-mode", "x-coreops-return-to"]) requestHeaders.delete(header);
  requestHeaders.set("x-coreops-return-to", authReturnForPath(`${plan.internalPath ?? request.nextUrl.pathname}${request.nextUrl.search}`));
  requestHeaders.set("x-coreops-path", plan.internalPath ?? request.nextUrl.pathname);
  requestHeaders.set("x-coreops-visible-path", request.nextUrl.pathname);
  requestHeaders.set("x-coreops-host-kind", plan.host.kind);
  requestHeaders.set("x-coreops-routing-mode", policy.mode);
  if (plan.workspaceSlug) requestHeaders.set("x-coreops-workspace", plan.workspaceSlug);
  const routingResponse = () => {
    const response = plan.action === "rewrite"
      ? NextResponse.rewrite(new URL(`${plan.internalPath}${request.nextUrl.search}`, workspaceUrl(policy, plan.workspaceSlug!)), { request: { headers: requestHeaders } })
      : NextResponse.next({ request: { headers: requestHeaders } });
    if (policy.mode === "subdomain" && plan.host.kind !== "marketing") response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  };
  // Public, nonpersonal brochure reads do not require an identity-provider
  // handshake. POST/actions still run Clerk and their own server authorization.
  const brochureRead = ["GET", "HEAD"].includes(request.method) && plan.public && !plan.workspaceSlug && !request.headers.has("next-action") && ["/", "/features", "/pricing", "/demo", "/terms", "/privacy", "/auth-help"].includes(request.nextUrl.pathname);
  if (plan.infrastructure || brochureRead) return routingResponse();
  // Validate routing before Clerk can initiate a development handshake.
  return clerkMiddleware(async (auth) => {
  if (!plan.public) {
    if (/^\/platform(\/|$)/.test(request.nextUrl.pathname) && !(await auth()).userId) {
      // Never redirect POST/actions across hosts (or turn mutations into GETs).
      if (!["GET", "HEAD"].includes(request.method)) return new NextResponse("Unauthorized", { status: 401 });
      return NextResponse.redirect(centralUrl(policy, "/platform/sign-in"));
    }
    // Existence is already checked before Clerk, and is rechecked by the
    // resource resolver. That resolver still verifies Clerk's
    // live session, ACTIVE membership, roles and commercial authorization.
    if (!(await auth()).userId) {
      if (!["GET", "HEAD"].includes(request.method)) return new NextResponse("Unauthorized", { status: 401 });
      return NextResponse.redirect(signInDestination(policy, authReturnForPath(`${plan.internalPath ?? request.nextUrl.pathname}${request.nextUrl.search}`)));
    }
  }
  return routingResponse();
  })(request, event);
}
// Include all paths: POSTing a compiled action ID to an asset-looking path
// must not bypass host restrictions or internal-header replacement.
export const config = { matcher: ["/:path*"] };
