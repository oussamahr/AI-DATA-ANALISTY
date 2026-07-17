"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import FerrofluidBackground from "@/components/FerrofluidBackground";
import { Mail, ArrowLeft, Sparkles, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-[#03010A] overflow-hidden">
      <FerrofluidBackground variant="reset" />

      <div className="relative z-10 min-h-screen flex items-center justify-center w-full px-4 py-12">
        <div className="w-full max-w-md">
          <div className="glass-card p-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Reset password
              </h1>
              <p className="text-white/50 text-sm">
                Enter your email and we&apos;ll send you a reset link
              </p>
            </div>

            {sent ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">
                  Check your email
                </h2>
                <p className="text-white/50 text-sm mb-6">
                  We&apos;ve sent a password reset link to{" "}
                  <span className="text-white/80">{email}</span>
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold hover:from-violet-500 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </div>
                    ) : (
                      "Send reset link"
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-white/40 hover:text-white/60 text-sm transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to sign in
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
