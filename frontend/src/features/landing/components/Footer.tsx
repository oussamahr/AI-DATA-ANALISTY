import { Brain, Github, Twitter, Linkedin, Mail } from "lucide-react";

const footerLinks = {
  Product: ["Features", "Pricing", "Integrations", "Changelog", "Roadmap"],
  Company: ["About", "Blog", "Careers", "Press", "Partners"],
  Resources: ["Documentation", "API Reference", "Guides", "Community", "Support"],
  Legal: ["Privacy", "Terms", "Security", "Cookies", "Compliance"],
};

export default function Footer() {
  return (
    <footer className="relative border-t border-[#fefaef]/5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-6 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#182350] to-[#afd2fa] flex items-center justify-center">
                <Brain className="w-5 h-5 text-[#fefaef]" />
              </div>
              <span className="text-lg font-bold">
                Neural<span className="gradient-text">ytics</span>
              </span>
            </a>
            <p className="text-sm text-[#c4d4f0] mb-6 max-w-xs">
              AI-powered analytics platform that transforms raw data into actionable intelligence for modern teams.
            </p>
            <div className="flex items-center gap-3">
              {[Github, Twitter, Linkedin, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-lg glass flex items-center justify-center text-[#c4d4f0] hover:text-[#fefaef] hover:bg-[#fefaef]/10 transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-[#fefaef] mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-[#c4d4f0] hover:text-[#fefaef] transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-[#fefaef]/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#c4d4f0]">
            © 2026 Neuralytics. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm text-[#c4d4f0]">
            <span className="w-2 h-2 rounded-full bg-[#b9915e] animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
