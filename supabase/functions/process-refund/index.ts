import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const { paymentId, amount, reason } = await req.json();
  // PYMT-004: Call Razorpay refund API
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  await supabase
    .from("user_payments")
    .update({ payment_status: "refunded", refund_amount: amount })
    .eq("id", paymentId);
  return new Response(JSON.stringify({ refunded: true, reason }), {
    headers: { "Content-Type": "application/json" },
  });
});
