"use client";

import React from "react";
import Link from "next/link";
import FerrofluidBackground from "@/components/FerrofluidBackground";
import {
  Sparkles,
  BarChart3,
  Database,
  Zap,
  ArrowRight,
  Brain,
  Shield,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Analytics",
    description: "Ask questions in natural language and get instant insights from your data",
    color: "text-violet-400 bg-violet-500/10",
  },
  {
    icon: BarChart3,
    title: "Smart Visualizations",
    description: "Auto-generated charts and dashboards that adapt to your data structure",
    color: "text-cyan-400 bg-cyan-500/10",
  },
  {
    icon: Database,
    title: "Multi-Source Data",
    description: "Connect CSV, JSON, databases, and APIs in one unified workspace",
    color: "text-amber-400 bg-amber-500/10",
  },
  {
    icon: Zap,
    title: "Instant Transforms",
    description: "Clean, reshape, and prepare data with visual pipeline builder",
    color: "text-emerald-400 bg-emerald-500/10",
  },
  {
    icon: Sparkles,
    title: "LLM Integration",
    description: "Advanced language models understand your data context and domain",
    color: "text-pink-400 bg-pink-500/10",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Role-based access control, audit logs, and data encryption at rest",
    color: "text-blue-400 bg-blue-500/10",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen relative bg-[#03010A] overflow-hidden">
      <FerrofluidBackground variant="default" />

      {/* Content */}
      <div className="relative z-10">
        {/* Nav */}
        <nav className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-xl">DataMind</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg text-white/60 hover:text-white transition-colors text-sm font-medium"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-medium text-sm hover:from-violet-500 hover:to-cyan-500 transition-all duration-300"
              >
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-28 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-white/60 text-sm">AI-Powered Data Analytics Platform</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Transform Data
            <br />
            <span className="gradient-text">Into Intelligence</span>
          </h1>

          <p className="text-white/50 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload datasets, run analyses, create visualizations, and ask questions
            in natural language. Powered by advanced AI models that understand your data.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold hover:from-violet-500 hover:to-cyan-500 transition-all duration-300 text-lg"
            >
              Start for Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white/70 font-semibold hover:text-white hover:bg-white/10 transition-all duration-300 text-lg"
            >
              Sign In
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything you need
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              A complete analytics platform powered by AI
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="glass-card glass-card-hover p-6 transition-all duration-300"
                >
                  <div className={`w-11 h-11 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="glass-card p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-cyan-500/5" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
              <p className="text-white/40 mb-8 max-w-md mx-auto">
                Join thousands of data teams using DataMind to make better decisions.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold hover:from-violet-500 hover:to-cyan-500 transition-all duration-300"
              >
                Create Free Account
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-white/5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white/30" />
              <span className="text-white/30 text-sm">© 2024 DataMind. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="text-white/30 hover:text-white/50 text-sm transition-colors">Privacy</a>
              <a href="#" className="text-white/30 hover:text-white/50 text-sm transition-colors">Terms</a>
              <a href="#" className="text-white/30 hover:text-white/50 text-sm transition-colors">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
