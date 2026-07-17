"use client";

import React, { useState } from "react";
import {
  Zap,
  ArrowRight,
  Play,
  ChevronDown,
  Shuffle,
  Filter,
  Columns,
  GitMerge,
  BarChart2,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Settings,
  Database,
} from "lucide-react";

const transformTypes = [
  {
    id: "normalize",
    name: "Normalize",
    description: "Scale values to a standard range",
    icon: BarChart2,
    color: "text-violet-400 bg-violet-500/10",
  },
  {
    id: "filter",
    name: "Filter",
    description: "Remove rows based on conditions",
    icon: Filter,
    color: "text-cyan-400 bg-cyan-500/10",
  },
  {
    id: "aggregate",
    name: "Aggregate",
    description: "Group and summarize data",
    icon: Columns,
    color: "text-amber-400 bg-amber-500/10",
  },
  {
    id: "pivot",
    name: "Pivot",
    description: "Reshape data from rows to columns",
    icon: Shuffle,
    color: "text-emerald-400 bg-emerald-500/10",
  },
  {
    id: "join",
    name: "Join",
    description: "Merge two datasets together",
    icon: GitMerge,
    color: "text-pink-400 bg-pink-500/10",
  },
];

const transformHistory = [
  { id: "1", name: "Normalize sales amounts", type: "normalize", dataset: "sales_q4_2024.csv", status: "completed", rowsAffected: 45230, time: "10 min ago" },
  { id: "2", name: "Filter active customers", type: "filter", dataset: "customer_segments.json", status: "completed", rowsAffected: 89400, time: "1 hour ago" },
  { id: "3", name: "Aggregate by region", type: "aggregate", dataset: "sales_q4_2024.csv", status: "running", rowsAffected: 0, time: "2 hours ago" },
  { id: "4", name: "Join with inventory", type: "join", dataset: "product_inventory.csv", status: "failed", rowsAffected: 0, time: "3 hours ago" },
  { id: "5", name: "Pivot campaign metrics", type: "pivot", dataset: "marketing_campaigns.csv", status: "completed", rowsAffected: 8920, time: "1 day ago" },
];

const statusIcons: Record<string, React.FC<{ className?: string }>> = {
  completed: CheckCircle2,
  running: Clock,
  failed: XCircle,
};

const statusColors: Record<string, string> = {
  completed: "text-emerald-400 bg-emerald-500/10",
  running: "text-amber-400 bg-amber-500/10",
  failed: "text-red-400 bg-red-500/10",
};

export default function TransformsPage() {
  const [selectedType, setSelectedType] = useState("");

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Transforms</h1>
        <p className="text-white/50">Clean, reshape, and prepare your data for analysis</p>
      </div>

      {/* Transform Pipeline Builder */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Build Transform Pipeline</h2>
        
        {/* Type Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {transformTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                  isSelected
                    ? "border-violet-500/50 bg-violet-500/5 ring-1 ring-violet-500/20"
                    : "border-white/10 bg-white/3 hover:bg-white/5 hover:border-white/15"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${type.color} flex items-center justify-center mb-2`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-white/80 text-sm font-medium">{type.name}</p>
                <p className="text-white/30 text-xs mt-0.5">{type.description}</p>
              </button>
            );
          })}
        </div>

        {/* Config */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Source Dataset</label>
            <div className="relative">
              <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white appearance-none focus:outline-none focus:border-violet-500/50 transition-all">
                <option value="" className="bg-gray-900">Select dataset...</option>
                <option value="1" className="bg-gray-900">sales_q4_2024.csv</option>
                <option value="2" className="bg-gray-900">customer_segments.json</option>
                <option value="3" className="bg-gray-900">marketing_campaigns.csv</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Output Name</label>
            <input
              type="text"
              placeholder="transformed_dataset"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 transition-all"
            />
          </div>
          <div className="flex items-end gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all">
              <Settings className="w-4 h-4" />
              Configure
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-medium hover:from-violet-500 hover:to-cyan-500 transition-all duration-300">
              <Play className="w-4 h-4" />
              Run
            </button>
          </div>
        </div>

        {/* Pipeline visualization */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white/3 border border-white/5 overflow-x-auto">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 shrink-0">
            <Database className="w-4 h-4 text-violet-400" />
            <span className="text-violet-400 text-sm font-medium">Source</span>
          </div>
          <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 shrink-0">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 text-sm font-medium">Filter</span>
          </div>
          <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0">
            <BarChart2 className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-sm font-medium">Normalize</span>
          </div>
          <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
            <Columns className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-medium">Aggregate</span>
          </div>
          <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
          <button className="flex items-center gap-1 px-3 py-2 rounded-lg border border-dashed border-white/20 text-white/30 hover:text-white/50 hover:border-white/30 transition-all shrink-0">
            <Plus className="w-3 h-3" />
            <span className="text-sm">Add step</span>
          </button>
        </div>
      </div>

      {/* Transform History */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Transform History</h2>
          <button className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
            View all
          </button>
        </div>
        <div className="space-y-3">
          {transformHistory.map((item) => {
            const StatusIcon = statusIcons[item.status] || Clock;
            const typeInfo = transformTypes.find((t) => t.id === item.type);
            const TypeIcon = typeInfo?.icon || Zap;
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/3 transition-colors"
              >
                <div className={`w-9 h-9 rounded-lg ${typeInfo?.color || "bg-white/5"} flex items-center justify-center shrink-0`}>
                  <TypeIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm font-medium">{item.name}</p>
                  <p className="text-white/30 text-xs">{item.dataset}</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-white/60 text-sm">{item.rowsAffected.toLocaleString()} rows</p>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusColors[item.status]}`}>
                  <StatusIcon className="w-3 h-3" />
                  <span className="text-xs font-medium capitalize">{item.status}</span>
                </div>
                <span className="text-white/20 text-xs shrink-0">{item.time}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
