"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

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
  forceOpen?: boolean;
};

export function CreateInvoiceForm({
  clientId,
  forceOpen = false,
}: CreateInvoiceFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  const createInvoiceForClient = createInvoiceAction.bind(null, clientId);

  const open = forceOpen || isOpen;

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Create Invoice
      </Button>
    );
  }

  return (
    <Card className="border-core-primary/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Create Invoice</CardTitle>
            <CardDescription>
              Add a new invoice for this client and track payment status.
            </CardDescription>
          </div>

          {!forceOpen && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 text-core-text-secondary transition hover:bg-core-surface hover:text-core-text"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
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

          <div className="flex justify-end gap-3 border-t border-core-border pt-5">
            {!forceOpen && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
            )}

            <Button type="submit">Save Invoice</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

{/*"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

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
  forceOpen?: boolean;
};

export function CreateInvoiceForm({ 
    clientId, forceOpen }: CreateInvoiceFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const createInvoiceForClient = createInvoiceAction.bind(null, clientId);

  const open = forceOpen || isOpen;

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="secondary"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Create Invoice
      </Button>
    );
  }

  return (
    <Card className="border-core-primary/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Create Invoice</CardTitle>
            <CardDescription>
              Add a new invoice for this client and track payment status.
            </CardDescription>
          </div>

          {/*<button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-2 text-core-text-secondary transition hover:bg-core-surface hover:text-core-text"
          >
            <X className="h-4 w-4" />
          </button>*
           {!forceOpen && (
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg p-2 text-core-text-secondary transition hover:bg-core-surface hover:text-core-text"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
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

          <div className="flex justify-end gap-3 border-t border-core-border pt-5">
            
           
            {!forceOpen && (
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsOpen(false)}
                >
                    Cancel
                </Button>
            )}

            <Button type="submit">Save Invoice</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}*/}