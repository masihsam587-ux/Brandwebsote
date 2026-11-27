import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { getRuntimeOrigin } from '../services/siteConfig';
import { DEFAULT_TERMS_POLICY } from './seedData';
import {
  calculateAdminAnalytics,
  calculateCommission,
  calculateOrderPaidSummary,
  generateSellerId,
} from '../utils/commerce';
import { processSecureImageUpload } from '../utils/fileSecurity';
import { sanitizePlainText, validateSafeSlug } from '../utils/security';
import {
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
} from '../utils/supabaseMapping';

let pendingAvatarFile = null;
let pendingAvatarObjectUrl = null;

function clearPendingAvatar() {
  pendingAvatarFile = null;
  if (pendingAvatarObjectUrl && typeof globalThis.URL !== 'undefined') {
    globalThis.URL.revokeObjectURL(pendingAvatarObjectUrl);
  }
  pendingAvatarObjectUrl = null;
}

async function flushPendingAvatarUpload(sb, userId) {
  if (!pendingAvatarFile || !userId) return null;
  const fileToUpload = pendingAvatarFile;
  const path = `${userId}/${fileToUpload.name}`;
  const { error: upErr } = await sb.storage
    .from('avatars')
    .upload(path, fileToUpload, { upsert: true, contentType: fileToUpload.type });
  if (upErr) {
    throw toFriendlySupabaseError(upErr, 'Could not upload profile portrait.');
  }
  const { data } = sb.storage.from('avatars').getPublicUrl(path);
  const publicUrl = data?.publicUrl || null;
  if (publicUrl) {
    await sb.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
  }
  clearPendingAvatar();
  return publicUrl;
}

async function fetchProfileRow(sb, userId) {
  const { data, error } = await sb
    .from('profiles')
    .select('id,email,full_name,role,seller_code,phone,whatsapp,address,postal_code,father_name,avatar_url,created_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw toFriendlySupabaseError(error, 'Could not load user profile.');
  return data;
}

async function requireAuthUser(sb) {
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) {
    throw new Error('Please sign in to continue.');
  }
  return data.user;
}

async function requireAdminUser(sb) {
  const user = await requireAuthUser(sb);
  const profile = await fetchProfileRow(sb, user.id);
  if (!profile || String(profile.role).toLowerCase() !== 'admin') {
    throw new Error('Admin privileges required.');
  }
  return { user, profile };
}

