
import React from 'react';
import { Category, Theme, ToolType, PlatformType } from '../types';

interface SidebarProps {
  activeCategory: Category;
  setActiveCategory: (cat: Category) => void;
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  activePlatform: PlatformType;
  setActivePlatform: (plat: PlatformType) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onHowItWorks: () => void;
  onShowRadar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeCategory, setActiveCategory, 
  activeTool, setActiveTool, 
  activePlatform, setActivePlatform,
  theme, setTheme,
  onHowItWorks,
  onShowRadar
}) => {
  const sources: Category[] = ['All', 'Official', 'Social', 'Tutorials', 'News', 'Favorites'];
  const tools: ToolType[] = [
    'All Tools', 
    'Claude Code', 
    'Cursor', 
    'Aider', 
    'Windsurf', 
    'Bolt', 
    'v0', 
    'Google AI Studio', 
    'OpenAI', 
    'Replit'
  ];
  const platforms: PlatformType[] = ['All Platforms', 'X', 'Reddit', 'GitHub', 'HackerNews', 'Discord', 'Meta', 'LinkedIn', 'YouTube'];

  const Section = ({ title, items, active, setter }: any) => (
    <div className="mb-8 px-6">
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-2">{title}</p>
      <div className="space-y-1">
        {items.map((item: any) => (
          <button
            key={item}
            onClick={() => setter(item)}
            className={`w-full text-left px-3 py-2 rounded text-[12px] font-semibold transition-all ${
              active === item 
                ? 'bg-cyan-600/10 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 ring-1 ring-cyan-600/30' 
                : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900/50'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <aside className="w-60 h-full bg-[var(--sidebar-bg)] flex-shrink-0 flex flex-col border-r border-[var(--border)] z-50 overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-6 border-b border-transparent">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[14px] font-black tracking-tight text-slate-950 dark:text-slate-100 uppercase tracking-[0.2em]">VibeCodePulse</h1>
          <div className="h-1 w-10 bg-cyan-600 dark:bg-cyan-500 rounded-full" />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-4">
        <div className="px-6 mb-8">
          <button 
            onClick={onShowRadar}
            className="w-full py-3 px-3 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-black uppercase tracking-[0.1em] hover:opacity-90 transition-all flex items-center justify-between group"
          >
            <span>Launch Radar</span>
            <svg className="w-4 h-4 group-hover:rotate-45 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>

        <Section title="Ecosystem" items={sources} active={activeCategory} setter={setActiveCategory} />
        <Section title="Tools" items={tools} active={activeTool} setter={setActiveTool} />
        <Section title="Platforms" items={platforms} active={activePlatform} setter={setActivePlatform} />

        <div className="px-6 mb-8">
          <button 
            onClick={onHowItWorks}
            className="w-full py-2 px-3 rounded border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 hover:text-cyan-600 hover:border-cyan-600/30 transition-all flex items-center justify-between"
          >
            <span>How it Works</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="flex-shrink-0 p-6 border-t border-[var(--border)] bg-[var(--sidebar-bg)] space-y-5">
         <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Theme</p>
            <div className="grid grid-cols-2 gap-2">
               <button onClick={() => setTheme('light')} className={`py-1.5 text-[10px] font-black uppercase rounded border transition-all ${theme === 'light' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800'}`}>Light</button>
               <button onClick={() => setTheme('dark')} className={`py-1.5 text-[10px] font-black uppercase rounded border transition-all ${theme === 'dark' ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800'}`}>Dark</button>
            </div>
         </div>
         <div className="bg-slate-100 dark:bg-slate-900/50 border border-[var(--border)] p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Grounded</p>
            </div>
            <p className="text-[10px] font-sans text-slate-700 dark:text-slate-400 font-bold uppercase">AI Synchronized</p>
         </div>
      </div>
    </aside>
  );
};

export default Sidebar;
