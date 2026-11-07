"use client";
import { createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import type { RoutingPolicy } from "@/lib/routing/host-policy";
import { internalWorkspacePath } from "@/lib/routing/host-policy";
import { siteHref } from "@/lib/routing/navigation";
const Context = createContext<RoutingPolicy | null>(null);
export function NavigationProvider({ policy, children }: { policy: RoutingPolicy; children: React.ReactNode }) {
  return <Context.Provider value={policy}>{children}</Context.Provider>;
}
export function useNavigation() {
  const policy = useContext(Context);
  const pathname = usePathname() ?? "";
  const slug = pathname.match(/^\/w\/([^/]+)/)?.[1];
  return {
    policy,
    site: (path: string) => policy ? siteHref(policy, path) : path,
    workspace: (path: string) => policy?.mode !== "subdomain" && slug ? internalWorkspacePath(slug, path) : path,
  };
}
