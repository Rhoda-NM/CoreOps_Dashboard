import "server-only";
import { requestRoutingContext } from "./request-context";
import { authReturnForPath, signInDestination } from "@/lib/routing/navigation";
export async function authenticationDestination() {
  const { policy, requestHeaders } = await requestRoutingContext();
  return signInDestination(policy, requestHeaders.get("x-coreops-return-to") ?? authReturnForPath(requestHeaders.get("x-coreops-path") ?? "/dashboard"));
}
