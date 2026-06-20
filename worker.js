import { ENGINE_V6 } from "./engine.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api" && request.method === "POST") {
      try {
        const { profession } = await request.json();

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
            system: ENGINE_V6 + "\n\n---\n\nPRODUCTION MODE: Output ONLY the numbered recipe steps, each a single operational directive in the character's own voice, one per line — nothing else. Do NOT print a title, the occupation name, the generic-O framing, or any header. Do NOT print the candidate O/B lists or any selection rationale. Do NOT print any recipe-card metadata fields of any kind — no \"Yield,\" \"Servings,\" \"Equipment required,\" \"Difficulty,\" \"Prep time,\" \"You will need,\" ingredient lists, or any other framing device borrowed from real recipe formatting. The reader supplies their own context and infers the objective; do not scaffold the output for them. Begin directly with step 1 and end after the final step.",
            messages: [
              { role: "user", content: "Make me a recipe for replacing a " + profession }
            ]
          })
        });

        const data = await response.json();

        if (!response.ok) {
          return new Response(JSON.stringify({
            error: data.error?.message || "Anthropic API error",
            status: response.status
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }

        const result = data.content?.[0]?.text || "No response text found";
        return new Response(JSON.stringify({ result }), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    if (url.pathname === "/api/feedback" && request.method === "POST") {
      // Logging not yet wired — placeholder so the front end doesn't error.
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Everything else (index.html, cookbook-art.png, etc.) is served
    // automatically from the /public folder via the assets binding.
    return env.ASSETS.fetch(request);
  }
};
