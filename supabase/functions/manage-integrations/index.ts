import { createClient } from 'npm:@supabase/supabase-js@2'
import { getIntegrationStatuses, INTEGRATION_SECRET_NAMES, type IntegrationSecretName } from '../_shared/integration-secrets.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

function getBearerToken(req: Request) {
  const value = req.headers.get('authorization') ?? ''
  return value.startsWith('Bearer ') ? value.slice(7) : null
}

async function requireAdmin(req: Request) {
  const token = getBearerToken(req)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!token || !supabaseUrl || !serviceRoleKey) return null

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { data: userData, error: userError } = await adminClient.auth.getUser(token)
  if (userError || !userData.user) return null

  const { data: role, error: roleError } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .eq('role', 'admin')
    .maybeSingle()

  if (roleError || !role) return null
  return { adminClient, userId: userData.user.id }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const auth = await requireAdmin(req)
  if (!auth) return json({ error: 'Admin access required' }, 403)

  try {
    const body = await req.json().catch(() => ({})) as {
      action?: 'status' | 'save'
      values?: Record<string, unknown>
    }

    if (body.action === 'save') {
      const values = body.values ?? {}
      for (const [rawName, rawValue] of Object.entries(values)) {
        if (!INTEGRATION_SECRET_NAMES.includes(rawName as IntegrationSecretName)) {
          return json({ error: `Unsupported integration setting: ${rawName}` }, 400)
        }
        if (typeof rawValue !== 'string' || rawValue.trim().length === 0) continue

        const { error } = await auth.adminClient.rpc('upsert_integration_secret', {
          p_name: rawName,
          p_secret: rawValue.trim(),
          p_description: `APERFY integration secret managed by admin ${auth.userId}`,
        })
        if (error) throw error
      }
    }

    return json({ ok: true, statuses: await getIntegrationStatuses(auth.adminClient) })
  } catch (error) {
    console.error('Integration management failed', error)
    return json({ error: error instanceof Error ? error.message : 'Integration configuration failed' }, 500)
  }
})
