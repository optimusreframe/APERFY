import { describe, expect, it } from 'vitest';
import { readClipboardImage } from './image-clipboard';

describe('readClipboardImage', () => {
  it('returns the first image item as a File', async () => {
    const blob = new Blob(['png-data'], { type: 'image/png' });
    const file = await readClipboardImage(async () => [{
      types: ['text/plain', 'image/png'],
      getType: async () => blob,
    }]);

    expect(file).toBeInstanceOf(File);
    expect(file?.type).toBe('image/png');
    expect(file?.name).toMatch(/^clipboard-image-\d+\.png$/);
    expect(file?.size).toBe(blob.size);
  });

  it('skips clipboard items without an image', async () => {
    const file = await readClipboardImage(async () => [{
      types: ['text/plain'],
      getType: async () => new Blob(['text'], { type: 'text/plain' }),
    }]);

    expect(file).toBeNull();
  });
});
