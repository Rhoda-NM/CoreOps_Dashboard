import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getClientById } from "@/server/services/clients.service";
import { PageHeader } from "@/components/ui/shared/PageHeader";
import { EditClientForm } from "@/features/clients/components/EditClientForm";

type EditClientPageProps = {
  params: Promise<{
    clientId: string;
  }>;
};

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { clientId } = await params;

  const client = await getClientById(clientId);

  if (!client) {
    notFound();
  }

  return (
    <main className="space-y-8">
      <Link
        href={`/clients/${client.id}`}
        className="inline-flex items-center gap-2 text-sm text-core-text-secondary transition hover:text-core-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to client
      </Link>

      <PageHeader
        title={`Edit ${client.name}`}
        description="Update client information used across projects and invoices."
      />

      <EditClientForm client={client} />
    </main>
  );
}