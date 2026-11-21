"use client";
import { useNavigation } from "@/components/workspaces/NavigationProvider";

import { useRouter } from "next/navigation";
import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ClickableRowProps = HTMLAttributes<HTMLTableRowElement> & {
  href: string;
};

export function ClickableRow({
  href,
  className,
  onClick,
  ...props
}: ClickableRowProps) {
  const router = useRouter();
  const { workspace } = useNavigation();

  return (
    <tr
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || (event.target instanceof Element && event.target.closest("a,button,input,select,textarea,summary,label"))) return;
        router.push(workspace(`${href}`));
      }}
      className={cn(
        "cursor-pointer transition hover:bg-core-surface/70",
        className
      )}
      {...props}
    />
  );
}