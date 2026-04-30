import { Bell, Search } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-core-border bg-core-bg/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-5 lg:px-8">
        <div>
          <p className="text-xs uppercase tracking-wide text-core-muted">
            Workspace
          </p>
          <h2 className="text-sm font-semibold text-core-text">
            CoreOps Studio
          </h2>
        </div>

        <div className="hidden w-full max-w-md items-center gap-2 rounded-xl border border-core-border bg-core-surface px-3 py-2 md:flex">
          <Search className="h-4 w-4 text-core-muted" />
          <input
            placeholder="Search clients, projects, tasks..."
            className="w-full bg-transparent text-sm text-core-text outline-none placeholder:text-core-muted"
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-core-border bg-core-surface text-core-text-secondary transition hover:bg-core-card hover:text-core-text">
            <Bell className="h-4 w-4" />
          </button>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-core-text">Rhoda</p>
            <p className="text-xs text-core-text-secondary">Owner</p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-core-primary text-sm font-semibold text-white">
            R
          </div>
        </div>
      </div>
    </header>
  );
}