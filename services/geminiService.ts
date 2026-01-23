
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
  
  // Detect clearly broken/hallucinated segments
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
 * Cross-references parsed items with verified grounding metadata chunks.
 */
function verifyLinks(items: NewsItem[], groundingChunks: any[]): NewsItem[] {
  const verifiedUris = groundingChunks
    .filter(c => c.web && c.web.uri)
    .map(c => c.web.uri);

  return items.map(item => {
    // If the URL is already in the verified list, it's perfect.
    if (verifiedUris.includes(item.url)) return item;

    // Otherwise, find the best fuzzy match from verified URIs based on the title or domain
    const bestMatch = verifiedUris.find(uri => {
      const uriObj = new URL(uri);
      const itemUrlObj = item.url.startsWith('http') ? new URL(item.url) : null;
      
      // If domains match and title keywords are present in URI, it's likely the real one
      const sameDomain = itemUrlObj && uriObj.hostname.replace('www.', '') === itemUrlObj.hostname.replace('www.', '');
      const keywordInUri = item.title.toLowerCase().split(' ').some(word => word.length > 4 && uri.toLowerCase().includes(word));
      
      return sameDomain && keywordInUri;
    });

    if (bestMatch) {
      return { ...item, url: bestMatch, id: generateIdFromUrl(bestMatch) };
    }

    // If no good match and the current URL is suspect (ellipses), 
    // fall back to the first available relevant grounding chunk
    if (item.url.includes('...') && verifiedUris.length > 0) {
       return { ...item, url: verifiedUris[0], id: generateIdFromUrl(verifiedUris[0]) };
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

        if (title && url) {
          rawItems.push({
            id: generateIdFromUrl(url),
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

  // Verify and fix links using grounding metadata
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
      ${isTargeted ? 'DEEP SYNC: prioritize niche social threads.' : 'General ecosystem sync.'}
      ${catQuery}.
      
      CRITICAL: For every [ITEM], ensure you use the EXACT, COMPLETE URL from the search result sources. NO TRUNCATION.
      
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
      contents: `Context: ${toolContext} (${categoryContext}). Signals:\n${contextStr}\n\nSummarize into 3 points. Link to a signal ID.
      
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize technical takeaways from ${item.url}. Focus on developer impact. Markdown.`,
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
