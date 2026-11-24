import {
  DEFAULT_TERMS_POLICY,
  SEED_CATEGORIES,
  SEED_FEEDBACK,
  SEED_INSTALLMENT_PLANS,
  SEED_NOTIFICATIONS,
  SEED_ORDERS,
  SEED_PRODUCTS,
  SEED_USERS,
} from '../seedData';
import type {
  AuthSession,
  BackendApi,
  Category,
  CreateOrderPayload,
  FeedbackThread,
  InstallmentPlan,
  LoginPayload,
  ManualDashboardEntry,
  NotificationItem,
  Order,
  OrderStatus,
  Product,
  SignupPayload,
  TermsPolicyDocument,
  User,
} from '../types';
import {
  calculateAdminAnalytics,
  calculateCommission,
  calculateInstallmentPlan,
  calculateOrderPaidSummary,
  generateSellerId,
  slugify,
} from '../../utils/commerce';
import { httpRequest } from '../httpClient';
import { processSecureImageUpload } from '../../utils/fileSecurity';
import { sanitizePlainText, validateSafeSlug } from '../../utils/security';

const STORAGE_KEY = 'ca_mock_store_v3';

// Auth sessions and credential hashes are NEVER persisted to localStorage
let memorySession: AuthSession | null = null;
const memoryCredentials = new Map<string, { salt: string; hash: string }>();
const processedIdempotencyKeys = new Map<string, Order>();

async function sha256Hex(value: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return value;
}

function randomHex(len = 16): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return Math.random().toString(36).slice(2);
}

interface MockState {
  categories: Category[];
  products: Product[];
  plans: InstallmentPlan[];
  users: User[];
  orders: Order[];
  notifications: NotificationItem[];
  feedback: FeedbackThread[];
  manualEntries: ManualDashboardEntry[];
  termsPolicy: TermsPolicyDocument;
}

function scrubUser(raw: User & { password?: string }): User {
  const { password: _discarded, ...safe } = raw;
  return safe;
}

function loadState(): MockState {
  try {
    // Scrub any legacy mock session key from localStorage
    localStorage.removeItem('ca_mock_session_v1');
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MockState>;
      if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.orders)) {
        return {
          categories: Array.isArray(parsed.categories) ? parsed.categories : [...SEED_CATEGORIES],
          products: parsed.products,
          plans: Array.isArray(parsed.plans) ? parsed.plans : [...SEED_INSTALLMENT_PLANS],
          users: Array.isArray(parsed.users)
            ? parsed.users.map((u) => scrubUser(u as User & { password?: string }))
            : [],
          orders: parsed.orders,
          notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
          feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
          manualEntries: Array.isArray(parsed.manualEntries) ? parsed.manualEntries : [],
          termsPolicy: parsed.termsPolicy?.title ? parsed.termsPolicy : { ...DEFAULT_TERMS_POLICY },
        };
      }
    }
  } catch {
    // fallback to seed
  }
  const initial: MockState = {
    categories: [...SEED_CATEGORIES],
    products: [...SEED_PRODUCTS],
    plans: [...SEED_INSTALLMENT_PLANS],
    users: SEED_USERS.map((u) => scrubUser(u)),
    orders: [...SEED_ORDERS],
    notifications: [...SEED_NOTIFICATIONS],
    feedback: [...SEED_FEEDBACK],
    manualEntries: [],
    termsPolicy: { ...DEFAULT_TERMS_POLICY },
  };
  saveState(initial);
  return initial;
}

function saveState(state: MockState) {
  try {
    // Never write user passwords to localStorage
    const cleanState: MockState = {
      ...state,
      users: state.users.map((u) => scrubUser(u as User & { password?: string })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanState));
  } catch {
    // ignore storage quota
  }
}

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

function assertAdminTokenFormat(adminToken: string) {
  if (!adminToken || adminToken.split('.').length !== 2) {
    throw new Error('Admin session expired. Press Ctrl+Shift+A to authenticate.');
  }
}

