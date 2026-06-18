export async function onRequestPost(context) {
  try {
    const { profession } = await context.request.json();
    const result =
      "STUB OK — received: " + String(profession).toUpperCase() +
      "\n(Real engine not wired yet. This proves the plumbing works.)";
    return new Response(JSON.stringify({ result }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
