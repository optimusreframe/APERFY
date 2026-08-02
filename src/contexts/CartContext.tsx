import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string;
  slug: string;
  quantity: number;
  unitPrice: number;
  selectedVariations: { id: string; type: string; name: string; priceModifier: number }[];
  notes: string;
  weightGrams?: number;
  dimensions?: string;
}

export interface AppliedDiscount {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase: number;
}

const cartItemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string().max(500),
  productImage: z.string().max(2000),
  slug: z.string().max(255),
  quantity: z.number().int().min(1).max(100),
  unitPrice: z.number().min(0).max(999999),
  selectedVariations: z.array(z.object({
    id: z.string(),
    type: z.string().max(100),
    name: z.string().max(255),
    priceModifier: z.number().min(-999999).max(999999),
  })),
  notes: z.string().max(500),
  weightGrams: z.number().min(0).max(999999).optional(),
  dimensions: z.string().max(100).optional(),
});

const cartSchema = z.array(cartItemSchema);

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  itemCount: number;
  lastAdded: { item: CartItem; at: number } | null;
  dismissLastAdded: () => void;
  discount: AppliedDiscount | null;
  applyDiscount: (code: string) => Promise<{ ok: boolean; error?: string }>;
  removeDiscount: () => void;
  getDiscountAmount: () => number;
  getFinalTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY = 'aperfy-cart';
const DISCOUNT_KEY = 'aperfy-discount';

function loadCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    const result = cartSchema.safeParse(parsed);
    if (!result.success) { localStorage.removeItem(CART_KEY); return []; }
    return result.data as CartItem[];
  } catch { localStorage.removeItem(CART_KEY); return []; }
}

function loadDiscount(): AppliedDiscount | null {
  try { const s = localStorage.getItem(DISCOUNT_KEY); return s ? JSON.parse(s) : null; }
  catch { return null; }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [lastAdded, setLastAdded] = useState<{ item: CartItem; at: number } | null>(null);
  const [discount, setDiscount] = useState<AppliedDiscount | null>(loadDiscount);

  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(items)); }, [items]);
  useEffect(() => {
    if (discount) localStorage.setItem(DISCOUNT_KEY, JSON.stringify(discount));
    else localStorage.removeItem(DISCOUNT_KEY);
  }, [discount]);

  const addToCart = (item: CartItem) => {
    const result = cartItemSchema.safeParse(item);
    if (!result.success) return;
    setItems(prev => {
      const existing = prev.find(i => i.productId === item.productId);
      if (existing) {
        return prev.map(i =>
          i.productId === item.productId
            ? { ...item, quantity: Math.min(i.quantity + item.quantity, 100) }
            : i
        );
      }
      return [...prev, item];
    });
    setLastAdded({ item, at: Date.now() });
  };

  const removeFromCart = (productId: string) => setItems(prev => prev.filter(i => i.productId !== productId));
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return removeFromCart(productId);
    if (quantity > 100) return;
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity } : i));
  };
  const clearCart = () => { setItems([]); setDiscount(null); };

  const getTotal = () => items.reduce((sum, i) => {
    const varMod = i.selectedVariations.reduce((s, v) => s + v.priceModifier, 0);
    return sum + (i.unitPrice + varMod) * i.quantity;
  }, 0);

  const getDiscountAmount = () => {
    if (!discount) return 0;
    const subtotal = getTotal();
    if (subtotal < Number(discount.min_purchase || 0)) return 0;
    const amt = discount.discount_type === 'percentage'
      ? subtotal * (Number(discount.discount_value) / 100)
      : Number(discount.discount_value);
    return Math.min(amt, subtotal);
  };

  const getFinalTotal = () => Math.max(0, getTotal() - getDiscountAmount());

  const applyDiscount = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return { ok: false, error: 'empty' };
    const { data, error } = await supabase
      .from('discount_codes')
      .select('id, code, discount_type, discount_value, min_purchase, max_uses, current_uses, starts_at, expires_at, is_active')
      .eq('code', code).maybeSingle();
    if (error || !data) return { ok: false, error: 'not_found' };
    if (!data.is_active) return { ok: false, error: 'inactive' };
    const now = new Date();
    if (data.starts_at && new Date(data.starts_at) > now) return { ok: false, error: 'not_started' };
    if (data.expires_at && new Date(data.expires_at) < now) return { ok: false, error: 'expired' };
    if (data.max_uses && data.current_uses >= data.max_uses) return { ok: false, error: 'maxed' };
    if (getTotal() < Number(data.min_purchase || 0)) return { ok: false, error: 'min_purchase' };
    setDiscount({
      id: data.id, code: data.code,
      discount_type: data.discount_type as 'percentage' | 'fixed',
      discount_value: Number(data.discount_value),
      min_purchase: Number(data.min_purchase || 0),
    });
    return { ok: true };
  };

  const removeDiscount = () => setDiscount(null);
  const dismissLastAdded = () => setLastAdded(null);

  return (
    <CartContext.Provider value={{
      items, addToCart, removeFromCart, updateQuantity, clearCart, getTotal,
      itemCount: items.reduce((s, i) => s + i.quantity, 0),
      lastAdded, dismissLastAdded,
      discount, applyDiscount, removeDiscount, getDiscountAmount, getFinalTotal,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
