/**
 * Social Media & Profile API — Powered by Groq
 */
import { rateLimited } from './apiQueue.js';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL   = 'llama-3.3-70b-versatile';
const GROQ_URL     = `https://api.groq.com/openai/v1/chat/completions`;

/** In-memory cache: name (lowercased) → profile result */
const profileCache = new Map();

/** Custom error so callers can detect quota exhaustion specifically */
export class QuotaError extends Error {
  constructor(message, retryAfterSec = 60) {
    super(message);
    this.name = 'QuotaError';
    this.retryAfterSec = retryAfterSec;
  }
}

/* ── Low-level Groq caller ─────────────────────────────────────── */
/**
 * Calls Groq with automatic one-time retry on 429.
 * @param {string} prompt
 * @param {(secondsLeft: number) => void} [onCountdown] - called every second during wait
 */
const callGroq = async (prompt, onCountdown) => {
  const doFetch = () => fetch(GROQ_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2048,
      response_format: { type: "json_object" }
    }),
  });

  const parseError = async (response) => {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || response.statusText;
    if (response.status === 429) {
      const match = msg.match(/Please try again in ([\d.]+)s/i);
      const retryAfterSec = match ? Math.ceil(parseFloat(match[1])) : 5; // Groq limits are usually fast to clear
      return new QuotaError(`Groq API error 429: ${msg}`, retryAfterSec);
    }
    return new Error(`Groq API error ${response.status}: ${msg}`);
  };

  // ── First attempt ──────────────────────────────────────
  let response = await rateLimited(() => doFetch());

  if (!response.ok) {
    const err = await parseError(response);

    // On 429: wait the retry window then try exactly once more
    if (err instanceof QuotaError) {
      const waitSec = err.retryAfterSec;
      // Tick countdown every second so the UI can display it
      for (let s = waitSec; s > 0; s--) {
        onCountdown?.(s);
        await new Promise((r) => setTimeout(r, 1000));
      }
      onCountdown?.(0);

      // ── Second attempt ─────────────────────────────────
      response = await rateLimited(() => doFetch()); // retry also rate-limited
      if (!response.ok) {
        throw await parseError(response);   // give up — throw for UI to handle
      }
    } else {
      throw err;
    }
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? '';
};

/* ── JSON parser (strips markdown fences if present) ─────────────── */
const parseJson = (raw) => {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
};

/**
 * Fetch a complete influencer profile from Groq.
 * Returns realistic social follower estimates (in millions), domain,
 * sentiment, key contribution, and per-dimension score justifications.
 *
 * @param {string} name
 * @returns {Promise<{
 *   socials: { instagram: number, x: number, youtube: number, total: number },
 *   domain: string,
 *   sentiment: string,
 *   event: string,
 *   justification: {
 *     knowledge: string,
 *     social_impact: string,
 *     ethics: string,
 *     longevity: string,
 *     overall: string
 *   }
 * }>}
 */
