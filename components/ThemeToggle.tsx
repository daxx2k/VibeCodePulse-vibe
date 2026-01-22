
import React from 'react';
import { Theme } from '../types';

interface ThemeToggleProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, setTheme }) => {
  const themes: { id: Theme; icon: string; label: string }[] = [
    // Fixed: Theme identifiers now correctly match the 'light' | 'dark' Theme type in types.ts.
    // Line 13: Changed 'onyx' to 'dark'
    { id: 'dark', icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z', label: 'Onyx' },
    // Line 14: Changed 'vibe' to 'light'
    { id: 'light', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', label: 'Vibe' }
  ];

  return (
    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          title={t.label}
          className={`p-1.5 rounded-md transition-all ${
            theme === t.id 
              ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600 dark:text-purple-400' 
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
          </svg>
        </button>
      ))}
    </div>
  );
};

export default ThemeToggle;
