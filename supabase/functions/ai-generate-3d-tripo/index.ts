// Tripo3D text-to-3D generation. Returns a hosted .glb URL.
// Docs: https://platform.tripo3d.ai/docs/api-reference
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRIPO_API = "https://api.tripo3d.ai/v2/openapi";

async function tripo(path: string, opts: RequestInit, key: string) {
  const res = await fetch(`${TRIPO_API}${path}`, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`Tripo ${res.status}: ${text.slice(0, 200)}`);
  return json;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth: require admin
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return new Response(JSON.stringify({ success: false, error: "Admin required" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check enabled
    const { data: setting } = await admin.from("admin_settings").select("setting_value").eq("setting_key", "ai_3d_tripo_enabled").maybeSingle();
    if (setting?.setting_value !== "true") {
      return new Response(JSON.stringify({ success: false, error: "Tripo3D generation is disabled in admin settings." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const key = Deno.env.get("TRIPO_API_KEY");
    if (!key) return new Response(JSON.stringify({ success: false, error: "TRIPO_API_KEY is not configured." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string" || prompt.length < 3) {
      return new Response(JSON.stringify({ success: false, error: "prompt is required (min 3 chars)" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. create task
    const create = await tripo("/task", {
      method: "POST",
      body: JSON.stringify({ type: "text_to_model", prompt: prompt.slice(0, 800), model_version: "v2.5-20250123" }),
    }, key);
    const taskId = create?.data?.task_id;
    if (!taskId) throw new Error("No task_id returned");

    // 2. poll for up to ~3 minutes
    const deadline = Date.now() + 180_000;
    let status = "queued";
    let modelUrl: string | null = null;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 4000));
      const poll = await tripo(`/task/${taskId}`, { method: "GET" }, key);
      status = poll?.data?.status || status;
      if (status === "success") {
        modelUrl = poll?.data?.output?.pbr_model || poll?.data?.output?.model || null;
        break;
      }
      if (["failed", "cancelled", "banned", "expired"].includes(status)) {
        throw new Error(`Tripo task ${status}: ${JSON.stringify(poll?.data?.error || {})}`);
      }
    }
    if (!modelUrl) throw new Error("Tripo timed out (no model URL within 3 min). Try again later.");

    return new Response(JSON.stringify({ success: true, modelUrl, taskId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[ai-generate-3d-tripo] error", err);
    return new Response(JSON.stringify({ success: false, error: err?.message || String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
