import Link from "next/link";
import { Receipt, Users, BriefcaseBusiness, CalendarDays, AlertTriangle } from "lucide-react";
import { InvoiceFilters } from "@/features/invoices/components/InvoiceFilters";

import { getInvoices } from "@/server/services/invoices.service";
import { PageHeader } from "@/components/ui/shared/PageHeader";
import { EmptyState } from "@/components/ui/shared/EmptyState";
import { InvoiceStatusSelect } from "@/features/invoices/components/InvoiceStatusSelect";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

type InvoicesPageProps = {
  searchParams: Promise<{
    query?: string;
    status?: string;
    filter?: string;
  }>;
};

function getInvoiceStatusVariant(status: string) {
  if (status === "PAID") return "success";
  if (status === "OVERDUE") return "danger";
  if (status === "SENT") return "info";
  if (status === "DRAFT") return "muted";
  return "warning";
}

function isInvoiceOverdue(invoice: {
  dueDate: Date | null;
  status: string;
}) {
  if (!invoice.dueDate) return false;
  if (invoice.status === "PAID" || invoice.status === "CANCELLED") return false;

  const today = new Date();
  const due = new Date(invoice.dueDate);

  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  return due < today || invoice.status === "OVERDUE";
}

export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  const params = await searchParams;

  const status =
    params.status === "DRAFT" ||
    params.status === "SENT" ||
    params.status === "PAID" ||
    params.status === "OVERDUE" ||
    params.status === "CANCELLED"
      ? params.status
      : "ALL";

  const filter =
    params.filter === "outstanding" || params.filter === "overdue"
      ? params.filter
      : "all";

  const invoices = await getInvoices({
    query: params.query,
    status,
    filter,
  });

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
      <InvoiceFilters />

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
            {invoices.map((invoice) => {
              const overdue = isInvoiceOverdue(invoice);

              return (
                <TableRow key={invoice.id} className={overdue ? "bg-red-500/5" : ""}>
                  <TableCell className="font-medium text-core-text">
                    <div className="flex items-center gap-2">
                      {overdue && <AlertTriangle className="h-4 w-4 text-red-300" />}
                      {invoice.invoiceNo}
                    </div>
                  </TableCell>

                  {/* keep the other cells */}

                  <TableCell>
                    <div
                      className={
                        overdue
                          ? "inline-flex items-center gap-2 text-red-300"
                          : "inline-flex items-center gap-2"
                      }
                    >
                      <CalendarDays className="h-4 w-4 text-core-muted" />
                      {invoice.dueDate
                        ? new Date(invoice.dueDate).toLocaleDateString()
                        : "—"}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </main>
  );
}