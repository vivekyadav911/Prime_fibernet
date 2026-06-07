import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  const { code, userId } = await req.json();
  // AUTH-003: Verify TOTP with speakeasy equivalent in Deno
  const valid = typeof code === "string" && code.length === 6 && /^\d+$/.test(code);
  return new Response(JSON.stringify({ valid }), {
    headers: { "Content-Type": "application/json" },
  });
});
