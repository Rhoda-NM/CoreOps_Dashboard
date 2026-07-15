"use client";

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
import { QuickTaskForm } from "./QuickTaskForm";
import { QuickInvoiceForm } from "./QuickInvoiceForm";

export function QuickAddDialog() {
  const {
    isOpen,
    activeView,
    closeQuickAdd,
    setActiveView,
  } = useQuickAdd();

  if (!isOpen) return null;

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
              Create or find anything without leaving your current page.
            </p>
          </div>

          <button
            type="button"
            onClick={closeQuickAdd}
            className="rounded-lg p-2 text-core-text-secondary transition hover:bg-core-surface hover:text-core-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {activeView === "root" && (
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
                  onSelect={() => setActiveView("task")}
                />

                <CommandItem
                  icon={Receipt}
                  label="Create invoice"
                  keywords={["/invoice", "billing", "payment"]}
                  shortcut="/invoice"
                  onSelect={() => setActiveView("invoice")}
                />

                <CommandItem
                  icon={UserPlus}
                  label="Add client"
                  keywords={["/client", "customer", "contact"]}
                  shortcut="/client"
                  onSelect={() => setActiveView("client")}
                />
              </Command.Group>

              <Command.Group
                heading="Navigate"
                className="mt-3 text-xs text-core-muted"
              >
                <CommandItem
                  icon={Search}
                  label="Find a client or project"
                  keywords={["search", "open", "go to"]}
                  onSelect={() => setActiveView("search")}
                />

                <CommandItem
                  icon={BriefcaseBusiness}
                  label="Open projects"
                  keywords={["projects"]}
                  onSelect={() => {
                    window.location.href = "/projects";
                  }}
                />

                <CommandItem
                  icon={FilePlus2}
                  label="Open invoices"
                  keywords={["invoices", "billing"]}
                  onSelect={() => {
                    window.location.href = "/invoices";
                  }}
                />
              </Command.Group>
            </Command.List>
          </Command>
        )}

        {activeView === "task" && (
          <QuickTaskForm onBack={() => setActiveView("root")} />
        )}

        {activeView === "invoice" && (
          <QuickInvoiceForm clients={[]} onBack={() => setActiveView("root")} />
        )}

        {activeView === "client" && (
          <div className="p-5">
            Client micro-form goes here.
          </div>
        )}

        {activeView === "search" && (
          <div className="p-5">
            Client and project search goes here.
          </div>
        )}

        <div className="flex items-center justify-between border-t border-core-border px-5 py-3 text-[11px] text-core-muted">
          <span>↑ ↓ navigate · Enter select · Esc close</span>
          <span>CoreOps Velocity Hub</span>
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
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-core-primary/10 text-indigo-300">
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