export interface BarChartData {
  chart_type: string;
  title: string;
  labels: string[];
  datasets: Array<{ label: string; data: Array<number | string | null>; background_color?: string | string[] }>;
}

export interface HistogramData {
  chart_type: string;
  title: string;
  bins: Array<{ bin_start: number; bin_end: number; count: number }>;
  column: string;
}

export interface ScatterPoint { x: number; y: number; label?: string | null }
export interface ScatterData { chart_type: string; title: string; x_column: string; y_column: string; points: ScatterPoint[]; }

export interface LineDataPoint { x: string | number; y: number }
export interface LineSeries { label: string; data: LineDataPoint[] }
export interface LineData { chart_type: string; title: string; series: LineSeries[]; }

export interface HeatmapCell { x: string; y: string; value: number }
export interface HeatmapData { chart_type: string; title: string; x_labels: string[]; y_labels: string[]; cells: HeatmapCell[]; }

export interface PieSlice { label: string; value: number; percent: number }
export interface PieData { chart_type: string; title: string; slices: PieSlice[]; }

export interface PreviewChart { chart_type: string; title: string; data: Record<string, unknown> }
export interface DatasetPreview { dataset_id: string; dataset_name: string; row_count: number; column_count: number; charts: PreviewChart[]; }
