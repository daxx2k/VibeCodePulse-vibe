
import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem, GroundingSource } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Simple hash function to create deterministic IDs from URLs.
 * This ensures favorites and "isNew" logic remain consistent across refreshes.
 */
function generateIdFromUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `vibe-${Math.abs(hash).toString(36)}`;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1500): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRetryable = error?.status === 503 || error?.status === 429 || error?.message?.includes('overloaded');
    if (retries > 0 && isRetryable) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

function parseGroundedNews(text: string): NewsItem[] {
  const items: NewsItem[] = [];
  const regex = /(?:^|\n)(?:.*?)\[DATA\]\s*(.*?)\s*\|\|\s*(.*?)\s*\|\|\s*(.*?)\s*\|\|\s*(.*?)\s*\|\|\s*(.*?)\s*\|\|\s*(.*?)\s*\|\|\s*(.*?)\s*\|\|\s*(.*?)(?:\n|$)/g;
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    const [, title, snippet, source, platform, url, category, tool, date] = match.map(m => m?.trim());

    if (title && url && url.includes('.')) {
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
      items.push({
        id: generateIdFromUrl(normalizedUrl),
        title: title.replace(/^[#\s*]+/, ''),
        snippet: snippet || "Community update regarding AI developer tool telemetry.",
        source: source || "Community Intel",
        platform: (platform as any) || "News",
        url: normalizedUrl,
        category: (category?.toLowerCase() as any) || 'community',
        tool: (tool as any) || 'Claude Code',
        publishedAt: date || new Date().toISOString()
      });
    }
  }
  return items;
}

export async function fetchAIDevNews(targetTool?: string, targetCategory?: string): Promise<{ items: NewsItem[], sources: GroundingSource[] }> {
  return withRetry(async () => {
    const isTargeted = (targetTool && targetTool !== 'All Tools') || (targetCategory && targetCategory !== 'All');
    const toolQuery = (targetTool && targetTool !== 'All Tools') ? `specifically focus on "${targetTool}"` : `"Claude Code", "Cursor AI", "Windsurf", "Aider", "Bolt.new", "Google AI Studio", "OpenAI"`;
    const catQuery = (targetCategory && targetCategory !== 'All') ? `prioritize finding "${targetCategory}" type content` : `find news, social updates, and tutorials`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Search Google for high-density community updates (last 6 months) about ${toolQuery}. 
      ${isTargeted ? 'This is a DEEP SYNC: hunt for niche discussions, bugs, and advanced workflows.' : 'General hunt for the latest ecosystem vibes.'}
      ${catQuery}.
      
      TARGETS: Reddit, X, GitHub, Hacker News, Discord leaks, and Official changelogs.
      
      OUTPUT FORMAT (One per line):
      [DATA] Title || Short Detail || Source || Platform (X, Reddit, GitHub, HackerNews, Official, Discord, Meta, LinkedIn, YouTube, or News) || URL || Category (official, social, tutorial, community, or news) || Tool Name (Claude Code, Cursor, Aider, Windsurf, Bolt, v0, Google AI Studio, OpenAI, or Replit) || ISO Date`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const items = parseGroundedNews(response.text || "");
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = chunks
      .filter(chunk => chunk.web)
      .map(chunk => ({ title: chunk.web?.title || "Reference", uri: chunk.web?.uri || "#" }));

    return { items, sources };
  });
}

export async function generatePulseBriefing(items: NewsItem[], toolContext: string, categoryContext: string): Promise<{ title: string; content: string; alert?: boolean }[]> {
  if (items.length === 0) return [];
  
  return withRetry(async () => {
    const contextStr = items.slice(0, 15).map(i => `[${i.platform}] ${i.title}`).join('\n');
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze these community signals for Tool: ${toolContext} and Category: ${categoryContext}:\n${contextStr}\n\nSummarize the current "vibe" into 3 distinct points.
      Mention the tool and context in the summary headlines if relevant.
      
      FORMAT (Exactly 3 lines):
      PULSE || Headline || Short Insight || (Optional: alert)`,
    });
    
    const results: { title: string; content: string; alert?: boolean }[] = [];
    const lines = (response.text || "").split('\n');
    
    for (const line of lines) {
      if (line.includes('PULSE ||')) {
        const parts = line.split('||');
        if (parts.length >= 3) {
          results.push({
            title: parts[1].trim(),
            content: parts[2].trim(),
            alert: parts[3]?.toLowerCase().includes('alert')
          });
        }
      }
    }
    return results.slice(0, 3);
  });
}

export async function generateDeepDive(item: NewsItem): Promise<string> {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a developer-centric deep dive (2-3 sentences) on this update: "${item.title}". Tool: ${item.tool}. Explain the significance.`,
    });
    return response.text || "Insight synthesized.";
  });
}

export async function fetchArticleReadability(item: NewsItem): Promise<{ content: string; sources: GroundingSource[] }> {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize the technical content and core takeaways from: ${item.url}. Focus on developer impact. Markdown format.`,
      config: { tools: [{ googleSearch: {} }] }
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter(chunk => chunk.web)
      .map(chunk => ({ title: chunk.web?.title || "Context", uri: chunk.web?.uri || "#" }));

    return { content: response.text || "Summary failed.", sources };
  });
}

export async function explainWord(word: string, context: string): Promise<string> {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Define "${word}" in the context of AI coding tools. Max 15 words.`,
    });
    return response.text || "Term defined.";
  });
}
