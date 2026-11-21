"use client";
import { CreationForm } from "@/features/creation/CreationForm";
export function ClientForm({ initialOpen = false }: { initialOpen?: boolean }) { return <CreationForm kind="client" initialOpen={initialOpen} />; }
