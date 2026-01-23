
import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem, GroundingSource, RadarPosition } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Clean and validate a URL from the LLM.
 */
function sanitizeUrl(url: string): string {
  if (!url) return "";
  let clean = url.trim();
  
  // Remove markdown formatting
  const mdMatch = clean.match(/\[?.*?\]?\((https?:\/\/[^\s\)]+)\)/);
  if (mdMatch) clean = mdMatch[1];
  
  // Remove trailing punctuation
  clean = clean.replace(/[.,;!]$/, '');
  
  // Check for common hallucinated placeholders
  if (clean.includes('...') && clean.length < 20) return "";
  if (clean.includes('example.com') || clean.includes('your-url-here')) return "";

  if (clean && !clean.startsWith('http') && clean.includes('.')) {
    clean = 'https://' + clean;
  }
  
  return clean;
}

/**
 * Deterministic ID generation
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

/**
 * STRIC_LINK_PROTOCOL: Cross-references parsed items with verified grounding metadata chunks.
 * If a link is not verified, we force it to the most relevant verified URI to ensure NO BROKEN LINKS.
 */
function verifyLinks(items: NewsItem[], groundingChunks: any[]): NewsItem[] {
  const verifiedChunks = groundingChunks
    .filter(c => c.web && c.web.uri)
    .map(c => ({ uri: c.web.uri, title: (c.web.title || "").toLowerCase() }));

  if (verifiedChunks.length === 0) return items;

  return items.map(item => {
    const itemTitleLower = item.title.toLowerCase();
    
    // 1. Check for exact URL match first
    const exactMatch = verifiedChunks.find(c => c.uri === item.url);
    if (exactMatch) return item;

    // 2. Fuzzy Title Matching: Find the chunk whose title most resembles the item's title
    // This is the most robust way to map synthesized news items back to their actual source
    let bestMatch = verifiedChunks[0];
    let maxOverlap = 0;

    for (const chunk of verifiedChunks) {
      const chunkWords = chunk.title.split(/\s+/).filter(w => w.length > 3);
      const overlap = chunkWords.filter(w => itemTitleLower.includes(w)).length;
      
      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        bestMatch = chunk;
      }
    }

    // 3. Fallback: If we have at least some word overlap, swap the URL. 
    // Otherwise, use the model's URL but if it contains '...' swap to the first verified link.
    const isSuspect = item.url.includes('...') || item.url.length < 15;
    
    if (maxOverlap > 0 || isSuspect) {
      return { 
        ...item, 
        url: bestMatch.uri, 
        id: generateIdFromUrl(bestMatch.uri),
        source: bestMatch.title.length > 30 ? bestMatch.title.substring(0, 30) + '...' : bestMatch.title || item.source
      };
    }

    return item;
  });
}

