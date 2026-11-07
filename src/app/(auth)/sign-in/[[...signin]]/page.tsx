import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";
export default function SignInPage() {
  return <AuthShell><SignIn path="/sign-in" routing="path" fallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/onboarding" signUpUrl="/sign-up" appearance={{ variables: { colorPrimary: "#6366F1" } }} /></AuthShell>;
}
