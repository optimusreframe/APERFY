import { z } from 'zod';

// Strip HTML tags for sanitization
const stripHtml = (str: string) => str.replace(/<[^>]*>/g, '').trim();

const sanitizedString = (max: number) =>
  z.string().transform(stripHtml).pipe(z.string().max(max));

const requiredSanitizedString = (max: number) =>
  z.string().transform(stripHtml).pipe(z.string().min(1, 'Required').max(max));

// ── Auth ──
export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email').max(255),
  password: z.string().min(6, 'Min 6 characters').max(72, 'Max 72 characters'),
});

export const signupSchema = loginSchema.extend({
  fullName: requiredSanitizedString(100),
  confirmPassword: z.string().min(6).max(72),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ── Profile ──
export const profileSchema = z.object({
  fullName: sanitizedString(100),
  phone: z.string().trim().max(20).regex(/^[+\d\s()-]*$/, 'Invalid phone').optional().or(z.literal('')),
});

// ── Checkout ──
export const checkoutSchema = z.object({
  fullName: requiredSanitizedString(100),
  phone: z.string().trim().min(1, 'Required').max(20).regex(/^[+\d\s()-]+$/, 'Invalid phone'),
  address: requiredSanitizedString(255),
  city: requiredSanitizedString(100),
  notes: sanitizedString(500).optional().or(z.literal('')),
});

// ── Admin: Products ──
export const productSchema = z.object({
  name_en: requiredSanitizedString(255),
  name_es: requiredSanitizedString(255),
  description_en: sanitizedString(2000).optional().or(z.literal('')),
  description_es: sanitizedString(2000).optional().or(z.literal('')),
  slug: z.string().trim().min(1, 'Required').max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers, hyphens only'),
  base_price: z.number().min(0, 'Must be positive').max(999999),
  category_id: z.string().optional().or(z.literal('')),
  is_active: z.boolean(),
  is_featured: z.boolean(),
});

// ── Admin: Categories ──
export const categorySchema = z.object({
  name_en: requiredSanitizedString(255),
  name_es: requiredSanitizedString(255),
  slug: z.string().trim().min(1, 'Required').max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers, hyphens only'),
  icon: sanitizedString(50),
  is_active: z.boolean(),
});

// ── Admin: Materials ──
export const materialSchema = z.object({
  name_en: requiredSanitizedString(255),
  name_es: requiredSanitizedString(255),
  description_en: sanitizedString(1000).optional().or(z.literal('')),
  description_es: sanitizedString(1000).optional().or(z.literal('')),
  is_active: z.boolean(),
});

// ── File Upload ──
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

// Magic bytes for file type verification
const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF
};

export async function validateImageFile(
  file: File,
  maxSizeMB: number = 2
): Promise<{ valid: boolean; error?: string }> {
  // Check file size
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File must be under ${maxSizeMB}MB` };
  }

  // Check MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPG, PNG, and WebP images are allowed' };
  }

  // Check extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: 'Invalid file extension' };
  }

  // Check magic bytes
  try {
    const buffer = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const expected = MAGIC_BYTES[file.type];
    if (expected && !expected.every((b, i) => bytes[i] === b)) {
      return { valid: false, error: 'File content does not match its type' };
    }
  } catch {
    return { valid: false, error: 'Could not verify file' };
  }

  return { valid: true };
}

// Sanitize file name
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100);
}
