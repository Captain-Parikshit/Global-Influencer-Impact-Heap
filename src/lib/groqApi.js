/**
 * Groq API Integration — scoring and ethical analysis.
 * Set VITE_GROQ_API_KEY in your .env file.
 */
import { rateLimited } from './apiQueue.js';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // Fast, excellent for JSON/reasoning
const GROQ_URL = `https://api.groq.com/openai/v1/chat/completions`;

/**
 * Calls Groq with automatic retry on 429.
 * @param {string} prompt
 * @param {(s: number) => void} [onCountdown] - fires every second during wait
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
      temperature: 0.4,
      max_tokens: 2048,
      response_format: { type: "json_object" }
    }),
  });

  let response = await rateLimited(() => doFetch());

  // On 429 — wait the specified seconds then retry once
  if (response.status === 429) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || '';
    const match = msg.match(/Please try again in ([\d.]+)s/i);
    const waitSec = match ? Math.ceil(parseFloat(match[1])) : 5; // Groq rate limits are usually short

    for (let s = waitSec; s > 0; s--) {
      onCountdown?.(s);
      await new Promise((r) => setTimeout(r, 1000));
    }
    onCountdown?.(0);

    response = await rateLimited(() => doFetch()); // retry also rate-limited
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Groq API error ${response.status}: ${err?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? '';
};


/**
 * Parse JSON safely from a response string.
 */
const parseJson = (raw) => {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
};

/* ────────────────────────────────────────────────────────────────
   getLLMScore
──────────────────────────────────────────────────────────────── */
export const getLLMScore = async (name, domain, eventDesc) => {
  const prompt = `
You are an expert analyst evaluating the long-term global impact of public figures.
Assess "${name}" who operates in the "${domain}" domain.
Their most notable contribution: "${eventDesc}"

Score them on the following four dimensions, each from 0 to 100:
1. knowledge_score   — depth of expertise, intellectual contribution, thought leadership
2. social_impact     — measurable positive effect on society, communities, or public discourse
3. ethical_score     — integrity, transparency, ethical conduct, absence of major controversies
4. longevity_score   — sustainability of impact over time, legacy, lasting relevance

Use your knowledge of this individual to produce fair, realistic, differentiated scores.
DO NOT return identical scores for everyone.

Respond ONLY with a valid JSON object in this exact shape (no explanation, no markdown):
{
  "knowledge_score": <number>,
  "social_impact": <number>,
  "ethical_score": <number>,
  "longevity_score": <number>,
  "final_ai_score": <average of the four, rounded to nearest integer>
}
`.trim();

  try {
    const raw = await callGroq(prompt);
    const parsed = parseJson(raw);

    // Clamp all values to 0–100 and ensure final_ai_score is computed
    const clamp = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 50)));
    const knowledge_score = clamp(parsed.knowledge_score);
    const social_impact = clamp(parsed.social_impact);
    const ethical_score = clamp(parsed.ethical_score);
    const longevity_score = clamp(parsed.longevity_score);
    const final_ai_score = Math.round(
      (knowledge_score + social_impact + ethical_score + longevity_score) / 4
    );

    return { knowledge_score, social_impact, ethical_score, longevity_score, final_ai_score };
  } catch (err) {
    console.error('[groqApi] getLLMScore failed, using fallback:', err);
    return { knowledge_score: 50, social_impact: 50, ethical_score: 50, longevity_score: 50, final_ai_score: 50 };
  }
};

