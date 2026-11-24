import type {
  InstallmentPlan,
  ManualDashboardEntry,
  Order,
  OrderInstallmentEntry,
  Product,
  StockLevel,
} from '../api/types';

export function deriveProductStockStatus(
  product: Pick<Product, 'inStock' | 'stockLevel' | 'stockQuantity'>,
  lowStockThreshold = 5
): { level: StockLevel; isAvailable: boolean; remainingUnits?: number } {
  if (
    product.inStock === false ||
    product.stockLevel === 'out_of_stock' ||
    (typeof product.stockQuantity === 'number' && product.stockQuantity <= 0)
  ) {
    return { level: 'out_of_stock', isAvailable: false, remainingUnits: 0 };
  }

  if (
    product.stockLevel === 'low_stock' ||
    (typeof product.stockQuantity === 'number' && product.stockQuantity <= lowStockThreshold)
  ) {
    return {
      level: 'low_stock',
      isAvailable: true,
      remainingUnits: typeof product.stockQuantity === 'number' ? product.stockQuantity : undefined,
    };
  }

  return {
    level: 'in_stock',
    isAvailable: true,
    remainingUnits: typeof product.stockQuantity === 'number' ? product.stockQuantity : undefined,
  };
}

export function formatPKR(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `PKR ${safe.toLocaleString('en-PK')}`;
}

export function sanitizeText(value: string, maxLength = 500): string {
  return value
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export interface InstallmentCalculation {
  subtotal: number;
  advancePercent: number;
  advanceAmount: number;
  markupPercent: number;
  markupAmount: number;
  totalPayable: number;
  financedBalance: number;
  months: number;
  monthlyAmount: number;
  schedule: OrderInstallmentEntry[];
}

/**
 * Computes exact PKR installment figures:
 * - Interest (markupPercent: e.g. 15% for 2m, 25% for 3m, 40% for 4m) applies to the product subtotal.
 * - totalPayable = subtotal + markupAmount.
 * - Optional advancePercent (default 0%) is taken from totalPayable.
 * - Remaining financedBalance is split across `months`, with any rounding delta applied to the final month
 *   so sum(advance + monthly payments) equals totalPayable to the exact rupee.
 */
export function calculateInstallmentPlan(
  unitPrice: number,
  quantity: number,
  plan: InstallmentPlan,
  startDateIso = new Date().toISOString()
): InstallmentCalculation {
  const safePrice = Math.max(0, Math.round(unitPrice));
  const safeQty = Math.max(1, Math.floor(quantity));
  const subtotal = safePrice * safeQty;
  const months = Math.max(1, Math.floor(plan.months));
  const advancePercent = Math.min(90, Math.max(0, plan.advancePercent));
  const markupPercent = Math.max(0, plan.markupPercent);

  const markupAmount = Math.round((subtotal * markupPercent) / 100);
  const totalPayable = subtotal + markupAmount;
  const advanceAmount = Math.round((totalPayable * advancePercent) / 100);
  const financedBalance = Math.max(0, totalPayable - advanceAmount);

  const baseMonthly = Math.floor(financedBalance / months);
  const remainder = financedBalance - baseMonthly * months;
  const startDate = new Date(startDateIso);

  const schedule: OrderInstallmentEntry[] = [];
  for (let i = 1; i <= months; i++) {
    const due = new Date(startDate);
    due.setMonth(due.getMonth() + i);
    const amount = i === months ? baseMonthly + remainder : baseMonthly;
    schedule.push({
      installmentNumber: i,
      dueDate: due.toISOString().slice(0, 10),
      amount,
      paid: false,
      paidAt: null,
    });
  }

  return {
    subtotal,
    advancePercent,
    advanceAmount,
    markupPercent,
    markupAmount,
    totalPayable,
    financedBalance,
    months,
    monthlyAmount: baseMonthly,
    schedule,
  };
}

export function calculateOrderPaidSummary(order: Order): {
  paidAmount: number;
  remainingAmount: number;
  progressPercent: number;
} {
  if (order.paymentMethod === 'cod') {
    const paid = order.status === 'complete' ? order.totalAmount : 0;
    return {
      paidAmount: paid,
      remainingAmount: Math.max(0, order.totalAmount - paid),
      progressPercent: order.status === 'complete' ? 100 : 0,
    };
  }

  const advance = order.advancePaid ? order.advanceAmount : 0;
  const installmentsPaid = (order.installmentSchedule || [])
    .filter((item) => item.paid)
    .reduce((sum, item) => sum + item.amount, 0);
  const paidAmount = Math.min(order.totalAmount, advance + installmentsPaid);
  const remainingAmount = Math.max(0, order.totalAmount - paidAmount);
  const progressPercent =
    order.totalAmount > 0 ? Math.round((paidAmount / order.totalAmount) * 100) : 0;

  return { paidAmount, remainingAmount, progressPercent };
}

export function calculateCommission(orderTotal: number, rate = 0.1): number {
  if (!Number.isFinite(orderTotal) || orderTotal <= 0) return 0;
  return Math.round(orderTotal * rate);
}

export function generateSellerId(prefix = 'CA'): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `${prefix.toUpperCase()}-${digits}`;
}

export interface AnalyticsResult {
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  commissionsPayable: number;
  netProfit: number;
  profitMarginPct: number;
  ordersCount: number;
  completedOrdersCount: number;
  pendingOrdersCount: number;
  dailySeries: { label: string; revenue: number; orders: number }[];
  monthlySeries: { label: string; revenue: number; profit: number }[];
}

