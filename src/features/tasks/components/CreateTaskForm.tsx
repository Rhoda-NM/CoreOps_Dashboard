import { createTaskAction } from "../actions/create-task";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

type CreateTaskFormProps = {
  clientId: string;
  projectId: string;
  projectName: string;
};

export function CreateTaskForm({
  clientId,
  projectId,
  projectName,
}: CreateTaskFormProps) {
  const createTaskForProject = createTaskAction.bind(null, clientId, projectId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Task</CardTitle>
        <CardDescription>
          Add a task under {projectName}.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={createTaskForProject} className="grid gap-5">
          <Input
            id={`title-${projectId}`}
            name="title"
            label="Task Title"
            placeholder="Design homepage section"
            required
          />

          <Input
            id={`description-${projectId}`}
            name="description"
            label="Description"
            placeholder="Short task description"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label
                htmlFor={`priority-${projectId}`}
                className="text-sm font-medium text-core-text"
              >
                Priority
              </label>

              <select
                id={`priority-${projectId}`}
                name="priority"
                defaultValue="MEDIUM"
                className="w-full rounded-lg border border-core-border bg-core-surface px-3 py-2 text-sm text-core-text outline-none transition focus:border-core-primary focus:ring-2 focus:ring-core-primary/30"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <Input
              id={`dueDate-${projectId}`}
              name="dueDate"
              type="date"
              label="Due Date"
            />
          </div>

          <div className="flex justify-end border-t border-core-border pt-5">
            <Button type="submit">Create Task</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}