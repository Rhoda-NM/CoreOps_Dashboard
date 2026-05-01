"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { createTaskAction } from "../actions/create-task";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";

type CreateTaskPanelProps = {
  clientId: string;
  projectId: string;
};

export function CreateTaskPanel({
  clientId,
  projectId,
}: CreateTaskPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const createTaskForProject = createTaskAction.bind(
    null,
    clientId,
    projectId
  );

  if (!isOpen) {
    return (
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        New Task
      </Button>
    );
  }

  return (
    <Card className="border-core-primary/30 bg-core-surface">
      <CardContent className="p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-core-text">Create Task</h3>
            <p className="mt-1 text-sm text-core-text-secondary">
              Add a task to this project’s execution list.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-2 text-core-text-secondary transition hover:bg-core-card hover:text-core-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={createTaskForProject} className="grid gap-5">
          <Input
            id={`title-${projectId}`}
            name="title"
            label="Task Title"
            placeholder="Design homepage hero section"
            required
          />

          <Input
            id={`description-${projectId}`}
            name="description"
            label="Description"
            placeholder="Short task description"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label
                htmlFor={`priority-${projectId}`}
                className="text-sm font-medium text-core-text"
              >
                Priority
              </label>

              <select
                id={`priority-${projectId}`}
                name="priority"
                defaultValue="MEDIUM"
                className="w-full rounded-lg border border-core-border bg-core-surface px-3 py-2 text-sm text-core-text outline-none transition focus:border-core-primary focus:ring-2 focus:ring-core-primary/30"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <Input
              id={`dueDate-${projectId}`}
              name="dueDate"
              type="date"
              label="Due Date"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-core-border pt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>

            <Button type="submit">Create Task</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}