"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { createProjectAction } from "../actions/create-project";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

type CreateProjectFormProps = {
  clientId: string;
  forceOpen?: boolean;
};

export function CreateProjectForm({
  clientId,
  forceOpen = false,
}: CreateProjectFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  const createProjectForClient = createProjectAction.bind(null, clientId);

  const open = forceOpen || isOpen;

  if (!open) {
    return (
      <Button type="button" onClick={() => setIsOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Create Project
      </Button>
    );
  }

  return (
    <Card className="border-core-primary/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Create Project</CardTitle>
            <CardDescription>
              Add a new project under this client workspace.
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
        <form action={createProjectForClient} className="grid gap-5">
          <Input
            id="name"
            name="name"
            label="Project Name"
            placeholder="Website Redesign"
            required
          />

          <Input
            id="description"
            name="description"
            label="Description"
            placeholder="Short description of the project"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="deadline"
              name="deadline"
              type="date"
              label="Deadline"
            />

            <Input
              id="budget"
              name="budget"
              type="number"
              label="Budget"
              placeholder="50000"
              min="0"
            />
          </div>

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

            <Button type="submit">Save Project</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

{/*"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { createProjectAction } from "../actions/create-project";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

type CreateProjectFormProps = {
  clientId: string;
  forceOpen?: boolean;
};

export function CreateProjectForm({ clientId, forceOpen }: CreateProjectFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const createProjectForClient = createProjectAction.bind(null, clientId);

  const open = forceOpen || isOpen;

  if (!isOpen) {
    return (
      <Button type="button" onClick={() => setIsOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Create Project
      </Button>
    );
  }

  return (
    <Card className="border-core-primary/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Create Project</CardTitle>
            <CardDescription>
              Add a new project under this client workspace.
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
        <form action={createProjectForClient} className="grid gap-5">
          <Input
            id="name"
            name="name"
            label="Project Name"
            placeholder="Website Redesign"
            required
          />

          <Input
            id="description"
            name="description"
            label="Description"
            placeholder="Short description of the project"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="deadline"
              name="deadline"
              type="date"
              label="Deadline"
            />

            <Input
              id="budget"
              name="budget"
              type="number"
              label="Budget"
              placeholder="50000"
              min="0"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-core-border pt-5">
            {/*<Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>*
            {!forceOpen && (
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsOpen(false)}
                >
                    Cancel
                </Button>
            )}

            <Button type="submit">Save Project</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}*/}