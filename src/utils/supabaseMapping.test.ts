import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProductSlug,
  deriveItemIdempotencyKey,
  mapDbCategory,
  mapDbFeedbackThread,
  mapDbNotification,
  mapDbOrder,
  mapDbPlan,
  mapDbProduct,
  mapDbProfile,
  parsePlanMonths,
  toFriendlySupabaseError,
} from './supabaseMapping';
import { urlSlugSchema } from './validation';

test('buildProductSlug produces urlSlugSchema-compliant slugs', () => {
  const slug = buildProductSlug("Women's 3-Piece --- Unstitched!!", 'a1b2c3d4-e5f6-7890-1234-567890abcdef');
  assert.equal(slug, 'women-s-3-piece-unstitched-a1b2c3d4');
  assert.equal(urlSlugSchema.safeParse(slug).success, true);
});

test('mapDbCategory enriches DB category name with UI metadata', () => {
  const cat = mapDbCategory({
    id: '6963efa3-a6a7-4924-97a7-b46c6ae66f7f',
    name: "Women's Unstitched",
  });
  assert.equal(cat.slug, 'womens-unstitched');
  assert.ok(cat.description.length > 10);
  assert.ok(cat.image.includes('/src/assets/images/'));
});

test('mapDbProduct maps schema fields, images array, and admin product_costs', () => {
  const prod = mapDbProduct({
    id: '11111111-2222-3333-4444-555555555555',
    category_id: 'cat-1',
    title: 'Olive Bomber Jacket',
    description: 'Warm winter jacket',
    price: 9500,
    cover_image: 'https://cdn.example/cover.webp',
    images: ['https://cdn.example/cover.webp', 'https://cdn.example/angle2.webp'],
    is_active: true,
    created_at: '2026-11-23T00:00:00Z',
    categories: { name: 'Jackets' },
    product_costs: [{ cost_price: 5400 }],
  });

  assert.equal(prod.categoryName, 'Jackets');
  assert.equal(prod.costPrice, 5400);
  assert.deepEqual(prod.extraImages, ['https://cdn.example/angle2.webp']);
  assert.deepEqual(prod.sizes, ['S', 'M', 'L', 'XL']);
  assert.equal(prod.inStock, true);
  assert.equal(prod.hasOwnCoverImage, true);
  assert.equal(urlSlugSchema.safeParse(prod.slug).success, true);

  const prodWithoutImg = mapDbProduct({
    id: '22222222-2222-3333-4444-555555555555',
    category_id: 'cat-1',
    title: 'Plain Cap',
    price: 900,
    cover_image: null,
  });
  assert.equal(prodWithoutImg.hasOwnCoverImage, false);
});

test('mapDbPlan and parsePlanMonths round-trip plan months', () => {
  const plan = mapDbPlan({
    months: 3,
    markup_percent: 25,
    advance_percent: 20,
    is_active: true,
  });
  assert.equal(plan.id, 'plan-3m');
  assert.equal(plan.label, '3 Months');
  assert.equal(plan.markupPercent, 25);
  assert.equal(plan.advancePercent, 20);
  assert.equal(parsePlanMonths(plan.id), 3);
  assert.equal(parsePlanMonths(undefined), null);
});

test('mapDbOrder maps single-product order, installment_payments, and commissions', () => {
  const order = mapDbOrder({
    id: 'ord-uuid-1',
    user_id: 'usr-1',
    product_id: 'prod-1',
    product_title: 'Olive Bomber Jacket',
    quantity: 2,
    size: 'L',
    unit_price: 5000,
    subtotal: 10000,
    pay_method: 'installment',
    plan_months: 2,
    advance_amount: 2300,
    monthly_amount: 4600,
    total_amount: 11500,
    referral_code: 'CA-123456',
    seller_id: 'seller-1',
    customer_name: 'Hamza Khan',
    phone: '03355329722',
    whatsapp: '03355329722',
    address: 'University Road',
    city: 'Peshawar',
    postal_code: '25000',
    notes: 'Call before delivery',
    status: 'complete',
    created_at: '2026-11-23T10:00:00Z',
    installment_payments: [
      { id: 'pay-2', due_no: 2, amount: 4600, due_date: '2027-01-23', is_paid: false, paid_at: null },
      { id: 'pay-1', due_no: 1, amount: 4600, due_date: '2026-12-23', is_paid: true, paid_at: '2026-11-24T00:00:00Z' },
      { id: 'pay-0', due_no: 0, amount: 2300, due_date: '2026-11-23', is_paid: true, paid_at: '2026-11-23T10:05:00Z' },
    ],
    commissions: [{ id: 'com-1', amount: 1150 }],
  });

  assert.equal(order.paymentMethod, 'installments');
  assert.equal(order.planId, 'plan-2m');
  assert.equal(order.advancePaid, true);
  assert.equal(order.installmentSchedule.length, 2);
  assert.equal(order.installmentSchedule[0].installmentNumber, 1);
  assert.equal(order.installmentSchedule[0].paid, true);
  assert.equal(order.commissionAmount, 1150);
  assert.equal(order.commissionCredited, true);
  assert.equal(order.items[0].quantity, 2);
});

test('mapDbNotification detects read status from notification_reads', () => {
  const row = {
    id: 'notif-1',
    user_id: null,
    title: 'Support Reply',
    body: 'Your size exchange is approved.',
    created_at: '2026-11-23T00:00:00Z',
    notification_reads: [{ user_id: 'usr-1' }],
  };
  assert.equal(mapDbNotification(row, 'usr-1').read, true);
  assert.equal(mapDbNotification(row, 'usr-2').read, false);
  assert.equal(mapDbNotification(row, 'usr-1').kind, 'feedback_reply');
});

test('mapDbFeedbackThread sorts messages and infers replied status', () => {
  const profiles = new Map([['usr-1', { name: 'Ayesha', email: 'ayesha@example.com' }]]);
  const thread = mapDbFeedbackThread(
    {
      id: 'fb-1',
      user_id: 'usr-1',
      subject: 'Order Question',
      created_at: '2026-11-23T08:00:00Z',
      feedback_messages: [
        { id: 'm2', from_admin: true, body: 'Shipped today.', created_at: '2026-11-23T09:00:00Z' },
        { id: 'm1', from_admin: false, body: 'When will it ship?', created_at: '2026-11-23T08:00:00Z' },
      ],
    },
    profiles
  );

  assert.equal(thread.status, 'replied');
  assert.equal(thread.userName, 'Ayesha');
  assert.equal(thread.messages[0].senderRole, 'user');
  assert.equal(thread.messages[1].senderRole, 'admin');
});

test('mapDbProfile maps full_name and seller code safely', () => {
  const user = mapDbProfile({
    id: 'u-1',
    email: 'seller@example.com',
    full_name: 'Bilal Ahmad',
    role: 'seller',
    seller_code: 'CA-901234',
  });
  assert.equal(user.name, 'Bilal Ahmad');
  assert.equal(user.role, 'seller');
  assert.equal(user.isActiveSeller, true);
});

test('deriveItemIdempotencyKey and toFriendlySupabaseError handle edge cases', () => {
  assert.equal(deriveItemIdempotencyKey('bag-1', 0, 1), 'bag-1');
  assert.equal(deriveItemIdempotencyKey('bag-1', 1, 2), 'bag-1-2');
  assert.match(toFriendlySupabaseError(new Error('Invalid login credentials'), 'fail').message, /Incorrect email or password/);
  assert.match(toFriendlySupabaseError(new Error('permission denied for function check_referral'), 'fail').message, /permission/i);
});
