"use client";

import React, { useState } from "react";
import {
  Database,
  Upload,
  Search,
  MoreVertical,
  FileSpreadsheet,
  FileJson,
  Trash2,
  Eye,
  Download,
  Plus,
  Filter,
  Grid3X3,
  List,
} from "lucide-react";

interface Dataset {
  id: string;
  name: string;
  description: string;
  rows: number;
  columns: number;
  fileSize: string;
  format: string;
  createdAt: string;
  status: "ready" | "processing" | "error";
}

const mockDatasets: Dataset[] = [
  { id: "1", name: "sales_q4_2024.csv", description: "Q4 2024 sales data across all regions", rows: 45230, columns: 18, fileSize: "12.4 MB", format: "csv", createdAt: "2024-12-15", status: "ready" },
  { id: "2", name: "customer_segments.json", description: "Customer segmentation results", rows: 128400, columns: 24, fileSize: "34.7 MB", format: "json", createdAt: "2024-12-14", status: "ready" },
  { id: "3", name: "marketing_campaigns.csv", description: "Campaign performance metrics 2024", rows: 8920, columns: 12, fileSize: "2.1 MB", format: "csv", createdAt: "2024-12-13", status: "processing" },
  { id: "4", name: "product_inventory.csv", description: "Current stock levels and forecasts", rows: 3200, columns: 8, fileSize: "890 KB", format: "csv", createdAt: "2024-12-12", status: "ready" },
  { id: "5", name: "user_events.json", description: "User interaction event logs", rows: 2150000, columns: 32, fileSize: "1.2 GB", format: "json", createdAt: "2024-12-10", status: "error" },
  { id: "6", name: "financial_report_2024.csv", description: "Annual financial summary", rows: 480, columns: 15, fileSize: "156 KB", format: "csv", createdAt: "2024-12-08", status: "ready" },
];

const formatIcons: Record<string, React.FC<{ className?: string }>> = {
  csv: FileSpreadsheet,
  json: FileJson,
};

const statusColors: Record<string, string> = {
  ready: "bg-emerald-500/20 text-emerald-400",
  processing: "bg-amber-500/20 text-amber-400",
  error: "bg-red-500/20 text-red-400",
};

export default function DatasetsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  const filteredDatasets = mockDatasets.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Datasets</h1>
          <p className="text-white/50">Manage and explore your data sources</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-medium hover:from-violet-500 hover:to-cyan-500 transition-all duration-300"
        >
          <Plus className="w-4 h-4" />
          Upload Dataset
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search datasets..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 transition-all"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all">
          <Filter className="w-4 h-4" />
          <span className="text-sm">Filter</span>
        </button>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Datasets Grid */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDatasets.map((dataset) => {
            const FormatIcon = formatIcons[dataset.format] || Database;
            return (
              <div
                key={dataset.id}
                className="glass-card glass-card-hover p-5 cursor-pointer transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <FormatIcon className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[dataset.status]}`}>
                      {dataset.status}
                    </span>
                    <button className="p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="text-white font-semibold mb-1 truncate">{dataset.name}</h3>
                <p className="text-white/40 text-sm mb-4 line-clamp-2">{dataset.description}</p>
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5">
                  <div>
                    <p className="text-white/30 text-xs">Rows</p>
                    <p className="text-white/80 text-sm font-medium">{dataset.rows.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-xs">Columns</p>
                    <p className="text-white/80 text-sm font-medium">{dataset.columns}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-xs">Size</p>
                    <p className="text-white/80 text-sm font-medium">{dataset.fileSize}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-white/40 text-xs font-medium uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-white/40 text-xs font-medium uppercase tracking-wider hidden md:table-cell">Rows</th>
                <th className="text-left px-5 py-3 text-white/40 text-xs font-medium uppercase tracking-wider hidden md:table-cell">Columns</th>
                <th className="text-left px-5 py-3 text-white/40 text-xs font-medium uppercase tracking-wider hidden sm:table-cell">Size</th>
                <th className="text-left px-5 py-3 text-white/40 text-xs font-medium uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-white/40 text-xs font-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDatasets.map((dataset) => {
                const FormatIcon = formatIcons[dataset.format] || Database;
                return (
                  <tr key={dataset.id} className="border-b border-white/3 hover:bg-white/3 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <FormatIcon className="w-4 h-4 text-violet-400 shrink-0" />
                        <div>
                          <p className="text-white text-sm font-medium">{dataset.name}</p>
                          <p className="text-white/30 text-xs">{dataset.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-white/60 text-sm hidden md:table-cell">{dataset.rows.toLocaleString()}</td>
                    <td className="px-5 py-4 text-white/60 text-sm hidden md:table-cell">{dataset.columns}</td>
                    <td className="px-5 py-4 text-white/60 text-sm hidden sm:table-cell">{dataset.fileSize}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[dataset.status]}`}>
                        {dataset.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all" title="Download">
                          <Download className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-8 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-4">Upload Dataset</h2>
            <div className="border-2 border-dashed border-white/10 rounded-xl p-12 text-center hover:border-violet-500/30 transition-colors cursor-pointer">
              <Upload className="w-10 h-10 text-white/20 mx-auto mb-4" />
              <p className="text-white/60 text-sm mb-1">Drop files here or click to browse</p>
              <p className="text-white/30 text-xs">Supports CSV, JSON, XLSX up to 500MB</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowUpload(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-medium text-sm hover:from-violet-500 hover:to-cyan-500 transition-all">
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
