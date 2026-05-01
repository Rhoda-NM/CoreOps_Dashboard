"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { createClientAction } from "../actions/create-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

export function ClientForm() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <div className="flex justify-end">
        <Button type="button" onClick={() => setIsOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-core-primary/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Add New Client</CardTitle>
            <CardDescription>
              Create a new client to start managing projects, invoices, and
              agency operations.
            </CardDescription>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-2 text-core-text-secondary transition hover:bg-core-surface hover:text-core-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>

      <CardContent>
        <form action={createClientAction} className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="name"
              name="name"
              label="Client Name"
              placeholder="Coastal Stays"
              required
            />

            <Input
              id="company"
              name="company"
              label="Company"
              placeholder="Coastal Stays Ltd"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="email"
              name="email"
              type="email"
              label="Email"
              placeholder="client@example.com"
            />

            <Input
              id="phone"
              name="phone"
              label="Phone"
              placeholder="+254..."
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-core-border pt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>

            <Button type="submit">Save Client</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}