"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register" | "reset";

export function AuthCard({ mode }: { mode: Mode }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "login") {
        const res = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (res?.error) {
          setMessage("Credenciales invalidas");
        } else {
          router.push("/");
          router.refresh();
        }
      }

      if (mode === "register") {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          setMessage(data.error || "No se pudo crear la cuenta");
        } else {
          const loginRes = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });

          if (loginRes?.error) {
            setMessage("Cuenta creada, pero no se pudo iniciar sesión automáticamente. Inicia sesión manualmente.");
            router.push("/login");
          } else {
            router.push("/predictions");
            router.refresh();
          }
        }
      }

      if (mode === "reset") {
        const res = await fetch("/api/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();
        setMessage(data.message || "Si existe tu email, te hemos escrito.");
      }
    } catch {
      setMessage("Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-3xl border border-black/10 bg-white/80 p-6 shadow-xl dark:border-white/15 dark:bg-neutral-900/70">
      <h1 className="text-2xl font-black">
        {mode === "login" ? "Iniciar sesión" : mode === "register" ? "Crear cuenta" : "Recuperar contraseña"}
      </h1>
      {mode === "register" && (
        <input
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border px-3 py-2"
          required
        />
      )}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl border px-3 py-2"
        required
      />
      {mode !== "reset" && (
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border px-3 py-2"
          minLength={6}
          required
        />
      )}
      <button
        disabled={loading}
        className="w-full rounded-xl bg-emerald-600 px-3 py-2 font-bold text-white disabled:opacity-60"
      >
        {loading ? "Procesando..." : "Continuar"}
      </button>
      {message && <p className="text-sm text-amber-600 dark:text-amber-400">{message}</p>}
    </form>
  );
}
