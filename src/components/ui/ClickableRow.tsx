"use client";

import { useRouter } from "next/navigation";
import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ClickableRowProps = HTMLAttributes<HTMLTableRowElement> & {
  href: string;
};

export function ClickableRow({
  href,
  className,
  ...props
}: ClickableRowProps) {
  const router = useRouter();

  return (
    <tr
      onClick={() => router.push(href)}
      className={cn(
        "cursor-pointer transition hover:bg-core-surface/70",
        className
      )}
      {...props}
    />
  );
}