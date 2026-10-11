import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 20_000;

export type PersistedImage = {
  path: string;
  publicUrl: string;
  contentType: string;
  bytes: number;
};

function extensionForMime(contentType: string) {
  const normalized = contentType.toLowerCase().split(";")[0].trim();
  if (normalized === "image/jpeg") return "jpg";
  if (normalized === "image/webp") return "webp";
  if (normalized === "image/gif") return "gif";
  if (normalized === "image/avif") return "avif";
  return "png";
}

function normalizeContentType(value: string | null | undefined, source: string) {
  const candidate = (value || "").split(";")[0].trim().toLowerCase();
  if (candidate.startsWith("image/")) return candidate;

  try {
    const pathname = new URL(source).pathname.toLowerCase();
    if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "image/jpeg";
    if (pathname.endsWith(".webp")) return "image/webp";
    if (pathname.endsWith(".gif")) return "image/gif";
    if (pathname.endsWith(".avif")) return "image/avif";
  } catch {
    // Fall through to the safest supported raster type.
  }
  return "image/png";
}

function decodeDataUrl(source: string) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(source);
  if (!match) throw new Error("La imagen generada tiene un formato no compatible.");

  // Reject obviously oversized payloads before allocating a large buffer.
  if (match[2].length > Math.ceil(MAX_IMAGE_BYTES * 1.4)) {
    throw new Error("La imagen generada supera el límite de 15 MB.");
  }

  const binary = atob(match[2]);
  if (binary.length > MAX_IMAGE_BYTES) throw new Error("La imagen generada supera el límite de 15 MB.");
  return { bytes: Uint8Array.from(binary, (character) => character.charCodeAt(0)), contentType: match[1].toLowerCase() };
}

async function readImageSource(source: string) {
  if (source.startsWith("data:")) return decodeDataUrl(source);

  let parsed: URL;
  try {
    parsed = new URL(source);
  } catch {
    throw new Error("La imagen generada no contiene una URL válida.");
  }
  if (parsed.protocol !== "https:") throw new Error("La imagen generada debe estar disponible por HTTPS.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const response = await fetch(parsed, { signal: controller.signal });
    if (!response.ok) throw new Error(`No se pudo descargar la imagen generada (${response.status}).`);
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_IMAGE_BYTES) throw new Error("La imagen generada supera el límite de 15 MB.");

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0) throw new Error("La imagen generada está vacía.");
    if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("La imagen generada supera el límite de 15 MB.");
    return { bytes, contentType: normalizeContentType(response.headers.get("content-type"), source) };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("La descarga de la imagen generada agotó el tiempo de espera.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "image";
}

export async function persistImageSource(
  client: SupabaseClient,
  source: string,
  options: {
    bucket: string;
    folder: string;
    ownerId: string;
    label?: string;
  },
): Promise<PersistedImage> {
  const { bytes, contentType } = await readImageSource(source);
  const extension = extensionForMime(contentType);
  const label = safeSegment(options.label || "generated");
  const path = `${options.folder}/${safeSegment(options.ownerId)}/${Date.now()}-${label}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
  const { error } = await client.storage.from(options.bucket).upload(
    path,
    new Blob([bytes], { type: contentType }),
    { contentType, cacheControl: "31536000", upsert: false },
  );
  if (error) throw new Error(`No se pudo guardar la imagen generada: ${error.message}`);

  const { data } = client.storage.from(options.bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl, contentType, bytes: bytes.byteLength };
}
