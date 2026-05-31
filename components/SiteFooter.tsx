import BrandLogo from "./BrandLogo";

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-black/20">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div className="space-y-3">
            <BrandLogo size="sm" showTagline={false} />
            <p className="text-sm text-white/40 max-w-xs leading-relaxed">
              Multi-agent trip intelligence for research, optimization, and
              verified cost planning.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div>
              <p className="section-label mb-3">Product</p>
              <ul className="space-y-2 text-white/45">
                <li><a href="#plans-section" className="hover:text-white/80 transition-colors">Plans</a></li>
                <li><a href="#journey-section" className="hover:text-white/80 transition-colors">Journey</a></li>
                <li><a href="#assumptions-section" className="hover:text-white/80 transition-colors">Assumptions</a></li>
              </ul>
            </div>
            <div>
              <p className="section-label mb-3">Capabilities</p>
              <ul className="space-y-2 text-white/45">
                <li>Live route research</li>
                <li>Cost verification</li>
                <li>Deal validation links</li>
              </ul>
            </div>
            <div>
              <p className="section-label mb-3">Built with</p>
              <ul className="space-y-2 text-white/45">
                <li>9 specialist agents</li>
                <li>OpenStreetMap data</li>
                <li>Weights & Biases tracing</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
          <span>© {new Date().getFullYear()} TravelRooks · MIT Hackathon 2026</span>
          <span>Prices are estimates — always verify deals via provided links</span>
        </div>
      </div>
    </footer>
  );
}
