import { AuthCard } from "@/components/auth-card";

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-6xl items-center justify-center px-4">
      <AuthCard mode="reset" />
    </main>
  );
}
