"use client";

import { useTransition } from "react";
import { updateTaskStatusAction } from "../actions/update-task-status";

type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";

type TaskStatusSelectProps = {
  projectId: string;
  taskId: string;
  currentStatus: TaskStatus;
};

export function TaskStatusSelect({
  projectId,
  taskId,
  currentStatus,
}: TaskStatusSelectProps) {
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextStatus = event.target.value as TaskStatus;

    startTransition(() => {
      updateTaskStatusAction(projectId, taskId, nextStatus);
    });
  }

  return (
    <select
      defaultValue={currentStatus}
      onChange={handleChange}
      disabled={isPending}
      className="rounded-lg border border-core-border bg-core-surface px-2.5 py-1.5 text-xs font-medium text-core-text outline-none transition focus:border-core-primary focus:ring-2 focus:ring-core-primary/30 disabled:opacity-60"
    >
      <option value="TODO">TODO</option>
      <option value="IN_PROGRESS">IN PROGRESS</option>
      <option value="REVIEW">REVIEW</option>
      <option value="DONE">DONE</option>
    </select>
  );
}