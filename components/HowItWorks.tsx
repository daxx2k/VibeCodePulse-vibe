
import React from 'react';

interface HowItWorksProps {
  onClose: () => void;
}

const HowItWorks: React.FC<HowItWorksProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="h-16 flex-shrink-0 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-8">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">System Architecture</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar flex-1 space-y-12">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-cyan-600/10 flex items-center justify-center text-cyan-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">01. Grounding Engine</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed pl-11">
              VibeCodePulse uses <strong>Gemini-3-Flash</strong> with <strong>Google Search Grounding</strong>. It performs real-time crawls of GitHub, Reddit, and X to find signals that traditional RSS feeds miss.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">02. Security & Privacy</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed pl-11">
              API Keys are managed via <strong>Environment Variables</strong> and are never hardcoded. In production, this architecture supports backend-proxying to ensure your credentials remain invisible to the client-side.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">03. Targeted Deep Sync</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed pl-11">
              Switching filters to a specific tool (like <strong>Claude Code</strong>) triggers a "Deep Sync." The AI modifies its search intent to hunt for niche bug reports, experimental gists, and advanced community tutorials.
            </p>
          </section>

          <div className="p-6 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Pro Tip</p>
             <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed italic">
               The "Vibe Briefing" at the top of the feed is context-aware. It will summarize the current "pulse" of exactly what you have filtered in the sidebar.
             </p>
          </div>
        </div>

        <footer className="h-16 flex-shrink-0 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end px-8">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all"
          >
            Acknowledge
          </button>
        </footer>
      </div>
    </div>
  );
};

export default HowItWorks;
