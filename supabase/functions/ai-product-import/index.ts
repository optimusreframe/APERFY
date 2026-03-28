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

      // Get existing categories to help AI match
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

      const categorySlugs = existingCategories.map((c: any) => c.slug).join(", ");

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
Given scraped content from a product page, extract and GENERATE NEW product data.
IMPORTANT: Create a NEW unique product name that is different from the original but describes the same product.
Generate compelling bilingual descriptions (English and Spanish).
Extract any materials, colors, and pricing info mentioned.

EXISTING CATEGORIES in the store (use one of these slugs if applicable, or suggest a new one): ${categorySlugs || "none yet"}`
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
                  name_en: { type: "string", description: "NEW unique product name in English (not same as original)" },
                  name_es: { type: "string", description: "NEW unique product name in Spanish" },
                  description_en: { type: "string", description: "Short compelling description in English (2-3 sentences)" },
                  description_es: { type: "string", description: "Short compelling description in Spanish (2-3 sentences)" },
                  slug: { type: "string", description: "URL-friendly slug (lowercase, hyphens only)" },
                  suggested_price: { type: "number", description: "Suggested retail price in USD" },
                  suggested_category: { type: "string", description: "Best matching existing category slug, or a new slug if none match" },
                  suggested_category_name_en: { type: "string", description: "Category name in English (for new categories)" },
                  suggested_category_name_es: { type: "string", description: "Category name in Spanish (for new categories)" },
                  materials: { type: "array", items: { type: "string" }, description: "Material names that apply (e.g. PLA, ABS, PETG, Resin)" },
                  colors: { type: "array", items: { type: "string" }, description: "Colors recommended (e.g. Negro, Blanco, Dorado, Plateado, Rojo, Azul)" },
                  original_title: { type: "string", description: "The original product title from the source" },
                },
                required: ["name_en", "name_es", "description_en", "description_es", "slug", "suggested_price", "suggested_category", "materials", "colors"],
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

      return new Response(JSON.stringify({
        success: true,
        data: { ...productData, extracted_images: uniqueImages },
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

      // Default branded display stand prompt
      const defaultBgPrompt = `a sleek premium product display pedestal/stand in a professional photography studio. The stand is a modern circular or rectangular elevated platform with a dark matte finish. The background is a smooth dark gradient (deep charcoal to black) with subtle warm golden accent lights from the sides. Add a small elegant "3DtoPrint" watermark text in the bottom-right corner of the image in a subtle semi-transparent white font. The overall feel should be luxurious, like a high-end product showcase or exhibition display`;

      let bgInstruction = defaultBgPrompt;
      let promptText = `Take this 3D printed product/figurine image. Extract the main object from the image completely, remove its current background, and place it centered on top of ${bgInstruction}. Make the product look like a premium e-commerce product photo displayed on a professional exhibition stand. The object should be well-lit with professional studio lighting. Keep the object exactly as it is - only change the background, add the display stand beneath it, and enhance the lighting. IMPORTANT: Include a subtle "3DtoPrint" watermark/brand text in the bottom-right corner.`;

      const messages: any[] = [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            { type: "image_url", image_url: { url: sourceImage } }
          ]
        }
      ];

      // If custom background provided (system or uploaded)
      if (customBackground && backgroundMode !== 'ai') {
        messages[0].content.push({
          type: "image_url",
          image_url: { url: customBackground }
        });
        messages[0].content[0].text = `Take this 3D printed product/figurine from the first image. Extract the main object completely, remove its background, and place it on the background/surface shown in the second image. Make it look like a premium e-commerce product photo with professional lighting. Keep the object exactly as it is - only change the background. IMPORTANT: Include a subtle "3DtoPrint" watermark/brand text in the bottom-right corner.`;
      }

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
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await imgResp.text();
        console.error("Image generation error:", status, t);
        throw new Error("AI image generation failed");
      }

      const imgResult = await imgResp.json();
      const generatedImage = imgResult.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!generatedImage) {
        throw new Error("AI did not return an image");
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

    return new Response(JSON.stringify({ error: "Invalid action. Use 'scrape', 'generate_image', or 'translate'." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
