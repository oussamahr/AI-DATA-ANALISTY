"use client";

import React from "react";
import {
  Users,
  Database,
  BarChart3,
  HardDrive,
  Activity,
  Shield,
  Trash2,
  Edit3,
  Search,
  MoreVertical,
} from "lucide-react";

const systemStats = [
  { label: "Total Users", value: "1,024", icon: Users, color: "from-violet-500 to-purple-600", change: "+12%" },
  { label: "Total Datasets", value: "2,847", icon: Database, color: "from-cyan-500 to-blue-600", change: "+8%" },
  { label: "Total Analyses", value: "18,439", icon: BarChart3, color: "from-amber-500 to-orange-600", change: "+23%" },
  { label: "Storage Used", value: "247 GB", icon: HardDrive, color: "from-emerald-500 to-green-600", change: "+5%" },
];

const users = [
  { id: "1", name: "Sarah Chen", email: "sarah@company.com", role: "admin", status: "active", lastActive: "2 min ago", datasets: 45 },
  { id: "2", name: "Marcus Johnson", email: "marcus@company.com", role: "analyst", status: "active", lastActive: "15 min ago", datasets: 23 },
  { id: "3", name: "Emily Park", email: "emily@company.com", role: "analyst", status: "active", lastActive: "1 hour ago", datasets: 18 },
  { id: "4", name: "David Kim", email: "david@company.com", role: "viewer", status: "inactive", lastActive: "3 days ago", datasets: 0 },
  { id: "5", name: "Ana Rodriguez", email: "ana@company.com", role: "analyst", status: "active", lastActive: "30 min ago", datasets: 31 },
  { id: "6", name: "James Wilson", email: "james@company.com", role: "viewer", status: "active", lastActive: "2 hours ago", datasets: 5 },
];

const roleColors: Record<string, string> = {
  admin: "bg-amber-500/20 text-amber-400",
  analyst: "bg-violet-500/20 text-violet-400",
  viewer: "bg-cyan-500/20 text-cyan-400",
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  inactive: "bg-white/10 text-white/40",
};

export default function AdminPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          <p className="text-white/50">Manage users, monitor system health, and configure settings</p>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {systemStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card p-6">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-emerald-400 text-sm font-medium">{stat.change}</span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-white/40 text-sm">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">System Health</h2>
          <div className="space-y-4">
            {[
              { label: "API Response Time", value: "42ms", status: "good" },
              { label: "Database Connections", value: "18/100", status: "good" },
              { label: "CPU Usage", value: "34%", status: "good" },
              { label: "Memory Usage", value: "67%", status: "warning" },
              { label: "Disk Usage", value: "45%", status: "good" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-white/50 text-sm">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white/80 text-sm font-medium">{item.value}</span>
                  <div className={`w-2 h-2 rounded-full ${item.status === "good" ? "bg-emerald-400" : "bg-amber-400"}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Errors</h2>
          <div className="space-y-3">
            {[
              { error: "Dataset parse error", detail: "Invalid CSV format in row 45231", time: "2 hours ago", severity: "warning" },
              { error: "LLM timeout", detail: "Request exceeded 30s limit", time: "5 hours ago", severity: "error" },
              { error: "Storage limit warning", detail: "Approaching 80% capacity", time: "1 day ago", severity: "warning" },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-lg bg-white/3 border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${item.severity === "error" ? "bg-red-400" : "bg-amber-400"}`} />
                  <span className="text-white/80 text-sm font-medium">{item.error}</span>
                </div>
                <p className="text-white/30 text-xs ml-4">{item.detail}</p>
                <span className="text-white/20 text-xs ml-4">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Activity Feed</h2>
          <div className="space-y-3">
            {[
              { user: "Sarah Chen", action: "uploaded new dataset", time: "5 min ago" },
              { user: "Marcus Johnson", action: "ran predictive analysis", time: "12 min ago" },
              { user: "Emily Park", action: "created visualization", time: "30 min ago" },
              { user: "Ana Rodriguez", action: "used AI assistant", time: "45 min ago" },
              { user: "System", action: "automated backup completed", time: "1 hour ago" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 flex items-center justify-center shrink-0">
                  <Activity className="w-3 h-3 text-white/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/60 text-xs">
                    <span className="text-white/80 font-medium">{item.user}</span>{" "}
                    {item.action}
                  </p>
                </div>
                <span className="text-white/20 text-xs shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Management */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-white">User Management</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search users..."
              className="pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 transition-all text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-white/40 text-xs font-medium uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-white/40 text-xs font-medium uppercase tracking-wider hidden md:table-cell">Role</th>
                <th className="text-left px-4 py-3 text-white/40 text-xs font-medium uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-white/40 text-xs font-medium uppercase tracking-wider hidden lg:table-cell">Datasets</th>
                <th className="text-left px-4 py-3 text-white/40 text-xs font-medium uppercase tracking-wider hidden lg:table-cell">Last Active</th>
                <th className="text-right px-4 py-3 text-white/40 text-xs font-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/3 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 flex items-center justify-center">
                        <span className="text-white/70 text-xs font-semibold">
                          {user.name.split(" ").map((n) => n[0]).join("")}
                        </span>
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{user.name}</p>
                        <p className="text-white/30 text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${roleColors[user.role]}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 hidden sm:table-cell">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusColors[user.status]}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-white/60 text-sm hidden lg:table-cell">{user.datasets}</td>
                  <td className="px-4 py-4 text-white/40 text-sm hidden lg:table-cell">{user.lastActive}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all" title="Edit">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all" title="More">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
