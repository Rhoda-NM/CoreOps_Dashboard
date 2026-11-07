// src/app/layout.tsx

import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { getAuthConfiguration } from "@/config/auth";

import "./globals.css";

export const metadata: Metadata = {
  title: "CoreOps",
  description:
    "Manage your clients, projects, tasks, invoices, and agency operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><ClerkProvider telemetry={false} supportEmail={getAuthConfiguration().supportEmail} appearance={{ options: { helpPageUrl: "/auth-help", termsPageUrl: "/terms", privacyPageUrl: "/privacy" } }} signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/onboarding">{children}</ClerkProvider></body>
    </html>
  );
}