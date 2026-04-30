import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />

        <div className="min-h-screen flex-1">
          <Header />

          <main className="mx-auto w-full max-w-7xl px-6 py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
