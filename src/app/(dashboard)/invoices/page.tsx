import Link from "next/link";
import { Receipt, Users, BriefcaseBusiness, CalendarDays } from "lucide-react";

import { getInvoices } from "@/server/services/invoices.service";
import { PageHeader } from "@/components/ui/shared/PageHeader";
import { EmptyState } from "@/components/ui/shared/EmptyState";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

function getInvoiceStatusVariant(status: string) {
  if (status === "PAID") return "success";
  if (status === "OVERDUE") return "danger";
  if (status === "SENT") return "info";
  if (status === "DRAFT") return "muted";
  return "warning";
}

export default async function InvoicesPage() {
  const invoices = await getInvoices();

  const totalPaid = invoices
    .filter((invoice) => invoice.status === "PAID")
    .reduce((sum, invoice) => sum + Number(invoice.amount), 0);

  const totalOutstanding = invoices
    .filter((invoice) => invoice.status !== "PAID")
    .reduce((sum, invoice) => sum + Number(invoice.amount), 0);

  return (
    <main className="space-y-8">
      <PageHeader
        title="Invoices"
        description="Track billing, unpaid invoices, and agency revenue."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-core-border bg-core-card p-5">
          <p className="text-sm text-core-text-secondary">Total Invoices</p>
          <p className="mt-2 text-3xl font-semibold text-core-text">
            {invoices.length}
          </p>
        </div>

        <div className="rounded-xl border border-core-border bg-core-card p-5">
          <p className="text-sm text-core-text-secondary">Paid Revenue</p>
          <p className="mt-2 text-3xl font-semibold text-core-text">
            KES {totalPaid.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-core-border bg-core-card p-5">
          <p className="text-sm text-core-text-secondary">Outstanding</p>
          <p className="mt-2 text-3xl font-semibold text-core-text">
            KES {totalOutstanding.toLocaleString()}
          </p>
        </div>
      </section>

      {invoices.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-6 w-6" />}
          title="No invoices yet"
          description="Invoices created inside client profiles will appear here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium text-core-text">
                  {invoice.invoiceNo}
                </TableCell>

                <TableCell>
                  <Link
                    href={`/clients/${invoice.client.id}`}
                    className="inline-flex items-center gap-2 transition hover:text-indigo-300"
                  >
                    <Users className="h-4 w-4 text-core-muted" />
                    {invoice.client.name}
                  </Link>
                </TableCell>

                <TableCell>
                  {invoice.project ? (
                    <Link
                      href={`/projects/${invoice.project.id}`}
                      className="inline-flex items-center gap-2 transition hover:text-indigo-300"
                    >
                      <BriefcaseBusiness className="h-4 w-4 text-core-muted" />
                      {invoice.project.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>

                <TableCell>KES {Number(invoice.amount).toLocaleString()}</TableCell>

                <TableCell>
                  <Badge variant={getInvoiceStatusVariant(invoice.status)}>
                    {invoice.status}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-core-muted" />
                    {invoice.dueDate
                      ? new Date(invoice.dueDate).toLocaleDateString()
                      : "—"}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  );
}