// src/app/layout.tsx

import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { brand } from "@/config/brand";
import { getAuthConfiguration } from "@/config/auth";
import { hostMetadata } from "@/server/routing/metadata";
import { centralUrl, marketingUrl } from "@/lib/routing/host-policy";
import { NavigationProvider } from "@/components/workspaces/NavigationProvider";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { origin, index } = await hostMetadata();
  return {
  title: { default: `${brand.name} — ${brand.promise}`, template: `%s | ${brand.name}` },
  description: brand.description,
  applicationName: brand.name,
  metadataBase: new URL(origin),
  robots: { index, follow: index },
  openGraph: { type: "website", siteName: brand.name, title: `${brand.name} — ${brand.promise}`, description: brand.description, locale: "en_KE" },
  twitter: { card: "summary_large_image", title: brand.name, description: brand.description },
  icons: { icon: "/icon.svg", apple: "/apple-icon" },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { policy } = await hostMetadata();
  return (
    <html lang="en">
      <body><ClerkProvider allowedRedirectOrigins={[policy.appOrigin]} telemetry={false} supportEmail={getAuthConfiguration().supportEmail} appearance={{ variables: { colorPrimary: "#147D70", colorBackground: "#173434", colorForeground: "#F4F8F5", colorInput: "#102C2C", colorInputForeground: "#F4F8F5", colorMutedForeground: "#B1C7C0", colorBorder: "#345550", colorPrimaryForeground: "#FFFFFF", borderRadius: "0.75rem", fontFamily: "Inter, system-ui, sans-serif" }, options: { helpPageUrl: marketingUrl(policy, "/auth-help"), termsPageUrl: marketingUrl(policy, "/terms"), privacyPageUrl: marketingUrl(policy, "/privacy") } }} afterSignOutUrl={centralUrl(policy, "/sign-in")} signInUrl={centralUrl(policy, "/sign-in")} signUpUrl={centralUrl(policy, "/sign-up")} signInFallbackRedirectUrl={centralUrl(policy, "/dashboard")} signUpFallbackRedirectUrl={centralUrl(policy, "/onboarding")}><NavigationProvider policy={policy}>{children}</NavigationProvider></ClerkProvider></body>
    </html>
  );
}
