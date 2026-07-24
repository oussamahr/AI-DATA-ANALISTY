import Hero from "@/features/landing/components/Hero";
import Features from "@/features/landing/components/Features";
import Analytics from "@/features/landing/components/Analytics";
import AIInsights from "@/features/landing/components/AIInsights";
import Security from "@/features/landing/components/Security";
import CTA from "@/features/landing/components/CTA";
import Footer from "@/features/landing/components/Footer";

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <Analytics />
      <AIInsights />
      <Security />
      <CTA />
      <Footer />
    </>
  );
}
