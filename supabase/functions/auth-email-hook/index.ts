import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type EmailComponent = (props: Record<string, unknown>) => React.ReactElement
const EMAIL_TEMPLATES: Record<string, EmailComponent> = {
  signup: SignupEmail as unknown as EmailComponent,
  invite: InviteEmail as unknown as EmailComponent,
  magiclink: MagicLinkEmail as unknown as EmailComponent,
  recovery: RecoveryEmail as unknown as EmailComponent,
  email_change: EmailChangeEmail as unknown as EmailComponent,
  reauthentication: ReauthenticationEmail as unknown as EmailComponent,
}

const SITE_URL = 'https://aperfy.kpwr.dev'
const SAMPLE_EMAIL = 'user@example.test'
const SAMPLE_DATA: Record<string, Record<string, unknown>> = {
  signup: { siteName: 'APERFY', siteUrl: SITE_URL, recipient: SAMPLE_EMAIL, confirmationUrl: SITE_URL },
  magiclink: { siteName: 'APERFY', confirmationUrl: SITE_URL },
  recovery: { siteName: 'APERFY', confirmationUrl: SITE_URL },
  invite: { siteName: 'APERFY', siteUrl: SITE_URL, confirmationUrl: SITE_URL },
  email_change: { siteName: 'APERFY', email: SAMPLE_EMAIL, newEmail: SAMPLE_EMAIL, confirmationUrl: SITE_URL },
  reauthentication: { token: '123456' },
}

function isServiceRole(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return false
  try {
    const payload = token.split('.')[1]
    const claims = JSON.parse(atob(payload.replaceAll('-', '+').replaceAll('_', '/'))) as { role?: string }
    return claims.role === 'service_role'
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = new URL(req.url)
  if (!url.pathname.endsWith('/preview')) {
    return new Response(JSON.stringify({ error: 'Auth emails are delivered by Supabase Auth SMTP with Resend.' }), {
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!isServiceRole(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const body = await req.json().catch(() => ({})) as { type?: string }
  const component = body.type ? EMAIL_TEMPLATES[body.type] : undefined
  if (!component) {
    return new Response(JSON.stringify({ error: 'Unknown email type' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const html = await renderAsync(React.createElement(component, SAMPLE_DATA[body.type as string] ?? {}))
  return new Response(html, {
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
})
