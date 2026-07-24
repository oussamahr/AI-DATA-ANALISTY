import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Brain, TrendingUp, AlertTriangle, Lightbulb, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const insights = [
  {
    id: "1",
    title: "Revenue Spike Detected",
    description:
      "Q4 revenue projection shows 34% increase driven by enterprise segment growth. Recommend increasing sales team capacity by 15%.",
    type: "trend" as const,
    confidence: 94,
    timestamp: "2 min ago",
    icon: TrendingUp,
    color: "text-[#b9915e]",
    bgColor: "bg-[#b9915e]/10",
    borderColor: "border-[#b9915e]/20",
  },
  {
    id: "2",
    title: "Anomaly in User Behavior",
    description:
      "Mobile app session duration dropped 18% on iOS devices after latest update. Investigation recommended.",
    type: "anomaly" as const,
    confidence: 87,
    timestamp: "15 min ago",
    icon: AlertTriangle,
    color: "text-[#b9915e]",
    bgColor: "bg-[#b9915e]/10",
    borderColor: "border-[#b9915e]/20",
  },
  {
    id: "3",
    title: "Churn Risk Prediction",
    description:
      "ML model identifies 247 high-value accounts at risk of churning within 30 days. Proactive outreach suggested.",
    type: "prediction" as const,
    confidence: 91,
    timestamp: "1 hour ago",
    icon: Brain,
    color: "text-[#c4755e]",
    bgColor: "bg-[#c4755e]/10",
    borderColor: "border-[#c4755e]/20",
  },
  {
    id: "4",
    title: "Optimization Opportunity",
    description:
      "A/B test results show 12% conversion lift with new checkout flow. Recommend full rollout to production.",
    type: "recommendation" as const,
    confidence: 96,
    timestamp: "3 hours ago",
    icon: Lightbulb,
    color: "text-[#afd2fa]-light",
    bgColor: "bg-[#182350]/10",
    borderColor: "border-[#afd2fa]/20",
  },
];

const typeLabels = {
  trend: "Trend",
  anomaly: "Anomaly",
  prediction: "Prediction",
  recommendation: "Recommendation",
};

function InsightCard({ insight, index }: { insight: (typeof insights)[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });
  const Icon = insight.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      className="group"
    >
      <div
        className={cn(
          "relative rounded-2xl glass p-6 border transition-all duration-300",
          insight.borderColor,
          "hover:border-[#fefaef]/20",
        )}
      >
        <div className="flex items-start gap-4">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", insight.bgColor)}>
            <Icon className={cn("w-6 h-6", insight.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", insight.bgColor, insight.color)}>
                {typeLabels[insight.type]}
              </span>
              <span className="text-xs text-[#c4d4f0] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {insight.timestamp}
              </span>
            </div>
            <h3 className="text-base font-semibold text-[#fefaef] mb-2">{insight.title}</h3>
            <p className="text-sm text-[#c4d4f0] leading-relaxed">{insight.description}</p>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 h-1.5 rounded-full bg-[#fefaef]/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={isInView ? { width: `${insight.confidence}%` } : {}}
                  transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                  className={cn("h-full rounded-full", insight.color.replace("text-", "bg-"))}
                />
              </div>
              <span className="text-xs text-[#c4d4f0]">{insight.confidence}% confidence</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function AIInsights() {
  const headerRef = useRef<HTMLDivElement>(null);
  const isHeaderInView = useInView(headerRef, { once: true });

  return (
    <section id="insights" className="relative py-32">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#182350]/5 rounded-full blur-[200px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-[#afd2fa] mb-6">
            <Brain className="w-4 h-4" />
            AI-Powered Intelligence
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Insights That <span className="gradient-text">Anticipate</span>
          </h2>
          <p className="text-lg text-[#c4d4f0] max-w-2xl mx-auto">
            Our AI continuously analyzes your data to surface actionable insights before you even ask.
          </p>
        </motion.div>

        <div className="space-y-4">
          {insights.map((insight, index) => (
            <InsightCard key={insight.id} insight={insight} index={index} />
          ))}
        </div>

        {/* AI Status Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 rounded-2xl glass border border-[#fefaef]/5 p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#182350] to-[#afd2fa] flex items-center justify-center">
                <Brain className="w-5 h-5 text-[#fefaef]" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#b9915e] border-2 border-background" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#fefaef]">Neural Engine Active</div>
              <div className="text-xs text-[#c4d4f0]">Processing 2.4M data points / sec</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#c4d4f0]">
            <CheckCircle className="w-4 h-4 text-[#b9915e]" />
            All systems operational
          </div>
        </motion.div>
      </div>
    </section>
  );
}
