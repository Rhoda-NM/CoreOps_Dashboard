"use client";
import { CreateTaskForm } from "./CreateTaskForm";
export function CreateTaskPanel({ clientId, projectId }: { clientId: string; projectId: string }) {
  return <CreateTaskForm clientId={clientId} projectId={projectId} />;
}