/* ────────────────────────────────────────────────────────────────
   getPlatformAnalysis
──────────────────────────────────────────────────────────────── */
export const getPlatformAnalysis = async (name, domain, socials) => {
  const igM = Number(socials.instagram).toFixed(1);
  const xM  = Number(socials.x).toFixed(1);
  const ytM = Number(socials.youtube).toFixed(1);

  const prompt = `
You are an expert social media impact analyst. Analyze "${name}", a public figure in the "${domain}" domain,
who has approximately ${igM}M Instagram followers, ${xM}M X/Twitter followers, and ${ytM}M YouTube subscribers.

Return ONLY a valid JSON object (no markdown, no explanation) in EXACTLY this shape:
{
  "platforms": [
    {
      "platform": "Instagram",
      "followers_m": ${igM},
      "engagement_rate": "<e.g. 5.2%>",
      "sentiment_score": <number from -1.0 to +1.0>,
      "impact_score": <number 0-100>,
      "key_audience": "<short description>",
      "llm_justification": "<1-2 sentence explanation>"
    },
    {
      "platform": "X (Twitter)",
      "followers_m": ${xM},
      "engagement_rate": "<e.g. 4.5%>",
      "sentiment_score": <number from -1.0 to +1.0>,
      "impact_score": <number 0-100>,
      "key_audience": "<short description>",
      "llm_justification": "<1-2 sentence explanation>"
    },
    {
      "platform": "YouTube",
      "followers_m": ${ytM},
      "engagement_rate": "<e.g. 3.8%>",
      "sentiment_score": <number from -1.0 to +1.0>,
      "impact_score": <number 0-100>,
      "key_audience": "<short description>",
      "llm_justification": "<1-2 sentence explanation>"
    }
  ],
  "sentiment_drivers": {
    "positive": "<comma-separated key positive drivers>",
    "negative": "<comma-separated key negative drivers>",
    "neutral": "<comma-separated neutral drivers>"
  },
  "narrative_dimensions": [
    { "dimension": "Narrative Power",       "explanation": "<1 sentence>" },
    { "dimension": "Emotional Resonance",   "explanation": "<1 sentence>" },
    { "dimension": "Mass Trust Layer",      "explanation": "<1 sentence>" },
    { "dimension": "Polarization Index",    "explanation": "<1 sentence>" },
    { "dimension": "Conversion Potential",  "explanation": "<1 sentence>" }
  ],
  "prutl_mapping": [
    { "dimension": "Positive Soul",        "observation": "<1 sentence>" },
    { "dimension": "Negative Soul",        "observation": "<1 sentence>" },
    { "dimension": "Positive Materialism", "observation": "<1 sentence>" },
    { "dimension": "Negative Materialism", "observation": "<1 sentence>" }
  ],
  "final_insight": "<2-3 sentence overall conclusion covering platform-level strategic differences>"
}
`.trim();

  try {
    const raw = await callGroq(prompt);
    return parseJson(raw);
  } catch (err) {
    console.error('[groqApi] getPlatformAnalysis failed:', err);
    return null;
  }
};

/* ────────────────────────────────────────────────────────────────
   getEthicalAnalysis
──────────────────────────────────────────────────────────────── */
export const getEthicalAnalysis = async (name, domain) => {
  const prompt = `
You are an ethical impact analyst. Provide a balanced ethical profile for "${name}",
a public figure known primarily in the "${domain}" space.

Return ONLY a valid JSON object in this exact shape (no explanation, no markdown):
{
  "positive_traits": ["<trait 1>", "<trait 2>"],
  "negative_traits": ["<trait 1>", "<trait 2>"],
  "impact_summary": "<2–3 sentence balanced summary of their real-world impact>"
}

Guidelines:
- positive_traits: exactly 2 concise positive qualities
- negative_traits: exactly 2 concise criticisms or controversies
- impact_summary: balanced, factual, referencing their actual contributions and controversies
`.trim();

  try {
    const raw = await callGroq(prompt);
    const parsed = parseJson(raw);

    return {
      positive_traits: Array.isArray(parsed.positive_traits) ? parsed.positive_traits.slice(0, 2) : ['Influential in their field', 'Recognized publicly'],
      negative_traits: Array.isArray(parsed.negative_traits) ? parsed.negative_traits.slice(0, 2) : ['Limited public transparency', 'Subject to occasional criticism'],
      impact_summary: String(parsed.impact_summary || `${name} has had a notable impact in the ${domain} space.`),
    };
  } catch (err) {
    console.error('[groqApi] getEthicalAnalysis failed, using fallback:', err);
    return {
      positive_traits: ['Influential in their field', 'Recognized publicly'],
      negative_traits: ['Limited public transparency', 'Subject to occasional criticism'],
      impact_summary: `${name} has had a notable impact in the ${domain} space.`,
    };
  }
};
