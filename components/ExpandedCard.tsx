
import React, { useEffect, useState } from 'react';
import { NewsItem, GroundingSource } from '../types';
import { generateDeepDive, fetchArticleReadability } from '../services/geminiService';

interface ExpandedCardProps {
  item: NewsItem;
  onClose: () => void;
  isFavorite: boolean;
  toggleFavorite: (id: string) => void;
}

const ExpandedCard: React.FC<ExpandedCardProps> = ({ item, onClose, isFavorite, toggleFavorite }) => {
  const [deepDive, setDeepDive] = useState<string | null>(null);
  const [readabilityContent, setReadabilityContent] = useState<string | null>(null);
  const [readabilitySources, setReadabilitySources] = useState<GroundingSource[]>([]);
  const [loadingDeepDive, setLoadingDeepDive] = useState(true);
  const [loadingReadability, setLoadingReadability] = useState(false);
  const [isReadabilityMode, setIsReadabilityMode] = useState(false);

  useEffect(() => {
    const fetchDive = async () => {
      setLoadingDeepDive(true);
      const content = await generateDeepDive(item);
      setDeepDive(content);
      setLoadingDeepDive(false);
    };
    fetchDive();
  }, [item]);

  const toggleReadabilityMode = async () => {
    if (!isReadabilityMode && !readabilityContent) {
      setLoadingReadability(true);
      setIsReadabilityMode(true);
      const result = await fetchArticleReadability(item);
      setReadabilityContent(result.content);
      setReadabilitySources(result.sources);
      setLoadingReadability(false);
    } else {
      setIsReadabilityMode(!isReadabilityMode);
    }
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`News: ${item.title}`);
    const body = encodeURIComponent(`Check out this update on ${item.tool}:\n\n${item.title}\n\n${deepDive || item.snippet}\n\nOriginal article: ${item.url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const formatMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (!line.trim()) return <br key={i} />;
      
      if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mb-6 text-slate-950 dark:text-white leading-tight">{line.replace('# ', '')}</h1>;
      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mb-4 mt-8 text-slate-900 dark:text-slate-100 border-b border-[var(--border)] pb-2">{line.replace('## ', '')}</h2>;
      if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold mb-3 mt-6 text-slate-800 dark:text-slate-200">{line.replace('### ', '')}</h3>;

      if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
        const cleanLine = line.replace(/^[-•*]\s+/, '');
        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
        return (
          <div key={i} className="mb-4 flex gap-4 text-[15px] md:text-[16px] pl-2 font-medium">
            <span className="text-cyan-600 dark:text-cyan-500 font-bold">•</span>
            <span>
              {parts.map((part, j) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={j} className="text-slate-950 dark:text-white font-bold">{part.slice(2, -2)}</strong>;
                }
                return part;
              })}
            </span>
          </div>
        );
      }

      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className="mb-5 text-[15px] md:text-[16px] text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="text-slate-950 dark:text-white font-bold">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className={`relative w-full max-w-2xl bg-[var(--card-bg)] rounded-xl border border-[var(--border)] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl transition-all duration-300 animate-in zoom-in-95 ${isReadabilityMode ? 'max-w-3xl' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-16 border-b border-[var(--border)] flex items-center justify-between px-8 bg-slate-50 dark:bg-slate-950/80">
          <div className="flex items-center gap-4">
             <button 
              onClick={toggleReadabilityMode}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border ${isReadabilityMode ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-[var(--border)] shadow-sm hover:bg-slate-50'}`}
             >
                {isReadabilityMode ? 'Exit Reader Mode' : 'Open Reader Mode'}
             </button>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={`p-10 overflow-y-auto custom-scrollbar flex-1 transition-colors duration-300 ${isReadabilityMode ? 'bg-white dark:bg-slate-950' : ''}`}>
          {!isReadabilityMode ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <span className="px-2.5 py-1 rounded bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-400 text-[10px] font-bold uppercase tracking-widest border border-cyan-200 dark:border-cyan-800">
                  {item.category}
                </span>
                <span className="text-slate-500 dark:text-slate-500 text-[11px] font-sans font-bold uppercase tracking-wider">
                  {new Date(item.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-slate-950 dark:text-white mb-8 leading-tight">
                {item.title}
              </h2>

              <div className="flex items-center gap-4 mb-10 p-4 bg-slate-50 dark:bg-slate-900/50 border border-[var(--border)] rounded-lg">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-sans">Source:</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wide flex items-center gap-2">
                  {item.source}
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              <div className="space-y-10">
                <div className="italic border-l-4 border-cyan-600 dark:border-cyan-500 pl-6 py-2 text-slate-600 dark:text-slate-400 text-[16px] leading-relaxed font-medium">
                  "{item.snippet}"
                </div>

                <div>
                  <h4 className="text-slate-900 dark:text-slate-100 text-[11px] font-bold mb-6 flex items-center gap-3 uppercase tracking-widest">
                    <div className="w-4 h-[2px] bg-cyan-600 dark:bg-cyan-500" />
                    AI Insights
                  </h4>
                  {loadingDeepDive ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-5/6"></div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-900/30 p-8 rounded-xl border border-[var(--border)] shadow-inner">
                      {formatMarkdown(deepDive || '')}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="max-w-2xl mx-auto">
              <button 
                onClick={() => setIsReadabilityMode(false)}
                className="mb-10 text-[11px] font-bold text-cyan-700 dark:text-cyan-400 flex items-center gap-2 hover:underline uppercase tracking-widest"
              >
                ← Back to Article
              </button>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-950 dark:text-white mb-4 leading-tight">
                {item.title}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-500 mb-12 border-b border-[var(--border)] pb-8 uppercase tracking-widest font-bold">
                {item.source} // {new Date(item.publishedAt).toLocaleDateString()}
              </p>
              
              {loadingReadability ? (
                <div className="space-y-8 animate-pulse">
                  <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
                  <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
                  <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded w-3/4"></div>
                </div>
              ) : (
                <div className="readability-content">
                  {formatMarkdown(readabilityContent || '')}
                  {readabilitySources.length > 0 && (
                    <div className="mt-20 pt-10 border-t border-[var(--border)]">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-6 font-sans">References</p>
                      <div className="space-y-3">
                        {readabilitySources.map((source, idx) => (
                          <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="block text-[12px] text-cyan-700 dark:text-cyan-400 hover:underline font-bold uppercase tracking-tight">
                            [{idx + 1}] {source.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {!isReadabilityMode && (
          <div className="h-20 px-10 border-t border-[var(--border)] bg-slate-50 dark:bg-slate-950 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-8">
              <button onClick={() => toggleFavorite(item.id)} className={`flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-widest transition-all ${isFavorite ? 'text-red-600' : 'text-slate-500 hover:text-red-600'}`}>
                {isFavorite ? 'Saved to Favorites' : 'Add to Favorites'}
              </button>
              <button onClick={handleShareEmail} className="text-[11px] font-bold text-slate-500 hover:text-cyan-600 uppercase tracking-widest">
                Share Article
              </button>
            </div>

            <a href={item.url} target="_blank" rel="noopener noreferrer" className="px-8 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-cyan-600/20 active:scale-95 flex items-center gap-2">
              <span>Source Signal</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpandedCard;
