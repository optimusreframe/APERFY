// Lovable AI static "3D render" image generator.
// Returns a base64 PNG that the client uploads to product-images bucket.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
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

    const { data: setting } = await admin.from("admin_settings").select("setting_value").eq("setting_key", "ai_3d_render_enabled").maybeSingle();
    if (setting?.setting_value !== "true") {
      return new Response(JSON.stringify({ success: false, error: "AI render generation is disabled in admin settings." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ success: false, error: "LOVABLE_API_KEY missing" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string" || prompt.length < 3) {
      return new Response(JSON.stringify({ success: false, error: "prompt is required" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const fullPrompt = `Highly detailed isometric 3D render of: ${prompt}. Studio lighting, soft shadows, clean dark background, premium product photography style, sharp focus, photorealistic, 8K quality.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-image-2",
        prompt: fullPrompt,
        size: "1024x1024",
        quality: "low",
        n: 1,
      }),
    });
    const aiText = await aiRes.text();
    if (!aiRes.ok) {
      return new Response(JSON.stringify({ success: false, error: `AI gateway ${aiRes.status}: ${aiText.slice(0, 200)}` }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const aiJson = JSON.parse(aiText);
    const b64 = aiJson?.data?.[0]?.b64_json;
    if (!b64) return new Response(JSON.stringify({ success: false, error: "No image returned" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ success: true, imageBase64: b64, mimeType: "image/png" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[ai-render-3d-image] error", err);
    return new Response(JSON.stringify({ success: false, error: err?.message || String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
