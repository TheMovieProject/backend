"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import MoviesPosterWall from "@/app/components/MoviePosterWall";

function passwordInfo(password) {
  const checks = {
    length: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;

  return {
    valid: Object.values(checks).every(Boolean),
    score,
  };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const email = (searchParams?.get("email") ?? "").trim().toLowerCase();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canReset = useMemo(() => {
    const info = passwordInfo(password);
    return Boolean(token && email && info.valid && password === confirmPassword);
  }, [token, email, password, confirmPassword]);

  const strengthBar = useMemo(() => {
    const score = passwordInfo(password).score;
    if (score <= 1) return "bg-red-500 w-1/5";
    if (score === 2) return "bg-orange-500 w-2/5";
    if (score === 3) return "bg-yellow-500 w-3/5";
    if (score === 4) return "bg-green-500 w-4/5";
    return "bg-emerald-500 w-full";
  }, [password]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canReset) {
      toast.error("Please enter a valid strong password.");
      return;
    }

    try {
      setSubmitting(true);
      await axios.post("/api/auth/reset-password", {
        email,
        token,
        password,
      });
      toast.success("Password reset successful.");
      router.replace(`/login?reset=1&email=${encodeURIComponent(email)}`);
    } catch (error) {
      const message =
        error?.response?.data?.error || "Unable to reset password.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="pt-20 min-h-screen relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#dbb304] via-[#a99801] to-yellow-600 text-white">
        <MoviesPosterWall />
        <div className="min-h-screen flex items-center justify-center px-4 relative z-20">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_10px_50px_rgba(0,0,0,.7)] text-center">
            <h2 className="text-xl font-bold">Invalid reset link</h2>
            <p className="text-sm text-white/70 mt-2">
              Request a new password reset link and try again.
            </p>
            <Link href="/forgot-password" className="inline-block mt-4 text-white hover:underline">
              Request new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#dbb304] via-[#a99801] to-yellow-600 text-white">
      <MoviesPosterWall />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_260px_at_85%_-10%,rgba(255,200,100,.25),transparent),radial-gradient(600px_260px_at_0%_110%,rgba(70,120,255,.25),transparent)] z-10" />

      <div className="min-h-screen flex items-center justify-center px-4 relative z-20">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_10px_50px_rgba(0,0,0,.7)]">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Reset password</h2>
            <p className="text-sm text-white/70 mt-1">{email}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white/80 mb-1"
              >
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                placeholder="********"
                autoComplete="new-password"
                required
              />
              <div className="mt-2 h-2 w-full rounded-full bg-white/10">
                <div className={`h-2 rounded-full transition-all ${strengthBar}`} />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-white/80 mb-1"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                placeholder="********"
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={!canReset || submitting}
              className={`w-full rounded-xl py-2.5 text-sm font-semibold transition ${
                canReset && !submitting
                  ? "bg-white text-black hover:bg-white/90"
                  : "bg-white/30 text-white/60 cursor-not-allowed"
              }`}
            >
              {submitting ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
