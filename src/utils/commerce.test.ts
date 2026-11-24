import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAdminAnalytics,
  calculateCommission,
  calculateInstallmentPlan,
  calculateOrderPaidSummary,
  deriveProductStockStatus,
  generateSellerId,
  validateCheckoutInput,
} from './commerce';
import type { InstallmentPlan, ManualDashboardEntry, Order, Product } from '../api/types';

const plan2m: InstallmentPlan = {
  id: 'plan-2m',
  label: '2 Months',
  months: 2,
  advancePercent: 0,
  markupPercent: 15,
  active: true,
};

const plan3m: InstallmentPlan = {
  id: 'plan-3m',
  label: '3 Months',
  months: 3,
  advancePercent: 0,
  markupPercent: 25,
  active: true,
};

const plan4m: InstallmentPlan = {
  id: 'plan-4m',
  label: '4 Months',
  months: 4,
  advancePercent: 0,
  markupPercent: 40,
  active: true,
};

test('calculateInstallmentPlan computes exact 15%, 25%, and 40% interest for 2, 3, and 4 months', () => {
  const res2 = calculateInstallmentPlan(10000, 1, plan2m, '2026-11-01T00:00:00.000Z');
  assert.equal(res2.subtotal, 10000);
  assert.equal(res2.markupPercent, 15);
  assert.equal(res2.markupAmount, 1500);
  assert.equal(res2.totalPayable, 11500);
  assert.equal(res2.advanceAmount, 0);
  assert.equal(res2.schedule.length, 2);
  assert.equal(res2.schedule.reduce((s, r) => s + r.amount, 0), 11500);

  const res3 = calculateInstallmentPlan(10000, 1, plan3m, '2026-11-01T00:00:00.000Z');
  assert.equal(res3.markupPercent, 25);
  assert.equal(res3.markupAmount, 2500);
  assert.equal(res3.totalPayable, 12500);
  assert.equal(res3.schedule.length, 3);
  assert.equal(res3.schedule.reduce((s, r) => s + r.amount, 0), 12500);

  const res4 = calculateInstallmentPlan(10000, 1, plan4m, '2026-11-01T00:00:00.000Z');
  assert.equal(res4.markupPercent, 40);
  assert.equal(res4.markupAmount, 4000);
  assert.equal(res4.totalPayable, 14000);
  assert.equal(res4.schedule.length, 4);
  assert.equal(res4.schedule.reduce((s, r) => s + r.amount, 0), 14000);
});

test('calculateInstallmentPlan supports custom advance % while preserving exact totalPayable', () => {
  const withAdvance: InstallmentPlan = {
    id: 'plan-custom',
    label: '3 Months Custom',
    months: 3,
    advancePercent: 20,
    markupPercent: 25,
    active: true,
  };
  const result = calculateInstallmentPlan(10000, 2, withAdvance, '2026-11-01T00:00:00.000Z');
  assert.equal(result.subtotal, 20000);
  assert.equal(result.markupAmount, 5000);
  assert.equal(result.totalPayable, 25000);
  assert.equal(result.advanceAmount, 5000);
  const scheduleSum = result.schedule.reduce((sum, item) => sum + item.amount, 0);
  assert.equal(result.advanceAmount + scheduleSum, result.totalPayable);
});

test('calculateCommission calculates 10% rounded PKR commission', () => {
  assert.equal(calculateCommission(24500), 2450);
  assert.equal(calculateCommission(0), 0);
  assert.equal(calculateCommission(-500), 0);
});

test('generateSellerId matches CA-XXXXXX format', () => {
  const id = generateSellerId('CA');
  assert.match(id, /^CA-\d{6}$/);
});

test('validateCheckoutInput requires referralCode for installments but not COD', () => {
  const base = {
    fullName: 'Amina Tariq',
    phone: '03355329722',
    whatsapp: '03355329722',
    address: 'House 14, University Town',
    city: 'Peshawar',
    postalCode: '25000',
    referralCode: '',
  };

  const codResult = validateCheckoutInput({ ...base, paymentMethod: 'cod' });
  assert.equal(codResult.valid, true);

  const instMissingRef = validateCheckoutInput({ ...base, paymentMethod: 'installments' });
  assert.equal(instMissingRef.valid, false);
  assert.ok(instMissingRef.errors.referralCode);

  const instWithRef = validateCheckoutInput({
    ...base,
    paymentMethod: 'installments',
    referralCode: 'CA-102938',
  });
  assert.equal(instWithRef.valid, true);
});

