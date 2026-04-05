import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
- DISCARD listings that are STL files or digital downloads (we sell physical 3D printed items)
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 5_000_000) {
      return new Response(JSON.stringify({ error: "Request too large" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
              content: `You are a product data extraction expert for a 3D printing e-commerce store called "3DtoPrint".

STRICT RULES:
- Product name (name_en, name_es): Create a TOTALLY NEW name. MAX 4 WORDS. Short, catchy, commercial. NEVER copy the original name.
- Description (description_en, description_es): MAX 150 characters each. 2-3 short sentences. Attractive and concise.
- reference_image_url: From the list of extracted images below, pick the SINGLE BEST image URL that shows the product most clearly (front view, clean, high-res). If no good image, return empty string.
- slug: URL-friendly, lowercase, hyphens only, based on the new name.
- ${priceInstruction}
- suggested_category: Use one of these existing slugs if applicable: ${categorySlugs || "none yet"}. Otherwise suggest a new slug.
- materials: Logical 3D printing materials (PLA, ABS, PETG, Resin, etc.)
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
      const { sourceImage, customBackground, backgroundMode } = body;
      if (!sourceImage) {
        return new Response(JSON.stringify({ error: "Source image is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let promptText: string;
      const contentParts: any[] = [];

      const fidelityRule = "CRITICAL FIDELITY RULE: The 3D printed object MUST be reproduced with ABSOLUTE fidelity to the original image. Do NOT modify, alter, or reinterpret the object's design, colors, shape, size, proportions, textures, surface details, or any visual characteristic. The object must look EXACTLY like the original — same colors, same geometry, same style, same level of detail. The ONLY change is making it hyper-realistic with professional photography quality. You are changing the BACKGROUND and LIGHTING only, never the object itself.";

      if (backgroundMode === "system") {
        promptText = `${fidelityRule} Isolate the 3D model object from the reference image. Remove its original background completely. Place the EXACT same object (unchanged in every detail) on a grey industrial workbench. Background: Blurred professional 3D printer and colorful filament spools (orange/teal). Macro lens aesthetic, heavy bokeh, cinematic studio lighting with a cool rim light on the object edges. Hyper-realistic rendering — the object must be a perfect replica of the original.`;
      } else if (backgroundMode === "custom") {
        promptText = `${fidelityRule} Isolate the 3D model object from the reference image and remove its original background. The object must remain COMPLETELY unchanged — same design, colors, shape, proportions, textures, and details. Seamlessly composite and place this identical object onto the user-uploaded background image. Apply realistic lighting and soft contact shadows on the surface where the object is placed.`;
      } else {
        promptText = `${fidelityRule} Isolate the 3D model object from the reference image and remove its original background. The object must remain COMPLETELY unchanged. Luxury product display. Place the exact same object on a dark carbon-fiber plinth. Background: Intricate 3D geometric network nodes in dark blue/grey. '3DtoPrint' logo subtly engraved in copper/gold on the plinth. Cyberpunk technology aesthetic. The object must cast realistic, soft contact shadows on the plinth to look physically present. Hyper-realistic rendering of the identical original object.`;
      }

      contentParts.push({ type: "text", text: promptText });
      contentParts.push({ type: "image_url", image_url: { url: sourceImage } });

      if (customBackground && (backgroundMode === "custom" || backgroundMode === "system")) {
        contentParts.push({ type: "image_url", image_url: { url: customBackground } });
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

      if (!imgResp.ok) {
        const status = imgResp.status;
        const t = await imgResp.text();
        console.error("Image generation error:", status, t);
        let errorMsg = 'Error al generar imagen con IA.';
        if (status === 429) errorMsg = 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.';
        else if (status === 402) errorMsg = 'Créditos de IA agotados.';
        else errorMsg = `Error del servicio de IA (código ${status}). Intenta de nuevo más tarde.`;
        return new Response(JSON.stringify({ success: false, error: errorMsg }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const imgResult = await imgResp.json();
      console.log("AI image response keys:", JSON.stringify(Object.keys(imgResult)));
      const message = imgResult.choices?.[0]?.message;
      console.log("Message keys:", message ? JSON.stringify(Object.keys(message)) : "no message");

      let generatedImage: string | undefined;

      if (message?.images?.[0]?.image_url?.url) {
        generatedImage = message.images[0].image_url.url;
      } else if (Array.isArray(message?.content)) {
        const imgPart = message.content.find((p: any) => p.type === "image_url" || p.type === "image");
        if (imgPart?.image_url?.url) {
          generatedImage = imgPart.image_url.url;
        } else if (imgPart?.url) {
          generatedImage = imgPart.url;
        }
      } else if (typeof message?.content === "string" && message.content.startsWith("data:image")) {
        generatedImage = message.content;
      }

      if (!generatedImage) {
        const finishReason = imgResult.choices?.[0]?.finish_reason || 'unknown';
        const nativeReason = imgResult.choices?.[0]?.native_finish_reason || '';
        
        const reasonMap: Record<string, string> = {
          'IMAGE_PROHIBITED_CONTENT': 'La IA detectó contenido prohibido en la imagen. Intenta con otra imagen fuente.',
          'MALFORMED_FUNCTION_CALL': 'La IA no pudo procesar la solicitud correctamente. Intenta de nuevo o con otra imagen.',
          'SAFETY': 'La imagen fue bloqueada por filtros de seguridad. Usa una imagen diferente.',
          'RECITATION': 'La IA detectó contenido protegido por derechos de autor. Usa otra imagen.',
          'MAX_TOKENS': 'La respuesta fue demasiado larga. Intenta con una imagen más simple.',
        };
        
        const readableError = reasonMap[nativeReason] || reasonMap[finishReason] || 
          `La IA no devolvió una imagen (razón: ${nativeReason || finishReason}). Intenta con otra imagen fuente o modo diferente.`;
        
        console.error("Full AI response (no image found):", JSON.stringify(imgResult).substring(0, 2000));
        return new Response(JSON.stringify({
          success: false,
          error: readableError,
          error_code: nativeReason || finishReason,
        }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: { generated_image: generatedImage },
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
              content: "You are a translator for a 3D printing e-commerce store. Translate the given Spanish product name and description to English. Keep it compelling and suitable for an online store."
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
          content: `You are a product copywriter for "3DtoPrint", a 3D printing e-commerce store.

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

    return new Response(JSON.stringify({ error: "Invalid action. Use 'scrape', 'generate_image', 'translate', or 'enhance_product'." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
