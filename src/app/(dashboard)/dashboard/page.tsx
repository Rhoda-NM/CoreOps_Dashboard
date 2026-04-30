export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-gray-500">
          Your agency operations at a glance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Total Clients</p>
          <h2 className="mt-2 text-3xl font-semibold">0</h2>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Active Projects</p>
          <h2 className="mt-2 text-3xl font-semibold">0</h2>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Pending Tasks</p>
          <h2 className="mt-2 text-3xl font-semibold">0</h2>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Unpaid Invoices</p>
          <h2 className="mt-2 text-3xl font-semibold">KES 0</h2>
        </div>
      </div>
    </div>
  );
}