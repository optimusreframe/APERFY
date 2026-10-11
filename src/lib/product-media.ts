export type ProductMediaKind = 'image' | 'video';

const VIDEO_EXTENSIONS = /\.(?:mp4|webm|mov|m4v|ogv)(?:$|[?#])/i;

export function getProductMediaKind(source: string): ProductMediaKind {
  return VIDEO_EXTENSIONS.test(source) ? 'video' : 'image';
}

export function isProductVideo(source: string): boolean {
  return getProductMediaKind(source) === 'video';
}
