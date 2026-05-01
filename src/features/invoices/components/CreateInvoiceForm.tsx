import { createInvoiceAction } from "../actions/create-invoice";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

type CreateInvoiceFormProps = {
  clientId: string;
};

export function CreateInvoiceForm({ clientId }: CreateInvoiceFormProps) {
  const createInvoiceForClient = createInvoiceAction.bind(null, clientId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Invoice</CardTitle>
        <CardDescription>
          Add a new invoice for this client and track payment status.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={createInvoiceForClient} className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="invoiceNo"
              name="invoiceNo"
              label="Invoice Number"
              placeholder="INV-005"
              required
            />

            <Input
              id="amount"
              name="amount"
              type="number"
              label="Amount"
              placeholder="50000"
              min="0"
              required
            />
          </div>

          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            label="Due Date"
          />

          <div className="flex justify-end border-t border-core-border pt-5">
            <Button type="submit">Create Invoice</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}