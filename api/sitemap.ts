type SitemapProduct = { slug: string; updated_at: string };

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character] ?? character);
}

export default {
  async fetch() {
    const baseUrl = (process.env.SITE_URL || 'https://aperfy.kpwr.dev').replace(/\/$/, '');
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
    let products: SitemapProduct[] = [];
    if (supabaseUrl && supabaseKey) {
      const endpoint = new URL(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/products`);
      endpoint.searchParams.set('select', 'slug,updated_at');
      endpoint.searchParams.set('is_active', 'eq.true');
      endpoint.searchParams.set('order', 'updated_at.desc');
      endpoint.searchParams.set('limit', '1000');
      const response = await fetch(endpoint, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Accept: 'application/json' } });
      if (response.ok) products = await response.json() as SitemapProduct[];
    }
    const entries = [
      `<url><loc>${baseUrl}/</loc></url>`,
      `<url><loc>${baseUrl}/ask</loc></url>`,
      `<url><loc>${baseUrl}/contact</loc></url>`,
      ...products.map((product) => `<url><loc>${baseUrl}/products/${encodeURIComponent(product.slug)}</loc><lastmod>${escapeXml(product.updated_at)}</lastmod></url>`),
    ];
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=86400' } });
  },
};
