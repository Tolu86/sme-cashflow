"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <Sparkles size={24} />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Welcome back</h1>
          <p className="mt-1 text-sm text-zinc-500">Sign in to your cash flow workspace</p>
        </div>

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
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="current-password"
            />
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
    const code = (err as { code?: string }).code;
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/invalid-email":
        return "Invalid email or password.";
      case "auth/user-not-found":
        return "No account found with that email.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again later.";
      case "auth/popup-closed-by-user":
        return "Sign-in popup closed. Try again.";
      default:
        return err.message.replace("Firebase: Error (auth/", "").replace(")", ".");
    }
  }
  return "Something went wrong. Please try again.";
}