import { useEffect, useRef, useState } from 'react';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}

let scriptPromise: Promise<void> | null = null;

function loadModelViewer(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (customElements.get('model-viewer')) return resolve();
    const s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load model-viewer'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface Props {
  src: string;
  poster?: string;
  alt?: string;
  className?: string;
}

export default function Model3DViewer({ src, poster, alt, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { loadModelViewer().then(() => setReady(true)).catch(() => {}); }, []);

  if (!ready) {
    return (
      <div ref={ref} className={`flex items-center justify-center bg-card/40 border border-border/40 rounded-xl ${className || ''}`}>
        <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Loading 3D…</div>
      </div>
    );
  }

  return (
    // @ts-ignore - custom element
    <model-viewer
      src={src}
      poster={poster}
      alt={alt}
      camera-controls
      auto-rotate
      shadow-intensity="1"
      exposure="0.9"
      environment-image="neutral"
      style={{ width: '100%', height: '100%', background: 'transparent', borderRadius: '0.75rem' }}
      class={className}
    />
  );
}
