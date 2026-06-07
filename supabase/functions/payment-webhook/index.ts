import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  const body = await req.json();
  // PYMT-001: Integrate Razorpay order creation with RAZORPAY_KEY_SECRET
  return new Response(
    JSON.stringify({
      orderId: `order_${crypto.randomUUID().slice(0, 8)}`,
      amount: body.amount,
      planId: body.planId,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