export function calculateAdminAnalytics(
  orders: Order[],
  products: Product[],
  manualEntries: ManualDashboardEntry[] = []
): AnalyticsResult {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const activeOrders = orders.filter((o) => o.status !== 'rejected');
  const completedOrders = orders.filter((o) => o.status === 'complete');

  let revenue = 0;
  let costOfGoods = 0;
  let commissionsPayable = 0;
  let manualOrdersTotal = 0;

  for (const order of completedOrders) {
    revenue += order.totalAmount;
    for (const item of order.items) {
      const prod = productMap.get(item.productId);
      const unitCost = prod?.costPrice ?? Math.round(item.unitPrice * 0.55);
      costOfGoods += unitCost * item.quantity;
    }
    if (order.referralSellerId) {
      commissionsPayable += order.commissionAmount ?? calculateCommission(order.totalAmount);
    }
  }

  for (const entry of manualEntries) {
    const rev = Math.max(0, Number(entry.revenue) || 0);
    const cogs = Math.max(0, Number(entry.costOfGoods) || 0);
    const comm = Math.max(0, Number(entry.commissionAmount) || 0);
    const cnt = Math.max(1, Math.floor(Number(entry.ordersCount) || 1));
    revenue += rev;
    costOfGoods += cogs;
    commissionsPayable += comm;
    manualOrdersTotal += cnt;
  }

  const grossProfit = revenue - costOfGoods;
  const netProfit = grossProfit - commissionsPayable;
  const profitMarginPct = revenue > 0 ? Number(((netProfit / revenue) * 100).toFixed(1)) : 0;

  const dailyBuckets = new Map<string, { revenue: number; orders: number }>();
  const monthlyBuckets = new Map<string, { revenue: number; profit: number }>();

  for (const order of activeOrders) {
    const dayKey = order.createdAt.slice(0, 10);
    const prevDay = dailyBuckets.get(dayKey) || { revenue: 0, orders: 0 };
    prevDay.revenue += order.totalAmount;
    prevDay.orders += 1;
    dailyBuckets.set(dayKey, prevDay);

    const monthKey = order.createdAt.slice(0, 7);
    const prevMonth = monthlyBuckets.get(monthKey) || { revenue: 0, profit: 0 };
    if (order.status === 'complete') {
      let cogs = 0;
      for (const item of order.items) {
        const prod = productMap.get(item.productId);
        cogs += (prod?.costPrice ?? Math.round(item.unitPrice * 0.55)) * item.quantity;
      }
      const comm = order.referralSellerId
        ? order.commissionAmount ?? calculateCommission(order.totalAmount)
        : 0;
      prevMonth.revenue += order.totalAmount;
      prevMonth.profit += order.totalAmount - cogs - comm;
    }
    monthlyBuckets.set(monthKey, prevMonth);
  }

  for (const entry of manualEntries) {
    const dayKey = (entry.date || entry.createdAt).slice(0, 10);
    const rev = Math.max(0, Number(entry.revenue) || 0);
    const cogs = Math.max(0, Number(entry.costOfGoods) || 0);
    const comm = Math.max(0, Number(entry.commissionAmount) || 0);
    const cnt = Math.max(1, Math.floor(Number(entry.ordersCount) || 1));

    const prevDay = dailyBuckets.get(dayKey) || { revenue: 0, orders: 0 };
    prevDay.revenue += rev;
    prevDay.orders += cnt;
    dailyBuckets.set(dayKey, prevDay);

    const monthKey = dayKey.slice(0, 7);
    const prevMonth = monthlyBuckets.get(monthKey) || { revenue: 0, profit: 0 };
    prevMonth.revenue += rev;
    prevMonth.profit += rev - cogs - comm;
    monthlyBuckets.set(monthKey, prevMonth);
  }

  const dailySeries = Array.from(dailyBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([label, vals]) => ({ label: label.slice(5), ...vals }));

  const monthlySeries = Array.from(monthlyBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([label, vals]) => ({ label, ...vals }));

  return {
    revenue,
    costOfGoods,
    grossProfit,
    commissionsPayable,
    netProfit,
    profitMarginPct,
    ordersCount: orders.length + manualOrdersTotal,
    completedOrdersCount: completedOrders.length + manualOrdersTotal,
    pendingOrdersCount: orders.filter((o) => o.status === 'pending').length,
    dailySeries,
    monthlySeries,
  };
}

export interface CheckoutFormInput {
  fullName: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  postalCode: string;
  paymentMethod: 'cod' | 'installments';
  referralCode: string;
}

export function validateCheckoutInput(
  input: CheckoutFormInput
): { valid: boolean; errors: Partial<Record<keyof CheckoutFormInput, string>> } {
  const errors: Partial<Record<keyof CheckoutFormInput, string>> = {};

  if (!input.fullName || input.fullName.trim().length < 2) {
    errors.fullName = 'Please enter your full name.';
  }
  const cleanPhone = input.phone.replace(/[\s-]/g, '');
  if (!/^(\+92|0)?3\d{9}$/.test(cleanPhone) && cleanPhone.length < 10) {
    errors.phone = 'Enter a valid Pakistani mobile number (e.g. 03355329722).';
  }
  const cleanWa = input.whatsapp.replace(/[\s-]/g, '');
  if (!cleanWa || cleanWa.length < 10) {
    errors.whatsapp = 'Enter a valid WhatsApp number for delivery updates.';
  }
  if (!input.address || input.address.trim().length < 6) {
    errors.address = 'Enter your complete street address.';
  }
  if (!input.city || input.city.trim().length < 2) {
    errors.city = 'City is required.';
  }
  if (!input.postalCode || input.postalCode.trim().length < 4) {
    errors.postalCode = 'Postal code is required.';
  }
  if (input.paymentMethod === 'installments' && !input.referralCode.trim()) {
    errors.referralCode =
      'An active Seller Referral ID (format CA-XXXXXX) is required for installment orders.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
