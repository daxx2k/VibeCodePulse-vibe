
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
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeCategory, setActiveCategory, 
  activeTool, setActiveTool, 
  activePlatform, setActivePlatform,
  theme, setTheme,
  onHowItWorks
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
    <div className="mb-8">
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
    <aside className="w-60 h-full bg-[var(--sidebar-bg)] flex-shrink-0 flex flex-col p-6 border-r border-[var(--border)] overflow-y-auto custom-scrollbar z-50">
      <div className="flex flex-col gap-1.5 mb-12">
        <h1 className="text-[14px] font-black tracking-tight text-slate-950 dark:text-slate-100 uppercase tracking-[0.2em]">VibeCodePulse</h1>
        <div className="h-1 w-10 bg-cyan-600 dark:bg-cyan-500 rounded-full" />
      </div>

      <Section title="Ecosystem" items={sources} active={activeCategory} setter={setActiveCategory} />
      <Section title="Tools" items={tools} active={activeTool} setter={setActiveTool} />
      <Section title="Platforms" items={platforms} active={activePlatform} setter={setActivePlatform} />

      <button 
        onClick={onHowItWorks}
        className="mt-4 mb-8 w-full py-2 px-3 rounded border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 hover:text-cyan-600 hover:border-cyan-600/30 transition-all flex items-center justify-between"
      >
        <span>How it Works</span>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </button>

      <div className="mt-auto pt-8 border-t border-[var(--border)] space-y-5">
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
