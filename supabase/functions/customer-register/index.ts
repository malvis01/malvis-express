import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.error("Customer registration function is missing server configuration.");
      return json({ error: "Customer registration is temporarily unavailable." }, 503);
    }

    const payload = await request.json();
    const displayName = typeof payload.display_name === "string" ? payload.display_name.trim() : "";
    const phone = typeof payload.phone_e164 === "string" ? payload.phone_e164.trim() : "";
    const password = typeof payload.password === "string" ? payload.password : "";

    if (displayName.length < 2 || displayName.length > 100) return json({ error: "Enter a valid full name." }, 400);
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) return json({ error: "Enter your phone number in international format, for example +2348012345678." }, 400);
    if (password.length < 8 || password.length > 128) return json({ error: "Your password must be between 8 and 128 characters." }, 400);

    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const clientIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || forwarded || "unknown";
    const ipHash = await sha256(clientIp);
    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: allowed, error: limitError } = await admin.rpc("check_customer_signup_rate_limit", { p_ip_hash: ipHash });
    if (limitError) {
      console.error("Signup rate-limit check failed:", limitError.message);
      return json({ error: "Customer registration is temporarily unavailable." }, 503);
    }
    if (allowed !== true) return json({ error: "Too many registration attempts from this network. Please try again later." }, 429);

    const digits = phone.replace(/\D/g, "");
    const loginEmail = `${digits}@phone.malvis-express.invalid`;
    const { data, error } = await admin.auth.admin.createUser({
      email: loginEmail,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, phone_e164: phone, phone_verified: false },
    });
    if (error || !data.user) {
      if (error) console.warn("Customer account creation was rejected:", error.message);
      return json({ error: "An account with this phone number may already exist. Try signing in instead." }, 409);
    }
    return json({ created: true });
  } catch (error) {
    console.error("Customer registration failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "We could not create your account. Please try again." }, 500);
  }
});
