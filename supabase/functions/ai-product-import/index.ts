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
      const imageListForAI = scrapedImages.slice(0, 10).map((u, i) => `${i + 1}. ${u}`).join("\n");

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
- suggested_price: Reasonable retail price in USD for a 3D printed product.
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

      // Build prompt based on backgroundMode
      let promptText: string;
      const contentParts: any[] = [];

      if (backgroundMode === "system") {
        promptText = "Isolate the 3D model object from the reference image. Remove its original background completely. Place the object on a clean, solid, slightly warm light-gray studio background with soft contact shadows beneath it. Maintain high fidelity to the original object's shape and color.";
      } else if (backgroundMode === "custom") {
        promptText = "Isolate the 3D model object from the reference image and remove its original background. Seamlessly composite and place this object onto the user-uploaded background image. Apply realistic lighting and soft contact shadows on the surface where the object is placed.";
      } else {
        // "ai" (premium) - default
        promptText = "Isolate the 3D model object from the reference image and remove its original background. Place this object centrally on a high-end, dark exhibition plinth made of polished dark concrete and brushed copper. The plinth has the logo '3DtoPrint' precisely laser-etched on its front face. The scene is a dark, minimalist showroom with cinematic lighting: a soft warm light from above and a subtle electric blue neon line in the background. The object must cast realistic, soft contact shadows on the plinth to look physically present.";
      }

      contentParts.push({ type: "text", text: promptText });
      contentParts.push({ type: "image_url", image_url: { url: sourceImage } });

      // Attach custom/system background as second image when applicable
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
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await imgResp.text();
        console.error("Image generation error:", status, t);
        throw new Error("AI image generation failed");
      }

      const imgResult = await imgResp.json();
      console.log("AI image response keys:", JSON.stringify(Object.keys(imgResult)));
      const message = imgResult.choices?.[0]?.message;
      console.log("Message keys:", message ? JSON.stringify(Object.keys(message)) : "no message");

      // Defensive parsing: try multiple known response shapes
      let generatedImage: string | undefined;

      // Shape 1: message.images array (Lovable gateway format)
      if (message?.images?.[0]?.image_url?.url) {
        generatedImage = message.images[0].image_url.url;
      }
      // Shape 2: inline base64 in content parts
      else if (Array.isArray(message?.content)) {
        const imgPart = message.content.find((p: any) => p.type === "image_url" || p.type === "image");
        if (imgPart?.image_url?.url) {
          generatedImage = imgPart.image_url.url;
        } else if (imgPart?.url) {
          generatedImage = imgPart.url;
        }
      }
      // Shape 3: direct base64 in content string (data:image prefix)
      else if (typeof message?.content === "string" && message.content.startsWith("data:image")) {
        generatedImage = message.content;
      }

      if (!generatedImage) {
        console.error("Full AI response (no image found):", JSON.stringify(imgResult).substring(0, 2000));
        return new Response(JSON.stringify({
          success: false,
          error: "La IA no devolvió una imagen. Intenta con otra imagen fuente o modo diferente.",
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