export function subscribeToUserRealtime(userId, onChange) {
  if (!isSupabaseConfigured() || !userId) return () => {};
  try {
    const sb = getSupabase();
    const channel = sb
      .channel(`ca-user-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => onChange()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=is.null' },
        () => onChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` },
        () => onChange()
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}

export const supabaseAdapter = {
  mode: 'supabase',

  authService: {
    async getSession() {
      const sb = getSupabase();
      const { data, error } = await sb.auth.getSession();
      if (error || !data.session) return null;

      const userId = data.session.user.id;
      let profile = await fetchProfileRow(sb, userId);

      if (pendingAvatarFile) {
        try {
          await flushPendingAvatarUpload(sb, userId);
          profile = await fetchProfileRow(sb, userId);
        } catch {
          // Keep existing profile even if deferred avatar upload needs retry
        }
      }

      if (!profile) {
        const meta = data.session.user.user_metadata || {};
        return {
          user: mapDbProfile({
            id: userId,
            email: data.session.user.email || '',
            full_name: meta.full_name || meta.name || data.session.user.email || 'Member',
            role: meta.role || 'user',
            seller_code: meta.seller_code || null,
          }),
          token: data.session.access_token,
        };
      }

      return {
        user: mapDbProfile(profile),
        token: data.session.access_token,
      };
    },

    async login(payload) {
      if (payload.honeypot && payload.honeypot.trim().length > 0) {
        throw new Error('Request blocked by spam verification.');
      }
      const sb = getSupabase();
      const { data, error } = await sb.auth.signInWithPassword({
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
      });
      if (error || !data.session || !data.user) {
        throw toFriendlySupabaseError(error, 'Sign in failed.');
      }

      if (pendingAvatarFile) {
        try {
          await flushPendingAvatarUpload(sb, data.user.id);
        } catch {
          // Non-fatal during sign-in; user can still update avatar in Profile
        }
      }

      let profile = await fetchProfileRow(sb, data.user.id);
      if (!profile) {
        throw new Error('Profile record not found for this account.');
      }
      const metaCode = data.user.user_metadata?.seller_code;
      if (
        !profile.seller_code &&
        metaCode &&
        (profile.role === 'seller' || data.user.user_metadata?.role === 'seller')
      ) {
        try {
          const { data: patched } = await sb
            .from('profiles')
            .update({ seller_code: metaCode })
            .eq('id', data.user.id)
            .select('id,email,full_name,role,seller_code,phone,whatsapp,address,postal_code,father_name,avatar_url,created_at')
            .maybeSingle();
          if (patched) profile = patched;
        } catch {
          // Keep fetched profile even if RLS blocks self-update of seller_code
        }
      }
      return {
        user: mapDbProfile(profile),
        token: data.session.access_token,
      };
    },

    async signup(payload) {
      if (payload.honeypot && payload.honeypot.trim().length > 0) {
        throw new Error('Request blocked by spam verification.');
      }
      const sb = getSupabase();
      const cleanEmail = payload.email.trim().toLowerCase();
      const cleanName = sanitizePlainText(payload.name, 80);
      const isSeller = payload.role === 'seller';
      const fallbackSellerCode = isSeller ? generateSellerId('CA') : null;

      const userMeta = {
        role: payload.role,
        full_name: cleanName,
        name: cleanName,
        phone: isSeller ? sanitizePlainText(payload.phone, 24) : null,
        whatsapp: isSeller ? sanitizePlainText(payload.whatsapp, 24) : null,
        address: isSeller ? sanitizePlainText(payload.address, 200) : null,
        postal_code: isSeller ? sanitizePlainText(payload.postalCode, 16) : null,
        father_name: isSeller ? sanitizePlainText(payload.fatherName, 80) : null,
        seller_code: fallbackSellerCode,
      };

      const { data, error } = await sb.auth.signUp({
        email: cleanEmail,
        password: payload.password,
        options: {
          data: userMeta,
          emailRedirectTo: `${getRuntimeOrigin()}/auth`,
        },
      });
      if (error || !data.user) {
        throw toFriendlySupabaseError(error, 'Could not create account.');
      }

      // If email confirmation is active, Supabase returns user without a session.
      // Keep any selected avatar file in memory until first successful login.
      if (!data.session) {
        return {
          user: mapDbProfile({
            id: data.user.id,
            email: cleanEmail,
            full_name: cleanName,
            role: payload.role,
            seller_code: undefined,
          }),
          token: '',
          emailConfirmationRequired: true,
        };
      }

      let uploadedAvatarUrl = null;
      if (pendingAvatarFile) {
        try {
          uploadedAvatarUrl = await flushPendingAvatarUpload(sb, data.user.id);
        } catch {
          uploadedAvatarUrl = null;
        }
      } else if (isSeller && payload.avatarUrl && !payload.avatarUrl.startsWith('blob:')) {
        uploadedAvatarUrl = payload.avatarUrl;
      }

      const existing = await fetchProfileRow(sb, data.user.id);
      const profilePatch = {
        id: data.user.id,
        email: cleanEmail,
        full_name: cleanName,
        role: existing?.role || payload.role,
        seller_code: existing?.seller_code || fallbackSellerCode,
        phone: isSeller ? sanitizePlainText(payload.phone, 24) : existing?.phone ?? null,
        whatsapp: isSeller ? sanitizePlainText(payload.whatsapp, 24) : existing?.whatsapp ?? null,
        address: isSeller ? sanitizePlainText(payload.address, 200) : existing?.address ?? null,
        postal_code: isSeller
          ? sanitizePlainText(payload.postalCode, 16)
          : existing?.postal_code ?? null,
        father_name: isSeller
          ? sanitizePlainText(payload.fatherName, 80)
          : existing?.father_name ?? null,
        avatar_url: uploadedAvatarUrl || existing?.avatar_url || null,
      };

      const { data: savedProfile, error: profErr } = await sb
        .from('profiles')
        .upsert(profilePatch, { onConflict: 'id' })
        .select('id,email,full_name,role,seller_code,phone,whatsapp,address,postal_code,father_name,avatar_url,created_at')
        .single();

      if (profErr || !savedProfile) {
        throw toFriendlySupabaseError(profErr, 'Could not save user profile.');
      }

      return {
        user: mapDbProfile(savedProfile),
        token: data.session.access_token,
        emailConfirmationRequired: false,
      };
    },

    async requestPasswordReset(email) {
      const sb = getSupabase();
      const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${getRuntimeOrigin()}/auth?type=recovery`,
      });
      if (error) throw toFriendlySupabaseError(error, 'Password reset failed.');
      return {
        message: 'If an account matches that address, reset instructions were dispatched.',
      };
    },

    async updatePassword(newPassword) {
      const sb = getSupabase();
      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) throw toFriendlySupabaseError(error, 'Could not update password.');
      return { message: 'Your password has been updated. You are now signed in.' };
    },

    async logout() {
      const sb = getSupabase();
      clearPendingAvatar();
      await sb.auth.signOut();
    },
  },

  productService: {
    async listProducts(params) {
      const sb = getSupabase();
      let query = sb
        .from('products')
        .select('id,category_id,title,description,price,cover_image,images,is_active,created_at,categories(name)')
        .eq('is_active', true);

      if (params?.categoryId && params.categoryId !== 'all') {
        query = query.eq('category_id', params.categoryId);
      }
      if (params?.search) {
        const cleanSearch = sanitizePlainText(params.search, 80).replace(/[%_,]/g, '');
        if (cleanSearch) {
          query = query.ilike('title', `%${cleanSearch}%`);
        }
      }
      if (params?.sort === 'price_asc') query = query.order('price', { ascending: true });
      else if (params?.sort === 'price_desc') query = query.order('price', { ascending: false });
      else query = query.order('created_at', { ascending: false });

      if (params?.page && params?.limit) {
        const from = Math.max(0, (params.page - 1) * params.limit);
        query = query.range(from, from + params.limit - 1);
      }

      const { data, error } = await query;
      if (error) throw toFriendlySupabaseError(error, 'Could not load products.');
      return (data || []).map((row) => mapDbProduct(row));
    },

    async getProductBySlug(slug) {
      if (!validateSafeSlug(slug)) return null;
      const sb = getSupabase();
      const { data, error } = await sb
        .from('products')
        .select('id,category_id,title,description,price,cover_image,images,is_active,created_at,categories(name)')
        .eq('is_active', true);

      if (error) throw toFriendlySupabaseError(error, 'Could not load product details.');
      const mapped = (data || []).map((row) => mapDbProduct(row));
      return mapped.find((p) => p.slug === slug || p.id === slug) || null;
    },

    async listCategories() {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('categories')
        .select('id,name,created_at')
        .order('name', { ascending: true });
      if (error) throw toFriendlySupabaseError(error, 'Could not load categories.');
      return (data || []).map((row) => mapDbCategory(row));
    },

    async listInstallmentPlans() {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('plans')
        .select('months,markup_percent,advance_percent,is_active')
        .eq('is_active', true)
        .order('months', { ascending: true });
      if (error) throw toFriendlySupabaseError(error, 'Could not load installment plans.');
      return (data || []).map((row) => mapDbPlan(row));
    },

    async getTermsPolicy() {
      return { ...DEFAULT_TERMS_POLICY };
    },
  },

  orderService: {
    async validateSellerReferral(code) {
      const clean = sanitizePlainText(code, 20).toUpperCase();
      if (!/^CA-[A-Z0-9]{4,12}$/.test(clean)) {
        return { valid: false };
      }
      const sb = getSupabase();
      const { data: userData } = await sb.auth.getUser();
      if (userData?.user) {
        const metaCode = String(userData.user.user_metadata?.seller_code || '').toUpperCase();
        if (metaCode && metaCode === clean) {
          return { valid: false, selfReferral: true };
        }
        const profile = await fetchProfileRow(sb, userData.user.id).catch(() => null);
        if (profile?.seller_code && String(profile.seller_code).toUpperCase() === clean) {
          return { valid: false, selfReferral: true };
        }
      }
      const { data, error } = await sb.rpc('check_referral', { p_code: clean });
      if (error) {
        return { valid: false };
      }
      return { valid: Boolean(data) };
    },

    async createOrder(payload) {
      if (payload.honeypot && payload.honeypot.trim().length > 0) {
        throw new Error('Request blocked by spam verification.');
      }
      if (!payload.items || payload.items.length === 0) {
        throw new Error('Select at least one product before placing an order.');
      }

      const sb = getSupabase();
      const payMethod = payload.paymentMethod === 'installments' ? 'installment' : 'cash';
      const planMonths = payMethod === 'installment' ? parsePlanMonths(payload.planId) : null;
      const referralCode = payload.referralCode?.trim()
        ? sanitizePlainText(payload.referralCode, 20).toUpperCase()
        : null;

      if (payMethod === 'installment' && !referralCode) {
        throw new Error('Installment orders require an active CA Seller Referral ID.');
      }
      if (referralCode) {
        const { data: userData } = await sb.auth.getUser();
        if (userData?.user) {
          const metaCode = String(userData.user.user_metadata?.seller_code || '').toUpperCase();
          const profile = await fetchProfileRow(sb, userData.user.id).catch(() => null);
          const ownCode = (profile?.seller_code ? String(profile.seller_code).toUpperCase() : '') || metaCode;
          if (ownCode && ownCode === referralCode) {
            throw new Error('You cannot use your own Seller Referral ID.');
          }
        }
      }

      const createdOrderIds = [];
      const succeededItems = [];
      for (let i = 0; i < payload.items.length; i += 1) {
        const item = payload.items[i];
        const idemKey = deriveItemIdempotencyKey(
          payload.idempotencyKey,
          i,
          payload.items.length
        );
        const { data: orderId, error } = await sb.rpc('place_order', {
          p_product_id: item.productId,
          p_qty: Math.max(1, Math.floor(item.quantity)),
          p_size: sanitizePlainText(item.selectedSize || 'Standard', 40),
          p_pay: payMethod,
          p_months: planMonths,
          p_referral: referralCode,
          p_name: sanitizePlainText(payload.customerName, 80),
          p_phone: sanitizePlainText(payload.phone, 24),
          p_whatsapp: sanitizePlainText(payload.whatsapp, 24),
          p_address: sanitizePlainText(payload.address, 200),
          p_city: sanitizePlainText(payload.city, 60),
          p_postal: sanitizePlainText(payload.postalCode, 16),
          p_notes: sanitizePlainText(payload.notes || '', 300),
          p_idem: idemKey,
        });
        if (error || !orderId) {
          const baseErr = toFriendlySupabaseError(error, 'Could not place order.');
          if (createdOrderIds.length > 0) {
            const partialErr = new Error(
              `${createdOrderIds.length} of ${payload.items.length} item(s) were placed (${createdOrderIds.join(', ')}), but "${item.title}" failed: ${baseErr.message}`
            );
            partialErr.partialCreatedIds = createdOrderIds;
            partialErr.succeededItems = succeededItems;
            throw partialErr;
          }
          throw baseErr;
        }
        createdOrderIds.push(String(orderId));
        succeededItems.push(item);
      }

      const primaryId = createdOrderIds[0];
      const { data: row, error: fetchErr } = await sb
        .from('orders')
        .select('*,installment_payments(*),commissions(*),products(cover_image)')
        .eq('id', primaryId)
        .maybeSingle();

      if (fetchErr || !row) {
        const fallbackSubtotal = payload.items.reduce(
          (sum, it) => sum + Math.max(0, Number(it.unitPrice) || 0) * Math.max(1, Math.floor(Number(it.quantity) || 1)),
          0
        );
        return {
          id: primaryId,
          userId: 'current',
          customerName: sanitizePlainText(payload.customerName, 80),
          phone: sanitizePlainText(payload.phone, 24),
          whatsapp: sanitizePlainText(payload.whatsapp, 24),
          address: sanitizePlainText(payload.address, 200),
          city: sanitizePlainText(payload.city, 60),
          postalCode: sanitizePlainText(payload.postalCode, 16),
          notes: sanitizePlainText(payload.notes || '', 300),
          items: payload.items,
          paymentMethod: payload.paymentMethod,
          planId: payload.planId,
          planLabel: planMonths ? `${planMonths} Months` : undefined,
          advanceAmount: 0,
          advancePaid: false,
          monthlyAmount: 0,
          totalAmount: fallbackSubtotal,
          installmentSchedule: [],
          referralCode: referralCode || undefined,
          commissionAmount: 0,
          commissionCredited: false,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
      }

      return mapDbOrder(row);
    },

    async listMyOrders() {
      const sb = getSupabase();
      const { data: userData } = await sb.auth.getUser();
      if (!userData?.user) return [];

      const { data, error } = await sb
        .from('orders')
        .select('*,installment_payments(*),commissions(*),products(cover_image)')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) throw toFriendlySupabaseError(error, 'Could not load your orders.');
      return (data || []).map((row) => mapDbOrder(row));
    },
  },

  userService: {
    async updateProfile(patch) {
      const sb = getSupabase();
      const user = await requireAuthUser(sb);

      let nextAvatarUrl = patch.avatarUrl;
      if (pendingAvatarFile) {
        nextAvatarUrl = await flushPendingAvatarUpload(sb, user.id);
      }

      const updateBody = {};
      if (patch.name !== undefined) updateBody.full_name = sanitizePlainText(patch.name, 80);
      if (patch.phone !== undefined) updateBody.phone = sanitizePlainText(patch.phone, 24);
      if (patch.whatsapp !== undefined) updateBody.whatsapp = sanitizePlainText(patch.whatsapp, 24);
      if (patch.address !== undefined) updateBody.address = sanitizePlainText(patch.address, 200);
      if (patch.postalCode !== undefined) {
        updateBody.postal_code = sanitizePlainText(patch.postalCode, 16);
      }
      if (nextAvatarUrl !== undefined && !String(nextAvatarUrl).startsWith('blob:')) {
        updateBody.avatar_url = nextAvatarUrl;
      }

      const { data, error } = await sb
        .from('profiles')
        .update(updateBody)
        .eq('id', user.id)
        .select('id,email,full_name,role,seller_code,phone,whatsapp,address,postal_code,father_name,avatar_url,created_at')
        .single();

      if (error || !data) throw toFriendlySupabaseError(error, 'Could not update profile.');
      return mapDbProfile(data);
    },

    async deleteAccount(confirmationEmail) {
      const sb = getSupabase();
      const user = await requireAuthUser(sb);
      const expected = String(user.email || '').trim().toLowerCase();
      if (!expected || confirmationEmail.trim().toLowerCase() !== expected) {
        throw new Error('Confirmation email does not match your account email.');
      }

      const { error } = await sb.rpc('delete_my_account');
      if (error) throw toFriendlySupabaseError(error, 'Could not delete account.');
      clearPendingAvatar();
      await sb.auth.signOut();
    },

    async getSellerDashboard() {
      const sb = getSupabase();
      const user = await requireAuthUser(sb);
      const profile = await fetchProfileRow(sb, user.id);
      if (!profile || profile.role !== 'seller' || !profile.seller_code) {
        throw new Error('Seller account required.');
      }

      const [{ data: rpcRows, error: rpcErr }, { data: ownOrdersData }] = await Promise.all([
        sb.rpc('get_seller_referrals'),
        sb
          .from('orders')
          .select('*,installment_payments(*),commissions(*),products(cover_image)')
          .eq('user_id', user.id)
          .eq('pay_method', 'installment')
          .order('created_at', { ascending: false }),
      ]);

      if (rpcErr) {
        throw toFriendlySupabaseError(rpcErr, 'Could not load seller referral ledger.');
      }

      const referralList = Array.isArray(rpcRows) ? rpcRows : [];
      const referredOrders = referralList.map((r) =>
        mapDbOrder({
          ...r,
          id: r.order_id || r.id,
          pay_method: r.pay_method || 'cash',
          seller_id: r.seller_id || user.id,
          customer_name: r.customer_name || 'Referred Customer',
          total_amount: r.total_amount ?? r.order_total ?? 0,
          commissions:
            r.commission_amount !== undefined ? [{ amount: r.commission_amount }] : r.commissions,
        })
      );

      let commissionEarned = 0;
      let pendingCommission = 0;
      let totalFinanced = 0;
      let totalRecovered = 0;
      const monthBuckets = new Map();

      for (const ord of referredOrders) {
        const comm = ord.commissionAmount || calculateCommission(ord.totalAmount);
        if (ord.status === 'complete') {
          commissionEarned += comm;
          const monthKey = ord.createdAt.slice(0, 7);
          const prev = monthBuckets.get(monthKey) || { month: monthKey, commission: 0, orders: 0 };
          prev.commission += comm;
          prev.orders += 1;
          monthBuckets.set(monthKey, prev);
        } else if (ord.status === 'pending' || ord.status === 'proceeding') {
          pendingCommission += comm;
        }

        if (ord.paymentMethod === 'installments') {
          const sum = calculateOrderPaidSummary(ord);
          totalFinanced += ord.totalAmount;
          totalRecovered += sum.paidAmount;
        }
      }

      const monthlyEarnings = Array.from(monthBuckets.values()).sort((a, b) =>
        a.month.localeCompare(b.month)
      );

      return {
        sellerCode: String(profile.seller_code),
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
        ownInstallmentOrders: (ownOrdersData || []).map((row) => mapDbOrder(row)),
        monthlyEarnings,
      };
    },
  },

  notificationService: {
    async listNotifications() {
      const sb = getSupabase();
      const { data: userData } = await sb.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) return [];

      const { data, error } = await sb
        .from('notifications')
        .select('id,user_id,title,body,created_at,notification_reads(user_id)')
        .order('created_at', { ascending: false });

      if (error) throw toFriendlySupabaseError(error, 'Could not load notifications.');
      return (data || []).map((row) => mapDbNotification(row, userId));
    },

    async markAsRead(id) {
      const sb = getSupabase();
      const user = await requireAuthUser(sb);
      const { error } = await sb
        .from('notification_reads')
        .upsert(
          { notification_id: id, user_id: user.id },
          { onConflict: 'notification_id,user_id', ignoreDuplicates: true }
        );
      if (error) throw toFriendlySupabaseError(error, 'Could not mark notification as read.');
    },

    async markAllRead() {
      const sb = getSupabase();
      const user = await requireAuthUser(sb);
      const list = await this.listNotifications();
      const unreadIds = list.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length === 0) return;

      const rows = unreadIds.map((notifId) => ({
        notification_id: notifId,
        user_id: user.id,
      }));
      const { error } = await sb
        .from('notification_reads')
        .upsert(rows, { onConflict: 'notification_id,user_id', ignoreDuplicates: true });
      if (error) throw toFriendlySupabaseError(error, 'Could not mark notifications read.');
    },
  },

  feedbackService: {
    async listMyThreads() {
      const sb = getSupabase();
      const user = await requireAuthUser(sb);
      const profile = await fetchProfileRow(sb, user.id);
      const lookup = new Map([
        [
          user.id,
          {
            name: String(profile?.full_name || user.email || 'Customer'),
            email: String(profile?.email || user.email || ''),
          },
        ],
      ]);

      const { data, error } = await sb
        .from('feedback')
        .select('id,user_id,kind,subject,created_at,feedback_messages(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw toFriendlySupabaseError(error, 'Could not load support threads.');
      return (data || []).map((row) => mapDbFeedbackThread(row, lookup));
    },

    async createThread(subject, message) {
      const sb = getSupabase();
      const user = await requireAuthUser(sb);
      const profile = await fetchProfileRow(sb, user.id);

      const { data: fbRow, error: fbErr } = await sb
        .from('feedback')
        .insert({
          user_id: user.id,
          kind: 'feedback',
          subject: sanitizePlainText(subject, 120),
        })
        .select('id,user_id,kind,subject,created_at')
        .single();

      if (fbErr || !fbRow) {
        throw toFriendlySupabaseError(fbErr, 'Could not create feedback thread.');
      }

      const { error: msgErr } = await sb.from('feedback_messages').insert({
        feedback_id: fbRow.id,
        sender_id: user.id,
        from_admin: false,
        body: sanitizePlainText(message, 800),
      });

      if (msgErr) {
        throw toFriendlySupabaseError(msgErr, 'Could not send message.');
      }

      const { data: fullRow, error: fetchErr } = await sb
        .from('feedback')
        .select('id,user_id,kind,subject,created_at,feedback_messages(*)')
        .eq('id', fbRow.id)
        .single();

      if (fetchErr || !fullRow) {
        throw toFriendlySupabaseError(fetchErr, 'Message sent, but thread reload failed.');
      }

      const lookup = new Map([
        [
          user.id,
          {
            name: String(profile?.full_name || user.email || 'Customer'),
            email: String(profile?.email || user.email || ''),
          },
        ],
      ]);
      return mapDbFeedbackThread(fullRow, lookup);
    },

    async replyToThread(threadId, body) {
      const sb = getSupabase();
      const user = await requireAuthUser(sb);
      const profile = await fetchProfileRow(sb, user.id);

      const { error: msgErr } = await sb.from('feedback_messages').insert({
        feedback_id: threadId,
        sender_id: user.id,
        from_admin: false,
        body: sanitizePlainText(body, 800),
      });
      if (msgErr) throw toFriendlySupabaseError(msgErr, 'Could not send reply.');

      const { data: fullRow, error: fetchErr } = await sb
        .from('feedback')
        .select('id,user_id,kind,subject,created_at,feedback_messages(*)')
        .eq('id', threadId)
        .single();

      if (fetchErr || !fullRow) {
        throw toFriendlySupabaseError(fetchErr, 'Could not reload thread.');
      }

      const lookup = new Map([
        [
          user.id,
          {
            name: String(profile?.full_name || user.email || 'Customer'),
            email: String(profile?.email || user.email || ''),
          },
        ],
      ]);
      return mapDbFeedbackThread(fullRow, lookup);
    },
  },

  adminService: {
    async getAuthStatus() {
      return { configured: true };
    },

    async setupInitialPassword() {
      throw new Error('Admin accounts use Supabase Auth with profiles.role = admin.');
    },

    async verifyAdminPassword(password, email) {
      const sb = getSupabase();
      let targetEmail = email ? email.trim().toLowerCase() : '';
      if (!targetEmail) {
        const { data: cur } = await sb.auth.getUser();
        targetEmail = cur?.user?.email ? String(cur.user.email).trim().toLowerCase() : '';
      }
      if (!targetEmail) {
        throw new Error('Enter your admin email and password.');
      }

      const { data, error } = await sb.auth.signInWithPassword({
        email: targetEmail,
        password,
      });
      if (error || !data.session || !data.user) {
        throw toFriendlySupabaseError(error, 'Admin verification failed.');
      }

      const profile = await fetchProfileRow(sb, data.user.id);
      if (!profile || String(profile.role).toLowerCase() !== 'admin') {
        await sb.auth.signOut();
        throw new Error('Access denied: this account does not have admin privileges.');
      }

      return { token: data.session.access_token };
    },

    async getOverview(_adminToken) {
      const sb = getSupabase();
      await requireAdminUser(sb);

      const [{ data: statsData }, orders, products] = await Promise.all([
        sb.rpc('admin_stats'),
        this.listAllOrders(_adminToken),
        this.listAdminProducts(_adminToken),
      ]);

      const analytics = calculateAdminAnalytics(orders, products, []);
      if (statsData && typeof statsData === 'object') {
        const s = Array.isArray(statsData) ? statsData[0] : statsData;
        if (s && typeof s === 'object') {
          const rev = Number(s.revenue ?? s.total_revenue ?? analytics.revenue);
          const cogs = Number(s.cost_of_goods ?? s.cogs ?? analytics.costOfGoods);
          const comm = Number(s.commissions_payable ?? s.commissions ?? analytics.commissionsPayable);
          const gross = Number(s.gross_profit ?? rev - cogs);
          const net = Number(s.net_profit ?? gross - comm);
          return {
            ...analytics,
            revenue: Number.isFinite(rev) ? rev : analytics.revenue,
            costOfGoods: Number.isFinite(cogs) ? cogs : analytics.costOfGoods,
            grossProfit: Number.isFinite(gross) ? gross : analytics.grossProfit,
            commissionsPayable: Number.isFinite(comm) ? comm : analytics.commissionsPayable,
            netProfit: Number.isFinite(net) ? net : analytics.netProfit,
            profitMarginPct:
              rev > 0 ? Number(((net / rev) * 100).toFixed(1)) : analytics.profitMarginPct,
            ordersCount: Number(s.orders_count ?? s.total_orders ?? analytics.ordersCount),
            completedOrdersCount: Number(
              s.completed_orders_count ?? s.completed_orders ?? analytics.completedOrdersCount
            ),
            pendingOrdersCount: Number(
              s.pending_orders_count ?? s.pending_orders ?? analytics.pendingOrdersCount
            ),
          };
        }
      }
      return analytics;
    },

    async listManualEntries(_adminToken) {
      return [];
    },

    async addManualEntry(_adminToken, _entry) {
      throw new Error(
        'Manual ledger entries are disabled in Supabase mode (no manual_entries table in database).'
      );
    },

    async deleteManualEntry(_adminToken, _entryId) {
      throw new Error(
        'Manual ledger entries are disabled in Supabase mode (no manual_entries table in database).'
      );
    },

    async listAllOrders(_adminToken) {
      const sb = getSupabase();
      await requireAdminUser(sb);
      const { data, error } = await sb
        .from('orders')
        .select('*,installment_payments(*),commissions(*),products(cover_image)')
        .order('created_at', { ascending: false });
      if (error) throw toFriendlySupabaseError(error, 'Could not load orders.');
      return (data || []).map((row) => mapDbOrder(row));
    },

    async updateOrderStatus(_adminToken, orderId, status) {
      const sb = getSupabase();
      await requireAdminUser(sb);
      const { error } = await sb.rpc('set_order_status', {
        p_order: orderId,
        p_status: status,
      });
      if (error) throw toFriendlySupabaseError(error, 'Could not update order status.');

      const { data: row, error: fetchErr } = await sb
        .from('orders')
        .select('*,installment_payments(*),commissions(*),products(cover_image)')
        .eq('id', orderId)
        .single();
      if (fetchErr || !row) throw toFriendlySupabaseError(fetchErr, 'Could not reload order.');
      return mapDbOrder(row);
    },

    async toggleInstallmentPayment(_adminToken, orderId, installmentNumber, _paid, isAdvance) {
      const sb = getSupabase();
      await requireAdminUser(sb);
      const targetDueNo = isAdvance ? 0 : installmentNumber;

      const { data: paymentRow, error: payLookupErr } = await sb
        .from('installment_payments')
        .select('id')
        .eq('order_id', orderId)
        .eq('due_no', targetDueNo)
        .maybeSingle();

      if (payLookupErr || !paymentRow) {
        throw toFriendlySupabaseError(payLookupErr, 'Installment payment row not found.');
      }

      const { error } = await sb.rpc('mark_installment_paid', {
        p_payment: paymentRow.id,
      });
      if (error) throw toFriendlySupabaseError(error, 'Could not update installment payment.');

      const { data: row, error: fetchErr } = await sb
        .from('orders')
        .select('*,installment_payments(*),commissions(*),products(cover_image)')
        .eq('id', orderId)
        .single();
      if (fetchErr || !row) throw toFriendlySupabaseError(fetchErr, 'Could not reload order.');
      return mapDbOrder(row);
    },

    async listAllUsers(_adminToken) {
      const sb = getSupabase();
      await requireAdminUser(sb);
      const { data, error } = await sb
        .from('profiles')
        .select('id,email,full_name,role,seller_code,phone,whatsapp,address,postal_code,father_name,avatar_url,created_at')
        .order('created_at', { ascending: false });
      if (error) throw toFriendlySupabaseError(error, 'Could not load users.');
      return (data || []).map((row) => mapDbProfile(row));
    },

    async sendNotification(_adminToken, payload) {
      const sb = getSupabase();
      await requireAdminUser(sb);
      const { error } = await sb.from('notifications').insert({
        user_id: payload.targetUserId || null,
        title: sanitizePlainText(payload.title, 120),
        body: sanitizePlainText(payload.message, 800),
      });
      if (error) throw toFriendlySupabaseError(error, 'Could not send notification.');
    },

    async listFeedbackThreads(_adminToken) {
      const sb = getSupabase();
      await requireAdminUser(sb);
      const [{ data: fbData, error: fbErr }, { data: profData }] = await Promise.all([
        sb
          .from('feedback')
          .select('id,user_id,kind,subject,created_at,feedback_messages(*)')
          .order('created_at', { ascending: false }),
        sb.from('profiles').select('id,full_name,email'),
      ]);
      if (fbErr) throw toFriendlySupabaseError(fbErr, 'Could not load feedback threads.');

      const lookup = new Map();
      for (const p of profData || []) {
        lookup.set(String(p.id), {
          name: String(p.full_name || p.email || 'Customer'),
          email: String(p.email || ''),
        });
      }
      return (fbData || []).map((row) => mapDbFeedbackThread(row, lookup));
    },

    async replyFeedbackThread(_adminToken, threadId, body) {
      const sb = getSupabase();
      const { user } = await requireAdminUser(sb);
      const cleanBody = sanitizePlainText(body, 800);

      const { error: msgErr } = await sb.from('feedback_messages').insert({
        feedback_id: threadId,
        sender_id: user.id,
        from_admin: true,
        body: cleanBody,
      });
      if (msgErr) throw toFriendlySupabaseError(msgErr, 'Could not send reply.');

      const { data: fullRow, error: fetchErr } = await sb
        .from('feedback')
        .select('id,user_id,kind,subject,created_at,feedback_messages(*)')
        .eq('id', threadId)
        .single();
      if (fetchErr || !fullRow) {
        throw toFriendlySupabaseError(fetchErr, 'Could not reload feedback thread.');
      }

      const profile = await fetchProfileRow(sb, fullRow.user_id);
      const lookup = new Map([
        [
          String(fullRow.user_id),
          {
            name: String(profile?.full_name || profile?.email || 'Customer'),
            email: String(profile?.email || ''),
          },
        ],
      ]);

      return mapDbFeedbackThread(fullRow, lookup);
    },

    async listAdminProducts(_adminToken) {
      const sb = getSupabase();
      await requireAdminUser(sb);
      const { data, error } = await sb
        .from('products')
        .select('id,category_id,title,description,price,cover_image,images,is_active,created_at,categories(name),product_costs(cost_price)')
        .order('created_at', { ascending: false });
      if (error) throw toFriendlySupabaseError(error, 'Could not load admin catalog.');
      return (data || []).map((row) => mapDbProduct(row));
    },

    async saveProduct(_adminToken, product) {
      const sb = getSupabase();
      await requireAdminUser(sb);

      const cleanTitle = sanitizePlainText(product.title, 120);
      const cleanDesc = sanitizePlainText(product.description || '', 1200);
      const cover = product.coverImage
        ? String(product.coverImage)
        : '/src/assets/images/womens_unstitched_suit_1795333234539.jpg';
      const images = Array.isArray(product.extraImages)
        ? product.extraImages.filter((u) => typeof u === 'string' && u.trim().length > 0)
        : [];

      const rowPayload = {
        category_id: product.categoryId,
        title: cleanTitle,
        description: cleanDesc,
        price: Number(product.price),
        cover_image: cover,
        images,
        is_active: product.inStock !== false,
      };

      let savedId = product.id;
      if (savedId) {
        const { error: upErr } = await sb.from('products').update(rowPayload).eq('id', savedId);
        if (upErr) throw toFriendlySupabaseError(upErr, 'Could not update product.');
      } else {
        const { data: ins, error: insErr } = await sb
          .from('products')
          .insert(rowPayload)
          .select('id')
          .single();
        if (insErr || !ins) throw toFriendlySupabaseError(insErr, 'Could not create product.');
        savedId = String(ins.id);
      }

      if (product.costPrice !== undefined) {
        const { error: costErr } = await sb
          .from('product_costs')
          .upsert(
            { product_id: savedId, cost_price: Math.max(0, Number(product.costPrice) || 0) },
            { onConflict: 'product_id' }
          );
        if (costErr) throw toFriendlySupabaseError(costErr, 'Could not save product cost.');
      }

      const { data: fullRow, error: fetchErr } = await sb
        .from('products')
        .select('id,category_id,title,description,price,cover_image,images,is_active,created_at,categories(name),product_costs(cost_price)')
        .eq('id', savedId)
        .single();
      if (fetchErr || !fullRow) {
        throw toFriendlySupabaseError(fetchErr, 'Product saved, but reload failed.');
      }
      return mapDbProduct(fullRow);
    },

    async deleteProduct(_adminToken, productId) {
      const sb = getSupabase();
      await requireAdminUser(sb);
      const cleanId = String(productId || '').trim();
      if (!cleanId) throw new Error('Product ID is required.');

      // Remove product cost row first if present so no non-cascading FK blocks product deletion
      await sb.from('product_costs').delete().eq('product_id', cleanId);

      const { data: deletedRows, error } = await sb
        .from('products')
        .delete()
        .eq('id', cleanId)
        .select('id');

      if (!error && Array.isArray(deletedRows) && deletedRows.length > 0) {
        return { outcome: 'deleted' };
      }

      // If product is referenced by existing orders (FK 23503), archive by setting is_active = false
      if (error && (error.code === '23503' || /foreign key|violates/i.test(error.message || ''))) {
        const { data: softRows, error: softErr } = await sb
          .from('products')
          .update({ is_active: false })
          .eq('id', cleanId)
          .select('id');
        if (softErr || !softRows || softRows.length === 0) {
          throw toFriendlySupabaseError(
            softErr || error,
            'Product is linked to existing orders and could not be archived. Check Supabase RLS policies.'
          );
        }
        return { outcome: 'archived' };
      }

      if (error) {
        throw toFriendlySupabaseError(error, 'Could not delete product.');
      }

      throw new Error(
        'Product was not removed from Supabase. Verify your admin user has DELETE permission on the products table.'
      );
    },

    async saveCategory(_adminToken, category) {
      const sb = getSupabase();
      await requireAdminUser(sb);
      const cleanName = sanitizePlainText(category.name, 80);
      if (category.id) {
        const { data, error } = await sb
          .from('categories')
          .update({ name: cleanName })
          .eq('id', category.id)
          .select('id,name,created_at')
          .single();
        if (error || !data) throw toFriendlySupabaseError(error, 'Could not update category.');
        return mapDbCategory(data);
      }
      const { data, error } = await sb
        .from('categories')
        .insert({ name: cleanName })
        .select('id,name,created_at')
        .single();
      if (error || !data) throw toFriendlySupabaseError(error, 'Could not create category.');
      return mapDbCategory(data);
    },

    async deleteCategory(_adminToken, categoryId, options) {
      const sb = getSupabase();
      await requireAdminUser(sb);
      const cleanCatId = String(categoryId || '').trim();
      if (!cleanCatId) throw new Error('Category ID is required.');

      const { data: childProds, error: childErr } = await sb
        .from('products')
        .select('id,title')
        .eq('category_id', cleanCatId);
      if (childErr) {
        throw toFriendlySupabaseError(childErr, 'Could not check category products.');
      }

      const deletedProductIds = [];
      if (Array.isArray(childProds) && childProds.length > 0) {
        if (!options?.cascadeProducts) {
          throw new Error(
            `This category still has ${childProds.length} product(s). Delete or reassign them first, or choose "Delete with products".`
          );
        }

        const childIds = childProds.map((p) => String(p.id));
        await sb.from('product_costs').delete().in('product_id', childIds);

        for (const childId of childIds) {
          const { data: removedChild, error: remErr } = await sb
            .from('products')
            .delete()
            .eq('id', childId)
            .select('id');

          if (remErr && (remErr.code === '23503' || /foreign key|violates/i.test(remErr.message || ''))) {
            throw new Error(
              'Cannot delete this category because at least one product in it is linked to existing orders. Move those products to another category first.'
            );
          }
          if (remErr) {
            throw toFriendlySupabaseError(remErr, 'Could not delete products inside this category.');
          }
          if (!removedChild || removedChild.length === 0) {
            throw new Error(
              'Could not delete products inside this category (check Supabase DELETE policy on products).'
            );
          }
          deletedProductIds.push(childId);
        }
      }

      const { data: deletedCats, error: delErr } = await sb
        .from('categories')
        .delete()
        .eq('id', cleanCatId)
        .select('id');

      if (delErr) {
        if (delErr.code === '23503' || /foreign key|violates/i.test(delErr.message || '')) {
          throw new Error(
            'Cannot delete this category because existing products or orders still reference it in Supabase.'
          );
        }
        throw toFriendlySupabaseError(delErr, 'Could not delete category.');
      }

      if (!deletedCats || deletedCats.length === 0) {
        throw new Error(
          'Category was not removed from Supabase. Verify your admin user has DELETE permission on the categories table.'
        );
      }

      return { deletedProductIds };
    },

    async saveInstallmentPlans(_adminToken, plans) {
      const sb = getSupabase();
      await requireAdminUser(sb);
      const payload = (plans || []).map((pl) => {
        const monthsNum = Number(pl.months);
        const markupNum = Number(pl.markupPercent);
        const advanceNum = Number(pl.advancePercent);
        return {
          months: Number.isFinite(monthsNum) ? Math.max(1, Math.min(36, Math.round(monthsNum))) : 2,
          markup_percent: Number.isFinite(markupNum) ? Math.max(0, Math.min(200, markupNum)) : 15,
          advance_percent: Number.isFinite(advanceNum) ? Math.max(0, Math.min(90, advanceNum)) : 0,
          is_active: Boolean(pl.active),
        };
      });

      const { error } = await sb.from('plans').upsert(payload, { onConflict: 'months' });
      if (error) throw toFriendlySupabaseError(error, 'Could not update installment plans.');

      const { data, error: fetchErr } = await sb
        .from('plans')
        .select('months,markup_percent,advance_percent,is_active')
        .order('months', { ascending: true });
      if (fetchErr) throw toFriendlySupabaseError(fetchErr, 'Could not reload installment plans.');
      return (data || []).map((row) => mapDbPlan(row));
    },

    async saveTermsPolicy(_adminToken, _doc) {
      throw new Error(
        'Terms & Policy edits require a store_settings table in Supabase (currently using default policy).'
      );
    },
  },

  storageService: {
    async uploadImage(file, folder) {
      const { sanitizedFile } = await processSecureImageUpload(file, folder);
      const sb = getSupabase();

      if (folder === 'avatars') {
        const { data: userData } = await sb.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) {
          // Hold in memory until signup/login gives a valid auth.uid() for avatars/<user_id>/...
          clearPendingAvatar();
          pendingAvatarFile = sanitizedFile;
          pendingAvatarObjectUrl = globalThis.URL.createObjectURL(sanitizedFile);
          return pendingAvatarObjectUrl;
        }
        const path = `${userId}/${sanitizedFile.name}`;
        const { error } = await sb.storage
          .from('avatars')
          .upload(path, sanitizedFile, { upsert: true, contentType: sanitizedFile.type });
        if (error) throw toFriendlySupabaseError(error, 'Avatar upload failed.');
        const { data } = sb.storage.from('avatars').getPublicUrl(path);
        return data.publicUrl;
      }

      const path = `products/${sanitizedFile.name}`;
      const { error } = await sb.storage
        .from('product-images')
        .upload(path, sanitizedFile, { upsert: true, contentType: sanitizedFile.type });
      if (error) throw toFriendlySupabaseError(error, 'Product image upload failed.');
      const { data } = sb.storage.from('product-images').getPublicUrl(path);
      return data.publicUrl;
    },
  },
};
