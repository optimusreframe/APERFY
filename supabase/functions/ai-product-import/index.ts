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
    const { url, originalImage, customBackground, action } = body;

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

      let scrapedContent = "";
      let scrapedImages: string[] = [];
      let scrapedTitle = "";

      // Try Firecrawl first
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
            // Extract image URLs from markdown
            const imgRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
            let match;
            while ((match = imgRegex.exec(scrapedContent)) !== null) {
              scrapedImages.push(match[1]);
            }
            // Also check og:image from metadata
            const ogImage = fcData.data?.metadata?.ogImage || fcData.metadata?.ogImage;
            if (ogImage) scrapedImages.unshift(ogImage);
          }
        } catch (e) {
          console.error("Firecrawl error:", e);
        }
      }

      // Fallback: use AI to analyze the URL
      if (!scrapedContent) {
        scrapedContent = `URL provided: ${url}. Unable to scrape content directly.`;
      }

      // Use AI to extract structured data from scraped content
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
Extract any materials, colors, and pricing info mentioned.`
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
                  suggested_category: { type: "string", enum: ["figurines", "home-decor", "accessories", "tools", "art"], description: "Best matching category" },
                  materials: { type: "array", items: { type: "string" }, description: "Materials mentioned (e.g. PLA, ABS, PETG)" },
                  colors: { type: "array", items: { type: "string" }, description: "Colors mentioned or recommended" },
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

      // Deduplicate images
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
      const { sourceImage, backgroundPrompt } = body;
      if (!sourceImage) {
        return new Response(JSON.stringify({ error: "Source image is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const bgInstruction = backgroundPrompt || 
        "a premium dark studio background with subtle golden light accents, professional product photography lighting, elegant and luxurious feel with a dark gradient from deep charcoal to black, subtle gold rim lighting";

      const messages: any[] = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Take this 3D printed product/figurine image. Extract the main object from the image, remove its current background completely, and place it on ${bgInstruction}. Make the product look like a premium e-commerce product photo. The object should be centered, well-lit, and look professional. Keep the object exactly as it is - only change the background and lighting.`
            },
            {
              type: "image_url",
              image_url: { url: sourceImage }
            }
          ]
        }
      ];

      // If custom background image provided, add it
      if (customBackground) {
        messages[0].content.push({
          type: "image_url",
          image_url: { url: customBackground }
        });
        messages[0].content[0].text = `Take this 3D printed product/figurine from the first image. Extract the main object, remove its background, and place it on the background shown in the second image. Make it look like a premium e-commerce product photo with professional lighting. Keep the object exactly as it is.`;
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

    return new Response(JSON.stringify({ error: "Invalid action. Use 'scrape' or 'generate_image'." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
