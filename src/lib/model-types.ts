import type { Database, Json } from '@/integrations/supabase/types'

export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type Category = Database['public']['Tables']['categories']['Row']
export type Material = Database['public']['Tables']['materials']['Row']
export type Review = Database['public']['Tables']['product_reviews']['Row']
export type ProfileSummary = Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url'>
export type Referral = Database['public']['Tables']['referrals']['Row']
export type ReferralCode = Database['public']['Tables']['referral_codes']['Row']
export type Order = Database['public']['Tables']['orders']['Row'] & {
  source?: string | null
  telegram_status?: string | null
  profiles?: ProfileSummary | null
}
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type DynamicRecord = Record<string, unknown>

export function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (error instanceof Error && error.message) return error.message

  // Supabase/PostgREST errors are plain objects rather than Error instances.
  // Preserve their useful diagnostics instead of reducing every failed save
  // to the unhelpful "Something went wrong" message.
  if (error && typeof error === 'object') {
    const candidate = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    const message = typeof candidate.message === 'string' ? candidate.message.trim() : ''
    if (message) {
      const context = [candidate.details, candidate.hint]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim())
      return [message, ...context].join(' — ')
    }
  }

  return fallback
}

export function asRecord(value: unknown): DynamicRecord {
  return value && typeof value === 'object' ? value as DynamicRecord : {}
}

export function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

export function asStringArray(value: Json | unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}
