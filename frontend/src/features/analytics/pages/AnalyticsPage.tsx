import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, BarChart2, Activity, Play } from "lucide-react";

export function AnalyticsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">AI Analytics</h2>
        <p className="text-muted-foreground mt-1">Run automated insights and correlations on your datasets.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center mb-2">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Data Profiling</CardTitle>
            <CardDescription>Automatically detect data types, missing values, and anomalies.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <Play className="mr-2 h-4 w-4" /> Run Profile
            </Button>
          </CardContent>
        </Card>
        
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center mb-2">
              <LineChart className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Correlation Analysis</CardTitle>
            <CardDescription>Find hidden relationships between features in your dataset.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="secondary">
              <Play className="mr-2 h-4 w-4" /> Analyze
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center mb-2">
              <BarChart2 className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Trend Prediction</CardTitle>
            <CardDescription>Use ML models to forecast future trends based on historical data.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="secondary">
              <Play className="mr-2 h-4 w-4" /> Forecast
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mb-4 opacity-20" />
            <p>No reports generated yet</p>
            <p className="text-sm">Run an analysis above to see results here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}