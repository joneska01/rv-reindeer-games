"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/shared/Button";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Login failed.");
        setPending(false);
        return;
      }
      router.push("/admin/setup");
      router.refresh();
    } catch {
      setError("Something went sideways. Try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-left">
        <span className="eyebrow">Host Password</span>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 rounded-card border border-gilt bg-forest-deep/60 px-4 font-body text-cream outline-none transition-colors placeholder:text-cream/30 focus:border-gilt-strong"
          placeholder="••••••••"
        />
      </label>

      {error && (
        <p className="rounded-card border border-cranberry/50 bg-cranberry/15 px-3 py-2 text-sm text-cream">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending || !password} className={buttonClass("gold", "md")}>
        {pending ? "Checking the list…" : "Enter the Host Panel"}
      </button>
    </form>
  );
}
