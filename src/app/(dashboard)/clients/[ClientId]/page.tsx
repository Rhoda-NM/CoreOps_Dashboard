import Link from "next/link";
import { notFound} from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, Mail, Phone, Receipt } from "lucide-react";

import { CreateProjectForm } from "@/features/projects/components/CreateProjectForm";
import { getClientById } from "@/server/services/clients.service";
import { PageHeader } from "@/components/ui/shared/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/shared/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";

type ClientDetailsPageProps = {
    params: {
        clientId: string;
    };
};

export default async function ClientDetailsPage({ 
    params,
 }: ClientDetailsPageProps) {
    const client = await getClientById(params.clientId);

    if (!client) {
        notFound();
    }
    
    return (
        <main className="space-y-8">
            <Link
                href="/clients"
                className="inline-flex items-center gap-2 text-sm text-core-text-secondary transition hover:text-core-text"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Clients
            </Link>

            <PageHeader
                title={client.name}
                description={
                    client.company
                        ? `${client.company} client workspace overview.`
                        : "Client workspace overview."
                    }
                action={<Button variant="secondary">Edit Client</Button>}
            />

            <section className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Client Profile</CardTitle>
                    </CardHeader>

                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-xl border border-core-border bg-core-surface p-4">
                                <p className="text-xs uppercase tracking-wide text-core-muted">
                                Company
                                </p>
                                <p className="mt-1 text-sm font-medium text-core-text">
                                {client.company || "Not provided"}
                                </p>
                            </div>

                            <div className="rounded-xl border border-core-border bg-core-surface p-4">
                                <p className="text-xs uppercase tracking-wide text-core-muted">
                                Status
                                </p>
                                <div className="mt-2">
                                <Badge variant="success">{client.status}</Badge>
                                </div>
                            </div>
                            <div className="rounded-xl border border-core-border bg-core-surface p-4">
                                <div className="flex items-center gap-2 text-core-muted">
                                <Mail className="h-4 w-4" />
                                <p className="text-xs uppercase tracking-wide">Email</p>
                                </div>
                                <p className="mt-1 text-sm font-medium text-core-text">
                                {client.email || "Not provided"}
                                </p>
                            </div>

                            <div className="rounded-xl border border-core-border bg-core-surface p-4">
                                <div className="flex items-center gap-2 text-core-muted">
                                <Phone className="h-4 w-4" />
                                <p className="text-xs uppercase tracking-wide">Phone</p>
                                </div>
                                <p className="mt-1 text-sm font-medium text-core-text">
                                {client.phone || "Not provided"}
                                </p>
                            </div>
                            </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Client Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-xl border border-core-border bg-core-surface p-4">
                        <p className="text-sm text-core-text-secondary">Projects</p>
                        <p className="mt-2 text-3xl font-semibold text-core-text">
                            {client.projects.length}
                        </p>
                        </div>

                        <div className="rounded-xl border border-core-border bg-core-surface p-4">
                        <p className="text-sm text-core-text-secondary">Invoices</p>
                        <p className="mt-2 text-3xl font-semibold text-core-text">
                            {client.invoices.length}
                        </p>
                        </div>
                    </CardContent>
                </Card>
            </section>
            <section>
                <CreateProjectForm clientId={client.id} />
            </section>
            
            <section className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Projects</CardTitle>
                    </CardHeader>
                    
                    <CardContent>
                        {client.projects.length === 0 ? (
                            <EmptyState
                                title="No projects yet"
                                icon={<BriefcaseBusiness className="h-6 w-6" />}
                                description="Create a project for this client to start tracking work"
                            />
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {client.projects.map((project) => (
                                        <TableRow key={project.id}>
                                        <TableCell className="font-medium text-core-text">
                                            {project.name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="info">{project.status}</Badge>
                                        </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Invoices</CardTitle>
                    </CardHeader>

                    <CardContent>
                        {client.invoices.length === 0 ? (
                            <EmptyState
                                title="No invoices yet"
                                icon={<Receipt className="h-6 w-6" />}
                                description="Invoices for this client will appear here once created"
                            />
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Invoice </TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                
                                <TableBody>
                                    {client.invoices.map((invoice) => (
                                        <TableRow key={invoice.id}>
                                            <TableCell className="font-medium text-core-text">
                                                {invoice.invoiceNo}
                                            </TableCell>
                                            <TableCell>
                                                ${invoice.amount.toString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="info">{invoice.status}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}