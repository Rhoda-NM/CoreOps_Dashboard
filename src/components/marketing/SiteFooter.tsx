import Link from "@/components/workspaces/SiteLink";
import { Brand } from "@/components/brand/Brand";
import { brand } from "@/config/brand";
import { getAuthConfiguration } from "@/config/auth";
export function SiteFooter() {
  const config = getAuthConfiguration();
  return <footer className="border-t border-brand-line bg-[#EFF3EC] py-12"><div className="site-container"><div className="flex flex-col justify-between gap-8 md:flex-row"><div className="max-w-sm"><Link href="/" className="text-brand-deep"><Brand /></Link><p className="site-copy mt-4 text-base">Your business, connected.</p><p className="mt-5 text-sm text-brand-muted">A product by {brand.company}.</p></div><nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-12 gap-y-4 text-base sm:grid-cols-3"><Link href="/features">Features</Link><Link href="/pricing">Pricing</Link><Link href="/sign-in">Sign in</Link><Link href="/terms">Terms of Service{!config.legalReady && " (draft)"}</Link><Link href="/privacy">Privacy Policy{!config.legalReady && " (draft)"}</Link>{config.supportEmail && <a href={`mailto:${config.supportEmail}`}>Contact support</a>}</nav></div><div className="mt-10 flex flex-wrap justify-between gap-4 border-t border-brand-line pt-6 text-sm text-brand-muted"><p>© {new Date().getFullYear()} {brand.company}. {brand.name}.</p><p>Built around the way service businesses work.</p></div></div></footer>;
}
