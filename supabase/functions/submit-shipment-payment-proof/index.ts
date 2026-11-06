import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json();
    const tracking = String(body?.tracking_number ?? "").trim().toUpperCase();
    const last4 = String(body?.phone_last4 ?? "").replace(/\D/g, "");
    const mime = String(body?.mime_type ?? "");
    const base64 = String(body?.file_base64 ?? "");
    const fileName = String(body?.file_name ?? "payment-proof").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 100);
    if (!/^MX-REQ-[A-F0-9]{16}$/.test(tracking) || !/^\d{4}$/.test(last4)) return json({ error: "Enter a valid tracking number and receiver phone's last four digits." }, 400);
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(mime)) return json({ error: "Upload a JPG, PNG, WebP image or PDF receipt." }, 400);
    if (!base64 || base64.length > 7000000) return json({ error: "The receipt is empty or too large. Please upload a file under 5 MB." }, 400);
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
    if (!url || !key) throw new Error("Payment proof service is not configured");
    const headers = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };
    const shipmentUrl = new URL("/rest/v1/deliveries", url);
    shipmentUrl.searchParams.set("select", "id,tracking_number,dropoff_contact_phone,status,tracking_code_issued");
    shipmentUrl.searchParams.set("tracking_number", "eq." + tracking);
    shipmentUrl.searchParams.set("tracking_code_issued", "eq.true");
    shipmentUrl.searchParams.set("limit", "1");
    const shipmentResponse = await fetch(shipmentUrl, { headers });
    if (!shipmentResponse.ok) throw new Error("Could not verify shipment");
    const shipment = (await shipmentResponse.json())?.[0];
    const receiverPhone = String(shipment?.dropoff_contact_phone ?? "").replace(/\D/g, "");
    if (!shipment || receiverPhone.slice(-4) !== last4) return json({ error: "Shipment or receiver verification details did not match." }, 403);
    if (shipment.status !== "awaiting_payment") return json({ error: "This shipment is not currently awaiting payment." }, 409);
    const binary = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    if (binary.byteLength > 5 * 1024 * 1024) return json({ error: "The receipt must be smaller than 5 MB." }, 400);
    const extension = fileName.includes(".") ? fileName.split(".").pop() : (mime === "application/pdf" ? "pdf" : "jpg");
    const path = "guest/" + shipment.id + "/" + crypto.randomUUID() + "." + extension;
    const uploadResponse = await fetch(new URL("/storage/v1/object/payment-proofs/" + path, url), {
      method: "POST",
      headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": mime, "x-upsert": "false" },
      body: binary,
    });
    if (!uploadResponse.ok) {
      console.error("Payment proof storage upload failed", await uploadResponse.text());
      throw new Error("Receipt upload failed");
    }
    const transactionReference = String(body?.transaction_reference ?? "").trim().slice(0, 160);
    const customerNote = String(body?.customer_note ?? "").trim().slice(0, 1000);
    const insertResponse = await fetch(new URL("/rest/v1/payment_proofs?select=id,status,created_at,transaction_reference,customer_note,storage_path", url), {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({ delivery_id: shipment.id, customer_id: null, storage_path: path, transaction_reference: transactionReference || null, customer_note: customerNote || null, status: "submitted" }),
    });
    if (!insertResponse.ok) {
      console.error("Payment proof record insert failed", await insertResponse.text());
      await fetch(new URL("/storage/v1/object/payment-proofs/" + path, url), { method: "DELETE", headers: { apikey: key, Authorization: "Bearer " + key } });
      throw new Error("Could not save payment receipt details");
    }
    const rows = await insertResponse.json();
    return json({ proof: rows[0], message: "Payment proof sent to the shipping team." });
  } catch (error) {
    console.error("Payment proof submission error", error);
    return json({ error: error instanceof Error ? error.message : "Payment proof submission is temporarily unavailable." }, 500);
  }
});