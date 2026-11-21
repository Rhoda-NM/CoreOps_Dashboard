"use client";
import { useEffect } from "react";
import { useNavigation } from "@/components/workspaces/NavigationProvider";

import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  BriefcaseBusiness,
  FilePlus2,
  Plus,
  Receipt,
  Search,
  UserPlus,
  X,
} from "lucide-react";

import { useQuickAdd } from "./QuickAddProvider";



export function QuickAddDialog({ role }: { role: "OWNER" | "MANAGER" }) {
  const router = useRouter();
  const { workspace } = useNavigation();
  const {
    isOpen,
    activeView,
    closeQuickAdd,

  } = useQuickAdd();

  const destination = activeView === "client" ? "/clients" : activeView === "task" ? "/tasks" : activeView === "invoice" && role === "OWNER" ? "/invoices" : activeView === "search" ? "/clients" : null;
  const target = destination ? workspace(destination) : null;
  useEffect(() => {
    if (isOpen && target) {
      closeQuickAdd();
      router.push(activeView === "search" ? target : `${target}?create=${crypto.randomUUID()}`);
    }
  }, [isOpen, target, activeView, closeQuickAdd, router]);
  if (!isOpen) return null;
  const go = (path: string) => {
    closeQuickAdd();
    router.push(workspace(path.replace("?create=1", `?create=${crypto.randomUUID()}`)));
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/65 px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeQuickAdd();
        }
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-core-border bg-core-card shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-core-border px-5 py-4">
          <div>
            <p className="font-semibold text-core-text">Quick Add</p>
            <p className="text-xs text-core-text-secondary">
              Open a creation form in this workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={closeQuickAdd}
            aria-label="Close Quick Add"
            className="rounded-lg p-2 text-core-text-secondary transition hover:bg-core-surface hover:text-core-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {(
          <Command
            label="Quick actions"
            className="bg-core-card"
          >
            <div className="flex items-center gap-3 border-b border-core-border px-5">
              <Search className="h-4 w-4 text-core-muted" />

              <Command.Input
                autoFocus
                placeholder="Type a command or search..."
                className="h-14 w-full bg-transparent text-sm text-core-text outline-none placeholder:text-core-muted"
              />
            </div>

            <Command.List className="max-h-[420px] overflow-y-auto p-3">
              <Command.Empty className="px-4 py-10 text-center text-sm text-core-text-secondary">
                No matching command found.
              </Command.Empty>

              <Command.Group
                heading="Create"
                className="text-xs text-core-muted"
              >
                <CommandItem
                  icon={Plus}
                  label="Create task"
                  keywords={["/task", "todo", "work"]}
                  shortcut="/task"
                  onSelect={() => go("/tasks?create=1")}
                />

                {role === "OWNER" && <CommandItem
                  icon={Receipt}
                  label="Create invoice"
                  keywords={["/invoice", "billing", "payment"]}
                  shortcut="/invoice"
                  onSelect={() => go("/invoices?create=1")}
                />}

                <CommandItem
                  icon={UserPlus}
                  label="Add client"
                  keywords={["/client", "customer", "contact"]}
                  shortcut="/client"
                  onSelect={() => go("/clients?create=1")}
                />
              </Command.Group>

              <Command.Group
                heading="Navigate"
                className="mt-3 text-xs text-core-muted"
              >
                <CommandItem
                  icon={Search}
                  label="Browse clients"
                  keywords={["search", "open", "go to"]}
                  onSelect={() => go("/clients")}
                />

                <CommandItem
                  icon={BriefcaseBusiness}
                  label="New project"
                  keywords={["projects"]}
                  onSelect={() => {
                    go("/projects?create=1");
                  }}
                />

                {role === "OWNER" && <CommandItem
                  icon={FilePlus2}
                  label="Open invoices"
                  keywords={["invoices", "billing"]}
                  onSelect={() => {
                    go("/invoices");
                  }}
                />}
              </Command.Group>
            </Command.List>
          </Command>
        )}

        <div className="flex items-center justify-between border-t border-core-border px-5 py-3 text-[11px] text-core-muted">
          <span>↑ ↓ navigate · Enter select · Esc close</span>
          <span>Quick add</span>
        </div>
      </div>
    </div>
  );
}

type CommandItemProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  keywords?: string[];
  shortcut?: string;
  onSelect: () => void;
};

function CommandItem({
  icon: Icon,
  label,
  keywords = [],
  shortcut,
  onSelect,
}: CommandItemProps) {
  return (
    <Command.Item
      value={[label, ...keywords].join(" ")}
      onSelect={onSelect}
      className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-3 text-sm text-core-text outline-none transition data-[selected=true]:bg-core-surface"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-core-primary/10 text-core-accent">
          <Icon className="h-4 w-4" />
        </span>

        {label}
      </span>

      {shortcut && (
        <span className="rounded-md border border-core-border bg-core-surface px-2 py-1 font-mono text-[10px] text-core-muted">
          {shortcut}
        </span>
      )}
    </Command.Item>
  );
}