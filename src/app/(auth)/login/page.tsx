"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider } from "firebase/auth";
import { signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth!, email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(getAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithPopup(auth!, new GoogleAuthProvider());
      router.replace("/dashboard");
    } catch (err) {
      setError(getAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth!, resetEmail);
      setResetSent(true);
    } catch (err) {
      setError(getAuthError(err));
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <svg viewBox="0 0 48 48" className="h-8 w-8" aria-hidden="true">
              <text x="24" y="29" textAnchor="middle" fontSize="27" fontWeight="700" fill="#fff" fontFamily="ui-sans-serif, system-ui">C</text>
          </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Welcome back</h1>
          <p className="mt-1 text-sm text-zinc-500">Sign in to your cash flow workspace</p>
        </div>

        {resetMode ? (
          <Card>
            <CardHeader>
              <CardTitle>Reset your password</CardTitle>
            </CardHeader>
            {resetSent ? (
              <div className="space-y-4">
                <p className="text-sm text-zinc-500">
                  If an account exists for <span className="font-medium text-zinc-900 dark:text-zinc-100">{resetEmail}</span>,
                  we've sent a password reset link to that email.
                </p>
                <Button variant="outline" className="w-full" onClick={() => setResetMode(false)}>
                  Back to sign in
                </Button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  autoComplete="email"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full" loading={resetLoading}>
                  Send reset link
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setResetMode(false);
                    setError(null);
                  }}
                  className="w-full text-center text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Back to sign in
                </button>
              </form>
            )}
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                autoComplete="email"
              />
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
                required
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <div className="flex items-center justify-between">
                <label className="flex select-none items-center gap-2 text-sm text-zinc-500">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => setResetMode(true)}
                  className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  Forgot password?
                </button>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" loading={loading}>
                Sign in
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              <span className="text-xs text-zinc-400">or</span>
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            </div>

            <Button variant="secondary" className="w-full" onClick={handleGoogle} loading={googleLoading}>
              Continue with Google
            </Button>
          </Card>
        )}

        <p className="mt-6 text-center text-sm text-zinc-500">
          New here?{" "}
          <Link href="/signup" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

function getAuthError(err: unknown): string {
  if (err instanceof Error) {
    const errWithCode = err as Error & { code?: string };
    switch (errWithCode.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return "Invalid email or password.";
      case "auth/invalid-email":
        return "Invalid email address.";
      case "auth/user-not-found":
        return "No account found with that email.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again later.";
      case "auth/popup-closed-by-user":
        return "Sign-in popup closed. Try again.";
      default:
        return "Unable to sign in. Check your credentials and try again.";
    }
  }
  return "Something went wrong. Please try again.";
}
