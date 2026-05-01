import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/ui/shared/PageHeader";
import { EmptyState } from "@/components/ui/shared/EmptyState";

export default function InvoicesPage() {
  return (
    <main className="space-y-8">
      <PageHeader
        title="Invoices"
        description="Track billing, unpaid invoices, and agency revenue."
      />

      <EmptyState
        icon={<Receipt className="h-6 w-6" />}
        title="Invoices overview coming soon"
        description="This page will show all invoices across your clients and projects."
      />
    </main>
  );
}