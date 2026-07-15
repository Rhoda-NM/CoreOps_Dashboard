import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B101D] px-6">
      <SignUp
        fallbackRedirectUrl="/onboarding"
        signInUrl="/sign-in"
      />
    </main>
  );
}