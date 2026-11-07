"use client";
import NextLink from "next/link";
import { useNavigation } from "./NavigationProvider";
import type { ComponentProps } from "react";

export default function WorkspaceLink({ href, ...props }: ComponentProps<typeof NextLink>) {
  const { workspace, site } = useNavigation();
  const scoped = typeof href === "string" && /^\/(dashboard|clients|projects|tasks|invoices|settings|activity|subscription)(\/|\?|$)/.test(href) ? workspace(href) : typeof href === "string" ? site(href) : href;
  return <NextLink href={scoped} {...props} />;
}
