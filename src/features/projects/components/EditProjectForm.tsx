import { updateProjectAction } from "../actions/update-project";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

type EditProjectFormProps = {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";
    deadline: Date | null;
    budget: unknown;
  };
};

function formatDateForInput(date: Date | null) {
  if (!date) return "";
  return date.toISOString().split("T")[0];
}

export function EditProjectForm({ project }: EditProjectFormProps) {
  const updateProjectWithId = updateProjectAction.bind(null, project.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Project</CardTitle>
        <CardDescription>
          Update project details, timeline, budget, and status.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={updateProjectWithId} className="grid gap-5">
          <Input
            id="name"
            name="name"
            label="Project Name"
            defaultValue={project.name}
            required
          />

          <Input
            id="description"
            name="description"
            label="Description"
            defaultValue={project.description || ""}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <label
                htmlFor="status"
                className="text-sm font-medium text-core-text"
              >
                Status
              </label>

              <select
                id="status"
                name="status"
                defaultValue={project.status}
                className="w-full rounded-lg border border-core-border bg-core-surface px-3 py-2 text-sm text-core-text outline-none transition focus:border-core-primary focus:ring-2 focus:ring-core-primary/30"
              >
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="PAUSED">Paused</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <Input
              id="deadline"
              name="deadline"
              type="date"
              label="Deadline"
              defaultValue={formatDateForInput(project.deadline)}
            />

            <Input
              id="budget"
              name="budget"
              type="number"
              label="Budget"
              defaultValue={project.budget ? project.budget.toString() : ""}
              min="0"
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