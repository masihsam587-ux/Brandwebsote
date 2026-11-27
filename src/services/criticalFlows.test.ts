import test from 'node:test';
import assert from 'node:assert/strict';
import { mockAdapter } from '../api/adapters/mockAdapter';
import { SEED_INSTALLMENT_PLANS, SEED_PRODUCTS } from '../api/seedData';
import {
  calculateInstallmentPlan,
  calculateOrderPaidSummary,
  formatPKR,
} from '../utils/commerce';

function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const mockStorage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    configurable: true,
    writable: true,
  });
  return mockStorage;
}

test('characterization: price & installment display values match exact PKR rules', async () => {
  installMemoryLocalStorage();

  const products = await mockAdapter.productService.listProducts({ sort: 'latest' });
  const plans = await mockAdapter.productService.listInstallmentPlans();

  assert.equal(products.length, SEED_PRODUCTS.length);
  assert.equal(plans.length, SEED_INSTALLMENT_PLANS.length);

  const jacket = products.find((p) => p.id === 'prod-3')!;
  assert.equal(formatPKR(jacket.price), 'PKR 9,500');

  const plan2m = plans.find((p) => p.months === 2)!;
  const plan3m = plans.find((p) => p.months === 3)!;
  const plan4m = plans.find((p) => p.months === 4)!;

  assert.equal(calculateInstallmentPlan(10000, 1, plan2m).totalPayable, 11500);
  assert.equal(calculateInstallmentPlan(10000, 1, plan3m).totalPayable, 12500);
  assert.equal(calculateInstallmentPlan(10000, 1, plan4m).totalPayable, 14000);
  assert.equal(formatPKR(calculateInstallmentPlan(jacket.price, 2, plan2m).totalPayable), 'PKR 21,850');
});

test('characterization: auth signup/login/password-update & seller referral validation', async () => {
  installMemoryLocalStorage();
  await mockAdapter.authService.logout();

  // 1. Signup active seller -> generates CA-XXXXXX referral code
  const sellerSession = await mockAdapter.authService.signup({
    role: 'seller',
    name: 'Tariq Seller',
    email: 'tariq.seller@example.com',
    password: 'StrongPass#2026',
    fatherName: 'Khan',
    phone: '03355329722',
    whatsapp: '03355329722',
    address: 'University Town',
    postalCode: '25000',
  });
  assert.equal(sellerSession.user.role, 'seller');
  assert.match(sellerSession.user.sellerCode || '', /^CA-\d{6}$/);

  const sellerCode = sellerSession.user.sellerCode!;

  // 2. Self-referral while signed in as that seller must be flagged
  const selfCheck = await mockAdapter.orderService.validateSellerReferral(sellerCode);
  assert.equal(selfCheck.valid, false);
  assert.equal(selfCheck.selfReferral, true);

  // 3. Invalid / unknown codes rejected
  assert.equal((await mockAdapter.orderService.validateSellerReferral('INVALID')).valid, false);
  assert.equal((await mockAdapter.orderService.validateSellerReferral('CA-000000')).valid, false);

  // 4. Logout & verify buyer signup + login + password update
  await mockAdapter.authService.logout();
  assert.equal(await mockAdapter.authService.getSession(), null);

  const validCheck = await mockAdapter.orderService.validateSellerReferral(sellerCode);
  assert.equal(validCheck.valid, true);
  assert.equal(validCheck.sellerName, 'Tariq Seller');

  const buyer = await mockAdapter.authService.signup({
    role: 'user',
    name: 'Amina Buyer',
    email: 'amina.buyer@example.com',
    password: 'BuyerPass#2026',
  });
  assert.equal(buyer.user.role, 'user');
  assert.equal(buyer.user.sellerCode, undefined);

  await mockAdapter.authService.logout();
  await assert.rejects(
    () =>
      mockAdapter.authService.login({
        email: 'amina.buyer@example.com',
        password: 'WrongPassword1',
      }),
    /Invalid email or password/
  );

  const loggedIn = await mockAdapter.authService.login({
    email: 'amina.buyer@example.com',
    password: 'BuyerPass#2026',
  });
  assert.equal(loggedIn.user.email, 'amina.buyer@example.com');

  await mockAdapter.authService.updatePassword('UpdatedPass#2026');
  await mockAdapter.authService.logout();
  const reLoggedIn = await mockAdapter.authService.login({
    email: 'amina.buyer@example.com',
    password: 'UpdatedPass#2026',
  });
  assert.equal(reLoggedIn.user.id, loggedIn.user.id);
});

