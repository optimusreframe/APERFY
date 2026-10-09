import { describe, expect, it, vi } from 'vitest';
import { fetchActiveStorefrontProducts } from './storefront-products';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({ supabase: supabaseMock }));

describe('storefront products query', () => {
  it('returns the complete active catalog instead of applying a 48-item cap', async () => {
    const products = Array.from({ length: 210 }, (_, index) => ({ id: String(index) }));
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: products, error: null }),
      limit: vi.fn(() => { throw new Error('The storefront must not cap products at 48'); }),
    };
    supabaseMock.from.mockReturnValue(query);

    await expect(fetchActiveStorefrontProducts()).resolves.toHaveLength(210);
    expect(query.limit).not.toHaveBeenCalled();
  });
});
