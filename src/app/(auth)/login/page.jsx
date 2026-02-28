"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { FaGoogle } from "react-icons/fa";
import MoviesPosterWall from "@/app/components/MoviePosterWall";

function normalizeRedirectPath(pathname) {
  if (!pathname || typeof pathname !== "string") return "/profile";
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return "/profile";
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) return "/profile";
  return pathname;
}

function loginErrorMessage(error) {
  if (typeof error !== "string") return "Invalid email or password.";
  const lower = error.toLowerCase();
  if (lower.includes("too many")) return error;
  if (lower.includes("verify your email")) return error;
  return "Invalid email or password.";
}

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const noticeShownRef = useRef(false);

  const redirectTarget = useMemo(
    () => normalizeRedirectPath(searchParams?.get("from")),
    [searchParams]
  );

  const prefillEmail = useMemo(() => {
    const raw = searchParams?.get("email") ?? "";
    return raw.trim().toLowerCase();
  }, [searchParams]);

  const signupHref = useMemo(() => {
    if (redirectTarget === "/profile") return "/signup";
    return `/signup?from=${encodeURIComponent(redirectTarget)}`;
  }, [redirectTarget]);

  useEffect(() => {
    if (prefillEmail) {
      setUser((prev) => ({
        ...prev,
        email: prev.email || prefillEmail,
      }));
    }
  }, [prefillEmail]);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(redirectTarget);
    }
  }, [status, router, redirectTarget]);

  useEffect(() => {
    if (noticeShownRef.current) return;

    const verified = searchParams?.get("verified");
    const verifySent = searchParams?.get("verify_sent");
    const reset = searchParams?.get("reset");

    if (verified === "1") {
      toast.success("Email verified. You can now log in.");
      noticeShownRef.current = true;
      return;
    }

    if (verified === "0") {
      toast.error("Verification link is invalid or expired.");
      noticeShownRef.current = true;
      return;
    }

    if (verifySent === "1") {
      toast.success("Check your email for a verification link.");
      noticeShownRef.current = true;
      return;
    }

    if (reset === "1") {
      toast.success("Password reset successful. Please log in.");
      noticeShownRef.current = true;
    }
  }, [searchParams]);

  const userLogin = async (e) => {
    e.preventDefault();

    const email = user.email.trim().toLowerCase();
    const password = user.password;

    if (!email || !password) {
      toast.error("Email and password are required.");
      return;
    }

    try {
      setSubmitting(true);
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(loginErrorMessage(result.error));
        return;
      }

      toast.success("Welcome back!");
      router.replace(redirectTarget);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const googleLogin = () => {
    setSubmitting(true);
    signIn("google", {
      callbackUrl: redirectTarget,
      redirect: true,
    }).catch(() => {
      setSubmitting(false);
      toast.error("Google sign in failed. Please try again.");
    });
  };

  const resendVerification = async () => {
    const email = user.email.trim().toLowerCase();
    if (!email) {
      toast.error("Enter your email first.");
      return;
    }

    try {
      setResending(true);
      await axios.post("/api/auth/request-email-verification", { email });
      toast.success("If your account exists, a verification email was sent.");
    } catch (error) {
      const msg = error?.response?.data?.error || "Unable to resend verification email.";
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="pt-20 min-h-screen relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#dbb304] via-[#a99801] to-yellow-600 text-white">
      <MoviesPosterWall />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_260px_at_85%_-10%,rgba(255,200,100,.25),transparent),radial-gradient(600px_260px_at_0%_110%,rgba(70,120,255,.25),transparent)] z-10" />

      <div className="min-h-screen flex items-center justify-center px-4 relative z-20">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_10px_50px_rgba(0,0,0,.7)]">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Login</h2>
            <p className="text-sm text-white/70 mt-1">
              Use your credentials or continue with Google
            </p>
          </div>

          <form onSubmit={userLogin} className="space-y-4">
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
                value={user.email}
                onChange={(e) =>
                  setUser((prev) => ({ ...prev, email: e.target.value }))
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white/80 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={user.password}
                  onChange={(e) =>
                    setUser((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                  placeholder="********"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-2 text-xs text-white/70 hover:text-white/90"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={resendVerification}
                disabled={resending}
                className="text-white/80 hover:text-white disabled:opacity-60"
              >
                {resending ? "Resending..." : "Resend verification email"}
              </button>
              <Link href="/forgot-password" className="text-white/80 hover:text-white">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={
                "w-full rounded-xl py-2.5 text-sm font-semibold transition " +
                (submitting
                  ? "bg-white/30 text-white/60 cursor-not-allowed"
                  : "bg-white text-black hover:bg-white/90")
              }
            >
              {submitting ? "Signing in..." : "Login"}
            </button>
          </form>

          <div className="my-4 text-center text-xs text-white/50">OR</div>

          <button
            onClick={googleLogin}
            disabled={submitting}
            className={
              "w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/10 py-2.5 text-sm text-white hover:bg-white/15 transition " +
              (submitting ? "opacity-60 cursor-not-allowed" : "")
            }
          >
            <FaGoogle size={18} className="text-yellow-500" />
            <span className="font-semibold">Continue with Google</span>
          </button>

          <p className="mt-6 text-sm text-center text-white/70">
            Do not have an account?{" "}
            <Link href={signupHref} className="text-white hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
