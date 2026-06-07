import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  const { message, userId } = await req.json();
  // CUST-006: Call Google Gemini API with user context
  const reply = `Thanks for your question about "${message}". Connect GEMINI_API_KEY for live responses. (user: ${userId})`;
  return new Response(JSON.stringify({ reply }), {
    headers: { "Content-Type": "application/json" },
  });
});
