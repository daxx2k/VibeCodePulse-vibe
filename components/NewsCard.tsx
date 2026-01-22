
import React from 'react';
import { NewsItem } from '../types';

interface NewsCardProps {
  item: NewsItem & { isNew?: boolean };
  isFavorite: boolean;
  toggleFavorite: (id: string) => void;
  onExpand: (item: NewsItem) => void;
}

const NewsCard: React.FC<NewsCardProps> = ({ item, isFavorite, toggleFavorite, onExpand }) => {
  return (
    <div 
      onClick={() => onExpand(item)}
      className="group bg-[var(--card-bg)] border border-[var(--border)] hover:border-cyan-600 dark:hover:border-cyan-500/60 p-6 transition-all duration-150 cursor-pointer flex flex-col relative overflow-hidden shadow-sm hover:shadow-xl rounded-lg"
    >
      {item.isNew && (
        <div className="absolute top-0 left-0 bg-cyan-600 text-white text-[9px] font-black px-2 py-0.5 z-10 uppercase tracking-widest rounded-br-md">
          New
        </div>
      )}
      
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-wrap gap-2">
           <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-[10px] font-mono font-black text-slate-700 dark:text-slate-400 border border-[var(--border)] uppercase rounded">
             {item.platform}
           </span>
           <span className="px-2 py-0.5 bg-cyan-600/5 dark:bg-cyan-500/10 text-[10px] font-mono font-black text-cyan-700 dark:text-cyan-400 border border-cyan-600/20 dark:border-cyan-500/20 uppercase rounded">
             {item.tool}
           </span>
        </div>
        <button 
          onClick={e => { e.stopPropagation(); toggleFavorite(item.id); }}
          className={`transition-colors p-1 -m-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${isFavorite ? 'text-red-600' : 'text-slate-300 dark:text-slate-700'}`}
        >
          <svg className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeWidth={2.5}/>
          </svg>
        </button>
      </div>

      <h3 className="text-[14px] font-bold text-slate-950 dark:text-slate-100 group-hover:text-cyan-700 dark:group-hover:text-cyan-400 mb-3 line-clamp-2 leading-snug tracking-tight">
        {item.title}
      </h3>
      <p className="text-[12px] text-slate-700 dark:text-slate-300 line-clamp-3 mb-10 font-medium leading-relaxed">
        {item.snippet}
      </p>

      <div className="mt-auto pt-5 border-t border-[var(--border)] flex justify-between items-center font-mono text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-wider font-bold">
        <span className="truncate max-w-[130px]">{item.source}</span>
        <span className="opacity-70">{new Date(item.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
      </div>
      
      <div className="absolute top-0 right-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity">
         <div className="absolute top-0 right-0 border-t-2 border-r-2 border-cyan-600 dark:border-cyan-500 w-2 h-2" />
      </div>
    </div>
  );
};

export default NewsCard;
