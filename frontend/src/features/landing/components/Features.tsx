import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Brain, Zap, Shield, Globe, BarChart3, Workflow, Layers, Sparkles } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Predictive AI",
    description: "Machine learning models that forecast trends, detect anomalies, and predict outcomes with 94% accuracy.",
    color: "from-[#182350] to-[#182350]-light",
    glow: "shadow-[#afd2fa]/30",
  },
  {
    icon: Zap,
    title: "Real-Time Processing",
    description: "Process millions of events per second with sub-millisecond latency. Your data never sleeps.",
    color: "from-[#b9915e] to-[#b9915e]/70",
    glow: "shadow-[#b9915e]/30",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "SOC 2 Type II certified with end-to-end encryption, RBAC, and audit trails for complete compliance.",
    color: "from-[#b9915e] to-[#b9915e]/70",
    glow: "shadow-[#b9915e]/30",
  },
  {
    icon: Globe,
    title: "Global Scale",
    description: "Deploy across 30+ regions with automatic failover and 99.99% uptime SLA guarantee.",
    color: "from-[#afd2fa] to-[#afd2fa]/70",
    glow: "shadow-[#afd2fa]/30",
  },
  {
    icon: BarChart3,
    title: "Advanced Visualization",
    description: "Interactive dashboards with 50+ chart types, custom themes, and embedded analytics.",
    color: "from-purple-500 to-purple-400",
    glow: "shadow-purple-500/30",
  },
  {
    icon: Workflow,
    title: "Automated Workflows",
    description: "Build no-code data pipelines with drag-and-drop interface and 200+ pre-built integrations.",
    color: "from-pink-500 to-pink-400",
    glow: "shadow-pink-500/30",
  },
  {
    icon: Layers,
    title: "Data Unification",
    description: "Connect 500+ data sources into a single semantic layer with automatic schema discovery.",
    color: "from-cyan-500 to-cyan-400",
    glow: "shadow-cyan-500/30",
  },
  {
    icon: Sparkles,
    title: "Natural Language",
    description: "Ask questions in plain English. Our AI translates queries into SQL and returns insights instantly.",
    color: "from-amber-500 to-amber-400",
    glow: "shadow-amber-500/30",
  },
];

function FeatureCard({ feature, index }: { feature: (typeof features)[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className="group relative"
    >
      <div className="relative h-full rounded-2xl glass p-6 border border-[#fefaef]/5 hover:border-[#fefaef]/10 transition-all duration-500 overflow-hidden">
        {/* Glow effect on hover */}
        <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500`} />

        {/* Icon */}
        <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg ${feature.glow} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-6 h-6 text-[#fefaef]" />
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-[#fefaef] mb-2 group-hover:text-[#afd2fa]-light transition-colors">
          {feature.title}
        </h3>
        <p className="text-sm text-[#c4d4f0] leading-relaxed">
          {feature.description}
        </p>

        {/* Corner accent */}
        <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${feature.color} opacity-0 group-hover:opacity-5 rounded-tr-2xl transition-opacity duration-500`} />
      </div>
    </motion.div>
  );
}

export default function Features() {
  const headerRef = useRef<HTMLDivElement>(null);
  const isHeaderInView = useInView(headerRef, { once: true });

  return (
    <section id="features" className="relative py-32">
      {/* Background accent */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#182350]/5 rounded-full blur-[150px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center max-w-2xl mx-auto mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-[#afd2fa]-light mb-6">
            <Sparkles className="w-4 h-4" />
            Powerful Capabilities
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Everything You Need to{" "}
            <span className="gradient-text">Win with Data</span>
          </h2>
          <p className="text-lg text-[#c4d4f0]">
            A complete analytics platform powered by cutting-edge AI, designed for teams that demand more from their data.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
