"use client";

import { useTransition } from "react";
import { Archive } from "lucide-react";
import { archiveClientAction } from "../actions/archive-client";
import { Button } from "@/components/ui/Button";

type ArchiveClientButtonProps = {
  clientId: string;
};

export function ArchiveClientButton({ clientId }: ArchiveClientButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleArchive() {
    const confirmed = window.confirm(
      "Archive this client? Their projects and invoices will remain saved, but the client will no longer count as active."
    );

    if (!confirmed) return;

    startTransition(() => {
      archiveClientAction(clientId);
    });
  }

  return (
    <Button
      type="button"
      variant="danger"
      onClick={handleArchive}
      disabled={isPending}
      className="gap-2"
    >
      <Archive className="h-4 w-4" />
      {isPending ? "Archiving..." : "Archive Client"}
    </Button>
  );
}