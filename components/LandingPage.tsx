import React from 'react';

interface LandingPageProps {
  onStart: () => void;
  isLoading: boolean;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart, isLoading }) => {
  return (
    <div className="relative w-full h-full overflow-y-auto overflow-x-hidden no-scrollbar">
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-40 px-6 py-4 flex justify-between items-center backdrop-blur-md bg-galaxy-950/30 border-b border-white/5">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-galaxy-accent to-purple-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="text-white font-bold tracking-wide text-sm md:text-base">GALAXY HOSPITALITY</span>
        </div>
        <div className="hidden md:flex gap-8 text-sm text-gray-400 font-medium">
            <span className="hover:text-white cursor-pointer transition-colors">Suites</span>
            <span className="hover:text-white cursor-pointer transition-colors">Experience</span>
            <span className="hover:text-white cursor-pointer transition-colors">Concierge AI</span>
        </div>
        <button className="px-4 py-2 rounded-full border border-galaxy-accent/30 text-galaxy-highlight text-xs font-bold hover:bg-galaxy-accent/10 transition-all">
            LOGIN
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-10 text-center">
        
        {/* Floating Tag */}
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-galaxy-800/50 border border-galaxy-accent/20 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-[10px] md:text-xs font-mono text-galaxy-highlight uppercase tracking-wider">
                System Online • Low Latency
            </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white mb-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            The Future of <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-galaxy-highlight via-galaxy-accent to-purple-500 text-glow">
                Living.
            </span>
        </h1>

        <p className="max-w-xl text-gray-400 text-lg md:text-xl mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-100">
            Experience El Cabañal's premier autonomous luxury suites. 
            Managed by <span className="text-white font-semibold">Sandra IA</span>, powered by Gemini & Veo technology.
        </p>

        {/* CTA Button */}
        <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            <button
                onClick={onStart}
                disabled={isLoading}
                className={`
                    group relative inline-flex items-center justify-center px-8 py-4 text-base md:text-lg font-bold text-white transition-all duration-300 
                    bg-white/5 border border-white/10 backdrop-blur-xl font-pj rounded-full overflow-hidden
                    hover:bg-white/10 hover:border-galaxy-accent/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]
                    ${isLoading ? 'cursor-wait opacity-80' : ''}
                `}
            >
                <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-galaxy-accent rounded-full group-hover:w-56 group-hover:h-56 opacity-10"></span>
                
                {isLoading ? (
                    <span className="flex items-center gap-3">
                         <svg className="animate-spin h-5 w-5 text-galaxy-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Connecting to Galaxy...
                    </span>
                ) : (
                    <span className="flex items-center gap-3 relative z-10">
                        <span>Talk to Sandra</span>
                        <div className="w-8 h-8 rounded-full bg-galaxy-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </div>
                    </span>
                )}
            </button>
        </div>

        {/* Floating UI Element (Veo Simulation) */}
        <div className="absolute bottom-10 right-4 md:right-10 flex flex-col items-end gap-2 opacity-60 hidden md:flex">
             <span className="text-[10px] uppercase tracking-widest text-galaxy-highlight">Environment generated by Veo 3.1</span>
             <div className="w-32 h-1 bg-gray-800 rounded-full overflow-hidden">
                 <div className="h-full bg-galaxy-accent w-2/3 animate-pulse"></div>
             </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-20 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="glass-card p-8 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-galaxy-accent/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-galaxy-accent/20"></div>
                  <h3 className="text-xl font-bold text-white mb-2">Instant Check-in</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                      No waiting lines. Your face is your key. The Galaxy system verifies your identity securely in seconds.
                  </p>
                  <div className="mt-6 flex items-center text-xs text-galaxy-highlight font-mono">
                      <span>SECURE PROTOCOL</span>
                      <span className="mx-2">•</span>
                      <span>ENCRYPTED</span>
                  </div>
              </div>

              {/* Feature 2 */}
              <div className="glass-card p-8 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-purple-500/20"></div>
                  <h3 className="text-xl font-bold text-white mb-2">Real-time Negotiation</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                      Powered by BridgeData. Discuss prices, extend your stay, or request upgrades directly with Sandra IA.
                  </p>
                  <div className="mt-6 flex items-center text-xs text-purple-400 font-mono">
                      <span>LIVE MARKET DATA</span>
                      <span className="mx-2">•</span>
                      <span>ACTIVE</span>
                  </div>
              </div>

               {/* Feature 3 */}
               <div className="glass-card p-8 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-blue-500/20"></div>
                  <h3 className="text-xl font-bold text-white mb-2">Local Guide</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                      Discover El Cabañal like a local. Sandra creates custom itineraries based on real-time events.
                  </p>
                  <div className="mt-6 flex items-center text-xs text-blue-400 font-mono">
                      <span>GEMINI GROUNDING</span>
                      <span className="mx-2">•</span>
                      <span>MAPS</span>
                  </div>
              </div>
          </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center border-t border-white/5 bg-black/20">
          <p className="text-gray-500 text-xs">
              © 2024 Galaxy Hospitality. Powered by Google Cloud Vertex AI.
          </p>
      </footer>
    </div>
  );
};

export default LandingPage;