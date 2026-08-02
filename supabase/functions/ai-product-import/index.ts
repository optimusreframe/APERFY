import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function extractPricesFromText(text: string): number[] {
  const prices: number[] = [];
  const priceRegex = /(?:US\s*)?(?:\$|USD\s*)(\d{1,5}(?:\.\d{1,2})?)/gi;
  let match;
  while ((match = priceRegex.exec(text)) !== null) {
    const price = parseFloat(match[1]);
    if (price >= 1 && price <= 500) prices.push(price);
  }
  return prices;
}

// ── Phase 1: Generate optimized eBay search queries using AI ──
async function generateEbayQueries(
  title: string,
  description: string,
  LOVABLE_API_KEY: string
): Promise<string[]> {
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You generate eBay search queries to find 3D printed products similar to the one described. Generate 3-4 diverse search queries that maximize the chance of finding relevant listings.

Rules:
- All queries MUST start with "site:ebay.com"
- Query 1: Use the most distinctive keywords from the title + "3D printed"
- Query 2: Use the product type/category + character/franchise name + "3D print"
- Query 3: Use a simplified 2-3 word description + "3D printed figurine" or "3D printed model"
- Query 4 (optional): If the product is from a known franchise, use the franchise name + product type + "3D print"
- Strip site names like "MakerWorld", "Thingiverse", "Printables" from queries
- Strip phrases like "Free 3D Print Model", "STL file", etc.
- Keep queries concise (under 10 words after "site:ebay.com")`
          },
          {
            role: "user",
            content: `Product title: ${title}\nDescription snippet: ${description.substring(0, 500)}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_queries",
            description: "Return optimized eBay search queries",
            parameters: {
              type: "object",
              properties: {
                queries: {
                  type: "array",
                  items: { type: "string" },
                  description: "3-4 eBay search queries, each starting with site:ebay.com"
                }
              },
              required: ["queries"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_queries" } },
      }),
    });

    if (!resp.ok) {
      console.error("Query generation failed:", resp.status);
      return [`site:ebay.com ${title.substring(0, 50)} 3D printed`];
    }

    const result = await resp.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return [`site:ebay.com ${title.substring(0, 50)} 3D printed`];

    const parsed = JSON.parse(toolCall.function.arguments);
    const queries = (parsed.queries || []).filter((q: string) => q && q.length > 10);
    console.log("Generated eBay queries:", queries);
    return queries.length > 0 ? queries : [`site:ebay.com ${title.substring(0, 50)} 3D printed`];
  } catch (e) {
    console.error("generateEbayQueries error:", e);
    return [`site:ebay.com ${title.substring(0, 50)} 3D printed`];
  }
}

// ── Phase 2: Execute parallel Firecrawl searches ──
interface EbayListing {
  title: string;
  price: number;
  url: string;
}

async function searchEbayMulti(
  queries: string[],
  FIRECRAWL_API_KEY: string
): Promise<EbayListing[]> {
  const allListings: EbayListing[] = [];
  const seenUrls = new Set<string>();

  const results = await Promise.allSettled(
    queries.map(async (query) => {
      try {
        const resp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            limit: 4,
            scrapeOptions: { formats: ["markdown"] },
          }),
        });
        const data = await resp.json();
        if (resp.ok && data.success && data.data) {
          return data.data.map((r: any) => ({
            title: r.title || r.metadata?.title || "",
            markdown: r.markdown || r.description || "",
            url: r.url || r.metadata?.sourceURL || "",
          }));
        }
      } catch (e) {
        console.error(`Search failed for query "${query}":`, e);
      }
      return [];
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const item of result.value) {
        if (item.url && seenUrls.has(item.url)) continue;
        if (item.url) seenUrls.add(item.url);

        const prices = extractPricesFromText(item.markdown + " " + item.title);
        for (const price of prices) {
          allListings.push({ title: item.title, price, url: item.url });
        }
      }
    }
  }

  console.log(`searchEbayMulti: found ${allListings.length} listings from ${queries.length} queries`);
  return allListings;
}

// ── Phase 3: AI-powered price validation and filtering ──
interface ValidatedPrice {
  suggested_price: number;
  price_confidence: "high" | "medium" | "low";
  matched_listings_count: number;
  price_source: "ebay_market" | "ai_estimate";
}

