
import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem, GroundingSource, RadarPosition } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Clean and validate a URL from the LLM.
 * Prevents truncation, markdown residue, and hallucinated ellipses.
 */
function sanitizeUrl(url: string): string {
  let clean = url.trim();
  
  // Remove possible markdown wrappers like [text](url) or just (url)
  const mdMatch = clean.match(/\[?.*?\]?\((https?:\/\/[^\s\)]+)\)/);
  if (mdMatch) clean = mdMatch[1];
  
  // Remove trailing punctuation added by model chatiness (e.g., "Check this link: http://site.com.")
  clean = clean.replace(/[.,;!]$/, '');
  
  // Detect common hallucinations like "site.com/..."
  if (clean.includes('...')) return "";

  // Protocol check and normalization
  if (clean && !clean.startsWith('http') && clean.includes('.')) {
    clean = 'https://' + clean;
  }
  
  try {
    // Final validation via URL constructor
    const parsed = new URL(clean);
    return parsed.href;
  } catch (e) {
    return "";
  }
}

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
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Using a very distinct [ITEM] tag and >>> separator to prevent mangling
    if (line.includes('[ITEM]')) {
      const content = line.split('[ITEM]')[1] || "";
      const parts = content.split('>>>').map(p => p.trim());
      
      if (parts.length >= 7) {
        const [title, snippet, source, platform, rawUrl, category, tool, date] = parts;
        const url = sanitizeUrl(rawUrl);

        if (title && url) {
          items.push({
            id: generateIdFromUrl(url),
            title: title.replace(/^[#\s*]+/, ''),
            snippet: snippet || "Community intelligence signal captured.",
            source: source || "Community Intel",
            platform: (platform as any) || "News",
            url: url,
            category: (category?.toLowerCase() as any) || 'community',
            tool: (tool as any) || 'General AI',
            publishedAt: date || new Date().toISOString()
          });
        }
      }
    }
  }
  return items;
}

export async function fetchAIDevNews(targetTool?: string, targetCategory?: string): Promise<{ items: NewsItem[], sources: GroundingSource[] }> {
  return withRetry(async () => {
    const isTargeted = (targetTool && targetTool !== 'All Tools') || (targetCategory && targetCategory !== 'All');
    const toolQuery = (targetTool && targetTool !== 'All Tools') ? `specifically for "${targetTool}"` : `the AI coding ecosystem ("Claude Code", "Cursor", "Aider", "Windsurf")`;
    const catQuery = (targetCategory && targetCategory !== 'All') ? `focusing heavily on ${targetCategory} content` : `finding the latest updates`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Perform a search for community updates from the last 6 months ${toolQuery}. 
      ${isTargeted ? 'DEEP SYNC: prioritize niche social threads, bug reports, and advanced workflows.' : 'Broad ecosystem search.'}
      ${catQuery}.
      
      TARGETS: Reddit, X (Twitter), GitHub Discussions, Hacker News.
      
      OUTPUT FORMAT (CRITICAL: One per line, use >>> as separator, NO EXTRA TEXT):
      [ITEM] Title >>> Short Detail >>> Source >>> Platform (X, Reddit, GitHub, HackerNews, News) >>> VERBATIM_FULL_URL >>> Category (official, social, tutorial, community, news) >>> Tool Name >>> ISO Date`,
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
    // Pass indices instead of URLs to the model to prevent hallucinated/mangled links
    const contextStr = items.slice(0, 15).map((i, idx) => `SIGNAL_ID:${idx} | ${i.title}`).join('\n');
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze these news signals for ${toolContext} (${categoryContext}):\n${contextStr}\n\nSummarize the current "vibe" into 3 distinct points.
      For each point, identify the SIGNAL_ID of the most relevant news signal to serve as the link.
      
      FORMAT (Exactly 3 lines):
      PULSE || Headline || Short Insight || SIGNAL_ID || (Optional: alert)`,
    });
    
    const results: { title: string; content: string; url?: string; alert?: boolean }[] = [];
    const lines = (response.text || "").split('\n');
    
    for (const line of lines) {
      if (line.includes('PULSE ||')) {
        const parts = line.split('||').map(p => p.trim());
        if (parts.length >= 4) {
          const rawId = parts[3].replace('SIGNAL_ID:', '').trim();
          const signalIdx = parseInt(rawId);
          // Look up the actual verified URL from our local items array
          const sourceUrl = !isNaN(signalIdx) && items[signalIdx] ? items[signalIdx].url : undefined;

          results.push({
            title: parts[1],
            content: parts[2],
            url: sourceUrl,
            alert: parts[4]?.toLowerCase().includes('alert')
          });
        }
      }
    }
    return results.slice(0, 3);
  });
}

export async function generateEcosystemRadar(items: NewsItem[]): Promise<RadarPosition[]> {
  if (items.length < 5) return [];

  return withRetry(async () => {
    const summary = items.slice(0, 20).map(i => `${i.tool}: ${i.title}`).join('\n');
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on these recent signals:\n${summary}\n\nMap these AI tools onto a 2D quadrant (X: Utility/Stability 0-100, Y: Hype/Momentum 0-100).
      Tools: Claude Code, Cursor, Aider, Windsurf, Bolt, v0, Replit, OpenAI, Google AI Studio.
      
      CRITICAL: Force a wide spread across the 0-100 spectrum. No clumping.
      
      OUTPUT FORMAT (One per line):
      RADAR || Tool Name || Utility Score || Hype Score || 1-sentence reasoning`,
    });

    const results: RadarPosition[] = [];
    const lines = (response.text || "").split('\n');
    for (const line of lines) {
      if (line.includes('RADAR ||')) {
        const parts = line.split('||').map(p => p.trim());
        if (parts.length >= 5) {
          results.push({
            tool: parts[1],
            utility: parseInt(parts[2]) || 50,
            hype: parseInt(parts[3]) || 50,
            reasoning: parts[4]
          });
        }
      }
    }
    return results;
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
