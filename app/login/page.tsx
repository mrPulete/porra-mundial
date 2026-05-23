import Link from "next/link";
import { AuthCard } from "@/components/auth-card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-4 py-8">
      {/* Banner */}
      <div className="w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://www.eluniverso.com/resizer/v2/XBJFBLNY5FG5LOQ6OP5RL57LN4.jpg?auth=8245ff90834e2f56886805b67c62f6a76e8433fd35d176c6d5a79363e2ac5391&width=1011&height=670&quality=75&smart=true"
          alt="Mundial 2026"
          className="h-56 w-full object-cover sm:h-72"
        />
      </div>

      {/* Form */}
      <div className="w-full max-w-md space-y-3">
        <AuthCard mode="login" />
        <div className="flex justify-center gap-6 text-sm">
          <Link href="/register" className="font-semibold text-emerald-400 hover:text-emerald-300">
            Crear cuenta
          </Link>
          <Link href="/reset-password" className="text-neutral-400 hover:text-neutral-300">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>
    </main>
  );
}
