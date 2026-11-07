"use client";
import Link from "@/components/workspaces/SiteLink";
import { useNavigation } from "@/components/workspaces/NavigationProvider";
import { useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/brand/Brand";
export function SiteHeader({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  const { site } = useNavigation();
  const [open, setOpen] = useState(false);
  const links = [["/features", "Features"], ["/pricing", "Pricing"], ["/#how-it-works", "How it works"]];
  return <header className="sticky top-0 z-40 border-b border-brand-line/80 bg-brand-warm/95 backdrop-blur-md"><div className="site-container flex min-h-20 items-center justify-between gap-5"><Link href="/" aria-label="WorkflowConnect home" className="text-brand-deep"><Brand /></Link><nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">{links.map(([href, label]) => <Link className="site-header-link" key={href} href={href}>{label}</Link>)}</nav><div className="hidden items-center gap-6 lg:flex"><Link href="/sign-in" className="site-header-link">Sign in</Link><a href={site(ctaHref)} className="site-button">{ctaLabel}<ArrowUpRight aria-hidden="true" size={15}/></a></div><button type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="site-mobile-navigation" onClick={() => setOpen(!open)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-brand-line lg:hidden">{open ? <X aria-hidden="true" size={20}/> : <Menu aria-hidden="true" size={20}/>}</button></div><nav id="site-mobile-navigation" aria-label="Mobile navigation" hidden={!open} onKeyDown={event => { if (event.key === "Escape") { setOpen(false); document.querySelector<HTMLButtonElement>('[aria-controls="site-mobile-navigation"]')?.focus(); } }} className="border-t border-brand-line bg-brand-warm px-6 py-4 lg:hidden">{links.map(([href, label]) => <Link onClick={() => setOpen(false)} className="block min-h-11 py-3 text-base" key={href} href={href}>{label}</Link>)}<Link onClick={() => setOpen(false)} className="block min-h-11 py-3 text-base" href="/sign-in">Sign in</Link><a href={site(ctaHref)} className="site-button mt-3 w-full">{ctaLabel}</a></nav></header>;
}
