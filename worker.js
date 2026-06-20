import { ENGINE_V7 } from "./engine.js";

// Server-side gate: only text that genuinely looks like a clean numbered recipe
// is ever shown to the user. Anything else - a refusal, commentary, an empty
// response, "NONRECIPE", a network error - produces the same fixed fallback.
// This is an allowlist, not a blocklist: nothing passes unless it positively
// matches the expected shape, so no unanticipated phrasing of a refusal or
// reveal can ever slip through.
const FALLBACK_LINE = "That one's not in my cookbook \u2014 some things, perhaps, are better left undone.";

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

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 2048,
            temperature: 0.85,
            system: ENGINE_V7,
            messages: [
              { role: "user", content: "Make me a recipe for replacing a " + profession.trim() }
            ]
          })
        });

        const data = await response.json();

        // Any upstream API error (rate limit, auth, server issue) -> safe fallback,
        // never the raw error message.
        if (!response.ok) {
          return new Response(JSON.stringify({ result: FALLBACK_LINE }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }

        const raw = data.content?.[0]?.text || "";
        const result = looksLikeCleanRecipe(raw) ? raw.trim() : FALLBACK_LINE;

        return new Response(JSON.stringify({ result }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });

      } catch (e) {
        // Any unexpected failure (bad JSON, network issue, etc.) -> safe fallback,
        // never the raw exception message.
        return new Response(JSON.stringify({ result: FALLBACK_LINE }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    if (url.pathname === "/api/feedback" && request.method === "POST") {
      // Logging not yet wired - placeholder so the front end doesn't error.
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Everything else (index.html, cookbook-art.png, frame-ornament.png, etc.)
    // is served automatically from the /public folder via the assets binding.
    return env.ASSETS.fetch(request);
  }
};
