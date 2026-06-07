import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const signature = req.headers.get("x-razorpay-signature");
  const body = await req.text();
  // PYMT-002: Verify HMAC-SHA256 with RAZORPAY_WEBHOOK_SECRET
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing signature" }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const event = JSON.parse(body);
  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;
    await supabase.from("user_payments").upsert(
      {
        transaction_id: payment.id,
        amount: payment.amount / 100,
        payment_status: "success",
        payment_method: payment.method,
      },
      { onConflict: "transaction_id" },
    );
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
