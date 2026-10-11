export type VariationTranslationPayload =
  | { direction: 'es_to_en'; name_es: string; description_es: string }
  | { direction: 'en_to_es'; name_en: string; description_en: string };

export function getVariationTranslationPayload(variation: {
  name_es: string;
  description_es: string;
  name_en: string;
  description_en: string;
}): VariationTranslationPayload | null {
  const hasSpanish = Boolean(variation.name_es.trim() || variation.description_es.trim());
  if (hasSpanish) {
    return {
      direction: 'es_to_en',
      name_es: variation.name_es,
      description_es: variation.description_es,
    };
  }

  const hasEnglish = Boolean(variation.name_en.trim() || variation.description_en.trim());
  if (hasEnglish) {
    return {
      direction: 'en_to_es',
      name_en: variation.name_en,
      description_en: variation.description_en,
    };
  }

  return null;
}
