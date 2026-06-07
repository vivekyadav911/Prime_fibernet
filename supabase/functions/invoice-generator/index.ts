import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  const { planId, amount, customerName } = await req.json();
  // PYMT-003: Generate PDF with pdf-lib, store in invoices/ bucket
  return new Response(
    JSON.stringify({
      invoiceNumber: `INV-${new Date().getFullYear()}-${Date.now()}`,
      planId,
      amount,
      customerName,
      pdfPath: `invoices/${planId}-${Date.now()}.pdf`,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
