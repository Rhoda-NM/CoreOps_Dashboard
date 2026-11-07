import "server-only";
import { isRegistrationReady } from "../auth/clerk-configuration";
import { publishedOffers } from "./service";
import { currentTaxConfiguration } from "./tax";
export async function marketingContent() {
  // Only the public brochure may degrade to contact-only availability. Business
  // and payment services must still fail closed when their database is unavailable.
  const catalog = await Promise.all([publishedOffers(), currentTaxConfiguration()])
    .then(([offers, tax]) => ({ offers, tax, catalogAvailable: true }))
    .catch((error: unknown) => {
      const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
      if (typeof code !== "string" || !["P1001", "P1002", "P1017", "P2021", "P2022"].includes(code)) throw error;
      // Do not log connection strings, SQL, or provider error payloads.
      console.warn(`[marketing] Subscription catalog unavailable (${code}); showing contact-only availability.`);
      return { offers: [], tax: null, catalogAvailable: false };
    });
  const { offers, tax, catalogAvailable } = catalog;
  const onboardingReady = process.env.COREOPS_PUBLIC_ONBOARDING_READY === "true" && offers.length > 0 && await isRegistrationReady();
  // Account access is independent of catalog availability. Registration and
  // workspace activation retain their own server-side readiness checks.
  const ctaHref = "/sign-in";
  return { offers, tax, catalogAvailable, ctaHref, ctaLabel: "Get access", onboardingReady };
}
