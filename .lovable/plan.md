

# Error Reporting Mejorado + Sistema de Activity Logs

## 1. Mejora de mensajes de error en AI operations

**Problema**: Los errores de AI (generacion de imagen, scraping, traducciones) muestran mensajes genericos. Los logs del edge function revelan errores como `MALFORMED_FUNCTION_CALL` o `IMAGE_PROHIBITED_CONTENT` que no llegan al usuario.

**Solucion**:

### Edge function (`supabase/functions/ai-product-import/index.ts`)
- En la seccion `generate_image`, cuando no se encuentra imagen en la respuesta AI, incluir el `finish_reason` / `native_finish_reason` en el mensaje de error retornado (ej: "Image generation failed: IMAGE_PROHIBITED_CONTENT - The AI could not process this image")
- Mapear los finish_reason comunes a mensajes legibles en espanol

### BulkImportContext
- Ya captura `e.message` en los errores — solo necesita que el edge function envie mejores mensajes
- Agregar logging a la tabla `activity_logs` (ver punto 2) en cada paso: exito y error

### AdminProducts.tsx  
- Los catch blocks ya muestran `e.message` via toast — solo asegurar que los errores de AI incluyan contexto suficiente desde el edge function

## 2. Sistema de Activity Logs

### Nueva tabla: `activity_logs`

```sql
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,           -- 'product_created', 'product_updated', 'bulk_import', 'ai_image_generated', 'order_received', 'error', etc.
  category text NOT NULL DEFAULT 'info',  -- 'success', 'error', 'order', 'import', 'edit', 'info'
  entity_type text,               -- 'product', 'order', 'category', etc.
  entity_id uuid,
  title text NOT NULL,
  details text,                   -- Detailed message / error explanation
  metadata jsonb DEFAULT '{}'
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view/insert logs
CREATE POLICY "Admins can manage logs" ON public.activity_logs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
```

### Helper: `src/lib/activity-log.ts`
Utility function to insert logs from anywhere in the app:
```typescript
export async function logActivity(params: {
  action: string;
  category: 'success' | 'error' | 'order' | 'import' | 'edit' | 'info';
  entity_type?: string;
  entity_id?: string;
  title: string;
  details?: string;
  metadata?: Record<string, any>;
})
```

### Integration points — call `logActivity()` from:
- **BulkImportContext**: Log each item success/error + final summary
- **AdminProducts**: Product create, update, delete, AI image generation, AI enhance, AI translate
- **AdminOrders**: Order status changes
- **AdminCategories**: Category create/update/delete
- **AdminMaterials**: Material create/update/delete

### Nueva pagina: `src/pages/admin/AdminLogs.tsx`
- Tab-based UI with categories: **Todos**, **Exitos**, **Errores**, **Ordenes**, **Importaciones**, **Ediciones**
- Table with columns: Fecha, Accion, Titulo, Detalles, Categoria (badge)
- Each tab filters by `category` field
- Paginated (50 per page), sorted newest first
- Expandable rows to see full details/metadata
- Color-coded badges per category

### Routing & Sidebar
- Add `{ title: 'Logs', url: '/admin/logs', icon: ScrollText }` to `AdminSidebar.tsx`
- Add route `<Route path="logs" element={<AdminLogs />} />` in `App.tsx`

## Files to create/modify

- **Create**: Migration for `activity_logs` table
- **Create**: `src/lib/activity-log.ts`
- **Create**: `src/pages/admin/AdminLogs.tsx`
- **Modify**: `supabase/functions/ai-product-import/index.ts` — better error messages in generate_image
- **Modify**: `src/contexts/BulkImportContext.tsx` — log each import result
- **Modify**: `src/pages/admin/AdminProducts.tsx` — log product CRUD + AI operations
- **Modify**: `src/pages/admin/AdminSidebar.tsx` — add Logs link
- **Modify**: `src/App.tsx` — add Logs route

