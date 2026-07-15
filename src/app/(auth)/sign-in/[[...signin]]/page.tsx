import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B101D] px-6">
      <SignIn
        fallbackRedirectUrl="/dashboard"
        signUpUrl="/sign-up"
      />
    </main>
  );
}