import { Routes, Route } from "react-router-dom";
import ParticleBackground from "@/features/landing/components/ParticleBackground";
import Navigation from "@/features/landing/components/Navigation";
import Home from "@/features/landing/pages/Home";

export default function LandingApp() {
  return (
    <div className="landing-theme relative min-h-screen bg-background text-foreground">
      <ParticleBackground />
      <Navigation />
      <main className="relative z-10">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
    </div>
  );
}
