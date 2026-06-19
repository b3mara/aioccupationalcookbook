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
            model: "claude-haiku-4-5",
            max_tokens: 2048,
            temperature: 0.95,
            system: ENGINE_V6,
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

    return new Response(getIndexHtml(), {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
};

function getIndexHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Occupational Cookbook</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 60px auto; padding: 0 16px; }
    h1 { font-size: 1.4rem; }
    input { width: 100%; padding: 10px; font-size: 1rem; box-sizing: border-box; }
    button { margin-top: 10px; padding: 10px 16px; font-size: 1rem; cursor: pointer; }
    #output { margin-top: 24px; white-space: pre-wrap; line-height: 1.5; }
    .muted { color: #888; }
  </style>
</head>
<body>
  <h1>AI Occupational Cookbook <span class="muted">(engine v6 test)</span></h1>
  <p>Make me a recipe for replacing a…</p>
  <input id="profession" placeholder="e.g. plumber" />
  <button id="go">Generate</button>
  <div id="output" class="muted">Output will appear here.</div>
  <script>
    const btn = document.getElementById("go");
    const out = document.getElementById("output");
    btn.addEventListener("click", async () => {
      const profession = document.getElementById("profession").value.trim();
      if (!profession) { out.textContent = "Type a profession first."; return; }
      out.textContent = "Working…";
      try {
        const res = await fetch("/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profession })
        });
        const data = await res.json();
        out.textContent = data.result || ("Error: " + (data.error || "unknown"));
      } catch (e) {
        out.textContent = "Request failed: " + e.message;
      }
    });
  </script>
</body>
</html>`;
}
