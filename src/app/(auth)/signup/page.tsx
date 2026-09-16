"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { defaultProfile } from "@/components/providers/auth-provider";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth!, email, password);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      await setDoc(doc(db!, "users", cred.user.uid), defaultProfile(cred.user.uid, email, name.trim() || undefined));
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
      const cred = await signInWithPopup(auth!, new GoogleAuthProvider());
      await setDoc(doc(db!, "users", cred.user.uid), defaultProfile(cred.user.uid, cred.user.email ?? "", cred.user.displayName ?? undefined), { merge: true });
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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Create your account</h1>
          <p className="mt-1 text-sm text-zinc-500">Start tracking your cash flow in minutes</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign up</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
            />
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
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>
              Create account
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
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
            Sign in
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
      case "auth/email-already-in-use":
        return "An account with that email already exists.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      case "auth/popup-closed-by-user":
        return "Sign-in popup closed. Try again.";
      default:
        return err.message.replace("Firebase: Error (auth/", "").replace(")", ".");
    }
  }
  return "Something went wrong. Please try again.";
}