import { getClients } from "@/server/services/clients.service";
import { ClientForm } from "@/features/clients/components/ClientForm";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { PageHeader } from "@/components/ui/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/shared/EmptyState";
import { Users } from "lucide-react";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <main className="space-y-10">
      <PageHeader
        title="Clients"
        description="Manage your agency clients and business relationships."
        action={<Button>Add Client</Button>}
      />

      <section>
        <ClientForm />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-core-text">Client Records</h2>

        {clients.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No clients yet"
            description="Add your first client to start managing your agency operations."
            action={<Button>Add Client</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium text-core-text">
                    {client.name}
                  </TableCell>
                  <TableCell>{client.company || "—"}</TableCell>
                  <TableCell>{client.email || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="success">{client.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </main>
  );
}