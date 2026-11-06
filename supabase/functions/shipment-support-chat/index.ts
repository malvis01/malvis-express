import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const body = await req.json();
    const tracking = String(body?.tracking_number ?? "").trim().toUpperCase();
    const last4 = String(body?.phone_last4 ?? "").replace(/\D/g, "");
    if (!/^MX-REQ-[A-F0-9]{16}$/.test(tracking) || !/^\d{4}$/.test(last4)) {
      return new Response(JSON.stringify({ error: "Enter the tracking number and the receiver phone's last four digits." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
    if (!url || !key) throw new Error("Support service is not configured");
    const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
    const shipmentUrl = new URL("/rest/v1/deliveries", url);
    shipmentUrl.searchParams.set("select", "id,tracking_number,dropoff_contact_phone");
    shipmentUrl.searchParams.set("tracking_number", `eq.${tracking}`);
    shipmentUrl.searchParams.set("tracking_code_issued", "eq.true");
    shipmentUrl.searchParams.set("limit", "1");
    const shipmentResponse = await fetch(shipmentUrl, { headers });
    if (!shipmentResponse.ok) throw new Error("Could not verify shipment");
    const shipment = (await shipmentResponse.json())?.[0];
    const phone = String(shipment?.dropoff_contact_phone ?? "").replace(/\D/g, "");
    if (!shipment || phone.slice(-4) !== last4) {
      return new Response(JSON.stringify({ error: "Shipment or receiver verification details did not match." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const messagesUrl = new URL("/rest/v1/support_messages", url);
    messagesUrl.searchParams.set("select", "id,sender_type,message,created_at");
    messagesUrl.searchParams.set("delivery_id", `eq.${shipment.id}`);
    messagesUrl.searchParams.set("order", "created_at.asc");
    if (body.action === "list") {
      const response = await fetch(messagesUrl, { headers });
      if (!response.ok) throw new Error("Could not load messages");
      return new Response(JSON.stringify({ messages: await response.json() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (body.action === "send") {
      const message = String(body.message ?? "").trim();
      if (!message || message.length > 2000) return new Response(JSON.stringify({ error: "Message must be between 1 and 2,000 characters." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const response = await fetch(new URL("/rest/v1/support_messages?select=id,sender_type,message,created_at", url), {
        method: "POST", headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({ delivery_id: shipment.id, tracking_number: tracking, sender_type: "receiver", message }),
      });
      if (!response.ok) throw new Error("Could not send message");
      const rows = await response.json();
      return new Response(JSON.stringify({ message: rows[0] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "Unsupported support action." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (_error) {
    return new Response(JSON.stringify({ error: "Support chat is temporarily unavailable." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
