import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple input validation (no Zod in Deno edge runtime by default)
function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function sanitizeForPrompt(text: string): string {
  // Remove potential prompt injection markers
  return text
    .replace(/```/g, '')
    .replace(/system:/gi, '')
    .replace(/\bignore\b.*\binstructions\b/gi, '')
    .substring(0, 2000)
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Request size limit (50KB)
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 50000) {
      return new Response(JSON.stringify({ error: "Request too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { url, description } = body;

    if (!url && !description) {
      return new Response(JSON.stringify({ error: "URL or description is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate URL format if provided
    if (url && typeof url === 'string' && url.trim()) {
      if (!isValidUrl(url.trim())) {
        return new Response(JSON.stringify({ error: "Invalid URL format. Must be HTTP or HTTPS." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Validate description length
    if (description && typeof description === 'string' && description.length > 2000) {
      return new Response(JSON.stringify({ error: "Description too long (max 2000 characters)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const sanitizedUrl = url ? sanitizeForPrompt(String(url)) : "Not provided";
    const sanitizedDesc = description ? sanitizeForPrompt(String(description)) : "Not provided";

    const prompt = `You are a product data extraction assistant for a curated shopping store. Given the following reference URL and/or description, generate structured product data for a bilingual (English/Spanish) e-commerce catalog.

Reference URL: ${sanitizedUrl}
Additional description: ${sanitizedDesc}

Extract or generate the following fields based on the reference. Be creative and write compelling product descriptions suitable for a curated shopping store.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a product data assistant. Return structured data only." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_product",
              description: "Create a structured product listing from reference data",
              parameters: {
                type: "object",
                properties: {
                  name_en: { type: "string", description: "Product name in English" },
                  name_es: { type: "string", description: "Product name in Spanish" },
                  description_en: { type: "string", description: "Product description in English (2-3 sentences)" },
                  description_es: { type: "string", description: "Product description in Spanish (2-3 sentences)" },
                  slug: { type: "string", description: "URL-friendly slug (lowercase, hyphens)" },
                  suggested_price: { type: "number", description: "Suggested price in USD" },
                  suggested_category: { type: "string", enum: ["figurines", "home-decor", "accessories"], description: "Best matching category" },
                },
                required: ["name_en", "name_es", "description_en", "description_es", "slug", "suggested_price", "suggested_category"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_product" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, data: productData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
