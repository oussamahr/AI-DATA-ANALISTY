"use client";

import React, { useState } from "react";
import {
  Plus,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  ScatterChart,
  Maximize2,
  MoreVertical,
  Download,
  Share2,
} from "lucide-react";

interface VizType {
  id: string;
  name: string;
  icon: React.FC<{ className?: string }>;
  description: string;
}

const vizTypes: VizType[] = [
  { id: "bar", name: "Bar Chart", icon: BarChart3, description: "Compare categories" },
  { id: "line", name: "Line Chart", icon: LineChart, description: "Track trends over time" },
  { id: "pie", name: "Pie Chart", icon: PieChart, description: "Show proportions" },
  { id: "area", name: "Area Chart", icon: Activity, description: "Volume over time" },
  { id: "scatter", name: "Scatter Plot", icon: ScatterChart, description: "Find correlations" },
];

const savedVisualizations = [
  { id: "1", name: "Monthly Revenue Trend", type: "line", dataset: "sales_q4_2024.csv", updatedAt: "2 hours ago" },
  { id: "2", name: "Customer Segments", type: "pie", dataset: "customer_segments.json", updatedAt: "1 day ago" },
  { id: "3", name: "Campaign ROI Comparison", type: "bar", dataset: "marketing_campaigns.csv", updatedAt: "3 days ago" },
  { id: "4", name: "Inventory Distribution", type: "scatter", dataset: "product_inventory.csv", updatedAt: "1 week ago" },
  { id: "5", name: "User Engagement Funnel", type: "area", dataset: "user_events.json", updatedAt: "2 weeks ago" },
];

const typeIcons: Record<string, React.FC<{ className?: string }>> = {
  bar: BarChart3,
  line: LineChart,
  pie: PieChart,
  area: Activity,
  scatter: ScatterChart,
};

const typeColors: Record<string, string> = {
  bar: "text-violet-400 bg-violet-500/10",
  line: "text-cyan-400 bg-cyan-500/10",
  pie: "text-amber-400 bg-amber-500/10",
  area: "text-emerald-400 bg-emerald-500/10",
  scatter: "text-pink-400 bg-pink-500/10",
};

export default function VisualizationsPage() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Visualizations</h1>
          <p className="text-white/50">Create and manage interactive data visualizations</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-medium hover:from-violet-500 hover:to-cyan-500 transition-all duration-300"
        >
          <Plus className="w-4 h-4" />
          New Visualization
        </button>
      </div>

      {/* Chart Type Selection */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {vizTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setShowCreate(true)}
              className="glass-card glass-card-hover p-4 text-center transition-all duration-300"
            >
              <Icon className="w-8 h-8 text-white/40 mx-auto mb-2" />
              <p className="text-white/70 text-sm font-medium">{type.name}</p>
              <p className="text-white/30 text-xs mt-0.5">{type.description}</p>
            </button>
          );
        })}
      </div>

      {/* Saved Visualizations */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Saved Visualizations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedVisualizations.map((viz) => {
            const Icon = typeIcons[viz.type] || BarChart3;
            const colorClass = typeColors[viz.type] || typeColors.bar;
            return (
              <div
                key={viz.id}
                className="glass-card glass-card-hover p-5 transition-all duration-300"
              >
                {/* Chart placeholder */}
                <div className="h-40 rounded-xl bg-white/3 border border-white/5 flex items-center justify-center mb-4 overflow-hidden relative group">
                  <Icon className="w-12 h-12 text-white/10" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${colorClass}`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <h3 className="text-white font-medium text-sm">{viz.name}</h3>
                    </div>
                    <p className="text-white/30 text-xs">{viz.dataset}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-white/20 text-xs">{viz.updatedAt}</span>
                    <button className="p-1 rounded text-white/20 hover:text-white/50 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-8 max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-6">Create Visualization</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Name</label>
                <input
                  type="text"
                  placeholder="My visualization"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Chart Type</label>
                <div className="grid grid-cols-5 gap-2">
                  {vizTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-violet-500/30 hover:bg-white/8 transition-all text-center"
                      >
                        <Icon className="w-5 h-5 text-white/50 mx-auto mb-1" />
                        <p className="text-white/40 text-[10px]">{type.name}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Dataset</label>
                <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white appearance-none focus:outline-none focus:border-violet-500/50 transition-all">
                  <option value="" className="bg-gray-900">Select dataset...</option>
                  <option value="1" className="bg-gray-900">sales_q4_2024.csv</option>
                  <option value="2" className="bg-gray-900">customer_segments.json</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-medium text-sm hover:from-violet-500 hover:to-cyan-500 transition-all">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
