"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import {
  createWorkspaceAction,
  type CreateWorkspaceState,
} from "@/features/workspaces/actions/create-workspace";

const initialState: CreateWorkspaceState = {
  error: "",
};

type WorkspaceOnboardingFormProps = {
  defaultName?: string;
};

export function WorkspaceOnboardingForm({
  defaultName = "",
}: WorkspaceOnboardingFormProps) {
  const [state, action, isPending] = useActionState(
    createWorkspaceAction,
    initialState
  );

  return (
    <div className="w-full max-w-lg rounded-2xl border border-[#232D42] bg-[#161C2A] p-8 shadow-2xl">
      <div className="mb-8">
        <p className="text-sm font-semibold text-blue-400">
          Welcome to CoreOps
        </p>

        <h1 className="mt-2 text-3xl font-bold text-white">
          Create your workspace
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Your workspace will contain your clients, projects, tasks, invoices,
          and future team members.
        </p>
      </div>

      <form action={action} className="space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="name"
            className="text-sm font-medium text-slate-200"
          >
            Workspace name
          </label>

          <input
            id="name"
            name="name"
            required
            minLength={2}
            defaultValue={defaultName}
            placeholder="Rhoda Studio"
            className="h-12 w-full rounded-xl border border-[#232D42] bg-[#0B101D] px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {state.error && (
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating workspace
            </>
          ) : (
            "Create workspace"
          )}
        </button>
      </form>
    </div>
  );
}