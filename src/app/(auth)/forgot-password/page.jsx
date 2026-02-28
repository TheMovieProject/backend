"use client";

import React, { useState } from "react";
import Link from "next/link";
import axios from "axios";
import toast from "react-hot-toast";
import MoviesPosterWall from "@/app/components/MoviePosterWall";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      toast.error("Email is required.");
      return;
    }

    try {
      setSubmitting(true);
      await axios.post("/api/auth/forgot-password", { email: normalized });
      setSent(true);
      toast.success("If your account exists, reset instructions were sent.");
    } catch (error) {
      const msg = error?.response?.data?.error || "Unable to process your request.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-20 min-h-screen relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#dbb304] via-[#a99801] to-yellow-600 text-white">
      <MoviesPosterWall />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_260px_at_85%_-10%,rgba(255,200,100,.25),transparent),radial-gradient(600px_260px_at_0%_110%,rgba(70,120,255,.25),transparent)] z-10" />

      <div className="min-h-screen flex items-center justify-center px-4 relative z-20">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_10px_50px_rgba(0,0,0,.7)]">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Forgot password</h2>
            <p className="text-sm text-white/70 mt-1">
              Enter your email to receive a reset link
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white/80 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full rounded-xl py-2.5 text-sm font-semibold transition ${
                submitting
                  ? "bg-white/30 text-white/60 cursor-not-allowed"
                  : "bg-white text-black hover:bg-white/90"
              }`}
            >
              {submitting ? "Sending..." : "Send reset link"}
            </button>
          </form>

          {sent && (
            <p className="mt-4 text-xs text-white/70 text-center">
              If your account exists, check your inbox and spam folder.
            </p>
          )}

          <p className="mt-6 text-sm text-center text-white/70">
            Back to{" "}
            <Link href="/login" className="text-white hover:underline">
              login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
