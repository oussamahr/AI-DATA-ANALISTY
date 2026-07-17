"use client";

import React from "react";
import {
  BarChart3,
  Database,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
  Sparkles,
} from "lucide-react";

const stats = [
  {
    label: "Total Datasets",
    value: "2,847",
    change: "+12.5%",
    up: true,
    icon: Database,
    color: "from-violet-500 to-purple-600",
  },
  {
    label: "Analyses Run",
    value: "18,439",
    change: "+8.2%",
    up: true,
    icon: BarChart3,
    color: "from-cyan-500 to-blue-600",
  },
  {
    label: "AI Queries",
    value: "6,210",
    change: "+23.1%",
    up: true,
    icon: Sparkles,
    color: "from-amber-500 to-orange-600",
  },
  {
    label: "Active Users",
    value: "1,024",
    change: "-2.4%",
    up: false,
    icon: Users,
    color: "from-emerald-500 to-green-600",
  },
];

const recentActivity = [
  { action: "New dataset uploaded", detail: "sales_q4_2024.csv", time: "2 min ago", type: "dataset" },
  { action: "Analysis completed", detail: "Customer segmentation", time: "15 min ago", type: "analysis" },
  { action: "AI query executed", detail: "Revenue trend analysis", time: "1 hour ago", type: "llm" },
  { action: "Transform applied", detail: "Data normalization", time: "2 hours ago", type: "transform" },
  { action: "Visualization created", detail: "Monthly KPI dashboard", time: "3 hours ago", type: "viz" },
  { action: "New user registered", detail: "analyst@company.com", time: "5 hours ago", type: "user" },
];

const activityColors: Record<string, string> = {
  dataset: "bg-violet-500/20 text-violet-400",
  analysis: "bg-cyan-500/20 text-cyan-400",
  llm: "bg-amber-500/20 text-amber-400",
  transform: "bg-emerald-500/20 text-emerald-400",
  viz: "bg-blue-500/20 text-blue-400",
  user: "bg-pink-500/20 text-pink-400",
};

const activityIcons: Record<string, React.FC<{ className?: string }>> = {
  dataset: Database,
  analysis: BarChart3,
  llm: Sparkles,
  transform: Zap,
  viz: Activity,
  user: Users,
};

export default function DashboardPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Dashboard
        </h1>
        <p className="text-white/50">
          Welcome back. Here&apos;s an overview of your analytics platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${stat.up ? "text-emerald-400" : "text-red-400"}`}>
                  {stat.up ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {stat.change}
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-white/40 text-sm">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {[
              { label: "Upload Dataset", icon: Database, href: "/datasets", color: "violet" },
              { label: "Run Analysis", icon: BarChart3, href: "/analytics", color: "cyan" },
              { label: "Ask AI", icon: Sparkles, href: "/llm", color: "amber" },
              { label: "Create Chart", icon: Activity, href: "/visualizations", color: "emerald" },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <a
                  key={action.label}
                  href={action.href}
                  className={`flex items-center gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/6 border border-white/5 hover:border-white/10 transition-all duration-200 group`}
                >
                  <div className={`w-9 h-9 rounded-lg bg-${action.color}-500/10 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-4 h-4 text-${action.color}-400`} />
                  </div>
                  <span className="text-white/70 text-sm font-medium group-hover:text-white transition-colors">
                    {action.label}
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-white/20 ml-auto group-hover:text-white/50 transition-colors" />
                </a>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <button className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
              View all
            </button>
          </div>
          <div className="space-y-3">
            {recentActivity.map((item, i) => {
              const Icon = activityIcons[item.type] || Activity;
              return (
                <div
                  key={i}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/3 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-lg ${activityColors[item.type]} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm font-medium">{item.action}</p>
                    <p className="text-white/40 text-xs truncate">{item.detail}</p>
                  </div>
                  <span className="text-white/30 text-xs shrink-0">{item.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Usage Chart Placeholder */}
      <div className="mt-6 glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Platform Usage</h2>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">Usage analytics will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
