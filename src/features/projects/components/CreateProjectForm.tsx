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
};

export function CreateProjectForm({ clientId }: CreateProjectFormProps) {
  const createProjectForClient = createProjectAction.bind(null, clientId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Project</CardTitle>
        <CardDescription>
          Add a new project under this client workspace.
        </CardDescription>
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

          <div className="flex justify-end border-t border-core-border pt-5">
            <Button type="submit">Create Project</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}