import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { callAi, loadAiVisionConfig } from "../_shared/ai-provider.ts";
import { DEEPSEEK_IMAGE_LIMITATION, isDeepSeekProvider, isImageProviderUsable } from "../_shared/ai-compat.ts";
import { getIntegrationSecret } from "../_shared/integration-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && Number(contentLength) > 8_000_000) return json({ success: false, error: "La imagen supera el límite de 8 MB." }, 413);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!supabaseUrl || !serviceRoleKey || !token) return json({ success: false, error: "Authentication required." }, 401);
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData } = await adminClient.auth.getUser(token);
    if (!userData.user) return json({ success: false, error: "Authentication required." }, 401);
    const { data: role } = await adminClient.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ success: false, error: "Admin access required." }, 403);

    const { imageData, discountPercent = 20, searchEnabled = false } = await req.json();
    if (typeof imageData !== "string" || !imageData.startsWith("data:image/")) return json({ success: false, error: "A product photo is required." }, 400);
    if (imageData.length > 10_800_000) return json({ success: false, error: "La imagen supera el límite de 8 MB." }, 413);

    const aiConfig = await loadAiVisionConfig(adminClient);
    if (!aiConfig) {
      return json({ success: false, code: "AI_IMAGE_PROVIDER_NOT_CONFIGURED", error: "Configura la clave, proveedor, modelo y base URL de visión en Admin → Integrations." });
    }
    if (!isImageProviderUsable(aiConfig)) {
      return json({
        success: false,
        code: isDeepSeekProvider(aiConfig) ? "AI_IMAGE_PROVIDER_UNSUPPORTED" : "AI_IMAGE_PROVIDER_NOT_CONFIGURED",
        error: isDeepSeekProvider(aiConfig)
          ? DEEPSEEK_IMAGE_LIMITATION
          : "El proveedor configurado no soporta visión o faltan sus credenciales. Configura un proveedor compatible en Admin → Integrations.",
      });
    }

    const response = await callAi(aiConfig, {
        model: aiConfig.model,
        messages: [{ role: "user", content: [
          { type: "text", text: "Identify this physical retail product from its packaging, label, logo, model number, and visible details. Return only structured facts. Do not invent certainty. This is a general ecommerce store, not a 3D-print workflow." },
          { type: "image_url", image_url: { url: imageData } },
        ] }],
        tools: [{ type: "function", function: { name: "return_product", description: "Return product identity for an ecommerce listing", parameters: { type: "object", properties: {
          name: { type: "string" }, brand: { type: "string" }, model: { type: "string" }, category: { type: "string" }, description: { type: "string" }, attributes: { type: "array", items: { type: "string" } }, search_query: { type: "string" }, market_reference_price: { type: "number" }, confidence: { type: "string", enum: ["high", "medium", "low"] },
        }, required: ["name", "brand", "model", "category", "description", "attributes", "search_query", "market_reference_price", "confidence"], additionalProperties: false } } }],
        tool_choice: { type: "function", function: { name: "return_product" } },
    });
    if (!response.ok) {
      const status = response.status;
      return json({
        success: false,
        code: status === 429 ? "AI_RATE_LIMITED" : status === 402 ? "AI_CREDITS_EXHAUSTED" : "AI_PROVIDER_ERROR",
        error: status === 429
          ? "El proveedor de IA está temporalmente limitado. Espera unos minutos y vuelve a intentarlo."
          : status === 402
            ? "El proveedor de IA no tiene créditos disponibles."
            : `El proveedor de IA no pudo analizar la imagen (código ${status}).`,
        ...(status === 429 ? { retry_after_seconds: 60 } : {}),
      });
    }
    const payload = await response.json();
    const args = payload.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return json({ success: false, error: "The AI provider returned no structured product data." });
    const identified = JSON.parse(args);

    let marketPrice = Number(identified.market_reference_price) || 0;
    let marketSources: Array<{ title: string; price: number; url: string }> = [];
    const firecrawlKey = await getIntegrationSecret(adminClient, "FIRECRAWL_API_KEY");
    if (searchEnabled && firecrawlKey && identified.search_query) {
      const search = await fetch("https://api.firecrawl.dev/v1/search", { method: "POST", headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: identified.search_query, limit: 5, scrapeOptions: { formats: ["markdown"] } }) });
      const results = await search.json();
      const resultRows = Array.isArray(results.data) ? results.data as Record<string, unknown>[] : [];
      marketSources = resultRows.map((item) => {
        const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata as Record<string, unknown> : {};
        const title = String(item.title || metadata.title || identified.name);
        const markdown = String(item.markdown || "");
        return { title, price: Number(markdown.match(/(?:\$|USD\s*)(\d+(?:\.\d{1,2})?)/)?.[1] || 0), url: String(item.url || "") };
      }).filter((item) => item.price > 0);
      if (marketSources.length) marketPrice = marketSources.reduce((sum, item) => sum + item.price, 0) / marketSources.length;
    }

    const discount = Math.min(90, Math.max(0, Number(discountPercent) || 20));
    const suggestedPrice = marketPrice > 0 ? Math.round(marketPrice * (1 - discount / 100) * 100) / 100 : 0;
    return json({ success: true, data: { ...identified, market_reference_price: Math.round(marketPrice * 100) / 100, market_sources: marketSources, discount_percent: discount, suggested_price: suggestedPrice } });
  } catch (error) {
    return json({ success: false, code: "AI_OPERATION_FAILED", error: error instanceof Error ? error.message : "No se pudo analizar la foto." });
  }
});
