import { requireCentralHost } from "@/server/routing/request-context";
import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function PrivateMetadata({ children }: { children: React.ReactNode }) { await requireCentralHost(); return children; }
