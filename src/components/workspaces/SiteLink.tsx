"use client";
import NextLink from "next/link";
import type { ComponentProps } from "react";
import { useNavigation } from "./NavigationProvider";
export default function SiteLink({ href, ...props }: ComponentProps<typeof NextLink>) {
  const { site } = useNavigation();
  return <NextLink href={typeof href === "string" ? site(href) : href} {...props} />;
}
