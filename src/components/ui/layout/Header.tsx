//src/components/ui/layout/Header.tsx
import { UserButton } from "@clerk/nextjs";
import { Bell, Search } from "lucide-react";

type HeaderProps = {
  workspace: {
    id: string;
    name: string;
    slug: string | null;
  };
  user: {
    name: string | null;
    email: string;
    imageUrl: string | null;
    role: string;
  };
};

function formatRole(role: string) {
  return role
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getInitials(name: string | null, email: string) {
  const source = name || email;

  return source
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Header({ workspace, user }: HeaderProps) {
  const displayName = user.name || user.email;
  const initials = getInitials(user.name, user.email);

  return (
    <header className="sticky top-0 z-20 border-b border-core-border bg-core-bg/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-5 lg:px-8">
        <div>
          <p className="text-xs uppercase tracking-wide text-core-muted">
            Workspace
          </p>
          <h2 className="text-sm font-semibold text-core-text">
            {workspace.name}
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
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-core-border bg-core-surface text-core-text-secondary transition hover:bg-core-card hover:text-core-text"
          >
            <Bell className="h-4 w-4" />
          </button>

          <div className="hidden text-right sm:block">
            <p className="max-w-32 truncate text-sm font-medium text-core-text">
              {displayName}
            </p>
            <p className="text-xs text-core-text-secondary">
              {formatRole(user.role)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-core-primary text-sm font-semibold text-white sm:flex">
              {initials}
            </div>

            <UserButton />
          </div>
        </div>
      </div>
    </header>
  );
}