test('calculateAdminAnalytics returns zeros when empty and updates with orders plus manual dashboard entries', () => {
  const empty = calculateAdminAnalytics([], [], []);
  assert.equal(empty.revenue, 0);
  assert.equal(empty.netProfit, 0);
  assert.equal(empty.ordersCount, 0);
  assert.equal(empty.dailySeries.length, 0);
  assert.equal(empty.monthlySeries.length, 0);

  const products: Product[] = [
    {
      id: 'p1',
      slug: 'jacket',
      title: 'Bomber Jacket',
      description: 'Casual jacket',
      price: 20000,
      costPrice: 11000,
      categoryId: 'c1',
      categoryName: 'Jackets',
      coverImage: '/img.jpg',
      extraImages: [],
      inStock: true,
      featured: true,
      createdAt: '2026-10-01T00:00:00Z',
    },
  ];
  const orders: Order[] = [
    {
      id: 'ORD-1',
      userId: 'u1',
      customerName: 'Zain Khan',
      phone: '03355329722',
      whatsapp: '03355329722',
      address: 'Hayatabad Phase 3',
      city: 'Peshawar',
      postalCode: '25100',
      notes: '',
      items: [{ productId: 'p1', title: 'Bomber Jacket', unitPrice: 20000, quantity: 1, image: '/img.jpg' }],
      paymentMethod: 'installments',
      planId: 'plan-2m',
      planLabel: '2 Months',
      advanceAmount: 0,
      advancePaid: false,
      monthlyAmount: 11500,
      totalAmount: 23000,
      installmentSchedule: [],
      referralCode: 'CA-102938',
      referralSellerId: 'seller-1',
      commissionAmount: 2300,
      commissionCredited: true,
      status: 'complete',
      createdAt: '2026-11-10T10:00:00Z',
    },
  ];

  const manualEntries: ManualDashboardEntry[] = [
    {
      id: 'man-1',
      date: '2026-11-15',
      label: 'Walk-in Women Suit Sale',
      revenue: 10000,
      costOfGoods: 5500,
      commissionAmount: 0,
      ordersCount: 2,
      createdAt: '2026-11-15T12:00:00Z',
    },
  ];

  const analytics = calculateAdminAnalytics(orders, products, manualEntries);
  assert.equal(analytics.revenue, 33000);
  assert.equal(analytics.costOfGoods, 16500);
  assert.equal(analytics.grossProfit, 16500);
  assert.equal(analytics.commissionsPayable, 2300);
  assert.equal(analytics.netProfit, 14200);
  assert.equal(analytics.ordersCount, 3);
  assert.equal(analytics.dailySeries.length, 2);
  assert.equal(analytics.monthlySeries.length, 1);
  assert.equal(analytics.monthlySeries[0].revenue, 33000);
  assert.equal(analytics.monthlySeries[0].profit, 14200);
});

test('calculateOrderPaidSummary tracks advance plus paid installments', () => {
  const order = {
    paymentMethod: 'installments' as const,
    totalAmount: 11500,
    advanceAmount: 0,
    advancePaid: false,
    status: 'proceeding' as const,
    installmentSchedule: [
      { installmentNumber: 1, dueDate: '2026-12-01', amount: 5750, paid: true, paidAt: '2026-12-01' },
      { installmentNumber: 2, dueDate: '2027-01-01', amount: 5750, paid: false, paidAt: null },
    ],
  } as unknown as Order;

  const summary = calculateOrderPaidSummary(order);
  assert.equal(summary.paidAmount, 5750);
  assert.equal(summary.remainingAmount, 5750);
  assert.equal(summary.progressPercent, 50);
});

test('deriveProductStockStatus classifies in_stock, low_stock, and out_of_stock accurately', () => {
  assert.deepEqual(deriveProductStockStatus({ inStock: true }), {
    level: 'in_stock',
    isAvailable: true,
    remainingUnits: undefined,
  });

  assert.deepEqual(deriveProductStockStatus({ inStock: true, stockQuantity: 3 }), {
    level: 'low_stock',
    isAvailable: true,
    remainingUnits: 3,
  });

  assert.deepEqual(deriveProductStockStatus({ inStock: true, stockLevel: 'low_stock' }), {
    level: 'low_stock',
    isAvailable: true,
    remainingUnits: undefined,
  });

  assert.deepEqual(deriveProductStockStatus({ inStock: false, stockQuantity: 10 }), {
    level: 'out_of_stock',
    isAvailable: false,
    remainingUnits: 0,
  });

  assert.deepEqual(deriveProductStockStatus({ inStock: true, stockQuantity: 0 }), {
    level: 'out_of_stock',
    isAvailable: false,
    remainingUnits: 0,
  });
});
