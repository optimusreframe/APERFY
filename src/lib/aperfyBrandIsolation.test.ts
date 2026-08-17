import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const runtimeFiles = [
  'vite.config.ts',
  'supabase/functions/_shared/email-templates/email-change.tsx',
  'supabase/functions/_shared/email-templates/invite.tsx',
  'supabase/functions/_shared/email-templates/magic-link.tsx',
  'supabase/functions/_shared/email-templates/reauthentication.tsx',
  'supabase/functions/_shared/email-templates/recovery.tsx',
  'supabase/functions/_shared/email-templates/signup.tsx',
  'supabase/functions/_shared/transactional-email-templates/model-request-received.tsx',
  'supabase/functions/_shared/transactional-email-templates/order-cancelled.tsx',
  'supabase/functions/_shared/transactional-email-templates/order-confirmation.tsx',
  'supabase/functions/_shared/transactional-email-templates/order-confirmed.tsx',
  'supabase/functions/_shared/transactional-email-templates/order-delivered.tsx',
  'supabase/functions/_shared/transactional-email-templates/order-printing.tsx',
  'supabase/functions/_shared/transactional-email-templates/order-shipped.tsx',
  'supabase/functions/_shared/transactional-email-templates/payment-received.tsx',
];

describe('APERFY runtime brand isolation', () => {
  it('does not expose inherited 3DtoPrint branding in runtime files', () => {
    const inheritedBrand = /3dtoprint|3dto|a3dtoprint/i;
    const inheritedProject = /fyqcbkfzyjgddmqupdfr/i;

    for (const relativePath of runtimeFiles) {
      const source = readFileSync(resolve(process.cwd(), relativePath), 'utf8');
      expect(source, relativePath).not.toMatch(inheritedBrand);
      expect(source, relativePath).not.toMatch(inheritedProject);
    }
  });
});