export const mockAdapter: BackendApi = {
  mode: 'mock',

  authService: {
    async getSession() {
      if (!memorySession) return null;
      const state = loadState();
      const fresh = state.users.find((u) => u.id === memorySession?.user.id);
      if (!fresh) {
        memorySession = null;
        return null;
      }
      return { user: scrubUser(fresh), token: memorySession.token };
    },

    async login(payload: LoginPayload) {
      await delay();
      if (payload.honeypot && payload.honeypot.trim().length > 0) {
        throw new Error('Request blocked by spam protection.');
      }
      const state = loadState();
      const email = sanitizePlainText(payload.email, 120).toLowerCase();
      const found = state.users.find((u) => u.email.toLowerCase() === email);
      const cred = found ? memoryCredentials.get(found.id) : undefined;
      if (!found || !cred) {
        throw new Error('Invalid email or password.');
      }
      const candidateHash = await sha256Hex(`${cred.salt}:${payload.password}`);
      if (candidateHash !== cred.hash) {
        throw new Error('Invalid email or password.');
      }
      const safeUser = scrubUser(found);
      const session: AuthSession = { user: safeUser, token: `mem-${randomHex(16)}` };
      memorySession = session;
      return session;
    },

    async signup(payload: SignupPayload) {
      await delay();
      if (payload.honeypot && payload.honeypot.trim().length > 0) {
        throw new Error('Request blocked by spam protection.');
      }
      const state = loadState();
      const email = sanitizePlainText(payload.email, 120).toLowerCase();
      if (state.users.some((u) => u.email.toLowerCase() === email)) {
        throw new Error('An account with this email already exists.');
      }
      if (!payload.password || payload.password.length < 8) {
        throw new Error('Password must be at least 8 characters.');
      }

      let sellerCode: string | undefined;
      if (payload.role === 'seller') {
        do {
          sellerCode = generateSellerId('CA');
        } while (state.users.some((u) => u.sellerCode === sellerCode));
      }

      const id = `usr-${randomHex(6)}`;
      const salt = randomHex(12);
      const hash = await sha256Hex(`${salt}:${payload.password}`);
      memoryCredentials.set(id, { salt, hash });

      const created: User = {
        id,
        role: payload.role,
        name: sanitizePlainText(payload.name, 80),
        email,
        phone: payload.role === 'seller' ? sanitizePlainText(payload.phone, 24) : undefined,
        whatsapp: payload.role === 'seller' ? sanitizePlainText(payload.whatsapp, 24) : undefined,
        address: payload.role === 'seller' ? sanitizePlainText(payload.address, 200) : undefined,
        city: payload.role === 'seller' ? sanitizePlainText(payload.city || 'Peshawar', 60) : 'Peshawar',
        postalCode: payload.role === 'seller' ? sanitizePlainText(payload.postalCode, 16) : undefined,
        fatherName: payload.role === 'seller' ? sanitizePlainText(payload.fatherName, 80) : undefined,
        avatarUrl: payload.role === 'seller' ? payload.avatarUrl : undefined,
        sellerCode,
        isActiveSeller: payload.role === 'seller',
        createdAt: new Date().toISOString(),
      };

      state.users.push(created);
      saveState(state);
      const session: AuthSession = { user: created, token: `mem-${randomHex(16)}` };
      memorySession = session;
      return session;
    },

    async requestPasswordReset(email: string) {
      await delay();
      if (!email.includes('@')) throw new Error('Enter a valid email address.');
      return {
        message: 'If an account matches that address, recovery instructions have been sent.',
      };
    },

    async logout() {
      memorySession = null;
    },
  },

  productService: {
    async listProducts(params) {
      await delay(80);
      const state = loadState();
      let list = state.products.map(({ costPrice: _hidden, ...pub }) => pub);
      if (params?.categoryId && params.categoryId !== 'all') {
        list = list.filter((p) => p.categoryId === params.categoryId);
      }
      if (params?.search) {
        const q = sanitizePlainText(params.search, 80).toLowerCase();
        list = list.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.categoryName.toLowerCase().includes(q)
        );
      }
      if (params?.sort === 'price_asc') list.sort((a, b) => a.price - b.price);
      else if (params?.sort === 'price_desc') list.sort((a, b) => b.price - a.price);
      else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      if (params?.page && params?.limit) {
        const start = Math.max(0, (params.page - 1) * params.limit);
        return list.slice(start, start + params.limit);
      }
      return list;
    },

    async getProductBySlug(slug: string) {
      await delay(60);
      if (!validateSafeSlug(slug)) return null;
      const state = loadState();
      const found = state.products.find((p) => p.slug === slug);
      if (!found) return null;
      const { costPrice: _hidden, ...pub } = found;
      return pub;
    },

    async listCategories() {
      return loadState().categories;
    },

    async listInstallmentPlans() {
      return loadState().plans.filter((p) => p.active);
    },

    async getTermsPolicy() {
      return loadState().termsPolicy;
    },
  },

  orderService: {
    async validateSellerReferral(code: string) {
      await delay(60);
      const clean = sanitizePlainText(code, 20).toUpperCase();
      if (!clean || !/^CA-[A-Z0-9]{4,12}$/.test(clean)) return { valid: false };
      const state = loadState();
      const seller = state.users.find(
        (u) => u.role === 'seller' && u.isActiveSeller && u.sellerCode?.toUpperCase() === clean
      );
      if (!seller) return { valid: false };
      return { valid: true, sellerId: seller.id, sellerName: seller.name };
    },

    async createOrder(payload: CreateOrderPayload) {
      await delay(140);
      if (payload.honeypot && payload.honeypot.trim().length > 0) {
        throw new Error('Request blocked by spam protection.');
      }
      if (payload.idempotencyKey && processedIdempotencyKeys.has(payload.idempotencyKey)) {
        return processedIdempotencyKeys.get(payload.idempotencyKey)!;
      }

      const state = loadState();
      const session = memorySession;

      const cleanRef = sanitizePlainText(payload.referralCode || '', 20).toUpperCase();
      let seller: User | undefined;
      if (cleanRef) {
        seller = state.users.find(
          (u) => u.role === 'seller' && u.isActiveSeller && u.sellerCode?.toUpperCase() === cleanRef
        );
      }
      if (payload.paymentMethod === 'installments' && !seller) {
        throw new Error('Installment orders require an active Seller Referral ID.');
      }

      // Always recompute product prices from catalog records
      const catalogMap = new Map(state.products.map((p) => [p.id, p]));
      const safeItems = payload.items.map((item) => {
        const prod = catalogMap.get(item.productId);
        return {
          ...item,
          title: prod ? prod.title : sanitizePlainText(item.title, 120),
          unitPrice: prod ? prod.price : Math.max(0, item.unitPrice),
          quantity: Math.min(20, Math.max(1, Math.floor(item.quantity))),
          selectedSize: item.selectedSize ? sanitizePlainText(item.selectedSize, 32) : undefined,
        };
      });

      const subtotal = safeItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      if (subtotal <= 0) {
        throw new Error('Order total must be greater than PKR 0.');
      }

      let advanceAmount = 0;
      let monthlyAmount = 0;
      let totalAmount = subtotal;
      let installmentSchedule: Order['installmentSchedule'] = [];
      let planLabel: string | undefined;

      if (payload.paymentMethod === 'installments') {
        const plan =
          state.plans.find((p) => p.id === payload.planId && p.active) || state.plans[0];
        const calc = calculateInstallmentPlan(subtotal, 1, plan);
        advanceAmount = calc.advanceAmount;
        monthlyAmount = calc.monthlyAmount;
        totalAmount = calc.totalPayable;
        installmentSchedule = calc.schedule;
        planLabel = plan.label;
      }

      const order: Order = {
        id: `CA-ORD-${Math.floor(1045 + Math.random() * 8900)}`,
        userId: session?.user.id || 'guest',
        customerName: sanitizePlainText(payload.customerName, 80),
        phone: sanitizePlainText(payload.phone, 24),
        whatsapp: sanitizePlainText(payload.whatsapp, 24),
        address: sanitizePlainText(payload.address, 200),
        city: sanitizePlainText(payload.city, 60),
        postalCode: sanitizePlainText(payload.postalCode, 16),
        notes: sanitizePlainText(payload.notes || '', 300),
        items: safeItems,
        paymentMethod: payload.paymentMethod,
        planId: payload.planId,
        planLabel,
        advanceAmount,
        advancePaid: false,
        monthlyAmount,
        totalAmount,
        installmentSchedule,
        referralCode: seller?.sellerCode,
        referralSellerId: seller?.id,
        commissionAmount: seller ? calculateCommission(totalAmount) : 0,
        commissionCredited: false,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      state.orders.unshift(order);
      saveState(state);
      if (payload.idempotencyKey) {
        processedIdempotencyKeys.set(payload.idempotencyKey, order);
      }
      return order;
    },

    async listMyOrders() {
      await delay(80);
      const session = memorySession;
      const state = loadState();
      if (!session) return [];
      return state.orders.filter((o) => o.userId === session.user.id);
    },
  },

  userService: {
    async updateProfile(patch) {
      await delay(100);
      const session = memorySession;
      if (!session) throw new Error('Sign in required.');
      const state = loadState();
      const idx = state.users.findIndex((u) => u.id === session.user.id);
      if (idx === -1) throw new Error('User not found.');
      const updated: User = {
        ...state.users[idx],
        name: patch.name ? sanitizePlainText(patch.name, 80) : state.users[idx].name,
        phone: patch.phone !== undefined ? sanitizePlainText(patch.phone, 24) : state.users[idx].phone,
        whatsapp:
          patch.whatsapp !== undefined ? sanitizePlainText(patch.whatsapp, 24) : state.users[idx].whatsapp,
        address:
          patch.address !== undefined ? sanitizePlainText(patch.address, 200) : state.users[idx].address,
        city: patch.city !== undefined ? sanitizePlainText(patch.city, 60) : state.users[idx].city,
        postalCode:
          patch.postalCode !== undefined
            ? sanitizePlainText(patch.postalCode, 16)
            : state.users[idx].postalCode,
        avatarUrl: patch.avatarUrl !== undefined ? patch.avatarUrl : state.users[idx].avatarUrl,
      };
      state.users[idx] = updated;
      saveState(state);
      memorySession = { ...session, user: updated };
      return updated;
    },

    async deleteAccount(confirmationEmail: string) {
      await delay(120);
      const session = memorySession;
      if (!session) throw new Error('Sign in required.');
      if (confirmationEmail.trim().toLowerCase() !== session.user.email.toLowerCase()) {
        throw new Error('Confirmation email does not match your account email.');
      }
      const state = loadState();
      state.users = state.users.filter((u) => u.id !== session.user.id);
      memoryCredentials.delete(session.user.id);
      saveState(state);
      memorySession = null;
    },

    async getSellerDashboard() {
      await delay(90);
      const session = memorySession;
      if (!session || session.user.role !== 'seller' || !session.user.sellerCode) {
        throw new Error('Seller account required.');
      }
      const state = loadState();
      const referredOrders = state.orders.filter((o) => o.referralSellerId === session.user.id);
      const commissionEarned = referredOrders
        .filter((o) => o.status === 'complete' && o.commissionCredited)
        .reduce((s, o) => s + o.commissionAmount, 0);
      const pendingCommission = referredOrders
        .filter((o) => o.status === 'pending' || o.status === 'proceeding')
        .reduce((s, o) => s + o.commissionAmount, 0);

      let totalFinanced = 0;
      let totalRecovered = 0;
      for (const ord of referredOrders.filter(
        (o) => o.paymentMethod === 'installments' && o.status !== 'rejected'
      )) {
        const sum = calculateOrderPaidSummary(ord);
        totalFinanced += ord.totalAmount;
        totalRecovered += sum.paidAmount;
      }

      const monthMap = new Map<string, { commission: number; orders: number }>();
      for (const ord of referredOrders.filter((o) => o.status === 'complete')) {
        const m = ord.createdAt.slice(0, 7);
        const prev = monthMap.get(m) || { commission: 0, orders: 0 };
        prev.commission += ord.commissionAmount;
        prev.orders += 1;
        monthMap.set(m, prev);
      }

      return {
        sellerCode: session.user.sellerCode,
        totalReferrals: referredOrders.length,
        completedReferrals: referredOrders.filter((o) => o.status === 'complete').length,
        commissionEarned,
        pendingCommission,
        referredOrders,
        recoverySummary: {
          totalFinanced,
          totalRecovered,
          totalRemaining: Math.max(0, totalFinanced - totalRecovered),
        },
        ownInstallmentOrders: state.orders.filter(
          (o) => o.userId === session.user.id && o.paymentMethod === 'installments'
        ),
        monthlyEarnings: Array.from(monthMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, data]) => ({ month, ...data })),
      };
    },
  },

  notificationService: {
    async listNotifications() {
      const session = memorySession;
      if (!session) return [];
      const state = loadState();
      return state.notifications.filter((n) => n.userId === null || n.userId === session.user.id);
    },

    async markAsRead(id: string) {
      const state = loadState();
      const target = state.notifications.find((n) => n.id === id);
      if (target) {
        target.read = true;
        saveState(state);
      }
    },

    async markAllRead() {
      const session = memorySession;
      if (!session) return;
      const state = loadState();
      state.notifications.forEach((n) => {
        if (n.userId === null || n.userId === session.user.id) n.read = true;
      });
      saveState(state);
    },
  },

  feedbackService: {
    async listMyThreads() {
      const session = memorySession;
      if (!session) return [];
      return loadState().feedback.filter((t) => t.userId === session.user.id);
    },

    async createThread(subject: string, message: string) {
      await delay();
      const session = memorySession;
      if (!session) throw new Error('Sign in required.');
      const state = loadState();
      const thread: FeedbackThread = {
        id: `fb-${Date.now().toString(36)}`,
        userId: session.user.id,
        userName: session.user.name,
        userEmail: session.user.email,
        subject: sanitizePlainText(subject, 120),
        status: 'open',
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: `msg-${Date.now().toString(36)}`,
            senderRole: 'user',
            senderName: session.user.name,
            body: sanitizePlainText(message, 800),
            createdAt: new Date().toISOString(),
          },
        ],
      };
      state.feedback.unshift(thread);
      saveState(state);
      return thread;
    },

    async replyToThread(threadId: string, body: string) {
      await delay();
      const session = memorySession;
      if (!session) throw new Error('Sign in required.');
      const state = loadState();
      const thread = state.feedback.find((t) => t.id === threadId && t.userId === session.user.id);
      if (!thread) throw new Error('Thread not found.');
      thread.messages.push({
        id: `msg-${Date.now().toString(36)}`,
        senderRole: 'user',
        senderName: session.user.name,
        body: sanitizePlainText(body, 800),
        createdAt: new Date().toISOString(),
      });
      thread.status = 'open';
      thread.updatedAt = new Date().toISOString();
      saveState(state);
      return thread;
    },
  },

  adminService: {
    async getAuthStatus() {
      return httpRequest<{ configured: boolean }>('/api/admin/status');
    },

    async setupInitialPassword(password: string) {
      return httpRequest<{ token: string }>('/api/admin/setup', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
    },

    async verifyAdminPassword(password: string) {
      return httpRequest<{ token: string }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
    },

    async getOverview(adminToken: string) {
      assertAdminTokenFormat(adminToken);
      const state = loadState();
      return calculateAdminAnalytics(state.orders, state.products, state.manualEntries);
    },

    async listManualEntries(adminToken: string) {
      assertAdminTokenFormat(adminToken);
      return loadState().manualEntries;
    },

    async addManualEntry(adminToken: string, entry) {
      assertAdminTokenFormat(adminToken);
      const label = sanitizePlainText(entry.label || '', 120);
      if (!label) throw new Error('Entry label is required.');
      const state = loadState();
      const created: ManualDashboardEntry = {
        id: `man-${Date.now().toString(36)}`,
        date: sanitizePlainText(entry.date || new Date().toISOString().slice(0, 10), 10),
        label,
        revenue: Math.max(0, Number(entry.revenue) || 0),
        costOfGoods: Math.max(0, Number(entry.costOfGoods) || 0),
        commissionAmount: Math.max(0, Number(entry.commissionAmount) || 0),
        ordersCount: Math.max(1, Math.floor(Number(entry.ordersCount) || 1)),
        notes: entry.notes ? sanitizePlainText(entry.notes, 240) : undefined,
        createdAt: new Date().toISOString(),
      };
      state.manualEntries.unshift(created);
      saveState(state);
      return created;
    },

    async deleteManualEntry(adminToken: string, entryId: string) {
      assertAdminTokenFormat(adminToken);
      const state = loadState();
      state.manualEntries = state.manualEntries.filter((m) => m.id !== entryId);
      saveState(state);
    },

    async listAllOrders(adminToken: string) {
      assertAdminTokenFormat(adminToken);
      return loadState().orders;
    },

    async updateOrderStatus(adminToken: string, orderId: string, status: OrderStatus) {
      assertAdminTokenFormat(adminToken);
      const state = loadState();
      const order = state.orders.find((o) => o.id === orderId);
      if (!order) throw new Error('Order not found.');
      order.status = status;
      if (status === 'complete' && order.referralSellerId && !order.commissionCredited) {
        order.commissionAmount = calculateCommission(order.totalAmount);
        order.commissionCredited = true;
        state.notifications.unshift({
          id: `notif-${Date.now().toString(36)}`,
          userId: order.referralSellerId,
          title: '10% Referral Commission Credited',
          message: `Order ${order.id} completed. PKR ${order.commissionAmount.toLocaleString('en-PK')} commission credited.`,
          kind: 'commission',
          read: false,
          createdAt: new Date().toISOString(),
        });
      } else if (status !== 'complete') {
        order.commissionCredited = false;
      }
      saveState(state);
      return order;
    },

    async toggleInstallmentPayment(
      adminToken: string,
      orderId: string,
      installmentNumber: number,
      paid: boolean,
      isAdvance = false
    ) {
      assertAdminTokenFormat(adminToken);
      const state = loadState();
      const order = state.orders.find((o) => o.id === orderId);
      if (!order) throw new Error('Order not found.');
      if (isAdvance) {
        order.advancePaid = paid;
      } else {
        const row = order.installmentSchedule.find(
          (i) => i.installmentNumber === installmentNumber
        );
        if (row) {
          row.paid = paid;
          row.paidAt = paid ? new Date().toISOString().slice(0, 10) : null;
        }
      }
      saveState(state);
      return order;
    },

    async listAllUsers(adminToken: string) {
      assertAdminTokenFormat(adminToken);
      return loadState().users.map((u) => scrubUser(u));
    },

    async sendNotification(adminToken: string, payload) {
      assertAdminTokenFormat(adminToken);
      if (payload.targetUserId !== null && !payload.targetUserId.trim()) {
        throw new Error('Please select a specific user for a private notification.');
      }
      const state = loadState();
      state.notifications.unshift({
        id: `notif-${Date.now().toString(36)}`,
        userId: payload.targetUserId,
        title: sanitizePlainText(payload.title, 120),
        message: sanitizePlainText(payload.message, 800),
        kind: 'broadcast',
        read: false,
        createdAt: new Date().toISOString(),
      });
      saveState(state);
    },

    async listFeedbackThreads(adminToken: string) {
      assertAdminTokenFormat(adminToken);
      return loadState().feedback;
    },

    async replyFeedbackThread(adminToken: string, threadId: string, body: string) {
      assertAdminTokenFormat(adminToken);
      const state = loadState();
      const thread = state.feedback.find((t) => t.id === threadId);
      if (!thread) throw new Error('Thread not found.');
      if (!thread.userId) throw new Error('Cannot reply: feedback sender account is missing.');
      const cleanBody = sanitizePlainText(body, 800);
      thread.messages.push({
        id: `msg-${Date.now().toString(36)}`,
        senderRole: 'admin',
        senderName: 'CA Admin',
        body: cleanBody,
        createdAt: new Date().toISOString(),
      });
      thread.status = 'replied';
      thread.updatedAt = new Date().toISOString();

      state.notifications.unshift({
        id: `notif-${Date.now().toString(36)}`,
        userId: thread.userId,
        title: `Reply: ${thread.subject}`,
        message: cleanBody,
        kind: 'feedback_reply',
        relatedFeedbackId: thread.id,
        read: false,
        createdAt: new Date().toISOString(),
      });
      saveState(state);
      return { ...thread, messages: [...thread.messages] };
    },

    async listAdminProducts(adminToken: string) {
      assertAdminTokenFormat(adminToken);
      return loadState().products;
    },

    async saveProduct(adminToken: string, product) {
      assertAdminTokenFormat(adminToken);
      const state = loadState();
      const category =
        state.categories.find((c) => c.id === product.categoryId) || state.categories[0];

      if (product.id) {
        const existing = state.products.find((p) => p.id === product.id);
        if (!existing) throw new Error('Product not found.');
        existing.title = sanitizePlainText(product.title, 120);
        existing.price = Math.max(0, Number(product.price));
        existing.costPrice = Math.max(
          0,
          Number(product.costPrice ?? existing.costPrice ?? Math.round(existing.price * 0.55))
        );
        existing.description = sanitizePlainText(product.description ?? existing.description, 1200);
        existing.categoryId = category.id;
        existing.categoryName = category.name;
        if (product.coverImage) existing.coverImage = product.coverImage;
        if (product.extraImages) existing.extraImages = product.extraImages;
        if (product.inStock !== undefined) existing.inStock = product.inStock;
        saveState(state);
        return existing;
      }

      const created: Product = {
        id: `prod-${Date.now().toString(36)}`,
        slug: `${slugify(product.title)}-${Math.floor(100 + Math.random() * 900)}`,
        title: sanitizePlainText(product.title, 120),
        description: sanitizePlainText(product.description || '', 1200),
        price: Math.max(0, Number(product.price)),
        costPrice: Math.max(0, Number(product.costPrice ?? Math.round(product.price * 0.55))),
        categoryId: category.id,
        categoryName: category.name,
        coverImage:
          product.coverImage || '/src/assets/images/cotton_dress_shirt_1795333237089.jpg',
        extraImages: product.extraImages || [],
        sizes: ['S', 'M', 'L', 'XL'],
        inStock: true,
        featured: Boolean(product.featured),
        createdAt: new Date().toISOString(),
      };
      state.products.unshift(created);
      saveState(state);
      return created;
    },

    async deleteProduct(adminToken: string, productId: string) {
      assertAdminTokenFormat(adminToken);
      const state = loadState();
      state.products = state.products.filter((p) => p.id !== productId);
      saveState(state);
    },

    async saveCategory(adminToken: string, category) {
      assertAdminTokenFormat(adminToken);
      const state = loadState();
      const created: Category = {
        id: `cat-${slugify(category.name)}-${Math.floor(10 + Math.random() * 90)}`,
        name: sanitizePlainText(category.name, 60),
        slug: slugify(category.name),
        description: sanitizePlainText(category.description || `${category.name} collection`, 200),
        image:
          category.image || '/src/assets/images/cotton_dress_shirt_1795333237089.jpg',
      };
      state.categories.push(created);
      saveState(state);
      return created;
    },

    async saveInstallmentPlans(adminToken: string, plans) {
      assertAdminTokenFormat(adminToken);
      const state = loadState();
      state.plans = plans.map((p) => ({
        id: p.id || `plan-${Math.max(1, Number(p.months) || 2)}m-${Date.now().toString(36)}`,
        label: sanitizePlainText(p.label || `${p.months} Months`, 40),
        months: Math.max(1, Math.min(36, Number(p.months ?? 2))),
        advancePercent: Math.max(0, Math.min(90, Number(p.advancePercent ?? 0))),
        markupPercent: Math.max(0, Math.min(200, Number(p.markupPercent ?? 0))),
        active: Boolean(p.active),
      }));
      saveState(state);
      return state.plans;
    },

    async saveTermsPolicy(adminToken: string, doc) {
      assertAdminTokenFormat(adminToken);
      const state = loadState();
      const cleanSections = (doc.sections || [])
        .map((sec, idx) => ({
          id: sec.id || `sec-${idx + 1}`,
          heading: sanitizePlainText(sec.heading || '', 160),
          body: sanitizePlainText(sec.body || '', 2500),
        }))
        .filter((sec) => sec.heading && sec.body);
      state.termsPolicy = {
        effectiveLabel: sanitizePlainText(doc.effectiveLabel || 'Peshawar, Pakistan · Effective 2026', 120),
        title: sanitizePlainText(doc.title || 'Terms of Service & Installment Rules', 160),
        sections: cleanSections,
        footerNote: sanitizePlainText(doc.footerNote || '', 300),
        updatedAt: new Date().toISOString(),
      };
      saveState(state);
      return state.termsPolicy;
    },
  },

  storageService: {
    async uploadImage(file: File, folder: 'products' | 'avatars') {
      const { dataUrl } = await processSecureImageUpload(file, folder);
      return dataUrl;
    },
  },
};
