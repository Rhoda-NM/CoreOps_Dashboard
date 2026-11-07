import "server-only";
import { indexingEnabled, canonicalOrigin } from "@/config/brand";
import { requestRoutingContext } from "./request-context";
export async function hostMetadata() {
  const context = await requestRoutingContext();
  const { policy, host } = context;
  const publicHost = policy.environment === "production" && (host.kind === "marketing" || (policy.mode === "path" && host.kind === "app" && policy.appOrigin === policy.marketingOrigin));
  const origin = host.kind === "tenant-candidate" ? `https://${host.authority}` : host.kind === "marketing" ? policy.marketingOrigin : policy.appOrigin;
  return { ...context, origin, index: publicHost && indexingEnabled() && canonicalOrigin() === policy.marketingOrigin };
}
