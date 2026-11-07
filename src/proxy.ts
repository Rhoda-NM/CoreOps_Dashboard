import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/demo(.*)",
  "/pricing(.*)",
  "/auth-help",
  "/platform/sign-in(.*)",
  "/platform/access-denied",
  "/api/payments/paystack/(.*)/webhook",
  "/terms",
  "/privacy",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-coreops-workspace");
  requestHeaders.set("x-coreops-path", request.nextUrl.pathname);
  const match = request.nextUrl.pathname.match(/^\/w\/([^/]+)(?:\/|$)/);
  if (match) requestHeaders.set("x-coreops-workspace", decodeURIComponent(match[1]));
  if (!isPublicRoute(request)) {
    if (request.nextUrl.pathname.startsWith("/platform") && !(await auth()).userId) return NextResponse.redirect(new URL("/platform/sign-in", request.url));
    await auth.protect();
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/w/:path*",
    "/invitations/:path*",
  ],
};