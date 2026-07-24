import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

export default function CTA() {
  const navigate = useNavigate();

  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-[#182350]/20 via-accent/10 to-[#182350]/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-[#afd2fa]-light mb-8">
            <Sparkles className="w-4 h-4" />
            Start Your Free Trial
          </div>

          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Ready to Unlock the{" "}
            <span className="gradient-text-animated">Power of AI</span>?
          </h2>

          <p className="text-lg text-[#c4d4f0] max-w-2xl mx-auto mb-10">
            Join 500+ companies already using Neuralytics to transform their data into competitive advantage. No credit card required.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <motion.button
              onClick={() => navigate("/login")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-[#182350] to-[#182350]-dark text-[#fefaef] font-semibold text-lg shadow-xl shadow-[#afd2fa]/30 hover:shadow-[#afd2fa]/50 transition-all flex items-center gap-2"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 rounded-2xl glass text-[#fefaef] font-semibold text-lg hover:bg-[#fefaef]/10 transition-all"
            >
              Talk to Sales
            </motion.button>
          </div>

          <p className="text-sm text-[#c4d4f0] mt-6">
            14-day free trial · No credit card required · Cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  );
}
