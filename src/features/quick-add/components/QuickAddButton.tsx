"use client";

import { Plus } from "lucide-react";

import { useQuickAdd } from "./QuickAddProvider";

export function QuickAddButton() {
  const { openQuickAdd } = useQuickAdd();

  return (
    <button
      type="button"
      onClick={() => openQuickAdd()}
      className="flex w-full items-center justify-between rounded-xl bg-core-primary px-3 py-3 text-sm font-semibold text-white shadow-lg shadow-core-primary/10 transition hover:bg-core-primary-hover"
    >
      <span className="flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Quick Add
      </span>

      <span className="rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-100">
        ⌘ K
      </span>
    </button>
  );
}