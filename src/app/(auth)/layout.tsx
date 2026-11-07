import type { Metadata } from "next";
export const metadata: Metadata = { title: "Account access", robots: { index: false, follow: false } };
export default function AuthMetadata({ children }: { children: React.ReactNode }) { return children; }
