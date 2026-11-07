import type { Metadata } from "next";
export const metadata: Metadata = { title: "Private administration", robots: { index: false, follow: false } };
export default function PlatformMetadata({ children }: { children: React.ReactNode }) { return children; }
