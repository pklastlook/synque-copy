/**
 * Sentiment Classification Service
 *
 * Classifies comment/mention text as positive, neutral, or negative
 * using the configured LLM provider (Gemini/Claude/OpenAI/ZAI).
 *
 * Falls back to a keyword-based classifier if no LLM is available,
 * so the system ALWAYS produces a sentiment — never "unknown".
 */

import { chatWithFallback } from "./llm";

export type Sentiment = "positive" | "neutral" | "negative";

// ============================================================================
// Keyword-based fallback classifier
// Used when no LLM is configured, so the system always has a sentiment.
// ============================================================================

const POSITIVE_WORDS = [
  "love", "amazing", "awesome", "great", "excellent", "perfect", "beautiful",
  "fantastic", "wonderful", "best", "incredible", "brilliant", "superb",
  "outstanding", "impressive", "fabulous", "marvelous", "superb", "cool",
  "nice", "good", "happy", "glad", "thanks", "thank you", "appreciate",
  "well done", "great job", "loving", "obsessed", "stunning", "gorgeous",
  "on point", "fire", "lit", "slay", "goals", "inspired", "motivating",
];

const NEGATIVE_WORDS = [
  "hate", "terrible", "awful", "worst", "horrible", "bad", "disappointing",
  "disappointed", "disgusting", "trash", "garbage", "useless", "boring",
  "stupid", "ugly", "annoying", "frustrated", "angry", "furious", "mad",
  "broken", "doesn't work", "not working", "fail", "failure", "scam",
  "rip off", "ripoff", "overpriced", "waste", "poor", "sad", "depressing",
  "unhappy", "dissatisfied", "complaint", "wrong", "issue", "problem",
  "bug", "crash", "slow", "laggy", "freeze", "error",
];

function keywordClassify(text: string): Sentiment {
  const lower = text.toLowerCase();
  let score = 0;
  for (const w of POSITIVE_WORDS) if (lower.includes(w)) score++;
  for (const w of NEGATIVE_WORDS) if (lower.includes(w)) score--;
  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

// ============================================================================
// LLM-based classifier
// Sends a batch of comments to the LLM and gets back sentiment labels.
// ============================================================================

/**
 * Classify a single comment's sentiment using the LLM.
 * Falls back to keyword classification if LLM is unavailable.
 */
export async function classifySentiment(text: string): Promise<Sentiment> {
  if (!text || !text.trim()) return "neutral";

  try {
    const response = await chatWithFallback([
      {
        role: "system",
        content:
          "You are a sentiment analysis engine. Classify the user's text as exactly one word: positive, neutral, or negative. " +
          "Respond with ONLY that single word — no explanation, no punctuation.",
      },
      {
        role: "user",
        content: text,
      },
    ]);

    const result = response.content.trim().toLowerCase();
    if (result.includes("positive")) return "positive";
    if (result.includes("negative")) return "negative";
    if (result.includes("neutral")) return "neutral";

    // LLM gave an unexpected response — fall back to keywords
    return keywordClassify(text);
  } catch (err) {
    console.warn("[sentiment] LLM classification failed, using keyword fallback:", err instanceof Error ? err.message : String(err));
    return keywordClassify(text);
  }
}

/**
 * Batch classify multiple comments at once.
 * Sends them all in a single LLM call for efficiency.
 *
 * @param comments Array of { id, text } objects
 * @returns Map of id → Sentiment
 */
export async function classifySentimentBatch(
  comments: { id: string; text: string }[]
): Promise<Map<string, Sentiment>> {
  const results = new Map<string, Sentiment>();

  if (comments.length === 0) return results;

  // For small batches, classify individually (more accurate)
  if (comments.length <= 5) {
    for (const c of comments) {
      results.set(c.id, await classifySentiment(c.text));
    }
    return results;
  }

  // For larger batches, send all at once with numbered list
  try {
    const numbered = comments.map((c, i) => `${i + 1}. "${c.text.substring(0, 200)}"`).join("\n");
    const response = await chatWithFallback([
      {
        role: "system",
        content:
          "You are a sentiment analysis engine. For each numbered comment below, classify it as positive, neutral, or negative. " +
          "Respond with ONLY the numbers and labels, one per line, in this exact format:\n" +
          "1. positive\n2. neutral\n3. negative\n\n" +
          "Do not include any other text.",
      },
      {
        role: "user",
        content: numbered,
      },
    ]);

    const lines = response.content.trim().split("\n");
    for (let i = 0; i < lines.length && i < comments.length; i++) {
      const line = lines[i].toLowerCase();
      const comment = comments[i];
      if (line.includes("positive")) results.set(comment.id, "positive");
      else if (line.includes("negative")) results.set(comment.id, "negative");
      else results.set(comment.id, "neutral");
    }

    // Any comments that didn't get classified — fall back to keywords
    for (const c of comments) {
      if (!results.has(c.id)) {
        results.set(c.id, keywordClassify(c.text));
      }
    }

    return results;
  } catch (err) {
    console.warn("[sentiment] Batch LLM classification failed, using keyword fallback for all:", err instanceof Error ? err.message : String(err));
    for (const c of comments) {
      results.set(c.id, keywordClassify(c.text));
    }
    return results;
  }
}
