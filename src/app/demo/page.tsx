import Link from "@/components/workspaces/SiteLink";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { WorkspacePreview } from "@/components/marketing/WorkspacePreview";
export const metadata: Metadata = { title: "Product preview", description: "An illustrative owner workspace with sample data. This preview is not a live business account." };
export default function DemoPage() {
  return <div className="marketing"><SiteHeader ctaHref="/sign-in" ctaLabel="Get access"/><main className="site-container site-section"><header className="mx-auto mb-10 max-w-2xl text-center"><p className="site-eyebrow">PRODUCT PREVIEW · SAMPLE DATA</p><h1 className="site-title mt-4">A clearer view of the work.</h1><p className="site-copy mt-5">Explore an illustrative owner workspace. This is a static product preview, not a trial or a live customer account. No workspace is created and no business data is changed.</p></header><div className="mx-auto max-w-4xl"><WorkspacePreview expanded/></div><p className="mt-10 text-center"><Link href="/features" className="site-button site-button-secondary">Explore the product features</Link></p></main><SiteFooter /></div>;
}
