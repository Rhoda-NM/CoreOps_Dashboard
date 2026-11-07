import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";
export function BrandMark({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" className={cn("h-10 w-10 shrink-0", className)}><rect width="40" height="40" rx="12" fill="currentColor"/><path d="m9 13 6 15 5-11 5 11 6-15" stroke="var(--brand-mark-ink, #F7F8F5)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="13" r="2.5" fill="#7CE0C9"/><circle cx="20" cy="17" r="2.5" fill="#7CE0C9"/><circle cx="31" cy="13" r="2.5" fill="#7CE0C9"/></svg>;
}
export function Brand({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return <span className={cn("inline-flex items-center gap-2.5", className)}><BrandMark className="h-9 w-9 text-core-primary"/>{!compact && <span className="text-[1.06rem] font-semibold tracking-[-0.045em]">{brand.name}</span>}</span>;
}
