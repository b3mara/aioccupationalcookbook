import { ENGINE_V7 } from "./engine.js";

// Two distinct user-facing messages:
// FALLBACK_LINE  — the input genuinely has no recipe (not an occupation, gibberish, NONRECIPE)
// RETRY_LINE     — a temporary server-side problem; nothing wrong with the input
const FALLBACK_LINE = "That one\u2019s not in my cookbook \u2014 some things, perhaps, are better left undone.";
const RETRY_LINE    = "The kitchen is a bit overwhelmed right now \u2014 please try again in a moment.";

function looksLikeCleanRecipe(text) {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  if (trimmed === "NONRECIPE") return false;

  // Must contain at least 2 numbered steps (e.g. "1." and "2." at line starts)
  const stepMatches = trimmed.match(/^\s*\d+\s*[.)]/gm);
  if (!stepMatches || stepMatches.length < 2) return false;

  // Must NOT contain first-person / meta / refusal language
  const banned = /\b(I'm not going to|I won't|I appreciate|I can't help|as an AI|I'm an AI|my instructions|system prompt|I'm not comfortable|I will not|I'm unable to|let me be (straightforward|direct|honest)|to be (straightforward|direct|honest))\b/i;
  if (banned.test(trimmed)) return false;

  return true;
}

// Call the Anthropic API once. Returns { ok, status, text }.
async function callAnthropic(profession, apiKey) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      temperature: 0.85,
      system: ENGINE_V7,
      messages: [
        { role: "user", content: "Make me a recipe for replacing a " + profession }
      ]
    })
  });
  const data = await response.json();
  const text = data.content?.[0]?.text || "";
  return { ok: response.ok, status: response.status, text };
}

// Small delay helper for the retry pause.
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api" && request.method === "POST") {
      try {
        const { profession } = await request.json();

        if (!profession || typeof profession !== "string" || profession.trim().length === 0) {
          return new Response(JSON.stringify({ result: FALLBACK_LINE }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }

        const p = profession.trim();

        // First attempt
        let attempt = await callAnthropic(p, env.ANTHROPIC_API_KEY);

        // On a 529 (Anthropic overloaded) or 529-like transient error, retry once
        // after a short pause. 429 (rate limit) we do NOT retry — it won't help
        // within the same minute. Any other non-OK status we also don't retry.
        if (!attempt.ok && attempt.status === 529) {
          await sleep(3000); // 3 seconds — enough for a transient spike to clear
          attempt = await callAnthropic(p, env.ANTHROPIC_API_KEY);
        }

        // If still not OK after the retry (or after a non-529 error), tell the
        // user to try again rather than implying their input was the problem.
        if (!attempt.ok) {
          return new Response(JSON.stringify({ result: RETRY_LINE }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }

        // Gate: clean recipe passes through; anything else (NONRECIPE, refusal,
        // meta-commentary) shows the content-level fallback.
        const result = looksLikeCleanRecipe(attempt.text) ? attempt.text.trim() : FALLBACK_LINE;

        return new Response(JSON.stringify({ result }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });

      } catch (e) {
        // Network failure, bad JSON, or anything else unexpected.
        return new Response(JSON.stringify({ result: RETRY_LINE }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    if (url.pathname === "/api/feedback" && request.method === "POST") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
