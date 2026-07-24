import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { TrendingUp, Users, DollarSign, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

const areaData = [
  { name: "Jan", revenue: 4000, users: 2400 },
  { name: "Feb", revenue: 3000, users: 1398 },
  { name: "Mar", revenue: 2000, users: 9800 },
  { name: "Apr", revenue: 2780, users: 3908 },
  { name: "May", revenue: 1890, users: 4800 },
  { name: "Jun", revenue: 2390, users: 3800 },
  { name: "Jul", revenue: 3490, users: 4300 },
  { name: "Aug", revenue: 4200, users: 5100 },
  { name: "Sep", revenue: 3800, users: 4700 },
  { name: "Oct", revenue: 5100, users: 6200 },
  { name: "Nov", revenue: 5800, users: 7100 },
  { name: "Dec", revenue: 6500, users: 8400 },
];

const barData = [
  { name: "Mon", desktop: 65, mobile: 45 },
  { name: "Tue", desktop: 78, mobile: 52 },
  { name: "Wed", desktop: 90, mobile: 61 },
  { name: "Thu", desktop: 81, mobile: 58 },
  { name: "Fri", desktop: 95, mobile: 72 },
  { name: "Sat", desktop: 55, mobile: 85 },
  { name: "Sun", desktop: 48, mobile: 78 },
];

const pieData = [
  { name: "Direct", value: 35, color: "#182350" },
  { name: "Social", value: 25, color: "#afd2fa" },
  { name: "Organic", value: 20, color: "#b9915e" },
  { name: "Referral", value: 15, color: "#b9915e" },
  { name: "Email", value: 5, color: "#b9915e" },
];

const lineData = [
  { name: "00:00", value: 120 },
  { name: "04:00", value: 80 },
  { name: "08:00", value: 340 },
  { name: "12:00", value: 520 },
  { name: "16:00", value: 480 },
  { name: "20:00", value: 390 },
  { name: "23:59", value: 210 },
];

const metrics = [
  {
    title: "Total Revenue",
    value: "$2,847,392",
    change: 12.5,
    icon: DollarSign,
    color: "text-[#b9915e]",
    bgColor: "bg-[#b9915e]/10",
    borderColor: "border-[#b9915e]/20",
  },
  {
    title: "Active Users",
    value: "48,291",
    change: 8.3,
    icon: Users,
    color: "text-[#afd2fa]-light",
    bgColor: "bg-[#182350]/10",
    borderColor: "border-[#afd2fa]/20",
  },
  {
    title: "Conversion Rate",
    value: "3.82%",
    change: -2.1,
    icon: TrendingUp,
    color: "text-[#afd2fa]",
    bgColor: "bg-[#afd2fa]/10",
    borderColor: "border-[#afd2fa]/20",
  },
  {
    title: "Avg. Session",
    value: "4m 32s",
    change: 5.7,
    icon: Activity,
    color: "text-[#b9915e]",
    bgColor: "bg-[#b9915e]/10",
    borderColor: "border-[#b9915e]/20",
  },
];

function MetricCard({ metric, index }: { metric: (typeof metrics)[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });
  const Icon = metric.icon;
  const isPositive = metric.change >= 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group"
    >
      <div
        className={cn(
          "relative rounded-2xl glass p-5 border transition-all duration-300",
          metric.borderColor,
          "hover:border-[#fefaef]/20",
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", metric.bgColor)}>
            <Icon className={cn("w-5 h-5", metric.color)} />
          </div>
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
              isPositive ? "bg-[#b9915e]/10 text-[#b9915e]" : "bg-[#c4755e]/10 text-[#c4755e]",
            )}
          >
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(metric.change)}%
          </div>
        </div>
        <div className="text-2xl font-bold text-[#fefaef] mb-1">{metric.value}</div>
        <div className="text-sm text-[#c4d4f0]">{metric.title}</div>

        {/* Hover glow */}
        <div
          className={cn(
            "absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500",
            metric.bgColor.replace("/10", "/20"),
          )}
        />
      </div>
    </motion.div>
  );
}

function ChartCard({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className="rounded-2xl glass border border-[#fefaef]/5 p-6 hover:border-[#fefaef]/10 transition-colors"
    >
      <h3 className="text-lg font-semibold text-[#fefaef] mb-6">{title}</h3>
      {children}
    </motion.div>
  );
}

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("7d");

  return (
    <section id="analytics" className="relative py-32">
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#afd2fa]/5 rounded-full blur-[150px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-[#afd2fa]-light mb-4">
              <TrendingUp className="w-4 h-4" />
              Live Analytics
            </div>
            <h2 className="text-4xl md:text-5xl font-bold">
              Your Data, <span className="gradient-text">Visualized</span>
            </h2>
          </div>

          {/* Time Range Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl glass">
            {["24h", "7d", "30d", "90d"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                  timeRange === range
                    ? "bg-[#182350] text-[#fefaef] shadow-lg shadow-[#afd2fa]/25"
                    : "text-[#c4d4f0] hover:text-[#fefaef]",
                )}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metrics.map((metric, index) => (
            <MetricCard key={metric.title} metric={metric} index={index} />
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <ChartCard title="Revenue vs Users" delay={0.2}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#182350" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#182350" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#afd2fa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#afd2fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(254,250,239,0.05)" />
                <XAxis dataKey="name" stroke="#8a9bc4" fontSize={12} />
                <YAxis stroke="#8a9bc4" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(18, 18, 26, 0.95)",
                    border: "1px solid rgba(254,250,239,0.1)",
                    borderRadius: "12px",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#182350" strokeWidth={2} fill="url(#revenueGrad)" />
                <Area type="monotone" dataKey="users" stroke="#afd2fa" strokeWidth={2} fill="url(#usersGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Traffic Sources */}
          <ChartCard title="Traffic Sources" delay={0.3}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(10,10,15,0.8)" strokeWidth={3} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(18, 18, 26, 0.95)",
                    border: "1px solid rgba(254,250,239,0.1)",
                    borderRadius: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-[#c4d4f0]">{item.name}</span>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Device Breakdown */}
          <ChartCard title="Device Breakdown" delay={0.4}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(254,250,239,0.05)" />
                <XAxis dataKey="name" stroke="#8a9bc4" fontSize={12} />
                <YAxis stroke="#8a9bc4" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(18, 18, 26, 0.95)",
                    border: "1px solid rgba(254,250,239,0.1)",
                    borderRadius: "12px",
                  }}
                />
                <Legend />
                <Bar dataKey="desktop" fill="#182350" radius={[4, 4, 0, 0]} />
                <Bar dataKey="mobile" fill="#afd2fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Live Activity */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-6 rounded-2xl glass border border-[#fefaef]/5 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#fefaef]">Live Activity</h3>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#b9915e] animate-pulse" />
              <span className="text-xs text-[#c4d4f0]">Real-time</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(254,250,239,0.05)" />
              <XAxis dataKey="name" stroke="#8a9bc4" fontSize={12} />
              <YAxis stroke="#8a9bc4" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "rgba(18, 18, 26, 0.95)",
                  border: "1px solid rgba(254,250,239,0.1)",
                  borderRadius: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#b9915e"
                strokeWidth={2}
                dot={{ fill: "#b9915e", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: "#b9915e", stroke: "#fff", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </section>
  );
}
