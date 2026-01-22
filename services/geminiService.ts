
import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem, GroundingSource } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Simple hash function to create deterministic IDs from URLs.
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
        snippet: snippet || "Community intelligence signal captured.",
        source: source || "Community Intel",
        platform: (platform as any) || "News",
        url: normalizedUrl,
        category: (category?.toLowerCase() as any) || 'community',
        tool: (tool as any) || 'General AI',
        publishedAt: date || new Date().toISOString()
      });
    }
  }
  return items;
}

export async function fetchAIDevNews(targetTool?: string, targetCategory?: string): Promise<{ items: NewsItem[], sources: GroundingSource[] }> {
  return withRetry(async () => {
    const isTargeted = (targetTool && targetTool !== 'All Tools') || (targetCategory && targetCategory !== 'All');
    
    // Construct search intent
    const toolQuery = (targetTool && targetTool !== 'All Tools') ? `specifically for "${targetTool}"` : `the AI coding ecosystem ("Claude Code", "Cursor", "Aider", "Windsurf")`;
    const catQuery = (targetCategory && targetCategory !== 'All') ? `focusing heavily on ${targetCategory} content` : `finding the latest updates`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Perform a high-intensity search for community updates from the last 6 months ${toolQuery}. 
      ${isTargeted ? 'This is a DEEP SYNC: prioritize niche social threads, bug reports, and advanced workflows.' : 'Broad ecosystem search.'}
      ${catQuery}.
      
      TARGETS: Reddit, X (Twitter), GitHub Discussions, Hacker News, and official docs.
      
      OUTPUT FORMAT (CRITICAL: One per line):
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

export async function generatePulseBriefing(items: NewsItem[], toolContext: string, categoryContext: string): Promise<{ title: string; content: string; url?: string; alert?: boolean }[]> {
  if (items.length === 0) return [];
  
  return withRetry(async () => {
    // Provide source list to the model so it can pick the most relevant URL for each point
    const contextStr = items.slice(0, 15).map((i, idx) => `ID:${idx} | [${i.platform}] ${i.title} | URL: ${i.url}`).join('\n');
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze these news signals for ${toolContext} (${categoryContext}):\n${contextStr}\n\nSummarize the current "vibe" into 3 distinct points.
      For each point, identify the most relevant URL from the provided signals to serve as a deep-link.
      
      FORMAT (Exactly 3 lines):
      PULSE || Headline || Short Insight || Exact Source URL || (Optional: alert)`,
    });
    
    const results: { title: string; content: string; url?: string; alert?: boolean }[] = [];
    const lines = (response.text || "").split('\n');
    
    for (const line of lines) {
      if (line.includes('PULSE ||')) {
        const parts = line.split('||');
        if (parts.length >= 4) {
          results.push({
            title: parts[1].trim(),
            content: parts[2].trim(),
            url: parts[3].trim().startsWith('http') ? parts[3].trim() : undefined,
            alert: parts[4]?.toLowerCase().includes('alert')
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
      contents: `Provide a developer-centric deep dive (2 sentences) on: "${item.title}". Context: ${item.tool}. Significance and impact.`,
    });
    return response.text || "Insight synthesized.";
  });
}

export async function fetchArticleReadability(item: NewsItem): Promise<{ content: string; sources: GroundingSource[] }> {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize the technical takeaways from: ${item.url}. Focus on developer impact. Use Markdown.`,
      config: { tools: [{ googleSearch: {} }] }
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter(chunk => chunk.web)
      .map(chunk => ({ title: chunk.web?.title || "Context", uri: chunk.web?.uri || "#" }));

    return { content: response.text || "Summary unavailable.", sources };
  });
}

export async function explainWord(word: string, context: string): Promise<string> {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Define "${word}" for an AI coding tools context. Max 15 words.`,
    });
    return response.text || "Term defined.";
  });
}
