import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { z } from 'zod';

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string;
  slug: string;
  quantity: number;
  unitPrice: number;
  selectedVariations: { id: string; type: string; name: string; priceModifier: number }[];
  notes: string;
}

// Zod schema for cart data integrity
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY = '3dtoprint-cart';

function loadCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    const result = cartSchema.safeParse(parsed);
    if (!result.success) {
      console.warn('Cart data validation failed, resetting cart');
      localStorage.removeItem(CART_KEY);
      return [];
    }
    return result.data as CartItem[];
  } catch {
    localStorage.removeItem(CART_KEY);
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = (item: CartItem) => {
    // Validate incoming item
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
  };

  const removeFromCart = (productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return removeFromCart(productId);
    if (quantity > 100) return;
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity } : i));
  };

  const clearCart = () => setItems([]);

  const getTotal = () => items.reduce((sum, i) => {
    const varMod = i.selectedVariations.reduce((s, v) => s + v.priceModifier, 0);
    return sum + (i.unitPrice + varMod) * i.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, getTotal, itemCount: items.reduce((s, i) => s + i.quantity, 0) }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
