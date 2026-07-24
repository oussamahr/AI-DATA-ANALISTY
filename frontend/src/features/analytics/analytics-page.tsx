import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Mail, RefreshCw, Sparkles, TrendingUp, Zap, BarChart3, Activity, AlertCircle, CheckCircle, Clock, FileText } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, PieChart, Pie, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useDatasets } from "@/hooks/use-api";
import { api } from "@/services/api";
import { getErrorMessage } from "@/utils/cn";
import type { AIInsightResponse, AnalysisReport, CorrelationResponse, DatasetProfileResponse, ColumnProfile } from "@/types";
import { useRef } from "react";

const severityIcons = {
  high: AlertCircle,
  medium: Activity,
  low: CheckCircle,
};

const severityColors = {
  high: "text-danger",
  medium: "text-warning",
  low: "text-success",
};

const severityBgColors = {
  high: "bg-danger/10 border-danger/20",
  medium: "bg-warning/10 border-warning/20",
  low: "bg-success/10 border-success/20",
};

function ColumnProfileCard({ column, index }: { column: ColumnProfile; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const nullPercent = column.null_percent;
  const uniquePercent = column.unique_percent;

  const histogramData = (column.histogram || []).map((h: any) => ({
    bin: h.bin || h.range || String(h.value || ""),
    count: h.count || h.frequency || 0,
  }));

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="rounded-xl border border-border/60 bg-surface p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4 className="font-medium text-foreground">{column.column_name}</h4>
          <p className="text-xs text-muted">{column.dtype}</p>
        </div>
        <Badge variant="secondary">{column.total_count} rows</Badge>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-3 text-center">
        <div>
          <div className="text-lg font-bold text-foreground">{nullPercent.toFixed(1)}%</div>
          <div className="text-xs text-muted">Null</div>
        </div>
        <div>
          <div className="text-lg font-bold text-foreground">{uniquePercent.toFixed(1)}%</div>
          <div className="text-xs text-muted">Unique</div>
        </div>
        <div>
          <div className="text-lg font-bold text-foreground">{column.total_count - column.null_count}</div>
          <div className="text-xs text-muted">Non-null</div>
        </div>
      </div>

      {histogramData.length > 0 && (
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histogramData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="rgba(254,250,239,0.05)" />
              <XAxis dataKey="bin" stroke="#8a9bc4" fontSize={10} />
              <YAxis stroke="#8a9bc4" fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(26, 42, 94, 0.95)",
                  border: "1px solid rgba(254,250,239,0.1)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" fill="#00D4D4" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}

function CorrelationHeatmap({ correlations, matrix, numeric_columns }: CorrelationResponse) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const numericColumns = numeric_columns || [];
  const safeMatrix = matrix || [];
  const safeCorrelations = correlations || [];

  const cellData = numericColumns.flatMap((colY, y) =>
    numericColumns.map((colX, x) => ({
      x: colX,
      y: colY,
      value: safeMatrix[y]?.[x] ?? 0,
    }))
  );

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className="rounded-xl border border-border/60 bg-surface p-4"
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">Correlation Matrix</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={numericColumns.map((col, i) => ({
            column: col,
            ...numericColumns.reduce((acc, colY, j) => {
              acc[colY] = safeMatrix[i]?.[j] ?? 0;
              return acc;
            }, {} as Record<string, number>),
          }))}>
            <PolarGrid />
            <PolarAngleAxis dataKey="column" stroke="#8a9bc4" fontSize={10} />
            <PolarRadiusAxis angle={30} domain={[-1, 1]} stroke="#8a9bc4" fontSize={10} />
            {numericColumns.map((col, i) => (
              <Radar
                key={col}
                name={col}
                dataKey={col}
                stroke={col === numericColumns[0] ? "#00D4D4" : col === numericColumns[1] ? "#1FA7A0" : "#35C98A"}
                fill={col === numericColumns[0] ? "#00D4D4" : col === numericColumns[1] ? "#1FA7A0" : "#35C98A"}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            ))}
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(26, 42, 94, 0.95)",
                border: "1px solid rgba(254,250,239,0.1)",
                borderRadius: "8px",
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {safeCorrelations.slice(0, 6).map((c, i) => {
          const absCorr = Math.abs(c.correlation);
          return (
            <div key={i} className="rounded-lg border border-border/60 px-3 py-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted">{c.column_1} ↔ {c.column_2}</span>
                <Badge variant={absCorr > 0.7 ? "success" : absCorr > 0.4 ? "secondary" : "outline"}>
                  {c.correlation.toFixed(3)}
                </Badge>
              </div>
              <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${absCorr * 100}%`,
                    backgroundColor: absCorr > 0.7 ? "#35C98A" : absCorr > 0.4 ? "#00D4D4" : "#1FA7A0",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function InsightCard({ insight, index }: { insight: any; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });
  const Icon = severityIcons[insight.severity as keyof typeof severityIcons] || Activity;
  const iconColor = severityColors[insight.severity as keyof typeof severityColors] || "text-primary";
  const bgColor = severityBgColors[insight.severity as keyof typeof severityBgColors] || "bg-muted/10 border-border/60";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`rounded-xl border p-4 ${bgColor}`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant={insight.severity === "high" ? "danger" : insight.severity === "medium" ? "warning" : "secondary"}>
              {insight.severity}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {insight.type}
            </Badge>
          </div>
          <h4 className="font-medium text-foreground mb-1">{insight.title}</h4>
          <p className="text-sm text-muted mb-2">{insight.description}</p>
          {insight.recommendation && (
            <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-muted/20">
              <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted">{insight.recommendation}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ReportSection({ section, index }: { section: any; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const isJson = typeof section.content === "object";
  const contentStr = typeof section.content === "string" ? section.content : JSON.stringify(section.content, null, 2);
  const sectionType = section.type || "text";

  const getSectionIcon = (type: string) => {
    switch (type) {
      case "summary": return FileText;
      case "statistics": return BarChart3;
      case "recommendations": return Sparkles;
      case "correlations": return Activity;
      case "distributions": return TrendingUp;
      default: return FileText;
    }
  };

  const SectionIcon = getSectionIcon(sectionType);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="rounded-xl border border-border/60 bg-surface p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <SectionIcon className="w-4 h-4 text-primary" />
        <h3 className="font-medium text-foreground">{section.title}</h3>
        {sectionType && (
          <Badge variant="outline" className="text-xs">
            {sectionType}
          </Badge>
        )}
      </div>
      <div className="mt-3 rounded-lg bg-muted/30 p-3 overflow-auto max-h-80">
        {isJson ? (
          <pre className="whitespace-pre-wrap break-words text-xs leading-5 text-muted font-mono">
            {contentStr}
          </pre>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm text-muted">
            {contentStr}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function FullAnalysisReport({ report }: { report: AnalysisReport }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const stats = [
    { label: "Total Rows", value: report.row_count.toLocaleString(), icon: Activity },
    { label: "Total Columns", value: report.column_count.toString(), icon: BarChart3 },
    { label: "Correlations", value: report.correlations?.length?.toString() ?? "0", icon: TrendingUp },
    { label: "AI Insights", value: report.ai_insights?.length?.toString() ?? "0", icon: Sparkles },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Report Header Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="rounded-xl border border-border/60 bg-surface p-4 text-center"
            >
              <div className="flex justify-center mb-2">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted">{stat.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Report Sections */}
      <div className="space-y-4">
        {report.sections.map((section, i) => (
          <ReportSection key={i} section={section} index={i} />
        ))}
      </div>
    </motion.div>
  );
}

export function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("dataset") ?? "";
  const { data: datasetsData, isLoading } = useDatasets(1, 100);

  const [profile, setProfile] = useState<DatasetProfileResponse | null>(null);
  const [correlations, setCorrelations] = useState<CorrelationResponse | null>(null);
  const [insights, setInsights] = useState<AIInsightResponse | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);

  const isVerificationError = error?.includes("verify your email");

  const resendVerification = async () => {
    setResendLoading(true);
    try {
      await api.forgotPassword("");
      setError("Verification email sent! Please check your inbox.");
    } catch {
      setError("Failed to send verification email. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const runAction = async (action: "profile" | "correlate" | "insights" | "analyze") => {
    if (!selectedId) return;
    setLoading(action);
    setError(null);
    try {
      if (action === "profile") {
        const r = await api.profileDataset(selectedId);
        if ("columns" in r) setProfile(r);
      } else if (action === "correlate") {
        const r = await api.correlateDataset(selectedId);
        if ("correlations" in r) setCorrelations(r);
      } else if (action === "insights") {
        const r = await api.generateInsights(selectedId);
        if ("insights" in r) setInsights(r);
      } else {
        const r = await api.analyzeDataset(selectedId);
        if ("sections" in r) setReport(r);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Profile, correlate, and generate AI insights from your data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Dataset</CardTitle>
          <CardDescription>Choose a dataset to run analytics on</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedId} onValueChange={(v) => setSearchParams({ dataset: v })}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Select a dataset" />
            </SelectTrigger>
            <SelectContent>
              {(datasetsData?.items ?? []).map((ds) => (
                <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!selectedId ? (
        <EmptyState
          icon={TrendingUp}
          title="Select a dataset"
          description="Choose a dataset above to start running analytics."
        />
      ) : (
        <>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border px-4 py-3 text-sm ${
                isVerificationError
                  ? "border-accent/30 bg-accent/5 text-accent"
                  : "border-danger/20 bg-danger/5 text-danger"
              }`}
            >
              <div className="flex items-start gap-2">
                {isVerificationError ? (
                  <Mail className="size-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="size-4 mt-0.5 flex-shrink-0" />
                )}
                <span className="flex-1">{error}</span>
              </div>
              {isVerificationError && (
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resendVerification}
                    disabled={resendLoading}
                  >
                    {resendLoading ? (
                      <RefreshCw className="size-4 animate-spin mr-1" />
                    ) : (
                      <Mail className="size-4 mr-1" />
                    )}
                    Resend Verification Email
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { key: "profile" as const, label: "Profile Data", icon: TrendingUp, desc: "Column statistics & distributions" },
              { key: "correlate" as const, label: "Correlations", icon: BarChart3, desc: "Find relationships between columns" },
              { key: "insights" as const, label: "AI Insights", icon: Sparkles, desc: "AI-powered anomaly detection" },
              { key: "analyze" as const, label: "Full Analysis", icon: Activity, desc: "Complete report with all analyses" },
            ].map((action) => (
              <motion.div
                key={action.key}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-6 w-full"
                  onClick={() => runAction(action.key)}
                  disabled={loading !== null}
                >
                  {loading === action.key ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <action.icon className="size-5 text-primary" />
                  )}
                  <div className="text-center">
                    <div className="font-medium">{action.label}</div>
                    <div className="text-xs text-muted mt-1">{action.desc}</div>
                  </div>
                </Button>
              </motion.div>
            ))}
          </div>

          {profile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Dataset Profile</CardTitle>
                  <CardDescription>
                    {profile.row_count} rows · {profile.column_count} columns · Generated {new Date(profile.generated_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {profile.columns.map((col, i) => (
                      <ColumnProfileCard key={col.column_name} column={col} index={i} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {correlations && correlations.correlations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Correlation Analysis</CardTitle>
                  <CardDescription>
                    {correlations.numeric_columns.length} numeric columns analyzed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CorrelationHeatmap
                    correlations={correlations.correlations}
                    matrix={correlations.matrix}
                    numeric_columns={correlations.numeric_columns}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {insights && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>AI Insights</CardTitle>
                  <CardDescription>{insights.summary}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {insights.insights.map((item, i) => (
                      <InsightCard key={i} insight={item} index={i} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {report && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Full Analysis Report</CardTitle>
                  <CardDescription>
                    {report.row_count} rows · {report.column_count} columns · Generated {new Date(report.generated_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FullAnalysisReport report={report} />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
