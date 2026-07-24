import { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, TrendingUp, Activity, Database, Cpu } from "lucide-react";

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);
  const glowX = useTransform(mouseXSpring, [-0.5, 0.5], ["-50%", "50%"]);
  const glowY = useTransform(mouseYSpring, [-0.5, 0.5], ["-50%", "50%"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) / (rect.width / 2) * 0.5);
    y.set((e.clientY - centerY) / (rect.height / 2) * 0.5);
  };

  return (
    <motion.div
      ref={ref}
      className={`perspective-1000 ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        x.set(0);
        y.set(0);
      }}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative w-full h-full"
      >
        {children}
        {isHovered && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${glowX.get()} ${glowY.get()}, rgba(175, 210, 250, 0.15), transparent 60%)`,
            }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

function FloatingIcon({ icon: Icon, delay, x, y }: { icon: any; delay: number; x: string; y: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, type: "spring" }}
      className="absolute"
      style={{ left: x, top: y }}
    >
      <motion.div
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 4, repeat: Infinity, delay, ease: "easeInOut" }}
        className="w-12 h-12 rounded-xl glass flex items-center justify-center glow-powder"
      >
        <Icon className="w-5 h-5 text-[#afd2fa]-light" />
      </motion.div>
    </motion.div>
  );
}

function StatCounter({ value, label, suffix = "" }: { value: number; label: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let start = 0;
          const duration = 2000;
          const increment = value / (duration / 16);
          const timer = setInterval(() => {
            start += increment;
            if (start >= value) {
              setCount(value);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
        }
      },
      { threshold: 0.5 },
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, hasAnimated]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl md:text-4xl font-bold gradient-text-animated">
        {count.toLocaleString()}
        {suffix}
      </div>
      <div className="text-sm text-[#c4d4f0] mt-1">{label}</div>
    </div>
  );
}

export default function Hero() {
  const navigate = useNavigate();
  const [typingText, setTypingText] = useState("");
  const fullText = "Transform raw data into actionable intelligence";
  const typingRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setTypingText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 50);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#182350]/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#afd2fa]/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#182350]/5 rounded-full blur-[150px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left Content */}
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-[#afd2fa]-light mb-6">
              <span className="w-2 h-2 rounded-full bg-[#afd2fa] animate-pulse" />
              AI-Powered Analytics Platform
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight"
          >
            <span className="block">Data That</span>
            <span className="gradient-text-animated">Thinks</span>
            <span className="block mt-2">For You</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg text-[#c4d4f0] max-w-lg leading-relaxed"
          >
            <span ref={typingRef} className="font-mono text-[#afd2fa]">{typingText}</span>
            <span className="animate-pulse text-[#afd2fa]">|</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap gap-4"
          >
            <motion.button
              onClick={() => navigate("/login")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-[#182350] to-[#182350]-dark text-[#fefaef] font-semibold text-lg shadow-xl shadow-[#afd2fa]/30 hover:shadow-[#afd2fa]/50 transition-all flex items-center gap-2"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="grid grid-cols-3 gap-8 pt-8 border-t border-[#fefaef]/10"
          >
            <StatCounter value={500} suffix="+" label="Enterprise Clients" />
            <StatCounter value={99} suffix=".9%" label="Uptime SLA" />
            <StatCounter value={10} suffix="B+" label="Data Points" />
          </motion.div>
        </div>

        {/* Right - 3D Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative hidden lg:block"
        >
          <TiltCard className="h-[500px]">
            <div className="relative w-full h-full rounded-3xl glass overflow-hidden">
              {/* Dashboard Header */}
              <div className="flex items-center gap-2 px-5 py-4 border-b border-[#fefaef]/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#c4755e]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#b9915e]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#b9915e]/80" />
                </div>
                <div className="flex-1 text-center text-xs text-[#c4d4f0] font-mono">neuralytics.dashboard</div>
              </div>

              {/* Dashboard Content */}
              <div className="p-5 space-y-4">
                {/* Metric Cards Row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Revenue", value: "$2.4M", change: "+12.5%", color: "text-[#b9915e]" },
                    { label: "Users", value: "48.2K", change: "+8.3%", color: "text-[#afd2fa]-light" },
                    { label: "Conversion", value: "3.8%", change: "+2.1%", color: "text-[#afd2fa]" },
                  ].map((metric, i) => (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + i * 0.1 }}
                      className="rounded-xl bg-[#fefaef]/5 p-3 border border-[#fefaef]/5"
                    >
                      <div className="text-xs text-[#c4d4f0]">{metric.label}</div>
                      <div className="text-lg font-bold mt-1">{metric.value}</div>
                      <div className={`text-xs ${metric.color} mt-0.5`}>{metric.change}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Chart Area */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                  className="rounded-xl bg-[#fefaef]/5 p-4 border border-[#fefaef]/5 h-40"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[#c4d4f0]">Traffic Overview</span>
                    <div className="flex gap-1">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 rounded-full bg-[#182350]/60"
                          initial={{ height: 8 }}
                          animate={{ height: [8, 20 + Math.random() * 40, 8] }}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-end gap-1 h-20">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 rounded-t-sm bg-gradient-to-t from-[#182350]/40 to-[#afd2fa]/40"
                        initial={{ height: "10%" }}
                        animate={{ height: `${15 + Math.random() * 70}%` }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", delay: i * 0.05 }}
                      />
                    ))}
                  </div>
                </motion.div>

                {/* AI Insight Badge */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.4 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#afd2fa]/10 border border-[#afd2fa]/20"
                >
                  <div className="w-2 h-2 rounded-full bg-[#afd2fa] animate-pulse" />
                  <span className="text-xs text-[#afd2fa] font-mono">AI detected 3 anomalies in your data</span>
                </motion.div>
              </div>

              {/* Shimmer overlay */}
              <div className="absolute inset-0 shimmer pointer-events-none" />
            </div>
          </TiltCard>

          {/* Floating icons around the card */}
          <FloatingIcon icon={TrendingUp} delay={1.5} x="-60px" y="20%" />
          <FloatingIcon icon={Activity} delay={1.8} x="-40px" y="70%" />
          <FloatingIcon icon={Database} delay={2.1} x="calc(100% + 20px)" y="30%" />
          <FloatingIcon icon={Cpu} delay={2.4} x="calc(100% + 40px)" y="60%" />
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-[#fefaef]/20 flex items-start justify-center p-2"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-white/60"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
