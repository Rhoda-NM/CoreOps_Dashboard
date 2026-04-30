import { getClients } from "@/server/services/clients.service";
import { ClientForm } from "@/features/clients/components/ClientForm";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Clients</h1>
        <p className="text-sm text-muted-foreground">
          Manage your agency clients and business relationships.
        </p>
      </div>

      <ClientForm />

      <div className="rounded-xl border">
        <div className="grid grid-cols-4 border-b p-4 font-medium">
          <span>Name</span>
          <span>Company</span>
          <span>Email</span>
          <span>Status</span>
        </div>

        {clients.map((client) => (
          <div key={client.id} className="grid grid-cols-4 border-b p-4 text-sm">
            <span>{client.name}</span>
            <span>{client.company || "—"}</span>
            <span>{client.email || "—"}</span>
            <span>{client.status}</span>
          </div>
        ))}
      </div>
    </main>
  );
}