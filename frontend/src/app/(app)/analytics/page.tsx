"use client";

import React, { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Brain,
  Target,
  Play,
  ChevronDown,
  ArrowRight,
  Sparkles,
  PieChart,
  Activity,
} from "lucide-react";

const analysisTypes = [
  {
    id: "descriptive",
    name: "Descriptive Analytics",
    description: "Understand what happened in your data with summary statistics and distributions",
    icon: BarChart3,
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-500/10",
    textColor: "text-violet-400",
  },
  {
    id: "diagnostic",
    name: "Diagnostic Analytics",
    description: "Discover why things happened through correlation and root cause analysis",
    icon: Brain,
    color: "from-cyan-500 to-blue-600",
    bgColor: "bg-cyan-500/10",
    textColor: "text-cyan-400",
  },
  {
    id: "predictive",
    name: "Predictive Analytics",
    description: "Forecast future trends and outcomes using machine learning models",
    icon: TrendingUp,
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-400",
  },
  {
    id: "prescriptive",
    name: "Prescriptive Analytics",
    description: "Get actionable recommendations based on optimization algorithms",
    icon: Target,
    color: "from-emerald-500 to-green-600",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-400",
  },
];

const recentAnalyses = [
  { name: "Customer Segmentation", dataset: "customer_segments.json", type: "Descriptive", status: "completed", time: "2 min ago" },
  { name: "Sales Forecast Q1", dataset: "sales_q4_2024.csv", type: "Predictive", status: "running", time: "5 min ago" },
  { name: "Churn Analysis", dataset: "user_events.json", type: "Diagnostic", status: "completed", time: "1 hour ago" },
  { name: "Price Optimization", dataset: "product_inventory.csv", type: "Prescriptive", status: "completed", time: "3 hours ago" },
];

const statusColors: Record<string, string> = {
  completed: "bg-emerald-500/20 text-emerald-400",
  running: "bg-amber-500/20 text-amber-400",
  failed: "bg-red-500/20 text-red-400",
};

export default function AnalyticsPage() {
  const [selectedDataset, setSelectedDataset] = useState("");
  const [selectedType, setSelectedType] = useState("");

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-white/50">
          Run powerful analyses on your datasets with AI-powered insights
        </p>
      </div>

      {/* Analysis Type Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {analysisTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`glass-card p-5 text-left transition-all duration-300 cursor-pointer ${
                isSelected
                  ? "border-violet-500/50 bg-violet-500/5 ring-1 ring-violet-500/20"
                  : "glass-card-hover"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl ${type.bgColor} flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${type.textColor}`} />
              </div>
              <h3 className="text-white font-semibold mb-1">{type.name}</h3>
              <p className="text-white/40 text-xs leading-relaxed">{type.description}</p>
            </button>
          );
        })}
      </div>

      {/* Configure Analysis */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Configure Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Dataset</label>
            <div className="relative">
              <select
                value={selectedDataset}
                onChange={(e) => setSelectedDataset(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white appearance-none focus:outline-none focus:border-violet-500/50 transition-all"
              >
                <option value="" className="bg-gray-900">Select dataset...</option>
                <option value="1" className="bg-gray-900">sales_q4_2024.csv</option>
                <option value="2" className="bg-gray-900">customer_segments.json</option>
                <option value="3" className="bg-gray-900">marketing_campaigns.csv</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Analysis Type</label>
            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white appearance-none focus:outline-none focus:border-violet-500/50 transition-all"
              >
                <option value="" className="bg-gray-900">Select type...</option>
                {analysisTypes.map((t) => (
                  <option key={t.id} value={t.id} className="bg-gray-900">{t.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            </div>
          </div>
          <div className="flex items-end">
            <button className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-medium hover:from-violet-500 hover:to-cyan-500 transition-all duration-300">
              <Play className="w-4 h-4" />
              Run Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Results & Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Insights Preview */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">AI Insights</h2>
          </div>
          <div className="space-y-4">
            {[
              { insight: "Revenue increased 23% in Q4, driven primarily by the APAC region", confidence: 94 },
              { insight: "Customer retention improved by 8% after the loyalty program launch", confidence: 87 },
              { insight: "Product returns correlate strongly with shipping delays (r=0.72)", confidence: 91 },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/3 border border-white/5">
                <p className="text-white/80 text-sm mb-3">{item.insight}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500"
                      style={{ width: `${item.confidence}%` }}
                    />
                  </div>
                  <span className="text-white/40 text-xs">{item.confidence}% confidence</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Analyses */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Analyses</h2>
            <button className="text-sm text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {recentAnalyses.map((analysis, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/3 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                  {analysis.type === "Descriptive" && <PieChart className="w-4 h-4 text-violet-400" />}
                  {analysis.type === "Predictive" && <TrendingUp className="w-4 h-4 text-amber-400" />}
                  {analysis.type === "Diagnostic" && <Brain className="w-4 h-4 text-cyan-400" />}
                  {analysis.type === "Prescriptive" && <Target className="w-4 h-4 text-emerald-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm font-medium">{analysis.name}</p>
                  <p className="text-white/30 text-xs">{analysis.dataset}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[analysis.status]}`}>
                  {analysis.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Visualization Placeholder */}
      <div className="mt-6 glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Analysis Distribution</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Descriptive", value: "847", pct: "42%", textColor: "text-violet-400" },
            { label: "Diagnostic", value: "523", pct: "26%", textColor: "text-cyan-400" },
            { label: "Predictive", value: "412", pct: "20%", textColor: "text-amber-400" },
            { label: "Prescriptive", value: "241", pct: "12%", textColor: "text-emerald-400" },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-4 rounded-xl bg-white/3">
              <div className={`text-2xl font-bold ${stat.textColor} mb-1`}>{stat.value}</div>
              <div className="text-white/40 text-sm">{stat.label}</div>
              <div className="text-white/20 text-xs mt-1">{stat.pct} of total</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
