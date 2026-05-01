"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { CreateProjectForm } from "@/features/projects/components/CreateProjectForm";
import { CreateInvoiceForm } from "@/features/invoices/components/CreateInvoiceForm";

type ActivePanel = "project" | "invoice" | null;

type ClientActionPanelProps = {
  clientId: string;
};

export function ClientActionPanel({ clientId }: ClientActionPanelProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant={activePanel === "project" ? "primary" : "secondary"}
          onClick={() =>
            setActivePanel(activePanel === "project" ? null : "project")
          }
          className="gap-2"
        >
          {activePanel === "project" ? (
            <X className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {activePanel === "project" ? "Close Project Form" : "Create Project"}
        </Button>

        <Button
          type="button"
          variant={activePanel === "invoice" ? "primary" : "secondary"}
          onClick={() =>
            setActivePanel(activePanel === "invoice" ? null : "invoice")
          }
          className="gap-2"
        >
          {activePanel === "invoice" ? (
            <X className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {activePanel === "invoice" ? "Close Invoice Form" : "Create Invoice"}
        </Button>
      </div>

      {activePanel === "project" && (
        <CreateProjectForm clientId={clientId} forceOpen />
      )}

      {activePanel === "invoice" && (
        <CreateInvoiceForm clientId={clientId} forceOpen />
      )}
    </section>
  );
}