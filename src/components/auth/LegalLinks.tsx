import Link from "@/components/workspaces/SiteLink";
import { getAuthConfiguration } from "@/config/auth";
export function LegalLinks() {
  const { termsUrl, privacyUrl } = getAuthConfiguration();
  return <nav aria-label="Legal documents" className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-core-text-secondary">
    {termsUrl && <Link href="/terms" className="underline underline-offset-4 hover:text-core-text">Terms of Service</Link>}
    {privacyUrl && <Link href="/privacy" className="underline underline-offset-4 hover:text-core-text">Privacy Policy</Link>}
  </nav>;
}