async function validateAndAveragePrices(
  productTitle: string,
  productDescription: string,
  listings: EbayListing[],
  LOVABLE_API_KEY: string
): Promise<ValidatedPrice> {
  if (listings.length === 0) {
    return { suggested_price: 0, price_confidence: "low", matched_listings_count: 0, price_source: "ai_estimate" };
  }

  try {
    const listingSummary = listings
      .slice(0, 20)
      .map((l, i) => `${i + 1}. "${l.title}" — $${l.price.toFixed(2)}`)
      .join("\n");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a pricing analyst for 3D printed products. Given a target product and a list of eBay listings found via search, determine which listings are ACTUALLY the same or very similar product (same character, same type, similar size/complexity).

Rules:
- DISCARD listings that are clearly different products (wrong character, wrong type, unrelated items)
- DISCARD listings that are digital files or digital downloads (we sell physical 3D printed items)
- From the RELEVANT listings, calculate the average price
- If 3+ relevant listings match → confidence "high"
- If 1-2 relevant listings match → confidence "medium"
- If 0 relevant listings match → confidence "low" and suggest a reasonable price based on product type`
          },
          {
            role: "user",
            content: `TARGET PRODUCT:\nTitle: ${productTitle}\nDescription: ${productDescription.substring(0, 300)}\n\nEBAY LISTINGS FOUND:\n${listingSummary}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "validate_prices",
            description: "Return validated price analysis",
            parameters: {
              type: "object",
              properties: {
                suggested_price: { type: "number", description: "Recommended price in USD" },
                price_confidence: { type: "string", enum: ["high", "medium", "low"] },
                matched_listings_count: { type: "number", description: "Number of relevant listings used" },
                reasoning: { type: "string", description: "Brief explanation of the pricing decision" },
              },
              required: ["suggested_price", "price_confidence", "matched_listings_count", "reasoning"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "validate_prices" } },
      }),
    });

    if (!resp.ok) {
      console.error("Price validation AI failed:", resp.status);
      const avg = listings.reduce((a, b) => a + b.price, 0) / listings.length;
      return { suggested_price: Math.round(avg * 100) / 100, price_confidence: "medium", matched_listings_count: listings.length, price_source: "ebay_market" };
    }

    const result = await resp.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      const avg = listings.reduce((a, b) => a + b.price, 0) / listings.length;
      return { suggested_price: Math.round(avg * 100) / 100, price_confidence: "medium", matched_listings_count: listings.length, price_source: "ebay_market" };
    }

    const validated = JSON.parse(toolCall.function.arguments);
    console.log("Price validation result:", validated.reasoning);
    return {
      suggested_price: Math.round((validated.suggested_price || 0) * 100) / 100,
      price_confidence: validated.price_confidence || "low",
      matched_listings_count: validated.matched_listings_count || 0,
      price_source: validated.matched_listings_count > 0 ? "ebay_market" : "ai_estimate",
    };
  } catch (e) {
    console.error("validateAndAveragePrices error:", e);
    const avg = listings.reduce((a, b) => a + b.price, 0) / listings.length;
    return { suggested_price: Math.round(avg * 100) / 100, price_confidence: "low", matched_listings_count: listings.length, price_source: "ebay_market" };
  }
}

