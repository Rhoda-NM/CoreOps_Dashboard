"use client";
import { CreationForm } from "@/features/creation/CreationForm";
export function CreateTaskForm({ projectId, initialOpen = false }: { clientId?: string; projectId?: string; projectName?: string; initialOpen?: boolean }) { return <CreationForm kind="task" projectId={projectId} initialOpen={initialOpen} />; }
