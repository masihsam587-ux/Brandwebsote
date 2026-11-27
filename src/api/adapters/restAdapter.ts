import type {
  AdminOverview,
  AuthSession,
  BackendApi,
  Category,
  FeedbackThread,
  InstallmentPlan,
  ManualDashboardEntry,
  NotificationItem,
  Order,
  OrderStatus,
  Product,
  SellerDashboardData,
  TermsPolicyDocument,
  User,
} from '../types';
import { httpRequest } from '../httpClient';
import { processSecureImageUpload } from '../../utils/fileSecurity';
import { createIdempotencyKey, validateSafeSlug } from '../../utils/security';

// User session token held strictly in memory (or backend httpOnly cookies via credentials: 'include')
let memoryUserToken: string | null = null;
let memorySession: AuthSession | null = null;

export const restAdapter: BackendApi = {
  mode: 'rest',

  authService: {
    async getSession() {
      if (memorySession) return memorySession;
      try {
        // Supports httpOnly cookie-based sessions across reloads when backend sets cookies
        const session = await httpRequest<AuthSession>('/api/auth/session', { retries: 0 });
        if (session?.user) {
          memorySession = session;
          if (session.token) memoryUserToken = session.token;
          return session;
        }
      } catch {
        // No active cookie session
      }
      return null;
    },
    async login(payload) {
      if (payload.honeypot && payload.honeypot.trim().length > 0) {
        throw new Error('Request blocked by spam verification.');
      }
      const session = await httpRequest<AuthSession>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      memoryUserToken = session.token;
      memorySession = session;
      return session;
    },
    async signup(payload) {
      if (payload.honeypot && payload.honeypot.trim().length > 0) {
        throw new Error('Request blocked by spam verification.');
      }
      const session = await httpRequest<AuthSession>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      memoryUserToken = session.token;
      memorySession = session;
      return session;
    },
    async requestPasswordReset(email) {
      return httpRequest<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },
    async updatePassword(newPassword) {
      return httpRequest<{ message: string }>('/api/auth/update-password', {
        method: 'POST',
        token: memoryUserToken,
        body: JSON.stringify({ password: newPassword }),
      });
    },
    async logout() {
      try {
        await httpRequest('/api/auth/logout', {
          method: 'POST',
          token: memoryUserToken,
        });
      } catch {
        // Clear local memory even if offline
      } finally {
        memoryUserToken = null;
        memorySession = null;
      }
    },
  },

  productService: {
    async listProducts(params) {
      const qs = new URLSearchParams();
      if (params?.categoryId) qs.set('categoryId', params.categoryId);
      if (params?.search) qs.set('search', params.search.slice(0, 80));
      if (params?.sort) qs.set('sort', params.sort);
      if (params?.page) qs.set('page', String(params.page));
      if (params?.limit) qs.set('limit', String(params.limit));
      const query = qs.toString();
      return httpRequest<Product[]>(`/api/products${query ? `?${query}` : ''}`);
    },
    async getProductBySlug(slug) {
      if (!validateSafeSlug(slug)) return null;
      try {
        return await httpRequest<Product>(`/api/products/${encodeURIComponent(slug)}`);
      } catch {
        return null;
      }
    },
    async listCategories() {
      return httpRequest<Category[]>('/api/categories');
    },
    async listInstallmentPlans() {
      return httpRequest<InstallmentPlan[]>('/api/installment-plans');
    },
    async getTermsPolicy() {
      return httpRequest<TermsPolicyDocument>('/api/terms');
    },
  },

  orderService: {
    async validateSellerReferral(code) {
      const clean = code.trim().toUpperCase();
      if (!clean || !/^CA-[A-Z0-9]{4,12}$/.test(clean)) return { valid: false };
      return httpRequest<{ valid: boolean; sellerId?: string; sellerName?: string }>(
        `/api/sellers/validate/${encodeURIComponent(clean)}`
      );
    },
    async createOrder(payload) {
      if (payload.honeypot && payload.honeypot.trim().length > 0) {
        throw new Error('Request blocked by spam verification.');
      }
      const idempotencyKey = payload.idempotencyKey || createIdempotencyKey('ord');
      return httpRequest<Order>('/api/orders', {
        method: 'POST',
        token: memoryUserToken,
        idempotencyKey,
        body: JSON.stringify({ ...payload, idempotencyKey }),
      });
    },
    async listMyOrders() {
      if (!memoryUserToken && !memorySession) return [];
      return httpRequest<Order[]>('/api/orders/mine', { token: memoryUserToken });
    },
  },

  userService: {
    async updateProfile(patch) {
      const user = await httpRequest<User>('/api/user/profile', {
        method: 'PATCH',
        token: memoryUserToken,
        body: JSON.stringify(patch),
      });
      if (memorySession) memorySession = { ...memorySession, user };
      return user;
    },
    async deleteAccount(confirmationEmail) {
      await httpRequest<{ ok: boolean }>('/api/user/account', {
        method: 'DELETE',
        token: memoryUserToken,
        body: JSON.stringify({ confirmationEmail }),
      });
      memoryUserToken = null;
      memorySession = null;
    },
    async getSellerDashboard() {
      return httpRequest<SellerDashboardData>('/api/user/seller-dashboard', {
        token: memoryUserToken,
      });
    },
  },

  notificationService: {
    async listNotifications() {
      if (!memoryUserToken && !memorySession) return [];
      return httpRequest<NotificationItem[]>('/api/notifications', { token: memoryUserToken });
    },
    async markAsRead(id) {
      await httpRequest<{ ok: boolean }>(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: 'POST',
        token: memoryUserToken,
      });
    },
    async markAllRead() {
      const list = await this.listNotifications();
      await Promise.all(list.filter((n) => !n.read).map((n) => this.markAsRead(n.id)));
    },
  },

  feedbackService: {
    async listMyThreads() {
      if (!memoryUserToken && !memorySession) return [];
      return httpRequest<FeedbackThread[]>('/api/feedback', { token: memoryUserToken });
    },
    async createThread(subject, message) {
      return httpRequest<FeedbackThread>('/api/feedback', {
        method: 'POST',
        token: memoryUserToken,
        body: JSON.stringify({ subject, message }),
      });
    },
    async replyToThread(threadId, body) {
      return httpRequest<FeedbackThread>(`/api/feedback/${encodeURIComponent(threadId)}/reply`, {
        method: 'POST',
        token: memoryUserToken,
        body: JSON.stringify({ body }),
      });
    },
  },

  adminService: {
    async getAuthStatus() {
      return httpRequest<{ configured: boolean }>('/api/admin/status', { token: null });
    },
    async setupInitialPassword(password) {
      return httpRequest<{ token: string }>('/api/admin/setup', {
        method: 'POST',
        token: null,
        body: JSON.stringify({ password }),
      });
    },
    async verifyAdminPassword(password) {
      return httpRequest<{ token: string }>('/api/admin/login', {
        method: 'POST',
        token: null,
        body: JSON.stringify({ password }),
      });
    },
    async getOverview(adminToken) {
      return httpRequest<AdminOverview>('/api/admin/overview', { token: adminToken });
    },
    async listManualEntries(adminToken) {
      return httpRequest<ManualDashboardEntry[]>('/api/admin/manual-entries', { token: adminToken });
    },
    async addManualEntry(adminToken, entry) {
      return httpRequest<ManualDashboardEntry>('/api/admin/manual-entries', {
        method: 'POST',
        token: adminToken,
        body: JSON.stringify(entry),
      });
    },
    async deleteManualEntry(adminToken, entryId) {
      await httpRequest<{ ok: boolean }>(`/api/admin/manual-entries/${encodeURIComponent(entryId)}`, {
        method: 'DELETE',
        token: adminToken,
      });
    },
    async listAllOrders(adminToken) {
      return httpRequest<Order[]>('/api/admin/orders', { token: adminToken });
    },
    async updateOrderStatus(adminToken, orderId, status: OrderStatus) {
      return httpRequest<Order>(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        token: adminToken,
        body: JSON.stringify({ status }),
      });
    },
    async toggleInstallmentPayment(adminToken, orderId, installmentNumber, paid, isAdvance) {
      return httpRequest<Order>(`/api/admin/orders/${encodeURIComponent(orderId)}/installments`, {
        method: 'PATCH',
        token: adminToken,
        body: JSON.stringify({ installmentNumber, paid, isAdvance }),
      });
    },
    async listAllUsers(adminToken) {
      return httpRequest<User[]>('/api/admin/users', { token: adminToken });
    },
    async sendNotification(adminToken, payload) {
      await httpRequest<{ ok: boolean }>('/api/admin/notifications', {
        method: 'POST',
        token: adminToken,
        body: JSON.stringify(payload),
      });
    },
    async listFeedbackThreads(adminToken) {
      return httpRequest<FeedbackThread[]>('/api/admin/feedback', { token: adminToken });
    },
    async replyFeedbackThread(adminToken, threadId, body) {
      return httpRequest<FeedbackThread>(`/api/admin/feedback/${encodeURIComponent(threadId)}/reply`, {
        method: 'POST',
        token: adminToken,
        body: JSON.stringify({ body }),
      });
    },
    async listAdminProducts(adminToken) {
      return httpRequest<Product[]>('/api/admin/products', { token: adminToken });
    },
    async saveProduct(adminToken, product) {
      return httpRequest<Product>('/api/admin/products', {
        method: 'POST',
        token: adminToken,
        body: JSON.stringify(product),
      });
    },
    async deleteProduct(adminToken, productId) {
      const res = await httpRequest<{ ok: boolean; outcome?: 'deleted' | 'archived' }>(
        `/api/admin/products/${encodeURIComponent(productId)}`,
        {
          method: 'DELETE',
          token: adminToken,
        }
      );
      return { outcome: res.outcome || 'deleted' };
    },
    async saveCategory(adminToken, category) {
      return httpRequest<Category>('/api/admin/categories', {
        method: 'POST',
        token: adminToken,
        body: JSON.stringify(category),
      });
    },
    async deleteCategory(adminToken, categoryId, options) {
      const qs = options?.cascadeProducts ? '?cascade=true' : '';
      const res = await httpRequest<{ ok: boolean; deletedProductIds?: string[] }>(
        `/api/admin/categories/${encodeURIComponent(categoryId)}${qs}`,
        {
          method: 'DELETE',
          token: adminToken,
        }
      );
      return { deletedProductIds: res.deletedProductIds || [] };
    },
    async saveInstallmentPlans(adminToken, plans) {
      return httpRequest<InstallmentPlan[]>('/api/admin/installment-plans', {
        method: 'PUT',
        token: adminToken,
        body: JSON.stringify({ plans }),
      });
    },
    async saveTermsPolicy(adminToken, doc) {
      return httpRequest<TermsPolicyDocument>('/api/admin/terms', {
        method: 'PUT',
        token: adminToken,
        body: JSON.stringify(doc),
      });
    },
  },

  storageService: {
    async uploadImage(file: File, folder: 'products' | 'avatars') {
      const { dataUrl } = await processSecureImageUpload(file, folder);
      return dataUrl;
    },
  },
};
