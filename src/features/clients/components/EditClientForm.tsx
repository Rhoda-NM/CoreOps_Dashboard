import { updateClientAction } from "../actions/update-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

type EditClientFormProps = {
  client: {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
  };
};

export function EditClientForm({ client }: EditClientFormProps) {
  const updateClientWithId = updateClientAction.bind(null, client.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Client</CardTitle>
        <CardDescription>
          Update this client’s contact and company information.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={updateClientWithId} className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="name"
              name="name"
              label="Client Name"
              defaultValue={client.name}
              required
            />

            <Input
              id="company"
              name="company"
              label="Company"
              defaultValue={client.company || ""}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="email"
              name="email"
              type="email"
              label="Email"
              defaultValue={client.email || ""}
            />

            <Input
              id="phone"
              name="phone"
              label="Phone"
              defaultValue={client.phone || ""}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-core-border pt-5">
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}