export const fetchInfluencerProfile = async (name, onCountdown) => {
  // ── Cache hit: return instantly, no API call ───────────────────────
  const cacheKey = name.trim().toLowerCase();
  if (profileCache.has(cacheKey)) return profileCache.get(cacheKey);

  // ── Single combined prompt: profile + scores in one call ───────────
  const prompt = `
You are a real-world data analyst AND impact scoring expert.
Provide accurate public information about "${name}" AND score their long-term global impact.

Return ONLY a valid JSON object in this EXACT shape (no explanation, no markdown):
{
  "instagram_followers_millions": <realistic number, e.g. 283.5>,
  "x_followers_millions": <realistic number>,
  "youtube_subscribers_millions": <realistic number>,
  "domain": "<one of: Technology | Science | Education | Healthcare | Arts | Business | Environment | Sports | Politics | Entertainment>",
  "sentiment": "<one of: Positive | Neutral | Negative>",
  "key_contribution": "<one concise sentence, max 120 chars>",
  "knowledge_score": <0-100, depth of expertise and intellectual contribution>,
  "social_impact": <0-100, measurable positive effect on society>,
  "ethical_score": <0-100, integrity, transparency, absence of controversies>,
  "longevity_score": <0-100, lasting relevance and legacy>,
  "justification": {
    "knowledge": "<one sentence on their expertise>",
    "social_impact": "<one sentence on their societal effect>",
    "ethics": "<one sentence on ethical standing and controversies>",
    "longevity": "<one sentence on lasting legacy>",
    "overall": "<2 sentences balanced overall assessment>"
  }
}

Rules:
- Use real-world knowledge only. Do NOT invent data.
- Scores must be realistic and differentiated (not all 50).
- Follower counts must be realistic (e.g. Cristiano Ronaldo ~636M Instagram).
- If person is unknown, use zeros for followers and 50 for scores.
- Do NOT add anything outside the JSON object.
`.trim();

  try {
    const raw = await callGroq(prompt, onCountdown);
    const data = parseJson(raw);

    const clampMil   = (v) => Math.max(0, Math.round(Number(v) * 10) / 10);
    const clampScore = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 50)));

    const instagram = clampMil(data.instagram_followers_millions);
    const x         = clampMil(data.x_followers_millions);
    const youtube   = clampMil(data.youtube_subscribers_millions);
    const total     = Math.round((instagram + x + youtube) * 10) / 10;

    const VALID_DOMAINS    = ['Technology','Science','Education','Healthcare','Arts','Business','Environment','Sports','Politics','Entertainment'];
    const VALID_SENTIMENTS = ['Positive', 'Neutral', 'Negative'];

    const domain    = VALID_DOMAINS.includes(data.domain) ? data.domain : 'Technology';
    const sentiment = VALID_SENTIMENTS.includes(data.sentiment) ? data.sentiment : 'Neutral';
    const event     = String(data.key_contribution || `Notable figure in the ${domain} space.`).slice(0, 160);

    // ── AI scores (from the same single response) ─────────────────────
    const knowledge_score  = clampScore(data.knowledge_score);
    const social_impact    = clampScore(data.social_impact);
    const ethical_score    = clampScore(data.ethical_score);
    const longevity_score  = clampScore(data.longevity_score);
    const final_ai_score   = Math.round((knowledge_score + social_impact + ethical_score + longevity_score) / 4);

    const j = data.justification || {};
    const justification = {
      knowledge:     String(j.knowledge     || 'Known for significant expertise in their field.'),
      social_impact: String(j.social_impact || 'Has had measurable positive impact on society.'),
      ethics:        String(j.ethics        || 'Generally regarded as a positive public figure.'),
      longevity:     String(j.longevity     || 'Their work continues to influence future generations.'),
      overall:       String(j.overall       || `${name} is a globally recognized public figure.`),
    };

    const result = {
      socials: { instagram, x, youtube, total },
      domain,
      sentiment,
      event,
      justification,
      // scores bundled in — no second API call needed
      scores: { knowledge_score, social_impact, ethical_score, longevity_score, final_ai_score },
    };

    profileCache.set(cacheKey, result);
    return result;

  } catch (err) {
    if (err instanceof QuotaError) throw err;
    console.error('[socialApi] fetchInfluencerProfile failed:', err);
    return {
      socials: { instagram: 1.0, x: 1.0, youtube: 0.5, total: 2.5 },
      domain: 'Technology',
      sentiment: 'Neutral',
      event: `${name} is a recognized public figure. (Groq API unavailable)`,
      justification: {
        knowledge:     'Could not retrieve data from AI at this time.',
        social_impact: 'Could not retrieve data from AI at this time.',
        ethics:        'Could not retrieve data from AI at this time.',
        longevity:     'Could not retrieve data from AI at this time.',
        overall:       'Profile data unavailable. Please check your Groq API key.',
      },
      scores: { knowledge_score: 50, social_impact: 50, ethical_score: 50, longevity_score: 50, final_ai_score: 50 },
    };
  }
};


/**
 * Backward-compatible follower-only fetch (wraps fetchInfluencerProfile).
 */
export const fetchFollowerCounts = async (name) => {
  const { socials } = await fetchInfluencerProfile(name);
  return socials;
};

/**
 * Format follower count (millions) for display.
 */
export const formatFollowers = (millions) => {
  if (millions >= 1)    return `${millions.toFixed(1)}M`;
  if (millions >= 0.01) return `${Math.round(millions * 1000)}K`;
  return `${Math.round(millions * 1_000_000)}`;
};
