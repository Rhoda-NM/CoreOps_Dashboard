"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export function TaskFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQuery = searchParams.get("query") || "";
  const currentStatus = searchParams.get("status") || "ALL";
  const currentPriority = searchParams.get("priority") || "ALL";
  const currentFilter = searchParams.get("filter") || "all";

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === "ALL" || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.push(`/tasks?${params.toString()}`);
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
      <div className="flex w-full items-center gap-2 rounded-xl border border-core-border bg-core-surface px-3 py-2">
        <Search className="h-4 w-4 text-core-muted" />
        <input
          defaultValue={currentQuery}
          placeholder="Search tasks, projects, or clients..."
          onChange={(event) => updateParams("query", event.target.value)}
          className="w-full bg-transparent text-sm text-core-text outline-none placeholder:text-core-muted"
        />
      </div>

      <select
        defaultValue={currentFilter}
        onChange={(event) => updateParams("filter", event.target.value)}
        className="rounded-xl border border-core-border bg-core-surface px-3 py-2 text-sm text-core-text outline-none focus:border-core-primary focus:ring-2 focus:ring-core-primary/30"
      >
        <option value="all">All</option>
        <option value="pending">Pending</option>
        <option value="overdue">Overdue</option>
      </select>

      <select
        defaultValue={currentStatus}
        onChange={(event) => updateParams("status", event.target.value)}
        className="rounded-xl border border-core-border bg-core-surface px-3 py-2 text-sm text-core-text outline-none focus:border-core-primary focus:ring-2 focus:ring-core-primary/30"
      >
        <option value="ALL">All Statuses</option>
        <option value="TODO">Todo</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="REVIEW">Review</option>
        <option value="DONE">Done</option>
      </select>

      <select
        defaultValue={currentPriority}
        onChange={(event) => updateParams("priority", event.target.value)}
        className="rounded-xl border border-core-border bg-core-surface px-3 py-2 text-sm text-core-text outline-none focus:border-core-primary focus:ring-2 focus:ring-core-primary/30"
      >
        <option value="ALL">All Priorities</option>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="URGENT">Urgent</option>
      </select>
    </div>
  );
}