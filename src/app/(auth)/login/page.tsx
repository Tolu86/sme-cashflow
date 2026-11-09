"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider } from "firebase/auth";
import { signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Eye, EyeOff, Sparkles, TrendingUp, Wallet } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo =
  searchParams.get("redirect") || "/dashboard";
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
      router.replace(redirectTo);
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
      router.replace(redirectTo);
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
  console.log("PASSWORD RESET EMAIL SENT:", resetEmail);
  setResetSent(true);


    } catch (err) {
       console.error("PASSWORD RESET ERROR:", err);
      setError(getAuthError(err));
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="relative isolate flex min-h-[100dvh] w-full flex-1 items-center overflow-hidden bg-[#0e2130] px-4 py-10 text-white sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute -right-32 -top-56 -z-10 h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-80 -left-52 -z-10 h-[650px] w-[650px] rounded-full bg-sky-500/[0.07] blur-[110px]" />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)] lg:gap-20">
        <section className="hidden max-w-lg lg:block">
          <Link href="/" className="inline-flex items-center gap-3 text-white">
            <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
              <img src="/icon.png" alt="" width={48} height={48} className="h-full w-full object-contain" />
            </span>
            <span className="text-lg font-bold tracking-tight">Cashflow Copilot</span>
          </Link>

          <div className="mt-20">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-300">
              <Sparkles size={15} /> Your financial workspace
            </span>
            <h2 className="mt-7 text-5xl font-semibold leading-[1.1] tracking-tight">
              Your numbers.
              <span className="mt-1 block text-[#65f0b0]">Your next move.</span>
            </h2>
            <p className="mt-6 max-w-md text-base leading-8 text-slate-300">
              Keep your accounts, transactions, and cash forecasts connected in one organized business workspace.
            </p>
          </div>

          <div className="mt-12 grid gap-3">
            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                <Wallet size={22} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Track what matters</p>
                <p className="mt-1 text-xs text-slate-400">Know where your business cash is moving.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                <TrendingUp size={22} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Plan with confidence</p>
                <p className="mt-1 text-xs text-slate-400">Review forecasts and explore financial insights.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[460px]">
          <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2.5 text-sm font-semibold text-white">
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white p-0.5">
                <img src="/icon.png" alt="" width={40} height={40} className="h-full w-full object-contain" />
              </span>
              Cashflow Copilot
            </Link>
            <Link href="/" className="text-xs font-medium text-emerald-300 hover:text-emerald-200">Home</Link>
          </div>

          <div className="rounded-[28px] border border-white/15 bg-[#172d3e] p-5 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.36)] sm:p-8">
            <div className="mb-7">
              <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00c076]" />
                {resetMode ? "Account recovery" : "Welcome back"}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {resetMode ? "Reset your password" : "Sign in to your workspace"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {resetMode ? "We'll send you a link to reset your password." : "Continue managing your business with clarity."}
              </p>
            </div>

            {resetMode ? (
              resetSent ? (
                <div className="space-y-5">
                  <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-slate-200">
                    If an account exists for <span className="font-semibold text-white">{resetEmail}</span>, we've sent a reset link to that address.
                  </p>
                  <Button variant="secondary" className="w-full" onClick={() => { setResetMode(false); setResetSent(false); setError(null); }}>
                    Back to sign in
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-5 [&_label]:!text-slate-200">
                  <Input
                    label="Email address"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    placeholder="you@company.com"
                    autoComplete="email"
                  />
                  {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
                  <Button type="submit" className="w-full" loading={resetLoading}>Send reset link</Button>
                  <button type="button" onClick={() => { setResetMode(false); setError(null); }} className="w-full text-center text-sm font-medium text-slate-300 hover:text-white">
                    Back to sign in
                  </button>
                </form>
              )
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-5 [&_label]:!text-slate-200">
                  <Input
                    label="Email address"
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
                        onClick={() => setShowPassword((value) => !value)}
                        className="text-slate-400 transition hover:text-slate-700"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                    required
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-slate-300">
                      <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-slate-400 accent-emerald-500" />
                      Remember me
                    </label>
                    <button type="button" onClick={() => { setResetMode(true); setError(null); }} className="text-xs font-semibold text-[#65f0b0] hover:underline">
                      Forgot password?
                    </button>
                  </div>
                  {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
                  <Button type="submit" className="w-full" loading={loading}>
                    Sign in <ArrowRight size={16} />
                  </Button>
                </form>

                <div className="my-6 flex items-center gap-3">
                  <span className="h-px flex-1 bg-white/10" />
                  <span className="text-xs text-slate-400">or continue with</span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                <Button variant="secondary" className="w-full" onClick={handleGoogle} loading={googleLoading}>
                  Continue with Google
                </Button>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-slate-300">
            New to Cashflow Copilot?{" "}
            <Link href="/signup" className="font-semibold text-[#65f0b0] hover:underline">Create an account</Link>
          </p>
          <p className="mt-8 text-center text-xs text-slate-500">
            <Link href="/" className="transition hover:text-slate-300">Back to home</Link>
          </p>
        </section>
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
