import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { z } from 'zod';
import type { OrderItem, PaymentMethod, Product } from '../api/types';
import { persistedCartItemSchema } from '../utils/validation';

export interface BuySheetOptions {
  paymentMethod?: PaymentMethod;
  planId?: string;
}

interface CartContextValue {
  items: OrderItem[];
  totalItems: number;
  subtotal: number;
  wishlistIds: string[];
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => void;
  addItem: (product: Product, quantity?: number, selectedSize?: string) => void;
  updateQuantity: (productId: string, selectedSize: string | undefined, quantity: number) => void;
  removeItem: (productId: string, selectedSize?: string) => void;
  clearCart: () => void;
  checkoutModalProduct: {
    product: Product;
    quantity: number;
    size?: string;
    paymentMethod?: PaymentMethod;
    planId?: string;
  } | null;
  openBuySheet: (
    product: Product,
    quantity?: number,
    size?: string,
    options?: BuySheetOptions
  ) => void;
  closeBuySheet: () => void;
}

const CART_KEY = 'ca_cart_v1';
const WISHLIST_KEY = 'ca_wishlist_v1';
const CartContext = createContext<CartContextValue | null>(null);

const cartArraySchema = z.array(persistedCartItemSchema).max(50);
const wishlistSchema = z.array(z.string().min(1).max(80)).max(200);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [checkoutModalProduct, setCheckoutModalProduct] = useState<{
    product: Product;
    quantity: number;
    size?: string;
    paymentMethod?: PaymentMethod;
    planId?: string;
  } | null>(null);

  useEffect(() => {
    try {
      const rawCart = localStorage.getItem(CART_KEY);
      if (rawCart) {
        const parsedCart = cartArraySchema.safeParse(JSON.parse(rawCart));
        if (parsedCart.success) setItems(parsedCart.data);
      }
      const rawWish = localStorage.getItem(WISHLIST_KEY);
      if (rawWish) {
        const parsedWish = wishlistSchema.safeParse(JSON.parse(rawWish));
        if (parsedWish.success) setWishlistIds(parsedWish.data);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlistIds));
    } catch {
      // ignore
    }
  }, [wishlistIds, hydrated]);

  const isWishlisted = (productId: string) => wishlistIds.includes(productId);

  const toggleWishlist = (productId: string) => {
    setWishlistIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const addItem = (product: Product, quantity = 1, selectedSize?: string) => {
    setItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.productId === product.id && (i.selectedSize || '') === (selectedSize || '')
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity };
        return next;
      }
      return [
        ...prev,
        {
          productId: product.id,
          title: product.title,
          unitPrice: product.price,
          quantity,
          selectedSize,
          image: product.coverImage,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, selectedSize: string | undefined, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId, selectedSize);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId && (i.selectedSize || '') === (selectedSize || '')
          ? { ...i, quantity }
          : i
      )
    );
  };

  const removeItem = (productId: string, selectedSize?: string) => {
    setItems((prev) =>
      prev.filter(
        (i) => !(i.productId === productId && (i.selectedSize || '') === (selectedSize || ''))
      )
    );
  };

  const clearCart = () => setItems([]);

  const openBuySheet = (
    product: Product,
    quantity = 1,
    size?: string,
    options?: BuySheetOptions
  ) => {
    setCheckoutModalProduct({
      product,
      quantity,
      size,
      paymentMethod: options?.paymentMethod,
      planId: options?.planId,
    });
  };

  const closeBuySheet = () => setCheckoutModalProduct(null);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        subtotal,
        wishlistIds,
        isWishlisted,
        toggleWishlist,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        checkoutModalProduct,
        openBuySheet,
        closeBuySheet,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
