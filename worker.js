export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle the API call
    if (url.pathname === "/api" && request.method === "POST") {
      try {
        const { profession } = await request.json();
        const result =
          "STUB OK — received: " + String(profession).toUpperCase() +
          "\n(Real engine not wired yet. This proves the plumbing works.)";
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

    // Serve index.html for everything else
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
  <h1>AI Occupational Cookbook <span class="muted">(plumbing test)</span></h1>
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