test('characterization: order placement rules (COD, missing/self referral rejection, installment schedule) & admin transitions', async () => {
  installMemoryLocalStorage();
  await mockAdapter.authService.logout();

  // Create verified seller
  const seller = await mockAdapter.authService.signup({
    role: 'seller',
    name: 'Verified Referrer',
    email: 'ref.seller@example.com',
    password: 'SellerPass#2026',
    fatherName: 'Ahmad',
    phone: '03355329722',
    whatsapp: '03355329722',
    address: 'Hayatabad Phase 1',
    postalCode: '25100',
  });
  const sellerCode = seller.user.sellerCode!;

  // Self-referral installment order must be rejected
  await assert.rejects(
    () =>
      mockAdapter.orderService.createOrder({
        items: [
          {
            productId: 'prod-1',
            title: SEED_PRODUCTS[0].title,
            unitPrice: 1, // tampered unit price should be overridden if allowed
            quantity: 1,
            image: SEED_PRODUCTS[0].coverImage,
          },
        ],
        customerName: 'Tariq',
        phone: '03355329722',
        whatsapp: '03355329722',
        address: 'Hayatabad Phase 1',
        city: 'Peshawar',
        postalCode: '25100',
        paymentMethod: 'installments',
        planId: 'plan-2m',
        referralCode: sellerCode,
      }),
    /own Seller Referral ID/
  );

  // Switch to buyer session
  await mockAdapter.authService.logout();
  await mockAdapter.authService.signup({
    role: 'user',
    name: 'Buyer One',
    email: 'buyer.one@example.com',
    password: 'BuyerPass#2026',
  });

  // Installment order WITHOUT referral code must fail
  await assert.rejects(
    () =>
      mockAdapter.orderService.createOrder({
        items: [
          {
            productId: 'prod-1',
            title: SEED_PRODUCTS[0].title,
            unitPrice: SEED_PRODUCTS[0].price,
            quantity: 1,
            image: SEED_PRODUCTS[0].coverImage,
          },
        ],
        customerName: 'Buyer One',
        phone: '03355329722',
        whatsapp: '03355329722',
        address: 'Street 4, Peshawar',
        city: 'Peshawar',
        postalCode: '25000',
        paymentMethod: 'installments',
        planId: 'plan-2m',
      }),
    /require an active Seller Referral ID/
  );

  // COD order succeeds without referral & ignores client-tampered unitPrice
  const codOrder = await mockAdapter.orderService.createOrder({
    items: [
      {
        productId: 'prod-2',
        title: SEED_PRODUCTS[1].title,
        unitPrice: 10, // tampered!
        quantity: 2,
        image: SEED_PRODUCTS[1].coverImage,
      },
    ],
    customerName: 'Buyer One',
    phone: '03355329722',
    whatsapp: '03355329722',
    address: 'Street 4, Peshawar',
    city: 'Peshawar',
    postalCode: '25000',
    paymentMethod: 'cod',
    idempotencyKey: 'char-cod-1',
  });
  assert.equal(codOrder.status, 'pending');
  assert.equal(codOrder.totalAmount, SEED_PRODUCTS[1].price * 2);

  // Duplicate idempotencyKey returns identical order
  const codReplay = await mockAdapter.orderService.createOrder({
    items: [
      {
        productId: 'prod-2',
        title: SEED_PRODUCTS[1].title,
        unitPrice: SEED_PRODUCTS[1].price,
        quantity: 2,
        image: SEED_PRODUCTS[1].coverImage,
      },
    ],
    customerName: 'Buyer One',
    phone: '03355329722',
    whatsapp: '03355329722',
    address: 'Street 4, Peshawar',
    city: 'Peshawar',
    postalCode: '25000',
    paymentMethod: 'cod',
    idempotencyKey: 'char-cod-1',
  });
  assert.equal(codReplay.id, codOrder.id);

  // Installment order WITH valid referral succeeds and generates schedule
  const instOrder = await mockAdapter.orderService.createOrder({
    items: [
      {
        productId: 'prod-1',
        title: SEED_PRODUCTS[0].title,
        unitPrice: SEED_PRODUCTS[0].price,
        quantity: 1,
        image: SEED_PRODUCTS[0].coverImage,
      },
    ],
    customerName: 'Buyer One',
    phone: '03355329722',
    whatsapp: '03355329722',
    address: 'Street 4, Peshawar',
    city: 'Peshawar',
    postalCode: '25000',
    paymentMethod: 'installments',
    planId: 'plan-2m',
    referralCode: sellerCode,
  });

  assert.equal(instOrder.status, 'pending');
  assert.equal(instOrder.totalAmount, Math.round(SEED_PRODUCTS[0].price * 1.15));
  assert.equal(instOrder.installmentSchedule.length, 2);
  assert.equal(instOrder.commissionCredited, false);

  // Admin status transitions: invalid token rejected, valid token transitions pending -> proceeding -> complete
  await assert.rejects(
    () => mockAdapter.adminService.updateOrderStatus('invalid', instOrder.id, 'proceeding'),
    /Admin session expired/
  );

  const adminToken = 'header.sig';
  const proceeding = await mockAdapter.adminService.updateOrderStatus(
    adminToken,
    instOrder.id,
    'proceeding'
  );
  assert.equal(proceeding.status, 'proceeding');
  assert.equal(proceeding.commissionCredited, false);

  const completed = await mockAdapter.adminService.updateOrderStatus(
    adminToken,
    instOrder.id,
    'complete'
  );
  assert.equal(completed.status, 'complete');
  assert.equal(completed.commissionCredited, true);
  assert.equal(completed.commissionAmount, Math.round(instOrder.totalAmount * 0.1));

  // Admin installment payment mark paid updates recovery progress
  const afterPay1 = await mockAdapter.adminService.toggleInstallmentPayment(
    adminToken,
    instOrder.id,
    1,
    true,
    false
  );
  const summary = calculateOrderPaidSummary(afterPay1);
  assert.ok(summary.paidAmount > 0);
  assert.equal(summary.paidAmount + summary.remainingAmount, afterPay1.totalAmount);
});
