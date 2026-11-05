import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const trackingNumber = String(body?.tracking_number ?? "").trim().toUpperCase();
    if (!/^MX-REQ-[A-F0-9]{16}$/.test(trackingNumber)) {
      return new Response(JSON.stringify({ error: "Enter a valid tracking number." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
    if (!supabaseUrl || !serviceKey) throw new Error("Tracking service is not configured");

    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const shipmentUrl = new URL("/rest/v1/deliveries", supabaseUrl);
    shipmentUrl.searchParams.set("select", "id,tracking_number,delivery_type,service_scope,status,pickup_location_label,dropoff_location_label,pickup_contact_name,dropoff_contact_name,customer_note,package_image_url,tracking_code_issued");
    shipmentUrl.searchParams.set("tracking_number", `eq.${trackingNumber}`);
    shipmentUrl.searchParams.set("tracking_code_issued", "eq.true");
    shipmentUrl.searchParams.set("limit", "1");

    const shipmentResponse = await fetch(shipmentUrl, { headers });
    if (!shipmentResponse.ok) throw new Error("Tracking lookup failed");
    const shipments = await shipmentResponse.json();
    const shipment = shipments?.[0];
    if (!shipment) {
      return new Response(JSON.stringify({ error: "We couldn't find a shipment with that tracking number." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventsUrl = new URL("/rest/v1/shipment_events", supabaseUrl);
    eventsUrl.searchParams.set("select", "status,description,location_label,occurred_at");
    eventsUrl.searchParams.set("delivery_id", `eq.${shipment.id}`);
    eventsUrl.searchParams.set("order", "occurred_at.asc");
    const eventsResponse = await fetch(eventsUrl, { headers });
    if (!eventsResponse.ok) throw new Error("Could not load shipment progress");
    const events = await eventsResponse.json();

    const { id: _privateId, tracking_code_issued: _issued, ...publicShipment } = shipment;
    return new Response(JSON.stringify({ shipment: publicShipment, events }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_error) {
    return new Response(JSON.stringify({ error: "Tracking is temporarily unavailable. Please try again later." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
