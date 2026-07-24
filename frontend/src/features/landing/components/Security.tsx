import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Shield, Lock, Fingerprint, Server, Eye, FileCheck, Globe, Clock } from "lucide-react";

const securityFeatures = [
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description: "AES-256 encryption for data at rest and TLS 1.3 for data in transit.",
  },
  {
    icon: Fingerprint,
    title: "Multi-Factor Auth",
    description: "Support for SSO, SAML 2.0, OAuth 2.0, and hardware security keys.",
  },
  {
    icon: Server,
    title: "SOC 2 Type II",
    description: "Independently audited security controls with annual recertification.",
  },
  {
    icon: Eye,
    title: "Audit Logging",
    description: "Immutable audit trails with 7-year retention and tamper detection.",
  },
  {
    icon: FileCheck,
    title: "GDPR & CCPA Compliant",
    description: "Built-in data subject rights management and automated compliance reporting.",
  },
  {
    icon: Globe,
    title: "Regional Data Residency",
    description: "Choose where your data lives with region-specific deployment options.",
  },
];

const certifications = ["SOC 2 Type II", "ISO 27001", "GDPR", "HIPAA", "PCI DSS", "CCPA"];

export default function Security() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section id="security" className="relative py-32">
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-[#b9915e]/5 rounded-full blur-[150px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div ref={ref} className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-[#b9915e] mb-6">
              <Shield className="w-4 h-4" />
              Enterprise Security
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Security You Can{" "}
              <span className="gradient-text">Trust</span>
            </h2>
            <p className="text-lg text-[#c4d4f0] mb-8 leading-relaxed">
              Your data is protected by the same security standards used by the world's largest financial institutions.
            </p>

            {/* Certifications */}
            <div className="flex flex-wrap gap-2 mb-8">
              {certifications.map((cert) => (
                <motion.div
                  key={cert}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.4 }}
                  className="px-4 py-2 rounded-lg glass border border-[#fefaef]/5 text-sm font-medium text-[#c4d4f0]"
                >
                  {cert}
                </motion.div>
              ))}
            </div>

            <div className="flex items-center gap-3 text-sm text-[#c4d4f0]">
              <Clock className="w-4 h-4" />
              99.99% uptime SLA with 24/7 monitoring
            </div>
          </motion.div>

          {/* Right - Security Features Grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {securityFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                  whileHover={{ y: -4 }}
                  className="group rounded-2xl glass border border-[#fefaef]/5 p-5 hover:border-[#fefaef]/10 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#b9915e]/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5 text-[#b9915e]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#fefaef] mb-1">{feature.title}</h3>
                  <p className="text-xs text-[#c4d4f0] leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
