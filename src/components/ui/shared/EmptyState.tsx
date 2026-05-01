import { ReactNode } from "react";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-core-border bg-core-surface/40 p-10 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-core-muted">{icon}</div>
      )}

      <p className="text-sm font-medium text-core-text">
        {title}
      </p>

      {description && (
        <p className="mt-1 text-sm text-core-text-secondary max-w-md">
          {description}
        </p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}