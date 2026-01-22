
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import NewsCard from './components/NewsCard';
import ExpandedCard from './components/ExpandedCard';
import HowItWorks from './components/HowItWorks';
import { fetchAIDevNews, generatePulseBriefing, explainWord } from './services/geminiService';
import { NewsItem, Category, Theme, TimeFilter, ToolType, PlatformType, GroundingSource } from './types';

const App: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<Category>(() => (localStorage.getItem('pulse-pref-cat') as Category) || 'All');
  const [activeTool, setActiveTool] = useState<ToolType>(() => (localStorage.getItem('pulse-pref-tool') as ToolType) || 'All Tools');
  const [activePlatform, setActivePlatform] = useState<PlatformType>(() => (localStorage.getItem('pulse-pref-plat') as PlatformType) || 'All Platforms');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(() => (localStorage.getItem('pulse-pref-time') as TimeFilter) || 'all');
  
  const [news, setNews] = useState<(NewsItem & { isNew?: boolean })[]>(() => {
    const cached = localStorage.getItem('vibe-news-history');
    return cached ? JSON.parse(cached) : [];
  });
  
  const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);
  const [loading, setLoading] = useState(news.length === 0);
  const [loadingStatus, setLoadingStatus] = useState("Initializing VibeCodePulse...");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [briefing, setBriefing] = useState<{ title: string; content: string; alert?: boolean }[]>([]);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('vibe-favs');
    return saved ? JSON.parse(saved) : [];
  });

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('vibe-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') html.classList.add('dark');
    else html.classList.remove('dark');
    localStorage.setItem('vibe-theme', theme);
  }, [theme]);

  // Persistent word selection logic
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.ai-tooltip')) return;

      const sel = window.getSelection();
      const text = sel?.toString().trim();
      
      if (text && text.length > 2 && text.length < 50) {
        const range = sel?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        if (rect) {
          setSelection({ text, x: rect.left + rect.width / 2, y: rect.top + window.scrollY });
          setExplanation(null);
        }
      } else {
        if (!target.closest('button')) {
          setSelection(null);
          setExplanation(null);
        }
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const loadNews = useCallback(async (toolOverride?: ToolType, catOverride?: Category) => {
    setIsRefreshing(true);
    setLoadingProgress(15);
    setFetchError(null);
    const syncTool = toolOverride || activeTool;
    const syncCat = catOverride || activeCategory;
    
    setLoadingStatus(`Crawl Depth Increased: Syncing ${syncTool === 'All Tools' ? 'Ecosystem' : syncTool}...`);
    
    const pInt = setInterval(() => setLoadingProgress(p => p < 90 ? p + 1 : p), 800);
    
    try {
      const data = await fetchAIDevNews(syncTool, syncCat);
      if (data.items.length > 0) {
        setNews(prev => {
          const newsMap = new Map();
          prev.forEach(item => newsMap.set(item.id, { ...item, isNew: false }));
          data.items.forEach(item => {
            if (!newsMap.has(item.id)) newsMap.set(item.id, { ...item, isNew: true });
          });
          const combined = Array.from(newsMap.values());
          localStorage.setItem('vibe-news-history', JSON.stringify(combined));
          return combined;
        });
        setGroundingSources(data.sources);
      }
      setLoading(false);
    } catch (err) {
      setFetchError("Sync engine overloaded. Retrying...");
      setLoading(false);
    } finally {
      clearInterval(pInt);
      setLoadingProgress(100);
      setTimeout(() => { setIsRefreshing(false); setLoadingProgress(0); }, 600);
    }
  }, [activeTool, activeCategory]);

  const filteredNews = useMemo(() => {
    let result = news.filter(item => {
      const isFav = favorites.includes(item.id);
      const matchesCategory = activeCategory === 'All' || (activeCategory === 'Favorites' && isFav) || item.category.toLowerCase().includes(activeCategory.toLowerCase());
      const matchesTool = activeTool === 'All Tools' || item.tool === activeTool;
      const matchesPlatform = activePlatform === 'All Platforms' || item.platform === activePlatform;
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.snippet.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesTool && matchesPlatform && matchesSearch;
    });

    if (timeFilter !== 'all') {
      const now = new Date();
      result = result.filter(item => {
        const diffDays = (now.getTime() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (timeFilter === 'day') return diffDays <= 1.2;
        if (timeFilter === 'week') return diffDays <= 7.5;
        if (timeFilter === 'month') return diffDays <= 31;
        if (timeFilter === '6months') return diffDays <= 183;
        return true;
      });
    }

    return result.sort((a, b) => {
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }, [news, activeCategory, activeTool, activePlatform, favorites, searchQuery, timeFilter]);

  // Dynamic briefing update
  useEffect(() => {
    const triggerBriefing = async () => {
      setIsBriefingLoading(true);
      const toolLabel = activeTool === 'All Tools' ? "Global Ecosystem" : activeTool;
      const catLabel = activeCategory === 'All' ? "All Categories" : activeCategory;

      if (filteredNews.length > 0) {
        const data = await generatePulseBriefing(filteredNews, toolLabel, catLabel);
        setBriefing(data);
      } else if (news.length > 0) {
        const data = await generatePulseBriefing(news.slice(0, 15), "Global", "All");
        setBriefing(data);
      }
      setIsBriefingLoading(false);
    };

    triggerBriefing();
  }, [activeTool, activeCategory, filteredNews, news]);

  useEffect(() => { if (news.length === 0) loadNews(); }, []);

  const isTargeted = activeTool !== 'All Tools' || activeCategory !== 'All';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg)] text-[var(--text)] font-sans">
      <div className="fixed inset-0 cyber-grid z-0"></div>
      
      <Sidebar 
        activeCategory={activeCategory} setActiveCategory={setActiveCategory}
        activeTool={activeTool} setActiveTool={setActiveTool}
        activePlatform={activePlatform} setActivePlatform={setActivePlatform}
        theme={theme} setTheme={setTheme}
        onHowItWorks={() => setShowHowItWorks(true)}
      />

      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-transparent z-10">
        {loadingProgress > 0 && (
          <div className="absolute top-0 left-0 h-[4px] bg-cyan-600 dark:bg-cyan-500 z-[60] transition-all duration-300" style={{ width: `${loadingProgress}%` }} />
        )}

        <header className="h-14 flex-shrink-0 bg-[var(--header-bg)] border-b border-[var(--border)] px-6 flex items-center justify-between z-40 backdrop-blur-md">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="font-sans text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Engine: <span className="text-slate-900 dark:text-slate-100">{isRefreshing ? 'Deep Crawling...' : isTargeted ? 'Targeted' : 'Global'}</span>
                </span>
             </div>
             
             <div className="h-8 flex bg-slate-100 dark:bg-slate-900 rounded-md border border-[var(--border)] p-1">
                {(['all', 'day', 'week', 'month', '6months'] as TimeFilter[]).map(f => (
                  <button key={f} onClick={() => setTimeFilter(f)} className={`px-4 py-0.5 rounded-sm text-[10px] font-bold uppercase transition-all ${timeFilter === f ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                    {f === '6months' ? '6m' : f}
                  </button>
                ))}
             </div>
          </div>

          <div className="flex items-center gap-3">
            <input 
              type="text" 
              placeholder="Search local feed..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-[var(--border)] rounded-md px-3 py-1.5 text-[11px] font-sans text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 w-64"
            />
            <button 
              onClick={() => loadNews()} 
              disabled={isRefreshing} 
              className="font-sans text-[11px] font-bold bg-cyan-600 text-white px-6 py-1.5 rounded-md hover:bg-cyan-700 transition-all uppercase tracking-wide disabled:opacity-40 flex items-center gap-2"
            >
              {isTargeted ? `Sync ${activeTool}` : 'Sync Ecosystem'}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-transparent select-text">
          <div className="w-full px-6 py-8">
            
            {/* PERSISTENT BRIEFING SECTION */}
            <div className="mb-10 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6 shadow-xl dark:shadow-2xl min-h-[180px] flex flex-col justify-center">
              <div className="flex items-center justify-between mb-8 border-b border-[var(--border)] pb-4">
                <p className="font-sans text-[11px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-cyan-600 rounded-full animate-pulse" />
                  Vibe Briefing: {activeTool !== 'All Tools' ? activeTool : 'Ecosystem'} — Context: {activeCategory}
                </p>
                {(isBriefingLoading || isRefreshing) && (
                  <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-tighter animate-pulse">
                    Synthesizing Intelligence...
                  </span>
                )}
              </div>

              {isBriefingLoading || isRefreshing ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 animate-pulse">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="space-y-4">
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                    </div>
                  ))}
                </div>
              ) : briefing.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 animate-in fade-in duration-500">
                  {briefing.map((item, idx) => (
                    <div key={idx} className="relative group">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-1.5 h-4 rounded-full ${item.alert ? 'bg-rose-600 animate-pulse' : 'bg-cyan-600'}`} />
                        <h4 className={`text-[11px] font-bold uppercase tracking-wide ${item.alert ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-[13px] text-slate-700 dark:text-slate-400 font-medium leading-relaxed border-l-2 border-[var(--border)] pl-4 group-hover:border-cyan-500 transition-colors">
                        {item.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <p className="text-slate-400 dark:text-slate-500 text-[12px] font-medium italic">
                    {loading ? 'Waiting for initial sync...' : 'No signals for this specific filter pair. Expand search?'}
                  </p>
                </div>
              )}
            </div>

            {loading ? (
              <div className="h-[40vh] flex flex-col items-center justify-center">
                 <div className="w-14 h-14 border-2 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin mb-8" />
                 <p className="font-sans text-[12px] text-slate-500 dark:text-slate-400 font-bold animate-pulse uppercase tracking-[0.2em]">{loadingStatus}</p>
              </div>
            ) : (
              <>
                {filteredNews.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {filteredNews.map(item => (
                      <NewsCard 
                        key={item.id} 
                        item={item} 
                        isFavorite={favorites.includes(item.id)} 
                        toggleFavorite={id => {
                          const next = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
                          setFavorites(next);
                          localStorage.setItem('vibe-favs', JSON.stringify(next));
                        }} 
                        onExpand={setSelectedItem} 
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-32 flex flex-col items-center justify-center max-w-lg mx-auto text-center">
                    <h3 className="text-slate-900 dark:text-slate-100 font-bold text-xl mb-4">No Signals Detected</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-10">Try a targeted deep sync for {activeTool === 'All Tools' ? 'this context' : activeTool}.</p>
                    <button onClick={() => loadNews()} className="px-12 py-3 bg-cyan-600 text-white rounded-lg font-bold uppercase text-[11px]">Initiate Sync</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {selectedItem && (
        <ExpandedCard 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
          isFavorite={favorites.includes(selectedItem.id)} 
          toggleFavorite={id => {
             const next = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
             setFavorites(next);
             localStorage.setItem('vibe-favs', JSON.stringify(next));
          }} 
        />
      )}

      {showHowItWorks && <HowItWorks onClose={() => setShowHowItWorks(false)} />}

      {selection && (
        <div 
          className="ai-tooltip bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl fixed z-[500] text-white min-w-[200px] max-w-[340px] animate-in fade-in zoom-in-95" 
          style={{ left: selection.x, top: selection.y, transform: 'translateX(-50%) translateY(-120%)' }}
        >
          {explanation ? (
            <div className="space-y-2">
              <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Intelligence Layer:</p>
              <p className="text-[12px] font-sans leading-relaxed text-slate-200">{explanation}</p>
            </div>
          ) : (
            <button 
              onClick={async (e) => {
                e.preventDefault(); e.stopPropagation();
                setExplanation(await explainWord(selection.text, ""));
              }} 
              className="w-full text-left font-sans text-[12px] font-bold hover:text-cyan-400 flex items-center justify-between gap-4 py-1"
            >
              <span>Explain "{selection.text}"</span>
              <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </button>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[10px] border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
};

export default App;
