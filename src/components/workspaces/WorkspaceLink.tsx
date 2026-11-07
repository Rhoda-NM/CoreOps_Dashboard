"use client";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

export default function WorkspaceLink({ href, ...props }: ComponentProps<typeof NextLink>) {
  const prefix = usePathname().match(/^\/w\/[^/]+/)?.[0] ?? "";
  const scoped = typeof href === "string" && /^\/(dashboard|clients|projects|tasks|invoices|settings|activity)(\/|\?|$)/.test(href) ? `${prefix}${href}` : href;
  return <NextLink href={scoped} {...props} />;
}
