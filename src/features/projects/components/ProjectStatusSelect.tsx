"use client";

import { useTransition } from "react";
import { updateProjectStatusAction } from "../actions/update-project-status";

type ProjectStatus = "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";

type ProjectStatusSelectProps = {
  projectId: string;
  currentStatus: ProjectStatus;
  pathsToRevalidate?: string[];
};

export function ProjectStatusSelect({
  projectId,
  currentStatus,
  pathsToRevalidate = [],
}: ProjectStatusSelectProps) {
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextStatus = event.target.value as ProjectStatus;

    startTransition(() => {
      updateProjectStatusAction(projectId, nextStatus, pathsToRevalidate);
    });
  }

  return (
    <select
      defaultValue={currentStatus}
      onChange={handleChange}
      disabled={isPending}
      className="rounded-lg border border-core-border bg-core-surface px-2.5 py-1.5 text-xs font-medium text-core-text outline-none transition focus:border-core-primary focus:ring-2 focus:ring-core-primary/30 disabled:opacity-60"
    >
      <option value="ACTIVE">ACTIVE</option>
      <option value="COMPLETED">COMPLETED</option>
      <option value="PAUSED">PAUSED</option>
      <option value="CANCELLED">CANCELLED</option>
    </select>
  );
}