function parseGroundedNews(text: string, groundingChunks: any[]): NewsItem[] {
  const rawItems: NewsItem[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.includes('[ITEM]')) {
      const segment = line.split('[ITEM]')[1] || "";
      const parts = segment.split('>>>').map(p => p.trim());
      
      if (parts.length >= 5) {
        const title = parts[0];
        const snippet = parts[1] || "Community update captured.";
        const source = parts[2] || "Intel Feed";
        const platform = (parts[3] as any) || "News";
        const rawUrl = parts[4];
        const category = (parts[5]?.toLowerCase() as any) || 'community';
        const tool = (parts[6] as any) || 'General AI';
        const date = parts[7] || new Date().toISOString();

        const url = sanitizeUrl(rawUrl);

        if (title) {
          rawItems.push({
            id: generateIdFromUrl(url || title),
            title: title.replace(/^[#\s*\-•]+/, ''),
            snippet: snippet,
            source: source,
            platform: platform,
            url: url,
            category: category,
            tool: tool,
            publishedAt: date
          });
        }
      }
    }
  }

  // FORCE VERIFICATION: Swap hallucinated links for real verified search URIs
  return verifyLinks(rawItems, groundingChunks);
}

export async function fetchAIDevNews(targetTool?: string, targetCategory?: string): Promise<{ items: NewsItem[], sources: GroundingSource[] }> {
  return withRetry(async () => {
    const isTargeted = (targetTool && targetTool !== 'All Tools') || (targetCategory && targetCategory !== 'All');
    const toolQuery = (targetTool && targetTool !== 'All Tools') ? `specifically for "${targetTool}"` : `the AI coding ecosystem ("Claude Code", "Cursor", "Aider", "Windsurf")`;
    const catQuery = (targetCategory && targetCategory !== 'All') ? `focusing on ${targetCategory} content` : `latest signals`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Search for community updates from the last 6 months ${toolQuery}. 
      ${isTargeted ? 'DEEP SYNC: prioritize niche social threads and bug reports.' : 'General ecosystem sync.'}
      ${catQuery}.
      
      CRITICAL INSTRUCTION: You MUST use the exact titles and verbatim URLs found in the Google Search results. DO NOT truncate URLs with "...". If you cannot find a specific URL, provide the closest possible match from the search citations.
      
      FORMAT:
      [ITEM] Title >>> Snippet >>> Source >>> Platform >>> FULL_VERBATIM_URL >>> Category >>> Tool Name >>> ISO Date`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const items = parseGroundedNews(response.text || "", chunks);
    
    const sources: GroundingSource[] = chunks
      .filter(chunk => chunk.web)
      .map(chunk => ({ title: chunk.web?.title || "Reference", uri: chunk.web?.uri || "#" }));

    return { items, sources };
  });
}

export async function generatePulseBriefing(items: NewsItem[], toolContext: string, categoryContext: string): Promise<{ title: string; content: string; url?: string; alert?: boolean }[]> {
  if (items.length === 0) return [];
  
  return withRetry(async () => {
    const contextStr = items.slice(0, 15).map((i, idx) => `ID:${idx} | ${i.title}`).join('\n');
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Context: ${toolContext} (${categoryContext}). Signals:\n${contextStr}\n\nSummarize into 3 points. Each point MUST reference a signal ID from the list above.
      
      FORMAT:
      PULSE || Headline || Insight || ID || (Optional: alert)`,
    });
    
    const results: { title: string; content: string; url?: string; alert?: boolean }[] = [];
    const lines = (response.text || "").split('\n');
    
    for (const line of lines) {
      if (line.includes('PULSE ||')) {
        const parts = line.split('||').map(p => p.trim());
        if (parts.length >= 4) {
          const rawId = parts[3].replace('ID:', '').trim();
          const signalIdx = parseInt(rawId);
          // Map index back to the verified news item URL
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
      contents: `Signals:\n${summary}\n\nMap AI tools (Claude Code, Cursor, Aider, Windsurf, Bolt, v0, Replit, OpenAI, Google AI Studio) to 0-100 scales for Utility (X) and Hype (Y).
      
      SPREAD THE TOOLS ACROSS THE FULL SPECTRUM.
      
      FORMAT:
      RADAR || Tool Name || Utility || Hype || Reason`,
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
      contents: `Detail the technical impact of: "${item.title}". Tool: ${item.tool}. Significance and impact in 2 sentences.`,
    });
    return response.text || "Insight synthesized.";
  });
}

export async function fetchArticleReadability(item: NewsItem): Promise<{ content: string; sources: GroundingSource[] }> {
  return withRetry(async () => {
    // Only perform readability if the URL is somewhat sane
    if (!item.url || !item.url.startsWith('http')) return { content: "Original source URI malformed.", sources: [] };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize technical takeaways from the content at this URI: ${item.url}. Focus on developer impact. Use Markdown.`,
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
      contents: `Define "${word}" in AI dev tool context. Max 15 words.`,
    });
    return response.text || "Term defined.";
  });
}
