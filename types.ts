
export interface NewsItem {
  id: string;
  title: string;
  snippet: string;
  source: string;
  platform: 'X' | 'Reddit' | 'GitHub' | 'HackerNews' | 'Official' | 'Discord' | 'Meta' | 'LinkedIn' | 'YouTube' | 'News';
  url: string;
  category: 'official' | 'social' | 'tutorial' | 'community' | 'news';
  tool: 'Claude Code' | 'Cursor' | 'Aider' | 'Windsurf' | 'Bolt' | 'v0' | 'Google AI Studio' | 'OpenAI' | 'Replit' | 'General AI';
  publishedAt: string; // ISO Date String
  author?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export type Category = 'All' | 'Official' | 'Social' | 'Tutorials' | 'News' | 'Favorites';
export type ToolType = 'All Tools' | 'Claude Code' | 'Cursor' | 'Aider' | 'Windsurf' | 'Bolt' | 'v0' | 'Google AI Studio' | 'OpenAI' | 'Replit';
export type PlatformType = 'All Platforms' | 'X' | 'Reddit' | 'GitHub' | 'HackerNews' | 'Discord' | 'Meta' | 'LinkedIn' | 'YouTube';

export type TimeFilter = 'day' | 'week' | 'month' | '6months' | 'all';

export type Theme = 'light' | 'dark';
