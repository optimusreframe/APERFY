export const PRODUCT_WIZARD_STEP_COUNT = 5;

export interface ProductWizardForm {
  name_es: string;
  name_en: string;
  slug: string;
  base_price: number;
}

export function getNextWizardStep(step: number): number {
  return Math.min(PRODUCT_WIZARD_STEP_COUNT - 1, step + 1);
}

export function getPreviousWizardStep(step: number): number {
  return Math.max(0, step - 1);
}

export function getWizardStepError(step: number, form: ProductWizardForm): string | null {
  if (step === 1 && !form.name_es.trim()) return 'Añade el nombre del producto en español.';
  if (step === 1 && !form.name_en.trim()) return 'Añade el nombre del producto en inglés.';
  if (step === 1 && !form.slug.trim()) return 'Añade un slug para el producto.';
  if (step === 2 && (!Number.isFinite(form.base_price) || form.base_price < 0)) return 'Añade un precio válido.';
  return null;
}
