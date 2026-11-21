"use client";
import { CreationForm } from "@/features/creation/CreationForm";
export function CreateProjectForm({ clientId, forceOpen = false, initialOpen = false }: { clientId?: string; forceOpen?: boolean; initialOpen?: boolean }) { return <CreationForm kind="project" clientId={clientId} initialOpen={forceOpen || initialOpen} />; }
