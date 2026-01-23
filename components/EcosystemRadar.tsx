
import React from 'react';
import { RadarPosition } from '../types';

interface EcosystemRadarProps {
  positions: RadarPosition[];
  loading: boolean;
  onClose: () => void;
}

const EcosystemRadar: React.FC<EcosystemRadarProps> = ({ positions, loading, onClose }) => {
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-end p-4 pointer-events-none" onClick={onClose}>
      <div 
        className="pointer-events-auto w-full max-w-xl h-full max-h-[85vh] bg-[var(--card-bg)] border border-[var(--border)] shadow-[0_32px_64px_rgba(0,0,0,0.5)] dark:shadow-[0_32px_64px_rgba(0,0,0,1)] rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-500 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-8 py-6 border-b border-[var(--border)] flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <div>
            <h2 className="text-[14px] font-black uppercase tracking-[0.2em] text-slate-950 dark:text-white">Ecosystem Radar</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Hype vs. Utility Intelligence</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="flex-1 p-12 flex flex-col items-center justify-center relative overflow-visible">
          {loading ? (
            <div className="flex flex-col items-center gap-6">
              <div className="w-12 h-12 border-2 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600 animate-pulse">Calculating Market Vector</p>
            </div>
          ) : (
            <>
              {/* The Quadrant Grid - Important: No overflow-hidden here to allow tooltips to pop out */}
              <div className="relative w-full aspect-square max-w-[400px] border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/20 rounded-lg">
                {/* Horizontal Axis */}
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[var(--border)] dashed shadow-sm" />
                {/* Vertical Axis */}
                <div className="absolute top-0 left-1/2 w-[1px] h-full bg-[var(--border)] dashed shadow-sm" />
                
                {/* Axes Labels */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase text-slate-400 dark:text-slate-600 tracking-widest">Hype High</div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase text-slate-400 dark:text-slate-600 tracking-widest">Hype Low</div>
                <div className="absolute top-1/2 -right-12 -translate-y-1/2 text-[9px] font-black uppercase text-slate-400 dark:text-slate-600 tracking-widest rotate-90">Utility High</div>
                <div className="absolute top-1/2 -left-12 -translate-y-1/2 text-[9px] font-black uppercase text-slate-400 dark:text-slate-600 tracking-widest -rotate-90">Utility Low</div>

                {/* Tool Dots */}
                {positions.map((p, idx) => {
                  const isTopHalf = p.hype > 50;
                  const isRightHalf = p.utility > 50;
                  
                  // Strategic Label Placement
                  const labelYClass = isTopHalf ? "top-6" : "bottom-6";
                  
                  // Tooltip Positioning to avoid clipping
                  const tooltipYClass = isTopHalf ? "bottom-8" : "top-8";
                  // If on the right side, shift tooltip left. If on left side, shift right.
                  const tooltipXClass = isRightHalf ? "-translate-x-[85%]" : "-translate-x-[15%]";

                  // Deterministic nudge to prevent clumping
                  const nudgeX = ((idx * 17) % 20) - 10;
                  const nudgeY = ((idx * 23) % 20) - 10;

                  return (
                    <div 
                      key={idx}
                      className="absolute group z-10 transition-all hover:z-[100]"
                      style={{ 
                        left: `${p.utility}%`, 
                        bottom: `${p.hype}%`, 
                        transform: `translate(calc(-50% + ${nudgeX}px), calc(50% + ${nudgeY}px))` 
                      }}
                    >
                      {/* Interactive Pulse Point */}
                      <div className="w-4 h-4 bg-cyan-600 dark:bg-cyan-500 rounded-full border-2 border-white dark:border-slate-900 shadow-lg cursor-help transition-all group-hover:scale-150 group-hover:bg-amber-500 relative z-10" />
                      
                      {/* Tooltip on Hover */}
                      <div className={`absolute left-1/2 ${tooltipXClass} ${tooltipYClass} opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-[200]`}>
                        <div className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 p-4 rounded-xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-white/20 dark:border-black/10">
                          <div className="flex items-center justify-between gap-6 mb-2">
                             <p className="text-[12px] font-black uppercase tracking-wider">{p.tool}</p>
                             <div className="flex gap-2">
                               <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/10 dark:bg-black/5 font-bold">U: {p.utility}</span>
                               <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/10 dark:bg-black/5 font-bold">H: {p.hype}</span>
                             </div>
                          </div>
                          <p className="text-[10px] font-medium max-w-[200px] leading-relaxed text-slate-300 dark:text-slate-600 italic break-words whitespace-normal">
                            {p.reasoning}
                          </p>
                        </div>
                      </div>

                      {/* Persistent Name Label */}
                      <div className={`absolute left-1/2 -translate-x-1/2 ${labelYClass} opacity-60 group-hover:opacity-100 transition-all pointer-events-none z-0`}>
                        <span className="text-[8px] font-black uppercase tracking-tighter text-slate-950 dark:text-white bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-1.5 py-0.5 rounded border border-[var(--border)] shadow-sm whitespace-nowrap">
                          {p.tool}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <footer className="px-8 py-6 border-t border-[var(--border)] bg-slate-50 dark:bg-slate-950/50">
          <div className="flex gap-4">
             <div className="flex-1 flex flex-col">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Intelligence Relay</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Hover over signals for deep reasoning. Layers prioritize active selection to prevent visual occlusion.</p>
             </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default EcosystemRadar;
