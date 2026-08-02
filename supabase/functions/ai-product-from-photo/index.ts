import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { imageData, discountPercent = 20, searchEnabled = false } = await req.json();
    if (typeof imageData !== "string" || !imageData.startsWith("data:image/")) return json({ success: false, error: "A product photo is required." }, 400);

    const aiKey = Deno.env.get("LOVABLE_API_KEY") || Deno.env.get("AI_PROVIDER_API_KEY");
    if (!aiKey) return json({ success: false, code: "AI_PROVIDER_NOT_CONFIGURED", error: "Configure AI_PROVIDER_API_KEY or LOVABLE_API_KEY in Supabase Edge Function secrets." });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("AI_VISION_MODEL") || "google/gemini-2.5-flash",
        messages: [{ role: "user", content: [
          { type: "text", text: "Identify this physical retail product from its packaging, label, logo, model number, and visible details. Return only structured facts. Do not invent certainty. This is a general ecommerce store, not a 3D-print workflow." },
          { type: "image_url", image_url: { url: imageData } },
        ] }],
        tools: [{ type: "function", function: { name: "return_product", description: "Return product identity for an ecommerce listing", parameters: { type: "object", properties: {
          name: { type: "string" }, brand: { type: "string" }, model: { type: "string" }, category: { type: "string" }, description: { type: "string" }, attributes: { type: "array", items: { type: "string" } }, search_query: { type: "string" }, market_reference_price: { type: "number" }, confidence: { type: "string", enum: ["high", "medium", "low"] },
        }, required: ["name", "brand", "model", "category", "description", "attributes", "search_query", "market_reference_price", "confidence"], additionalProperties: false } } }],
        tool_choice: { type: "function", function: { name: "return_product" } },
      }),
    });
    if (!response.ok) return json({ success: false, error: `AI provider returned ${response.status}.` });
    const payload = await response.json();
    const args = payload.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return json({ success: false, error: "The AI provider returned no structured product data." });
    const identified = JSON.parse(args);

    let marketPrice = Number(identified.market_reference_price) || 0;
    let marketSources: Array<{ title: string; price: number; url: string }> = [];
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (searchEnabled && firecrawlKey && identified.search_query) {
      const search = await fetch("https://api.firecrawl.dev/v1/search", { method: "POST", headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: identified.search_query, limit: 5, scrapeOptions: { formats: ["markdown"] } }) });
      const results = await search.json();
      marketSources = (results.data || []).map((item: any) => ({ title: item.title || item.metadata?.title || identified.name, price: Number(String(item.markdown || "").match(/(?:\$|USD\s*)(\d+(?:\.\d{1,2})?)/)?.[1] || 0), url: item.url || "" })).filter((item: any) => item.price > 0);
      if (marketSources.length) marketPrice = marketSources.reduce((sum, item) => sum + item.price, 0) / marketSources.length;
    }

    const discount = Math.min(90, Math.max(0, Number(discountPercent) || 20));
    const suggestedPrice = marketPrice > 0 ? Math.round(marketPrice * (1 - discount / 100) * 100) / 100 : 0;
    return json({ success: true, data: { ...identified, market_reference_price: Math.round(marketPrice * 100) / 100, market_sources: marketSources, discount_percent: discount, suggested_price: suggestedPrice } });
  } catch (error) {
    return json({ success: false, error: error instanceof Error ? error.message : "Photo analysis failed." }, 500);
  }
});
