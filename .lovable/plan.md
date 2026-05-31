# Background Studio en /admin/background-qa

Ampliación funcional, sin rediseño. Conserva todo lo actual (upload manual, remove, QA, system_workshop, seguridad admin).

## 1. Base de datos

Nueva tabla `public.system_background_candidates`:

- `id uuid pk`
- `preset text not null` — system_workshop | system_macro | system_dark_premium | premium_tech_plinth
- `image_url text not null`
- `prompt text`
- `source text not null default 'ai'` — 'ai' | 'manual'
- `is_active boolean not null default false`
- `created_by uuid` — auth.uid()
- `created_at timestamptz default now()`

RLS: solo admins (ALL via `has_role`). GRANT a `authenticated` + `service_role`.

Nuevo bucket de storage `system-backgrounds` (público) con policies admin-only para escritura, lectura pública.

`admin_settings.system_background` se mantiene como URL activa (compatibilidad con backend actual). "Set as Official" actualiza ambos: marca `is_active=true` en la fila y escribe la URL en `admin_settings`.

## 2. Edge function — nueva action en `ai-product-import`

`action: "generate_background_reference"`

Payload:
```
{ action, preset, count: 1|4|8, promptOverride?: string }
```

Comportamiento:
- Reutiliza el guard `requireAdmin()` ya existente.
- Mapa interno `BACKGROUND_PRESET_PROMPTS` con los 4 prompts (los textos del mensaje del usuario).
- Si `promptOverride` viene no vacío, lo usa; si no, usa el del preset.
- Llama al modelo de imagen actual (`google/gemini-3.1-flash-image-preview`) vía AI Gateway `/v1/images/generations`, **sin sourceImage** (sólo texto), una vez por variante (loop secuencial con `count`, máximo 8).
- Cada PNG resultante (`b64_json`) se sube a `system-backgrounds/{preset}/{uuid}.png` con service role.
- Inserta una fila en `system_background_candidates` por cada variante (source='ai', is_active=false, created_by=admin user id).
- Devuelve `{ success: true, candidates: [{id, image_url, preset, prompt}] }`.

Errores → HTTP 200 + `{success:false, error}` (patrón actual).

## 3. UI — `AdminBackgroundQA.tsx`

Conservar todo lo existente. Agregar tres bloques nuevos arriba del QA actual:

### A. "Official Workshop Background" (refactor del bloque actual)
- Preview grande de la imagen activa (de `admin_settings.system_background`).
- Badge `Active` / `Not configured`.
- Metadata: preset activo, fecha de creación, origen (AI/Manual) — leídos de la fila `is_active=true` en `system_background_candidates` si existe; si la URL viene sólo de admin_settings sin candidate, mostrar origen "Manual (legacy)".
- Botones: **Replace** (abre file picker), **Remove** (limpia admin_settings + desactiva candidate activo), **Upload manual background** (idéntico al actual).

### B. "AI Background Generator"
- Select preset (4 opciones).
- Select count (1 / 4 / 8).
- Textarea opcional `promptOverride` con placeholder mostrando el prompt default del preset elegido.
- Botón "Generate AI Backgrounds" → invoca la edge function, agrega los nuevos candidatos al estado, los muestra en la galería.

### C. "Generated Background Variants"
- Grid de cards leídas de `system_background_candidates` (ordenadas por created_at desc, filtro opcional por preset).
- Cada card:
  - Preview imagen
  - Preset, source, fecha
  - Prompt corto con tooltip del prompt completo
  - Botones:
    - **Set as Official** → update `admin_settings.system_background` + marca esta fila `is_active=true` y las demás del mismo preset `is_active=false`
    - **Preview with Product** → abre un mini-dialog: pega sourceImage URL, llama `generate_image` con `backgroundMode='system_workshop'` y `customBackground=<esta URL>` (ya soportado por la función para admins), muestra resultado lado a lado
    - **Regenerate Similar** → llama `generate_background_reference` con mismo preset y `promptOverride=prompt original`
    - **Delete** → borra fila + objeto del bucket (no permite borrar la activa sin confirmación)

El QA de los 5 presets (existente) se mantiene intacto debajo.

## 4. Seguridad
- Edge function: `requireAdmin()` ya existe.
- RLS de la nueva tabla: admin-only.
- Bucket: lectura pública (los backgrounds se referencian en composiciones), escritura sólo via service role.

## 5. UI pública
Sin cambios.

## Archivos tocados

- **Migración nueva**: tabla `system_background_candidates` + bucket `system-backgrounds` + policies + grants.
- `supabase/functions/ai-product-import/index.ts` — añadir `generate_background_reference` + prompts map + helper de upload a storage.
- `src/pages/admin/AdminBackgroundQA.tsx` — refactor del bloque Official + dos bloques nuevos + galería + dialog Preview with Product.

Sin cambios en: BulkImportContext, AdminProducts, prompts existentes, presets actuales, lógica `system_workshop` ya implementada.
