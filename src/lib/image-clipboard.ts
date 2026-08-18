export interface ClipboardImageItem {
  types: readonly string[];
  getType: (type: string) => Promise<Blob>;
}

function extensionForMimeType(type: string): string {
  const subtype = type.split('/')[1]?.split(';')[0]?.toLowerCase();
  if (subtype === 'jpeg') return 'jpg';
  if (subtype && /^[a-z0-9]+$/.test(subtype)) return subtype;
  return 'png';
}

export async function readClipboardImage(
  read: () => Promise<ReadonlyArray<ClipboardImageItem>>,
): Promise<File | null> {
  const items = await read();

  for (const item of items) {
    const imageType = item.types.find((type) => type.toLowerCase().startsWith('image/'));
    if (!imageType) continue;

    const blob = await item.getType(imageType);
    return new File([blob], `clipboard-image-${Date.now()}.${extensionForMimeType(imageType)}`, {
      type: blob.type || imageType,
    });
  }

  return null;
}
