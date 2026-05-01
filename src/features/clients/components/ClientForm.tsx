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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Client</CardTitle>
        <CardDescription>
          Create a new client to start managing projects and tasks.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={createClientAction} className="grid gap-5">
          <div className="grid gap-5">
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
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium text-core-text">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="client@example.com"
                className="rounded-lg border border-core-border bg-core-surface px-3 py-2 text-sm text-core-text placeholder:text-core-muted outline-none focus:border-core-primary focus:ring-2 focus:ring-core-primary/30"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="phone" className="text-sm font-medium text-core-text">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                placeholder="+254..."
                className="rounded-lg border border-core-border bg-core-surface px-3 py-2 text-sm text-core-text placeholder:text-core-muted outline-none focus:border-core-primary focus:ring-2 focus:ring-core-primary/30"
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-core-border pt-5">
            <Button type="submit">Add Client</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}