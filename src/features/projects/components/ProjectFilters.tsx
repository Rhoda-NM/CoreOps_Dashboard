"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export function ProjectFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQuery = searchParams.get("query") || "";
  const currentStatus = searchParams.get("status") || "ALL";

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === "ALL") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.push(`/projects?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-core-border bg-core-surface px-3 py-2">
        <Search className="h-4 w-4 text-core-muted" />
        <input
          defaultValue={currentQuery}
          placeholder="Search projects or clients..."
          onChange={(event) => updateParams("query", event.target.value)}
          className="w-full bg-transparent text-sm text-core-text outline-none placeholder:text-core-muted"
        />
      </div>

      <select
        defaultValue={currentStatus}
        onChange={(event) => updateParams("status", event.target.value)}
        className="rounded-xl border border-core-border bg-core-surface px-3 py-2 text-sm text-core-text outline-none focus:border-core-primary focus:ring-2 focus:ring-core-primary/30"
      >
        <option value="ALL">All Projects</option>
        <option value="ACTIVE">Active</option>
        <option value="COMPLETED">Completed</option>
        <option value="PAUSED">Paused</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
    </div>
  );
}