"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const LoginPage = () => {
  const { status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState({ email: "", password: "" });

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/profile");
    }
  }, [status, router]);

  const userLogin = async (e) => {
    e.preventDefault();
    const result = await signIn("credentials", { ...user, redirect: false });

    if (result?.error) {
      toast.error("Login failed: " + result.error);
    } else {
      toast.success("Login successful!");
      router.push("/profile");
    }
  };

  const googleLogin = () => {
    signIn("google", {
      callbackUrl: "/profile",
      redirect: true,
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0b1220] via-[#0b0f14] to-black text-white">
      {/* soft lights */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_260px_at_85%_-10%,rgba(255,200,100,.16),transparent),radial-gradient(600px_260px_at_0%_110%,rgba(70,120,255,.16),transparent)]" />

      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-xl shadow-[0_10px_50px_rgba(0,0,0,.5)]">
          {/* header */}
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Login</h2>
            <p className="text-sm text-white/60 mt-1">Welcome back to Movie Project</p>
          </div>

          <form onSubmit={userLogin} className="space-y-4">
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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={user.password}
                onChange={(e) => setUser({ ...user, password: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-white text-black py-2.5 text-sm font-semibold hover:bg-white/90 transition"
            >
              Login
            </button>
          </form>

          <button
            onClick={googleLogin}
            className="w-full mt-4 rounded-xl border border-white/10 bg-white/10 py-2.5 text-sm text-white hover:bg-white/15 transition"
          >
            Sign in with Google
          </button>

          <p className="mt-6 text-sm text-center text-white/70">
            Dont have an account?{" "}
            <Link href="/signup" className="text-white hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
