import { buildNominatimSearchUrl, mapNominatimResult, type NominatimResult } from '../../../src/lib/geocoding.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const body = await req.json() as { q?: unknown; countryCode?: unknown; featureType?: unknown }
    const query = typeof body.q === 'string' ? body.q.trim() : ''
    const countryCode = typeof body.countryCode === 'string' ? body.countryCode.trim().toUpperCase() : ''
    const featureType = body.featureType === 'city' ? 'city' : undefined

    if (query.length < 3 || query.length > 255) return json({ suggestions: [] })
    if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) return json({ error: 'Invalid country code' }, 400)

    const response = await fetch(buildNominatimSearchUrl(query, countryCode || undefined, featureType), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'APERFY/1.0 (https://aperfy.kpwr.dev; aperfy@kpwr.dev)',
        Referer: 'https://aperfy.kpwr.dev/',
      },
    })
    if (!response.ok) return json({ error: `Address lookup failed (${response.status})` }, 502)

    const results = await response.json() as NominatimResult[]
    const seen = new Set<string>()
    const suggestions = results
      .map(mapNominatimResult)
      .filter((suggestion) => {
        const key = suggestion.label.trim().toLowerCase()
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })

    return json({ suggestions })
  } catch (error) {
    console.error('Address lookup failed', error)
    return json({ error: 'Address lookup failed' }, 500)
  }
})