async function requireAdmin(req: Request): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return { ok: false, status: 401, error: "Authentication required" };

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
    return { ok: false, status: 500, error: "Auth not configured" };
  }

  // Validate user via Auth server
  const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!userResp.ok) return { ok: false, status: 401, error: "Invalid or expired session" };
  const user = await userResp.json();
  if (!user?.id) return { ok: false, status: 401, error: "Invalid session" };

  // Check admin role via service role over REST
  const rolesResp = await fetch(
    `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${user.id}&role=eq.admin&select=role`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!rolesResp.ok) return { ok: false, status: 500, error: "Role check failed" };
  const rows = await rolesResp.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, status: 403, error: "Admin access required" };
  }

  return { ok: true, userId: user.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 5_000_000) {
      return new Response(JSON.stringify({ error: "Request too large" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin-only: every action in this function mutates AI-generated content,
    // burns LOVABLE_API_KEY / Firecrawl quota, or accepts a `customBackground`
    // override. Block anon and non-admin callers at the door.
    const authCheck = await requireAdmin(req);
    if (!authCheck.ok) {
      return new Response(JSON.stringify({ error: authCheck.error }), {
        status: authCheck.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { url, action } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");


    // ── ACTION: scrape ──
    if (action === "scrape") {
      if (!url || typeof url !== 'string' || !isValidUrl(url.trim())) {
        return new Response(JSON.stringify({ error: "Valid URL is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const existingCategories = body.existingCategories || [];

      let scrapedContent = "";
      let scrapedImages: string[] = [];
      let scrapedTitle = "";

      if (FIRECRAWL_API_KEY) {
        try {
          const fcResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: url.trim(),
              formats: ["markdown", "links"],
              onlyMainContent: true,
            }),
          });
          const fcData = await fcResp.json();
          if (fcResp.ok && fcData.success) {
            scrapedContent = (fcData.data?.markdown || fcData.markdown || "").substring(0, 8000);
            scrapedTitle = fcData.data?.metadata?.title || fcData.metadata?.title || "";
            const imgRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
            let match;
            while ((match = imgRegex.exec(scrapedContent)) !== null) {
              scrapedImages.push(match[1]);
            }
            const ogImage = fcData.data?.metadata?.ogImage || fcData.metadata?.ogImage;
            if (ogImage) scrapedImages.unshift(ogImage);
          }
        } catch (e) {
          console.error("Firecrawl error:", e);
        }
      }

      if (!scrapedContent) {
        scrapedContent = `URL provided: ${url}. Unable to scrape content directly.`;
      }

      // ── Multi-Strategy eBay Price Research ──
      let priceResult: ValidatedPrice = {
        suggested_price: 0,
        price_confidence: "low",
        matched_listings_count: 0,
        price_source: "ai_estimate",
      };
      let searchQueriesUsed: string[] = [];

      if (FIRECRAWL_API_KEY && scrapedTitle) {
        // Phase 1: Generate smart queries
        const queries = await generateEbayQueries(scrapedTitle, scrapedContent.substring(0, 500), LOVABLE_API_KEY);
        searchQueriesUsed = queries;

        // Phase 2: Parallel search
        const listings = await searchEbayMulti(queries, FIRECRAWL_API_KEY);

        // Phase 3: AI validation
        priceResult = await validateAndAveragePrices(scrapedTitle, scrapedContent.substring(0, 500), listings, LOVABLE_API_KEY);
      }

      const categorySlugs = existingCategories.map((c: any) => c.slug).join(", ");
      const imageListForAI = scrapedImages.slice(0, 10).map((u, i) => `${i + 1}. ${u}`).join("\n");

      const priceInstruction = priceResult.price_source === "ebay_market"
        ? `suggested_price: Use exactly ${priceResult.suggested_price} as the price (validated from eBay market data).`
        : `suggested_price: Reasonable retail price in USD for a 3D printed product.`;

      const extractResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are a product data extraction expert for a curated shopping e-commerce store called "APERFY".

STRICT RULES:
- Product name (name_en, name_es): Create a TOTALLY NEW name. MAX 4 WORDS. Short, catchy, commercial. NEVER copy the original name.
- Description (description_en, description_es): MAX 150 characters each. 2-3 short sentences. Attractive and concise.
- reference_image_url: From the list of extracted images below, pick the SINGLE BEST image URL that shows the product most clearly (front view, clean, high-res). If no good image, return empty string.
- slug: URL-friendly, lowercase, hyphens only, based on the new name.
- ${priceInstruction}
- suggested_category: Use one of these existing slugs if applicable: ${categorySlugs || "none yet"}. Otherwise suggest a new slug.
- materials: Logical curated shopping materials (PLA, ABS, PETG, Resin, etc.)
- colors: Recommended colors in Spanish (Negro, Blanco, Dorado, etc.)

EXTRACTED IMAGES:
${imageListForAI || "No images found."}`
            },
            {
              role: "user",
              content: `Scraped page title: ${scrapedTitle}\n\nScraped content:\n${scrapedContent.substring(0, 6000)}`
            }
          ],
          tools: [{
            type: "function",
            function: {
              name: "extract_product_data",
              description: "Extract and generate product data from scraped content",
              parameters: {
                type: "object",
                properties: {
                  name_en: { type: "string", description: "NEW unique product name in English (max 4 words)" },
                  name_es: { type: "string", description: "NEW unique product name in Spanish (max 4 words)" },
                  description_en: { type: "string", description: "Short description in English (max 150 chars, 2-3 sentences)" },
                  description_es: { type: "string", description: "Short description in Spanish (max 150 chars, 2-3 sentences)" },
                  slug: { type: "string", description: "URL-friendly slug (lowercase, hyphens only)" },
                  suggested_price: { type: "number", description: "Suggested retail price in USD" },
                  suggested_category: { type: "string", description: "Best matching existing category slug, or a new slug" },
                  suggested_category_name_en: { type: "string", description: "Category name in English (for new categories)" },
                  suggested_category_name_es: { type: "string", description: "Category name in Spanish (for new categories)" },
                  materials: { type: "array", items: { type: "string" }, description: "Material names (e.g. PLA, ABS, PETG, Resin)" },
                  colors: { type: "array", items: { type: "string" }, description: "Colors in Spanish (e.g. Negro, Blanco, Dorado)" },
                  original_title: { type: "string", description: "The original product title from the source" },
                  reference_image_url: { type: "string", description: "The single best product image URL from the extracted images list" },
                },
                required: ["name_en", "name_es", "description_en", "description_es", "slug", "suggested_price", "suggested_category", "materials", "colors", "reference_image_url"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "extract_product_data" } },
        }),
      });

      if (!extractResp.ok) {
        const status = extractResp.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error("AI extraction failed");
      }

      const extractResult = await extractResp.json();
      const toolCall = extractResult.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("AI did not return structured data");

      const productData = JSON.parse(toolCall.function.arguments);
      const uniqueImages = [...new Set(scrapedImages)].slice(0, 5);

      // Override price with validated eBay price when available
      if (priceResult.price_source === "ebay_market" && priceResult.suggested_price > 0) {
        productData.suggested_price = priceResult.suggested_price;
      }

      return new Response(JSON.stringify({
        success: true,
        data: {
          ...productData,
          extracted_images: uniqueImages,
          price_confidence: priceResult.price_confidence,
          matched_listings_count: priceResult.matched_listings_count,
          price_source: priceResult.price_source,
          search_queries_used: searchQueriesUsed,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: generate_image ──
    if (action === "generate_image") {
      const { sourceImage, customBackground, backgroundMode, safeRetry, backgroundCandidateId, preset: presetTag, productId } = body;
      if (!sourceImage) {
        return new Response(JSON.stringify({ error: "Source image is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const FRAMING_RULE = `CRITICAL FRAMING RULE:
Show the entire 3D printed object fully visible inside the frame. Do not crop any part of the object. Keep clear margins around the object on all sides (at least 10-15% negative space top, bottom, left, and right). Center the object on the workbench. Use a medium product photography framing — not an extreme close-up. The full silhouette, base, top, sides, and details must remain visible. For tall/vertical objects, keep both the base and the top inside the frame. For long/horizontal objects, keep both the left and right ends inside the frame. Macro style is allowed but the object must remain fully visible and not cropped.`;

      const fidelityRule = `CRITICAL OBJECT FIDELITY RULE:
Preserve the exact same 3D object from the source image. Do not redesign it, do not change its shape, geometry, proportions, silhouette, color, material, texture, surface details, printed layer lines, logos, holes, edges, or accessories. Do not add or remove any parts. Do not stylize the object. Only change the background, lighting, camera feel, shadows, and environment. The final image must look like the same physical object photographed in a professional curated shopping studio.`;

      const SAFE_RETRY_PROMPT = `Create a clean product photo composition using the provided source object image and the provided background image. Preserve the exact object from the source image. Do not identify, rename, reinterpret, stylize, redesign, or transform the object. Do not add or remove any parts. Only adjust placement, scale, contact shadow, lighting match, and background integration. Keep the entire object fully visible inside the frame with at least 10-15% margin on all sides — never crop the object. The output should look like a realistic ecommerce product photo.`;

      const BACKGROUND_PROMPTS: Record<string, string> = {
        system_workshop: `BACKGROUND AND PHOTOGRAPHY STYLE:
Place the EXACT same object on a brushed grey metallic industrial workbench inside a premium FDM curated shopping studio.

The background must show a softly blurred professional 3D printer, out-of-focus orange and teal product detail spools, subtle workshop tools, and a dark cinematic maker-lab environment.

Use realistic premium ecommerce product photography lighting: soft studio light, cool blue rim light on the object edges, warm orange accent glow from the background, natural soft contact shadows, and subtle reflections on the metal tabletop.

Use a macro product photography look with shallow depth of field, heavy background bokeh, 50mm lens aesthetic, realistic scale, centered composition, and high-end catalog quality.

The object must remain the main focus, sharp, clean, physically grounded on the table, and must look like a real 3D printed PLA product.

No people, no hands, no text, no watermark, no extra logos, no extra objects distracting from the product.`,
        system_macro: `BACKGROUND AND PHOTOGRAPHY STYLE:
Macro ecommerce product photo of the EXACT same 3D printed object on a brushed grey metallic tabletop. Very shallow depth of field, close-up camera angle, heavily blurred FDM 3D printer and orange/teal product detail spools in the background. Premium studio lighting, soft realistic shadows, subtle metal reflections, sharp focus on the object, realistic PLA texture, clean product catalog composition. No people, no hands, no text, no watermark, no extra logos.`,
        system_dark_premium: `BACKGROUND AND PHOTOGRAPHY STYLE:
Premium cinematic product photography of the EXACT same 3D printed object displayed on a brushed dark metallic workbench inside a high-end curated shopping studio. Background: dark blurred FDM printer, teal and orange product detail bokeh, low-key lighting, dramatic cool blue rim light, warm orange accent glow, soft shadows, realistic reflections, luxury maker-lab atmosphere, centered hero composition, high-end ecommerce catalog image. No people, no hands, no text, no watermark, no extra logos.`,
        custom: `BACKGROUND AND PHOTOGRAPHY STYLE:
Seamlessly composite the identical object onto the user-uploaded background image. Match perspective, scale, lighting direction, color temperature, shadows, and surface contact. Add realistic soft contact shadows and subtle ambient reflections so the object looks physically placed in the scene. Do not alter the object. No people, no hands, no text, no watermark unless they already exist in the uploaded background.`,
        premium_tech_plinth: `BACKGROUND AND PHOTOGRAPHY STYLE:
Luxury technology product display of the EXACT same 3D printed object on a dark carbon-fiber plinth. Background: dark blue and grey geometric network structure, subtle copper and gold accents, premium cyber-tech aesthetic, soft realistic contact shadows, dramatic studio lighting, high-end product hero shot. Do not change the object. No people, no hands, no watermark.`,
      };

      const normalizedBackgroundMode =
        !backgroundMode ? "system_workshop" :
        backgroundMode === "system" ? "system_workshop" :
        BACKGROUND_PROMPTS[backgroundMode] ? backgroundMode :
        "system_workshop";

      if (normalizedBackgroundMode === "custom" && !customBackground) {
        return new Response(JSON.stringify({
          success: false,
          error: "Se requiere una imagen de fondo personalizada (customBackground) cuando backgroundMode es 'custom'.",
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Safe Retry uses a neutral prompt with no IP/brand references.
      const promptText = safeRetry === true
        ? `${FRAMING_RULE}\n\n${SAFE_RETRY_PROMPT}`
        : `${FRAMING_RULE}\n\n${fidelityRule}\n\n${BACKGROUND_PROMPTS[normalizedBackgroundMode]}`;

      // Resolve official workshop reference image when applicable
      let resolvedReference: string | undefined = customBackground;
      if (normalizedBackgroundMode === "system_workshop" && !resolvedReference) {
        try {
          const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
          const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
          if (SUPABASE_URL && SERVICE_KEY) {
            const settingResp = await fetch(
              `${SUPABASE_URL}/rest/v1/admin_settings?setting_key=eq.system_background&select=setting_value`,
              { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
            );
            if (settingResp.ok) {
              const rows = await settingResp.json();
              const val = rows?.[0]?.setting_value;
              if (val && typeof val === "string") resolvedReference = val;
            }
          }
        } catch {
          // Non-fatal
        }
      }

      const contentParts: any[] = [];
      contentParts.push({ type: "text", text: promptText });
      contentParts.push({ type: "image_url", image_url: { url: sourceImage } });

      if (normalizedBackgroundMode === "custom" && customBackground) {
        contentParts.push({ type: "image_url", image_url: { url: customBackground } });
      } else if (normalizedBackgroundMode === "system_workshop" && resolvedReference) {
        contentParts.push({ type: "image_url", image_url: { url: resolvedReference } });
      }

      const messages = [{ role: "user", content: contentParts }];

      const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages,
          modalities: ["image", "text"],
        }),
      });

      const BLOCKED_RX = /(prohibited|safety|content[_\s-]?policy|blocked|unsafe|moderation|rejected|recitation|copyright)/i;
      const BLOCKED_MESSAGE = "La IA no pudo procesar esta imagen. Puede ocurrir con personajes reconocibles, diseños con copyright, logos, rostros o contenido sensible. Puedes intentar Safe Retry, usar un preview sin IA o elegir otra imagen.";

      if (!imgResp.ok) {
        const status = imgResp.status;
        const t = await imgResp.text();
        console.error("[generate_image] AI HTTP error:", status, t);
        if ((status === 400 || status === 422) && BLOCKED_RX.test(t)) {
          return new Response(JSON.stringify({
            success: false,
            error_code: "AI_CONTENT_BLOCKED",
            message: BLOCKED_MESSAGE,
            can_retry_safe: !safeRetry,
            can_use_non_ai_fallback: true,
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        let errorMsg = 'Error al generar imagen con IA.';
        if (status === 429) errorMsg = 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.';
        else if (status === 402) errorMsg = 'Créditos de IA agotados.';
        else errorMsg = `Error del servicio de IA (código ${status}). Intenta de nuevo más tarde.`;
        return new Response(JSON.stringify({ success: false, error: errorMsg }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const imgResult = await imgResp.json();
      const message = imgResult.choices?.[0]?.message;

      let generatedImage: string | undefined;
      if (message?.images?.[0]?.image_url?.url) {
        generatedImage = message.images[0].image_url.url;
      } else if (Array.isArray(message?.content)) {
        const imgPart = message.content.find((p: any) => p.type === "image_url" || p.type === "image");
        if (imgPart?.image_url?.url) generatedImage = imgPart.image_url.url;
        else if (imgPart?.url) generatedImage = imgPart.url;
      } else if (typeof message?.content === "string" && message.content.startsWith("data:image")) {
        generatedImage = message.content;
      }

      if (!generatedImage) {
        const finishReason = imgResult.choices?.[0]?.finish_reason || 'unknown';
        const nativeReason = imgResult.choices?.[0]?.native_finish_reason || '';
        const combined = `${finishReason} ${nativeReason}`;
        console.error("[generate_image] no image, finish_reason:", combined, JSON.stringify(imgResult).substring(0, 1200));

        const blocked = BLOCKED_RX.test(combined) || /IMAGE_PROHIBITED_CONTENT|SAFETY|RECITATION/i.test(combined);
        if (blocked) {
          return new Response(JSON.stringify({
            success: false,
            error_code: "AI_CONTENT_BLOCKED",
            message: BLOCKED_MESSAGE,
            can_retry_safe: !safeRetry,
            can_use_non_ai_fallback: true,
            ai_finish_reason: combined.trim(),
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({
          success: false,
          error: `La IA no devolvió una imagen (razón: ${nativeReason || finishReason}). Intenta con otra imagen fuente o modo diferente.`,
          error_code: nativeReason || finishReason,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Persist composed result to storage + DB (best-effort) ──
      let composedPublicUrl: string | undefined;
      let savedResultId: string | undefined;
      try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (SUPABASE_URL && SERVICE_KEY && generatedImage.startsWith("data:image")) {
          const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(generatedImage);
          if (m) {
            const mime = m[1];
            const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
            const ext = mime === "image/jpeg" ? "jpg" : (mime.split("/")[1] || "png");
            const method = safeRetry === true ? "safe_retry" : "ai";
            const presetSlug = (typeof presetTag === "string" ? presetTag : normalizedBackgroundMode).replace(/[^a-zA-Z0-9_-]/g, "_");
            const path = `composed-results/${authCheck.userId}/${Date.now()}-${method}-${presetSlug}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
            const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
              auth: { persistSession: false, autoRefreshToken: false },
            });
            const { error: upErr } = await supabaseAdmin.storage
              .from("product-images")
              .upload(path, new Blob([bin], { type: mime }), { contentType: mime, upsert: false });
            if (!upErr) {
              const { data: pub } = supabaseAdmin.storage.from("product-images").getPublicUrl(path);
              composedPublicUrl = pub.publicUrl;
              const backgroundUrl = customBackground || resolvedReference || "";
              const { data: row } = await supabaseAdmin
                .from("background_composition_results")
                .insert({
                  source_image_url: sourceImage,
                  background_image_url: backgroundUrl,
                  composed_image_url: composedPublicUrl,
                  background_candidate_id: backgroundCandidateId || null,
                  method,
                  preset: presetSlug,
                  product_id: productId || null,
                  created_by: authCheck.userId,
                })
                .select("id")
                .single();
              if (row) savedResultId = row.id;
            } else {
              console.error("[generate_image] composed upload failed:", upErr);
            }
          }
        }
      } catch (persistErr) {
        console.error("[generate_image] persist error:", persistErr);
      }

      return new Response(JSON.stringify({
        success: true,
        data: {
          generated_image: composedPublicUrl || generatedImage,
          composed_image_url: composedPublicUrl,
          saved_result_id: savedResultId,
          method: safeRetry === true ? "safe_retry" : "ai",
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: translate ──
    if (action === "translate") {
      const { name_es, description_es } = body;
      if (!name_es && !description_es) {
        return new Response(JSON.stringify({ error: "Spanish text required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const translateResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: "You are a translator for a curated shopping e-commerce store. Translate the given Spanish product name and description to English. Keep it compelling and suitable for an online store."
            },
            {
              role: "user",
              content: `Translate to English:\nName: ${name_es || ''}\nDescription: ${description_es || ''}`
            }
          ],
          tools: [{
            type: "function",
            function: {
              name: "translate_product",
              description: "Return translated product data",
              parameters: {
                type: "object",
                properties: {
                  name_en: { type: "string", description: "Product name in English" },
                  description_en: { type: "string", description: "Product description in English" },
                },
                required: ["name_en", "description_en"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "translate_product" } },
        }),
      });

      if (!translateResp.ok) {
        const status = translateResp.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error("Translation failed");
      }

      const tResult = await translateResp.json();
      const tCall = tResult.choices?.[0]?.message?.tool_calls?.[0];
      if (!tCall) throw new Error("AI did not return translation");
      const translated = JSON.parse(tCall.function.arguments);

      return new Response(JSON.stringify({ success: true, data: translated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: enhance_product ──
    if (action === "enhance_product") {
      const { name_es, description_es, existingCategories, imageUrl } = body;

      const categorySlugs = (existingCategories || []).map((c: any) => `${c.slug} (${c.name_es})`).join(", ");

      const messages: any[] = [
        {
          role: "system",
          content: `You are a product copywriter for "APERFY", a curated shopping e-commerce store.

Given a product's current Spanish name and description (which may be rough/incomplete), generate polished, commercial versions.

STRICT RULES:
- name_es: Catchy Spanish product name. MAX 4 words.
- name_en: Equivalent English name. MAX 4 words.
- description_es: Attractive Spanish description. MAX 150 characters. 2-3 short sentences.
- description_en: Equivalent English description. MAX 150 characters. 2-3 short sentences.
- slug: URL-friendly, lowercase, hyphens only, based on the ENGLISH name.
- suggested_category: Pick the best from existing: ${categorySlugs || "none"}. If none fit, suggest a new slug.
- suggested_category_name_es: Spanish name for the category (only for new categories).
- suggested_category_name_en: English name for the category (only for new categories).

If the input name/description is already good, polish it slightly. If it's empty or very rough, create compelling copy based on any available image context.`
        },
        {
          role: "user",
          content: imageUrl
            ? [
                { type: "text", text: `Current name (ES): ${name_es || '(empty)'}\nCurrent description (ES): ${description_es || '(empty)'}` },
                { type: "image_url", image_url: { url: imageUrl } }
              ]
            : `Current name (ES): ${name_es || '(empty)'}\nCurrent description (ES): ${description_es || '(empty)'}`
        }
      ];

      const enhanceResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          tools: [{
            type: "function",
            function: {
              name: "enhance_product",
              description: "Return enhanced product data",
              parameters: {
                type: "object",
                properties: {
                  name_es: { type: "string", description: "Polished Spanish name (max 4 words)" },
                  name_en: { type: "string", description: "Polished English name (max 4 words)" },
                  description_es: { type: "string", description: "Spanish description (max 150 chars)" },
                  description_en: { type: "string", description: "English description (max 150 chars)" },
                  slug: { type: "string", description: "URL slug from English name" },
                  suggested_category: { type: "string", description: "Best category slug" },
                  suggested_category_name_es: { type: "string", description: "Category name in Spanish (new categories only)" },
                  suggested_category_name_en: { type: "string", description: "Category name in English (new categories only)" },
                },
                required: ["name_es", "name_en", "description_es", "description_en", "slug", "suggested_category"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "enhance_product" } },
        }),
      });

      if (!enhanceResp.ok) {
        const status = enhanceResp.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error("Enhancement failed");
      }

      const eResult = await enhanceResp.json();
      const eCall = eResult.choices?.[0]?.message?.tool_calls?.[0];
      if (!eCall) throw new Error("AI did not return enhanced data");
      const enhanced = JSON.parse(eCall.function.arguments);

      return new Response(JSON.stringify({ success: true, data: enhanced }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: generate_angle ──
    // Generates ONE additional camera angle from a reference image, preserving the object identically.
    if (action === "generate_angle") {
      const { sourceImage, angle } = body as { sourceImage?: string; angle?: string };
      if (!sourceImage || !angle) {
        return new Response(JSON.stringify({ success: false, error: "sourceImage and angle are required" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const fidelityRule = `CRITICAL OBJECT FIDELITY RULE:
Preserve the exact same 3D object from the source image. Do not redesign it, do not change its shape, geometry, proportions, silhouette, color, material, texture, surface details, printed layer lines, logos, holes, edges, or accessories. Do not add or remove any parts. Do not stylize the object. Only change the camera angle. The final image must look like the same physical object photographed in a professional APERFY workshop studio.`;

      const sharedBackground = `Generate a new product angle of the exact same object while preserving the same APERFY workshop background, same brushed grey metallic workbench, same blurred FDM printer, same orange and teal product detail bokeh, same lighting direction, same shadows, same camera lens style, and same ecommerce catalog quality. Only change the camera angle. Do not alter the object.`;

      const anglePrompts: Record<string, string> = {
        side: `${sharedBackground} Render the EXACT same object from a perfect side / profile view (90° rotation).`,
        back: `${sharedBackground} Render the EXACT same object from the back (180° rotation).`,
        three_quarter: `${sharedBackground} Render the EXACT same object from a 3/4 hero angle (roughly 45° rotation, slight high angle).`,
        top: `${sharedBackground} Render the EXACT same object from a top-down / overhead angle.`,
        macro: `${sharedBackground} Render an ultra close-up macro shot of the EXACT same object focusing on its surface details and PLA texture, with very shallow depth of field.`,
        lifestyle: `${sharedBackground} Render the EXACT same object framed as a tasteful lifestyle hero shot within the same APERFY workshop scene. Do not modify the object.`,
      };

      const anglePrompt = anglePrompts[angle] || anglePrompts.three_quarter;
      const framingRule = `CRITICAL FRAMING RULE: Show the entire 3D printed object fully visible inside the frame with at least 10-15% negative space on all sides. Do not crop the object. Keep the full silhouette, base, top, sides, and details visible. Macro is allowed but the object must remain fully visible.`;
      const promptText = `${framingRule}\n\n${fidelityRule}\n\n${anglePrompt}\n\nThe output MUST be a single photorealistic image of the identical object — never reinterpret or restyle it. No people, no hands, no text, no watermark, no extra logos.`;

      const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: promptText },
              { type: "image_url", image_url: { url: sourceImage } },
            ],
          }],
          modalities: ["image", "text"],
        }),
      });

      if (!imgResp.ok) {
        const status = imgResp.status;
        let errorMsg = `Error del servicio de IA (código ${status}).`;
        if (status === 429) errorMsg = 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.';
        else if (status === 402) errorMsg = 'Créditos de IA agotados.';
        return new Response(JSON.stringify({ success: false, error: errorMsg }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const imgResult = await imgResp.json();
      const message = imgResult.choices?.[0]?.message;
      let generatedImage: string | undefined;
      if (message?.images?.[0]?.image_url?.url) {
        generatedImage = message.images[0].image_url.url;
      } else if (Array.isArray(message?.content)) {
        const imgPart = message.content.find((p: any) => p.type === "image_url" || p.type === "image");
        if (imgPart?.image_url?.url) generatedImage = imgPart.image_url.url;
        else if (imgPart?.url) generatedImage = imgPart.url;
      } else if (typeof message?.content === "string" && message.content.startsWith("data:image")) {
        generatedImage = message.content;
      }

      if (!generatedImage) {
        const finishReason = imgResult.choices?.[0]?.finish_reason || 'unknown';
        const nativeReason = imgResult.choices?.[0]?.native_finish_reason || '';
        return new Response(JSON.stringify({
          success: false,
          error: `La IA no devolvió una imagen (razón: ${nativeReason || finishReason}).`,
          error_code: nativeReason || finishReason,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: true, data: { generated_image: generatedImage, angle } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: generate_background_reference ──
    // Generate empty AI background images (no product) and persist them as candidates.
    if (action === "generate_background_reference") {
      const { preset, count, promptOverride } = body as {
        preset?: string;
        count?: number;
        promptOverride?: string;
      };

      const BACKGROUND_PRESET_PROMPTS: Record<string, string> = {
        system_workshop: `Empty premium curated shopping workshop product photography background. Brushed grey metallic workbench in the foreground with enough empty space to place a product. Dark cinematic maker studio in the background, softly blurred FDM 3D printer, out-of-focus orange and teal product detail spools, subtle industrial tools, shallow depth of field, soft reflections on the metal table, realistic studio lighting, premium ecommerce catalog look, clean composition, no product, no people, no hands, no text, no logos, no watermark.`,
        system_macro: `Empty macro-style premium curated shopping workshop background. Brushed grey metallic tabletop in the foreground with empty centered placement area for a product. Very shallow depth of field, heavily blurred FDM 3D printer and orange/teal product detail spools in the background, premium studio lighting, subtle metal reflections, close-up product photography composition, clean dark maker-lab atmosphere, no product, no people, no hands, no text, no logos, no watermark.`,
        system_dark_premium: `Empty premium dark cinematic curated shopping studio background. Brushed dark metallic workbench in the foreground with enough empty space for a product. Background shows a blurred FDM 3D printer, teal and orange product detail bokeh, low-key luxury lighting, cool rim glow, warm orange accents, soft realistic shadows, subtle reflections, high-end maker-lab atmosphere, no product, no people, no hands, no text, no logos, no watermark.`,
        premium_tech_plinth: `Empty luxury technology product display background. Dark carbon-fiber plinth centered in the foreground with empty space for a product. Background: dark blue and grey geometric network forms, subtle copper and gold accents, premium cyber-tech aesthetic, soft contact shadows, dramatic studio lighting, clean composition, no product, no people, no hands, no text, no watermark.`,
      };

      const presetKey = typeof preset === "string" ? preset : "";
      if (!BACKGROUND_PRESET_PROMPTS[presetKey]) {
        return new Response(JSON.stringify({ success: false, error: "Invalid preset" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const allowedCounts = [1, 4, 8];
      const variantCount = allowedCounts.includes(Number(count)) ? Number(count) : 1;
      const prompt = (typeof promptOverride === "string" && promptOverride.trim().length > 10)
        ? promptOverride.trim()
        : BACKGROUND_PRESET_PROMPTS[presetKey];

      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!SUPABASE_URL || !SERVICE_KEY) {
        return new Response(JSON.stringify({ success: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const candidates: any[] = [];
      const errors: string[] = [];

      for (let i = 0; i < variantCount; i++) {
        try {
          const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3.1-flash-image-preview",
              messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
              modalities: ["image", "text"],
            }),
          });

          if (!imgResp.ok) {
            errors.push(`Variant ${i + 1}: AI HTTP ${imgResp.status}`);
            continue;
          }

          const imgResult = await imgResp.json();
          const message = imgResult.choices?.[0]?.message;
          let generatedDataUrl: string | undefined;
          if (message?.images?.[0]?.image_url?.url) {
            generatedDataUrl = message.images[0].image_url.url;
          } else if (Array.isArray(message?.content)) {
            const imgPart = message.content.find((p: any) => p.type === "image_url" || p.type === "image");
            if (imgPart?.image_url?.url) generatedDataUrl = imgPart.image_url.url;
            else if (imgPart?.url) generatedDataUrl = imgPart.url;
          } else if (typeof message?.content === "string" && message.content.startsWith("data:image")) {
            generatedDataUrl = message.content;
          }

          if (!generatedDataUrl || !generatedDataUrl.startsWith("data:image")) {
            const reason = imgResult.choices?.[0]?.native_finish_reason || imgResult.choices?.[0]?.finish_reason || "unknown";
            errors.push(`Variant ${i + 1}: no image (${reason})`);
            continue;
          }

          // data:image/<mime>;base64,<data>
          const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(generatedDataUrl);
          if (!match) {
            errors.push(`Variant ${i + 1}: malformed image payload`);
            continue;
          }
          const mime = match[1];
          const b64 = match[2];
          const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          const ext = mime === "image/jpeg" ? "jpg" : (mime.split("/")[1] || "png");
          const fileId = crypto.randomUUID();
          const path = `${presetKey}/${fileId}.${ext}`;

          // Upload to storage using the admin client (handles auth correctly for sb_secret_* keys)
          const blob = new Blob([bin], { type: mime });
          const { error: uploadErr } = await supabaseAdmin.storage
            .from("system-backgrounds")
            .upload(path, blob, { contentType: mime, upsert: true });
          if (uploadErr) {
            console.error(`[generate_background_reference] upload failed for variant ${i + 1}:`, uploadErr);
            errors.push(`Variant ${i + 1}: AI image generated, but storage upload failed. Check service role storage auth. (${uploadErr.message})`);
            continue;
          }
          const { data: pub } = supabaseAdmin.storage
            .from("system-backgrounds")
            .getPublicUrl(path);
          const publicUrl = pub.publicUrl;

          // Insert candidate row via admin client
          const { data: inserted, error: insertErr } = await supabaseAdmin
            .from("system_background_candidates")
            .insert({
              preset: presetKey,
              image_url: publicUrl,
              prompt,
              source: "ai",
              is_active: false,
              created_by: authCheck.userId,
            })
            .select()
            .single();
          if (insertErr) {
            console.error(`[generate_background_reference] db insert failed for variant ${i + 1}:`, insertErr);
            errors.push(`Variant ${i + 1}: db insert failed (${insertErr.message})`);
          } else if (inserted) {
            candidates.push(inserted);
          }
        } catch (e: any) {
          console.error(`[generate_background_reference] variant ${i + 1} error:`, e);
          errors.push(`Variant ${i + 1}: ${e?.message || "error"}`);
        }
      }

      return new Response(JSON.stringify({
        success: candidates.length > 0,
        candidates,
        errors,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'scrape', 'generate_image', 'generate_angle', 'generate_background_reference', 'translate', or 'enhance_product'." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });


  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
