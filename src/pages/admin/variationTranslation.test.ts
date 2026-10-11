import { describe, expect, it } from 'vitest';
import { getVariationTranslationPayload } from './variationTranslation';

describe('getVariationTranslationPayload', () => {
  it('sends both Spanish fields when generating English variant text', () => {
    expect(getVariationTranslationPayload({
      name_es: 'Bone',
      description_es: 'Audífonos color hueso con cancelación de ruido.',
      name_en: '',
      description_en: '',
    })).toEqual({
      direction: 'es_to_en',
      name_es: 'Bone',
      description_es: 'Audífonos color hueso con cancelación de ruido.',
    });
  });

  it('can generate Spanish variant text when only English is available', () => {
    expect(getVariationTranslationPayload({
      name_es: '',
      description_es: '',
      name_en: 'Bone',
      description_en: 'Bone-colored headphones with noise cancellation.',
    })).toEqual({
      direction: 'en_to_es',
      name_en: 'Bone',
      description_en: 'Bone-colored headphones with noise cancellation.',
    });
  });

  it('returns null when the variant has no text to translate', () => {
    expect(getVariationTranslationPayload({
      name_es: ' ',
      description_es: '',
      name_en: '',
      description_en: '  ',
    })).toBeNull();
  });
});
