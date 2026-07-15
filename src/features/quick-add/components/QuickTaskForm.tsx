"use client";

import { ArrowLeft } from "lucide-react";

type QuickTaskFormProps = {
  onBack: () => void;
};

export function QuickTaskForm({ onBack }: QuickTaskFormProps) {
  return (
    <div>
      <div className="flex items-center gap-3 border-b border-core-border px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg p-2 text-core-text-secondary hover:bg-core-surface hover:text-core-text"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div>
          <p className="font-semibold text-core-text">Quick task</p>
          <p className="text-xs text-core-text-secondary">
            Capture work before it gets lost.
          </p>
        </div>
      </div>

      <form className="grid gap-4 p-5">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-core-text">
            Task title
          </label>
          <input
            name="title"
            autoFocus
            required
            placeholder="Review landing page copy"
            className="rounded-xl border border-core-border bg-core-surface px-3 py-2.5 text-sm text-core-text outline-none placeholder:text-core-muted focus:border-core-primary"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-core-text">
            Project
          </label>
          <select
            name="projectId"
            required
            className="rounded-xl border border-core-border bg-core-surface px-3 py-2.5 text-sm text-core-text outline-none focus:border-core-primary"
          >
            <option value="">Select a project</option>
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-core-text">
              Due date
            </label>
            <input
              type="date"
              name="dueDate"
              className="rounded-xl border border-core-border bg-core-surface px-3 py-2.5 text-sm text-core-text outline-none focus:border-core-primary"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-core-text">
              Priority
            </label>
            <select
              name="priority"
              defaultValue="MEDIUM"
              className="rounded-xl border border-core-border bg-core-surface px-3 py-2.5 text-sm text-core-text outline-none focus:border-core-primary"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end border-t border-core-border pt-4">
          <button
            type="submit"
            className="rounded-xl bg-core-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-core-primary-hover"
          >
            Create task
          </button>
        </div>
      </form>
    </div>
  );
}