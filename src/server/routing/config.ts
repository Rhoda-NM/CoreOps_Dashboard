import "server-only";
import { routingPolicyFromEnvironment } from "@/lib/routing/host-policy";
// A local production-bundle smoke run has NODE_ENV=production but no Vercel
// deployment. Preserve loopback-only path mode; never infer a public origin
// from a request header or relax a configured subdomain/preview environment.
export function runtimeRoutingPolicy() {
  const env = process.env;
  const localOrigin = env.COREOPS_APP_ORIGIN ?? "http://localhost:3000";
  const localMarketing = env.COREOPS_MARKETING_ORIGIN ?? localOrigin;
  const local = (value: string) => /^http:\/\/(localhost|127\.0\.0\.1)(?::[0-9]+)?\/?$/.test(value);
  if (!env.VERCEL_ENV && (env.COREOPS_ROUTING_MODE ?? "path") === "path" && local(localOrigin) && local(localMarketing)) {
    return routingPolicyFromEnvironment({ ...env, NODE_ENV: "development", COREOPS_APP_ORIGIN: localOrigin, COREOPS_MARKETING_ORIGIN: localMarketing });
  }
  return routingPolicyFromEnvironment();
}
