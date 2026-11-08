import Link from "@/components/workspaces/SiteLink";
import { getAuthConfiguration } from "@/config/auth";
export function LegalLinks({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { termsUrl, privacyUrl } = getAuthConfiguration();
  return <nav aria-label="Legal documents" className={`flex flex-wrap gap-x-5 gap-y-2 ${tone === "light" ? "text-sm text-brand-muted" : "text-xs text-core-text-secondary"}`}>
    {termsUrl && <Link href="/terms" className="underline underline-offset-4 hover:opacity-75">Terms of Service</Link>}
    {privacyUrl && <Link href="/privacy" className="underline underline-offset-4 hover:opacity-75">Privacy Policy</Link>}
  </nav>;
}
