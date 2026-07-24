export interface MetricCard {
  id: string;
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: string;
}

export interface ChartData {
  name: string;
  value: number;
  value2?: number;
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  type: "trend" | "anomaly" | "prediction" | "recommendation";
  confidence: number;
  timestamp: string;
}
