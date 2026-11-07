import { centralUrl } from "@/lib/routing/host-policy";
import { runtimeRoutingPolicy } from "@/server/routing/config";
import { UserButton } from "@clerk/nextjs";
import { BrandMark } from "@/components/brand/Brand";
import { MobileNavigation } from "./MobileNavigation";
type HeaderProps = {
  workspace: { id: string; name: string; slug: string | null };
  user: { name: string | null; email: string; imageUrl: string | null; role: string };
};
export function Header({ workspace, user }: HeaderProps) {
  const role = user.role.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return <header className="sticky top-0 z-20 border-b border-core-border bg-core-bg/95 backdrop-blur-md"><div className="flex min-h-18 items-center justify-between gap-3 px-4 py-3 lg:px-8"><div className="flex min-w-0 items-center gap-3"><MobileNavigation role={user.role}/><BrandMark className="hidden h-8 w-8 text-core-primary sm:block lg:hidden"/><div className="min-w-0"><p className="text-[10px] font-medium uppercase tracking-[.14em] text-core-muted">Workspace</p><h2 className="mt-1 max-w-[45vw] truncate text-sm font-semibold sm:max-w-lg">{workspace.name}</h2></div></div><div className="flex shrink-0 items-center gap-4"><div className="hidden text-right sm:block"><p className="max-w-48 truncate text-sm font-medium">{user.name || user.email}</p><p className="mt-1 text-xs text-core-text-secondary">{role}</p></div><span className="rounded-full border border-core-border px-2.5 py-1 text-[10px] text-core-text-secondary sm:hidden">{role}</span><UserButton userProfileMode="navigation" userProfileUrl={centralUrl(runtimeRoutingPolicy(), "/account")} /></div></div></header>;
}
