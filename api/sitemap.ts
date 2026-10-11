type SitemapProduct = { slug: string; updated_at: string };

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character] ?? character);
}

async function fetchSitemapProducts(supabaseUrl: string, supabaseKey: string) {
  const response = await fetch(supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/get_active_product_sitemap', {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: 'Bearer ' + supabaseKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!response.ok) return [] as SitemapProduct[];
  const data = await response.json();
  return Array.isArray(data) ? data as SitemapProduct[] : [];
}

export default {
  async fetch() {
    const baseUrl = (process.env.SITE_URL || 'https://aperfy.kpwr.dev').replace(/\/$/, '');
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
    let products: SitemapProduct[] = [];
    if (supabaseUrl && supabaseKey) {
      products = await fetchSitemapProducts(supabaseUrl, supabaseKey);
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
