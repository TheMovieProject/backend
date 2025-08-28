"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const USERNAME_RE = /^[a-z0-9_\.]{3,20}$/; // lowercase, digits, _ . length 3–20

function strengthInfo(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const level = ["Very weak", "Weak", "Okay", "Good", "Strong"][Math.min(score, 4)];
  return { score, level };
}

export default function SignupPage() {
  const router = useRouter();
  const [user, setUser] = useState({
    email: "",
    name: "",
    username: "",
    password: "",
  });

  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null); // null = unknown, true/false
  const [submitting, setSubmitting] = useState(false);

  const { score, level } = useMemo(() => strengthInfo(user.password), [user.password]);

  // Debounced username availability check
  const debounceRef = useRef(null);
  useEffect(() => {
    setAvailable(null);
    if (!user.username || !USERNAME_RE.test(user.username)) return;
    setChecking(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/user/check-username?u=${encodeURIComponent(user.username)}`);
        const { available } = await res.json();
        setAvailable(available);
      } catch {
        setAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 450);
    return () => clearTimeout(debounceRef.current);
  }, [user.username]);

  const usernameValid = USERNAME_RE.test(user.username);
  const passwordValid = score >= 3; // require at least "Good"
  const canSubmit = user.email && user.name && usernameValid && available && passwordValid && !submitting;

  const userSignUp = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error("Please fix the errors before continuing.");
      return;
    }
    try {
      setSubmitting(true);
      const response = await axios.post("/api/signup", user);
      toast.success("Account created! Please log in.");
      router.push("/login");
    } catch (error) {
      const msg = error?.response?.data?.error || "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const strengthBarClasses =
    score <= 1
      ? "bg-red-500 w-1/5"
      : score === 2
      ? "bg-orange-500 w-2/5"
      : score === 3
      ? "bg-yellow-500 w-3/5"
      : score === 4
      ? "bg-green-500 w-4/5"
      : "bg-emerald-500 w-full";

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0b1220] via-[#0b0f14] to-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_260px_at_85%_-10%,rgba(255,200,100,.16),transparent),radial-gradient(600px_260px_at_0%_110%,rgba(70,120,255,.16),transparent)]" />
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-xl shadow-[0_10px_50px_rgba(0,0,0,.5)]">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
            <p className="text-sm text-white/60 mt-1">Unique username & strong password required</p>
          </div>

          <form onSubmit={userSignUp} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={user.email}
                onChange={(e) => setUser({ ...user, email: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                placeholder="you@example.com"
                required
              />
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white/80 mb-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={user.name}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                placeholder="Aditya Jain"
                required
              />
            </div>

            {/* Username */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="username" className="block text-sm font-medium text-white/80 mb-1">
                  Username
                </label>
                <span className="text-xs text-white/50">(3–20 chars, a–z 0–9 _ .)</span>
              </div>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  value={user.username}
                  onChange={(e) => setUser({ ...user, username: e.target.value.toLowerCase() })}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none bg-white/5
                    ${usernameValid ? "border-white/10 focus:border-white/30" : "border-red-500/40 focus:border-red-500/60"}`}
                  placeholder="aditya_movies"
                  required
                />
                {user.username && (
                  <div className="absolute right-2 top-2.5 text-xs">
                    {checking ? (
                      <span className="text-white/60">Checking…</span>
                    ) : usernameValid ? (
                      available === true ? (
                        <span className="text-emerald-400">Available</span>
                      ) : available === false ? (
                        <span className="text-red-400">Taken</span>
                      ) : (
                        <span className="text-white/60">—</span>
                      )
                    ) : (
                      <span className="text-red-400">Invalid</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-1">
                  Password
                </label>
                <span className="text-xs text-white/50">Min 8 chars, mix upper/lower/digit/symbol</span>
              </div>
              <input
                id="password"
                type="password"
                value={user.password}
                onChange={(e) => setUser({ ...user, password: e.target.value })}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none bg-white/5 border-white/10 focus:border-white/30`}
                placeholder="••••••••"
                required
              />
              <div className="mt-2 h-2 w-full rounded-full bg-white/10">
                <div className={`h-2 rounded-full transition-all ${strengthBarClasses}`} />
              </div>
              <div className="mt-1 text-xs text-white/70">Strength: {level}</div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full rounded-xl py-2.5 text-sm font-semibold transition
                ${canSubmit ? "bg-white text-black hover:bg-white/90" : "bg-white/30 text-white/60 cursor-not-allowed"}`}
            >
              {submitting ? "Creating…" : "Sign Up"}
            </button>
          </form>

          <p className="mt-6 text-sm text-center text-white/70">
            Already have an account?{" "}
            <Link href="/login" className="text-white hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
