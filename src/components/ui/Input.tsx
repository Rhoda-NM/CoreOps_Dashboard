import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({
  label,
  error,
  className,
  id,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...props
}: InputProps) {
  const errorId = error && id ? `${id}-error` : undefined;
  return (
    <div className="ui-field grid gap-2">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-core-text"
        >
          {label}
        </label>
      )}

      <input
        id={id}
        className={cn(
          "ui-input w-full rounded-lg border border-core-border bg-core-surface px-3 py-2 text-sm text-core-text placeholder:text-core-muted outline-none transition",
          "focus:border-core-primary focus:ring-2 focus:ring-core-primary/30",
          error && "border-red-500 focus:ring-red-500/30",
          className
        )}
        {...props}
        aria-invalid={error ? true : invalid}
        aria-describedby={[describedBy, errorId].filter(Boolean).join(" ") || undefined}
      />

      {error && (
        <p id={errorId} className="ui-field-error text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}