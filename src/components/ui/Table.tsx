import { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Table({ className, scrollLabel, ...props }: HTMLAttributes<HTMLTableElement> & { scrollLabel?: string }) {
  return (
    <div className="ui-table-frame">
      {scrollLabel && <p className="ui-table-hint">Scroll horizontally if needed to view every column.</p>}
      <div className="ui-table w-full overflow-hidden rounded-xl border border-core-border" role={scrollLabel ? "region" : undefined} aria-label={scrollLabel ? `${scrollLabel} table` : undefined} tabIndex={scrollLabel ? 0 : undefined}>
        <table className={cn("w-full border-collapse text-sm", className)} {...props} />
      </div>
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-core-surface", className)} {...props} />;
}

export function TableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-core-border", className)} {...props} />;
}

export function TableRow({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("transition hover:bg-core-surface/70", className)}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-core-text-secondary",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-4 py-4 text-core-text-secondary", className)}
      {...props}
    />
  );
}