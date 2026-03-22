"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockMinutes, setLockMinutes] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(
    null
  );

  // Countdown timer when locked out
  useEffect(() => {
    if (!locked || lockMinutes <= 0) return;
    const timer = setInterval(() => {
      setLockMinutes((prev) => {
        if (prev <= 1) {
          setLocked(false);
          setError("");
          return 0;
        }
        return prev - 1;
      });
    }, 60000);
    return () => clearInterval(timer);
  }, [locked, lockMinutes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Pre-check rate limit
    try {
      const rateCheck = await fetch("/api/auth/rate-check", {
        method: "POST",
      });

      if (rateCheck.status === 429) {
        const data = await rateCheck.json();
        setError(data.error);
        setLocked(true);
        setLockMinutes(Math.ceil((data.retryAfterMs || 0) / 60000));
        setLoading(false);
        return;
      }

      const rateData = await rateCheck.json();
      if (rateData.remainingAttempts !== undefined) {
        setRemainingAttempts(rateData.remainingAttempts);
      }
    } catch {
      // If rate check fails, proceed with login anyway
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      if (result.error.includes("Too many")) {
        setError(result.error);
        setLocked(true);
        setLockMinutes(15);
      } else {
        const remaining =
          remainingAttempts !== null ? remainingAttempts - 1 : null;
        setRemainingAttempts(remaining);

        if (remaining !== null && remaining <= 2 && remaining > 0) {
          setError(
            `Correo o contraseña incorrecta. ${remaining} intento${remaining !== 1 ? "s" : ""} antes del bloqueo.`
          );
        } else if (remaining !== null && remaining <= 0) {
          setError(
            "Demasiados intentos fallidos. Tu cuenta está bloqueada temporalmente por 15 minutos."
          );
          setLocked(true);
          setLockMinutes(15);
        } else {
          setError("Correo o contraseña incorrecta");
        }
      }
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Subtle background texture */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Decorative accent glow */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.06] dark:opacity-[0.08] blur-3xl"
        style={{ background: "oklch(0.586 0.253 17.585)" }}
      />
      <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-[0.04] dark:opacity-[0.06] blur-3xl"
        style={{ background: "oklch(0.645 0.246 16.439)" }}
      />

      <div className="w-full max-w-sm relative z-10 px-4">
        {/* Logo & App Name */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Image
              src="/logo.png"
              alt="Discipulado"
              width={80}
              height={80}
              className="dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.1)]"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Discipulado
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Inicia sesión en tu cuenta
          </p>
        </div>

        {/* Login Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-2xl p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@discipulado.app"
                required
                disabled={locked}
                className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-background text-foreground
                  focus:outline-none focus:ring-2 focus:border-transparent
                  placeholder:text-muted-foreground/50 disabled:opacity-50 disabled:bg-muted transition-shadow"
                style={{ "--tw-ring-color": "oklch(0.586 0.253 17.585 / 0.4)" } as React.CSSProperties}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={locked}
                className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-background text-foreground
                  focus:outline-none focus:ring-2 focus:border-transparent
                  placeholder:text-muted-foreground/50 disabled:opacity-50 disabled:bg-muted transition-shadow"
                style={{ "--tw-ring-color": "oklch(0.586 0.253 17.585 / 0.4)" } as React.CSSProperties}
              />
            </div>

            {/* Error / Lock message */}
            {error && (
              <div
                className={`text-sm rounded-xl px-3.5 py-2.5 ${
                  locked
                    ? "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                    : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                }`}
                style={!locked ? { color: "oklch(0.514 0.222 16.935)" } : undefined}
              >
                {locked ? (
                  <div className="flex items-center gap-2.5">
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                      />
                    </svg>
                    <div>
                      <p>{error}</p>
                      {lockMinutes > 0 && (
                        <p className="text-xs mt-0.5 opacity-70">
                          Intenta de nuevo en ~{lockMinutes} minuto
                          {lockMinutes !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  error
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || locked}
              className="w-full py-2.5 text-sm font-semibold text-white rounded-xl transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                hover:shadow-md hover:brightness-110 active:scale-[0.98]"
              style={{ background: "oklch(0.586 0.253 17.585)" }}
            >
              {loading
                ? "Iniciando sesión..."
                : locked
                ? "Cuenta bloqueada"
                : "Iniciar sesión"}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          Contacta a tu administrador para obtener tus credenciales.
        </p>
      </div>
    </div>
  );
}