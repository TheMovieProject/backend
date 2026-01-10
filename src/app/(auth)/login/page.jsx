"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Image from "next/image";
// ⬇️ adjust this path to where *you* placed the component
import MoviesPosterWall from "@/app/components/MoviePosterWall";
import { FaGoogle } from "react-icons/fa";


export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.push("/profile");
  }, [status, router]);

  const userLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await signIn("credentials", { ...user, redirect: false });
    setSubmitting(false);

    if (result && result.error) {
      toast.error("Login failed: " + result.error);
    } else {
      toast.success("Welcome back!");
      router.push("/profile");
    }
  };

  const googleLogin = () => {
    setSubmitting(true);
    signIn("google", {
      callbackUrl: "/profile",
      redirect: true,
    }).finally(() => setSubmitting(false));
  };

  return (
    <div className="pt-20 h-[46rem] relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#dbb304] via-[#a99801] to-yellow-600 text-white">
      {/* Posters background */}
      <MoviesPosterWall />

      {/* Glow overlay on top of posters */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_260px_at_85%_-10%,rgba(255,200,100,.25),transparent),radial-gradient(600px_260px_at_0%_110%,rgba(70,120,255,.25),transparent)] z-10" />

      {/* Main content */}
      <div className="min-h-screen flex items-center justify-center px-4 relative z-20">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_10px_50px_rgba(0,0,0,.7)]">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Login</h2>
            <p className="text-lg font-bold text-white/60 mt-1">
              Welcome to Movie Project
            </p>
          </div>

          {/* <form onSubmit={userLogin} className="space-y-4">
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
                  setUser({ ...user, email: e.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                placeholder="you@example.com"
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
                    setUser({ ...user, password: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                  placeholder="••••••••"
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
              {submitting ? "Signing in…" : "Login"}
            </button>
          </form> */}

          <button
            onClick={googleLogin}
            disabled={submitting}
            className={
              "w-full mt-4 flex items-center justify-between px-[6.7rem] rounded-xl border border-white/10 bg-white/10 py-2.5 text-sm text-white hover:bg-white/15 transition " +
              (submitting ? "opacity-60 cursor-not-allowed" : "")
            }
          >
            <FaGoogle size={20} className="text-yellow-500"/>
            <p className="font-bold">{submitting ? "Please wait…" : "Sign in with Google"}</p>
          </button>

          {/* <p className="mt-6 text-sm text-center text-white/70">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-white hover:underline">
              Sign up
            </Link>
          </p> */}
        </div>
      </div>
    </div>
  );
}
