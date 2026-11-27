import type { Order } from '../api/types';

const RECEIPT_STORAGE_KEY = 'ca_recent_order_receipts_v1';
const memoryReceipts = new Map<string, Order>();

export function saveOrderReceipt(order: Order): void {
  if (!order?.id) return;
  memoryReceipts.set(order.id, order);

  if (typeof sessionStorage !== 'undefined') {
    try {
      const existingRaw = sessionStorage.getItem(RECEIPT_STORAGE_KEY);
      const parsed = existingRaw ? (JSON.parse(existingRaw) as Record<string, Order>) : {};
      // Keep only the most recent 5 non-credential order summaries for this tab session
      const entries = Object.entries(parsed).filter(([k]) => k !== order.id).slice(-4);
      const next: Record<string, Order> = Object.fromEntries(entries);
      next[order.id] = order;
      sessionStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore sessionStorage quota errors
    }
  }
}

export function getOrderReceipt(orderId: string): Order | null {
  if (!orderId) return null;
  const fromMem = memoryReceipts.get(orderId);
  if (fromMem) return fromMem;

  if (typeof sessionStorage !== 'undefined') {
    try {
      const existingRaw = sessionStorage.getItem(RECEIPT_STORAGE_KEY);
      if (existingRaw) {
        const parsed = JSON.parse(existingRaw) as Record<string, Order>;
        if (parsed && parsed[orderId]) {
          memoryReceipts.set(orderId, parsed[orderId]);
          return parsed[orderId];
        }
      }
    } catch {
      // ignore parse/storage errors
    }
  }
  return null;
}

export function clearOrderReceipts(): void {
  memoryReceipts.clear();
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(RECEIPT_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }
}
