import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, KeyRound, Loader2, Save, Send, ShieldCheck, Smartphone, Sparkles } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { AdminPageHeader, AdminSurface } from './_shared'

const FIELDS = [
  { key: 'AI_PROVIDER_API_KEY', label: 'AI provider API key', placeholder: 'Paste the provider key', group: 'AI' },
  { key: 'AI_PROVIDER_BASE_URL', label: 'AI compatible API base URL', placeholder: 'https://api.openai.com/v1', group: 'AI' },
  { key: 'FIRECRAWL_API_KEY', label: 'Firecrawl API key (optional)', placeholder: 'Optional market-search key', group: 'AI' },
  { key: 'RESEND_API_KEY', label: 'Resend API key', placeholder: 're_...', group: 'EMAIL' },
  { key: 'RESEND_FROM_EMAIL', label: 'Resend sender email', placeholder: 'orders@aperfy.kpwr.dev', group: 'EMAIL' },
  { key: 'RESEND_FROM_NAME', label: 'Resend sender name', placeholder: 'APERFY', group: 'EMAIL' },
  { key: 'RESEND_WEBHOOK_SECRET', label: 'Resend webhook signing secret (optional)', placeholder: 'whsec_...', group: 'EMAIL' },
  { key: 'TELEGRAM_BOT_TOKEN', label: 'Telegram bot token', placeholder: '123456:ABC...', group: 'MESSAGING' },
  { key: 'TELEGRAM_CHAT_ID', label: 'Telegram admin chat ID', placeholder: '-100...', group: 'MESSAGING' },
  { key: 'WHATSAPP_BUSINESS_NUMBER', label: 'WhatsApp business number', placeholder: 'Country code + number', group: 'MESSAGING' },
] as const

type FieldKey = typeof FIELDS[number]['key']
type Status = { name: FieldKey; configured: boolean }

const GROUP_META = {
  AI: { title: 'AI PRODUCT INTELLIGENCE', icon: Sparkles, description: 'Compatible with OpenAI-style chat completion providers. Select the provider and model in AI Settings.' },
  EMAIL: { title: 'RESEND EMAIL', icon: Send, description: 'Transactional email uses Resend directly and stays within the provider account limits.' },
  MESSAGING: { title: 'ORDER NOTIFICATIONS', icon: Smartphone, description: 'WhatsApp checkout and Telegram order alerts activate as soon as their values are present.' },
} as const

export default function AdminIntegrations() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [values, setValues] = useState<Partial<Record<FieldKey, string>>>({})
  const [visible, setVisible] = useState<Partial<Record<FieldKey, boolean>>>({})

  const { data: statuses = [], isLoading } = useQuery({
    queryKey: ['admin-integration-status'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-integrations', { body: { action: 'status' } })
      if (error) throw error
      return (data?.statuses ?? []) as Status[]
    },
  })

  useEffect(() => {
    const next: Partial<Record<FieldKey, string>> = {}
    for (const field of FIELDS) next[field.key] = ''
    setValues(next)
  }, [])

  const save = useMutation({
    mutationFn: async () => {
      const payload = Object.fromEntries(Object.entries(values).filter(([, value]) => value?.trim()))
      const { data, error } = await supabase.functions.invoke('manage-integrations', { body: { action: 'save', values: payload } })
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.setQueryData(['admin-integration-status'], data?.statuses ?? [])
      setValues(Object.fromEntries(FIELDS.map((field) => [field.key, ''])))
      toast({ title: 'GUARDADO', description: 'Las integraciones se guardaron en Supabase Vault.' })
    },
    onError: (error: Error) => toast({ title: 'ERROR', description: error.message, variant: 'destructive' }),
  })

  const isConfigured = (key: FieldKey) => statuses.some((status) => status.name === key && status.configured)

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <AdminPageHeader
        eyebrow="SYSTEM · SECURE INTEGRATIONS"
        title="INTEGRATIONS"
        meta="CONFIGURA LOS SERVICIOS SIN EXPONER SECRETOS EN EL NAVEGADOR"
        actions={<Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2 uppercase"><Save className="h-4 w-4" />{save.isPending ? 'GUARDANDO' : 'GUARDAR'}</Button>}
      />

      <AdminSurface className="flex items-start gap-3 p-5 md:p-6">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div><p className="font-semibold uppercase">VAULT PROTECTED</p><p className="mt-1 text-sm text-muted-foreground">Los valores nuevos se envían a una Edge Function protegida y se guardan cifrados en Supabase Vault. Nunca se cargan valores existentes al cliente.</p></div>
      </AdminSurface>

      {(['AI', 'EMAIL', 'MESSAGING'] as const).map((group) => {
        const meta = GROUP_META[group]
        const Icon = meta.icon
        return (
          <AdminSurface key={group} className="p-5 md:p-6">
            <div className="flex items-start gap-3 border-b border-white/[0.08] pb-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div><div><h2 className="font-semibold uppercase">{meta.title}</h2><p className="mt-1 text-sm text-muted-foreground">{meta.description}</p></div></div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {FIELDS.filter((field) => field.group === group).map((field) => {
                const configured = isConfigured(field.key)
                const shown = visible[field.key] === true
                return <div key={field.key} className="space-y-2"><div className="flex items-center justify-between"><Label className="uppercase tracking-wider">{field.label}</Label><span className={`font-mono text-[10px] uppercase ${configured ? 'text-primary' : 'text-muted-foreground'}`}>{configured ? 'READY' : 'NOT SET'}</span></div><div className="relative"><Input type={shown ? 'text' : 'password'} value={values[field.key] ?? ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={configured ? '••••••••  (deja vacío para conservar)' : field.placeholder} className="border-white/10 bg-black/20 pr-10" autoComplete="new-password" /><button type="button" aria-label={shown ? 'Ocultar valor' : 'Mostrar valor'} onClick={() => setVisible((current) => ({ ...current, [field.key]: !shown }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
              })}
            </div>
          </AdminSurface>
        )
      })}

      <div className="flex items-center gap-2 text-xs text-muted-foreground"><KeyRound className="h-3.5 w-3.5" /> El estado indica si existe un secreto; no muestra el secreto.</div>
    </div>
  )
}
