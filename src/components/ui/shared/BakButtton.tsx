"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type BackButtonProps = {
  label?: string;
  fallbackHref?: string;
};

export function BackButton({
  label = "Back",
  fallbackHref = "/projects",
}: BackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center gap-2 text-sm text-core-text-secondary transition hover:text-core-text"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}