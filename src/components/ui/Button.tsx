import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-core-primary text-white hover:bg-core-primary-hover",
    secondary:
      "bg-core-card text-core-text border border-core-border hover:bg-core-surface",
    ghost:
      "bg-transparent text-core-text-secondary hover:bg-core-card hover:text-core-text",
    danger:
      "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}