"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

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
        const remaining = remainingAttempts !== null ? remainingAttempts - 1 : null;
        setRemainingAttempts(remaining);

        if (remaining !== null && remaining <= 2 && remaining > 0) {
          setError(
            `Invalid email or password. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining before lockout.`
          );
        } else if (remaining !== null && remaining <= 0) {
          setError(
            "Too many failed attempts. Your account is temporarily locked for 15 minutes."
          );
          setLocked(true);
          setLockMinutes(15);
        } else {
          setError("Invalid email or password");
        }
      }
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        {/* Logo / App Name */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-600 mb-4">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Discipulado</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@discipulado.app"
                required
                disabled={locked}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-400 disabled:opacity-50 disabled:bg-gray-50"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={locked}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-400 disabled:opacity-50 disabled:bg-gray-50"
              />
            </div>

            {error && (
              <div
                className={`text-sm rounded-lg px-3 py-2 ${
                  locked
                    ? "text-amber-700 bg-amber-50 border border-amber-200"
                    : "text-red-600 bg-red-50"
                }`}
              >
                {locked && (
                  <div className="flex items-center gap-2">
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
                          Try again in ~{lockMinutes} minute
                          {lockMinutes !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {!locked && error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || locked}
              className="w-full py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Signing in..."
                : locked
                ? "Account locked"
                : "Sign in"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Contact your admin to get your credentials.
        </p>
      </div>
    </div>
  );
}