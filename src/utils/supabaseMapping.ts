import { SEED_CATEGORIES } from '../api/seedData';
import type {
  Category,
  FeedbackMessage,
  FeedbackThread,
  InstallmentPlan,
  NotificationItem,
  Order,
  OrderInstallmentEntry,
  OrderStatus,
  Product,
  User,
} from '../api/types';
import { calculateCommission, slugify } from './commerce';
import { sanitizePlainText } from './security';

const DEFAULT_FALLBACK_IMAGE = '/src/assets/images/womens_unstitched_suit_1795333234539.jpg';

const CATEGORY_METADATA_BY_SLUG = new Map<string, Category>(
  SEED_CATEGORIES.map((c) => [c.slug, c])
);

const CATEGORY_METADATA_BY_NAME = new Map<string, Category>(
  SEED_CATEGORIES.map((c) => [c.name.toLowerCase(), c])
);

export function buildProductSlug(title: string, id: string): string {
  const base = slugify(title || 'piece') || 'piece';
  const idSuffix = slugify(id).slice(0, 8) || 'item';
  const combined = `${base.slice(0, 100)}-${idSuffix}`
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
  return combined || 'piece';
}

export function defaultSizesForCategory(categoryName: string): string[] {
  const lower = categoryName.toLowerCase();
  if (lower.includes('unstitched')) return ['3-Piece Unstitched'];
  if (lower.includes('trouser')) return ['26', '28', '30', '32'];
  if (lower.includes('accessor')) return ['One Size'];
  return ['S', 'M', 'L', 'XL'];
}

export function mapDbCategory(row: Record<string, unknown>): Category {
  const name = sanitizePlainText(String(row.name || 'Collection'), 80);
  const rawSlug = slugify(name) || 'collection';
  const seedMatch =
    CATEGORY_METADATA_BY_NAME.get(name.toLowerCase()) ||
    CATEGORY_METADATA_BY_SLUG.get(rawSlug);

  return {
    id: String(row.id),
    name,
    slug: seedMatch?.slug || rawSlug,
    description:
      seedMatch?.description || `${name} pieces crafted for Cinematic Arts (CA).`,
    image: seedMatch?.image || DEFAULT_FALLBACK_IMAGE,
  };
}

export function mapDbProduct(
  row: Record<string, unknown>,
  categoriesById?: Map<string, string>
): Product {
  const id = String(row.id);
  const title = sanitizePlainText(String(row.title || 'Atelier Piece'), 120);
  const categoryId = String(row.category_id || '');
  const joinedCat = row.categories as { name?: string } | null | undefined;
  const categoryName = sanitizePlainText(
    joinedCat?.name || categoriesById?.get(categoryId) || 'Collection',
    60
  );

  const coverImage = row.cover_image ? String(row.cover_image) : DEFAULT_FALLBACK_IMAGE;
  const rawImages = Array.isArray(row.images)
    ? row.images.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    : [];
  const extraImages = rawImages.filter((u) => u !== coverImage);

  const rawCosts = row.product_costs;
  let costPrice: number | undefined;
  if (Array.isArray(rawCosts) && rawCosts.length > 0) {
    const first = rawCosts[0] as { cost_price?: unknown };
    if (first && first.cost_price !== undefined && first.cost_price !== null) {
      costPrice = Number(first.cost_price);
    }
  } else if (rawCosts && typeof rawCosts === 'object') {
    const obj = rawCosts as { cost_price?: unknown };
    if (obj.cost_price !== undefined && obj.cost_price !== null) {
      costPrice = Number(obj.cost_price);
    }
  }

  return {
    id,
    slug: row.slug ? String(row.slug) : buildProductSlug(title, id),
    title,
    description: sanitizePlainText(String(row.description || ''), 1200),
    price: Number(row.price || 0),
    costPrice,
    categoryId,
    categoryName,
    coverImage,
    extraImages,
    sizes: defaultSizesForCategory(categoryName),
    inStock: row.is_active !== false,
    featured: row.is_active !== false,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export function mapDbPlan(row: Record<string, unknown>): InstallmentPlan {
  const months = Math.max(1, Math.round(Number(row.months || 2)));
  return {
    id: `plan-${months}m`,
    label: `${months} Months`,
    months,
    advancePercent: Number(row.advance_percent ?? 0),
    markupPercent: Number(row.markup_percent ?? 0),
    active: row.is_active !== false,
  };
}

export function parsePlanMonths(planId?: string): number | null {
  if (!planId) return null;
  const match = /(\d+)/.exec(planId);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isFinite(num) && num >= 1 ? num : null;
}

export function mapDbProfile(row: Record<string, unknown>): User {
  const dbRole = String(row.role || 'user').toLowerCase();
  const mappedRole: User['role'] = dbRole === 'seller' ? 'seller' : 'user';
  const sellerCode = row.seller_code ? sanitizePlainText(String(row.seller_code), 20) : undefined;

  return {
    id: String(row.id),
    role: mappedRole,
    name: sanitizePlainText(String(row.full_name || row.name || row.email || 'Member'), 80),
    email: sanitizePlainText(String(row.email || ''), 120),
    phone: row.phone ? sanitizePlainText(String(row.phone), 24) : undefined,
    whatsapp: row.whatsapp ? sanitizePlainText(String(row.whatsapp), 24) : undefined,
    address: row.address ? sanitizePlainText(String(row.address), 200) : undefined,
    city: row.city ? sanitizePlainText(String(row.city), 60) : 'Peshawar',
    postalCode: row.postal_code ? sanitizePlainText(String(row.postal_code), 16) : undefined,
    fatherName: row.father_name ? sanitizePlainText(String(row.father_name), 80) : undefined,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    sellerCode,
    isActiveSeller: mappedRole === 'seller' && Boolean(sellerCode),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export function mapDbOrder(row: Record<string, unknown>): Order {
  const payMethod = row.pay_method === 'installment' ? 'installments' : 'cod';
  const planMonths = row.plan_months ? Number(row.plan_months) : undefined;
  const rawPayments = Array.isArray(row.installment_payments)
    ? (row.installment_payments as Record<string, unknown>[])
    : [];

  const sortedPayments = [...rawPayments].sort(
    (a, b) => Number(a.due_no ?? 0) - Number(b.due_no ?? 0)
  );

  const advanceRow = sortedPayments.find((p) => Number(p.due_no) === 0);
  const installmentSchedule: OrderInstallmentEntry[] = sortedPayments
    .filter((p) => Number(p.due_no) > 0)
    .map((p) => ({
      installmentNumber: Number(p.due_no),
      dueDate: String(p.due_date || '').slice(0, 10),
      amount: Number(p.amount || 0),
      paid: Boolean(p.is_paid),
      paidAt: p.paid_at ? String(p.paid_at) : null,
    }));

  const rawCommissions = row.commissions;
  let commissionAmount = 0;
  let commissionCredited = false;
  if (Array.isArray(rawCommissions) && rawCommissions.length > 0) {
    const first = rawCommissions[0] as Record<string, unknown>;
    commissionAmount = Number(first.amount || 0);
    commissionCredited = true;
  } else if (rawCommissions && typeof rawCommissions === 'object') {
    const obj = rawCommissions as Record<string, unknown>;
    if (obj.amount !== undefined) {
      commissionAmount = Number(obj.amount || 0);
      commissionCredited = true;
    }
  }

  const totalAmount = Number(row.total_amount ?? row.subtotal ?? 0);
  const sellerId = row.seller_id ? String(row.seller_id) : undefined;
  if (commissionAmount === 0 && sellerId && totalAmount > 0) {
    commissionAmount = calculateCommission(totalAmount);
  }
  const status = (String(row.status || 'pending') as OrderStatus);
  if (status === 'complete' && sellerId && commissionAmount > 0) {
    commissionCredited = true;
  }

  const joinedProduct = row.products as { cover_image?: string } | null | undefined;
  const itemImage = joinedProduct?.cover_image
    ? String(joinedProduct.cover_image)
    : DEFAULT_FALLBACK_IMAGE;

  return {
    id: String(row.id),
    userId: String(row.user_id || 'guest'),
    customerName: sanitizePlainText(String(row.customer_name || ''), 80),
    phone: sanitizePlainText(String(row.phone || ''), 24),
    whatsapp: sanitizePlainText(String(row.whatsapp || ''), 24),
    address: sanitizePlainText(String(row.address || ''), 200),
    city: sanitizePlainText(String(row.city || 'Peshawar'), 60),
    postalCode: sanitizePlainText(String(row.postal_code || ''), 16),
    notes: sanitizePlainText(String(row.notes || ''), 300),
    items: [
      {
        productId: String(row.product_id || ''),
        title: sanitizePlainText(String(row.product_title || 'Atelier Piece'), 120),
        unitPrice: Number(row.unit_price || 0),
        quantity: Math.max(1, Number(row.quantity || 1)),
        selectedSize: row.size ? sanitizePlainText(String(row.size), 40) : undefined,
        image: itemImage,
      },
    ],
    paymentMethod: payMethod,
    planId: planMonths ? `plan-${planMonths}m` : undefined,
    planLabel: planMonths ? `${planMonths} Months` : undefined,
    advanceAmount: Number(row.advance_amount || 0),
    advancePaid: advanceRow ? Boolean(advanceRow.is_paid) : status === 'complete',
    monthlyAmount: Number(row.monthly_amount || 0),
    totalAmount,
    installmentSchedule,
    referralCode: row.referral_code ? sanitizePlainText(String(row.referral_code), 20) : undefined,
    referralSellerId: sellerId,
    commissionAmount,
    commissionCredited,
    status,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export function mapDbNotification(
  row: Record<string, unknown>,
  currentUserId?: string
): NotificationItem {
  const title = sanitizePlainText(String(row.title || 'Notification'), 120);
  const body = sanitizePlainText(String(row.body ?? row.message ?? ''), 800);
  const reads = Array.isArray(row.notification_reads)
    ? (row.notification_reads as Record<string, unknown>[])
    : [];
  const isRead = currentUserId
    ? reads.some((r) => String(r.user_id) === currentUserId)
    : false;

  const lowerTitle = title.toLowerCase();
  let kind: NotificationItem['kind'] = row.user_id ? 'order' : 'broadcast';
  if (lowerTitle.includes('reply') || lowerTitle.includes('support') || lowerTitle.includes('feedback')) {
    kind = 'feedback_reply';
  } else if (lowerTitle.includes('commission')) {
    kind = 'commission';
  } else if (lowerTitle.includes('order')) {
    kind = 'order';
  }

  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : null,
    title,
    message: body,
    kind,
    read: isRead,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export function mapDbFeedbackThread(
  row: Record<string, unknown>,
  profileLookup?: Map<string, { name: string; email: string }>
): FeedbackThread {
  const userId = String(row.user_id || '');
  const profile = profileLookup?.get(userId);
  const rawMsgs = Array.isArray(row.feedback_messages)
    ? (row.feedback_messages as Record<string, unknown>[])
    : [];

  const sortedMsgs = [...rawMsgs].sort((a, b) =>
    String(a.created_at || '').localeCompare(String(b.created_at || ''))
  );

  const userName = sanitizePlainText(profile?.name || 'Customer', 80);
  const userEmail = sanitizePlainText(profile?.email || '', 120);

  const messages: FeedbackMessage[] = sortedMsgs.map((m) => {
    const isAdmin = Boolean(m.from_admin);
    return {
      id: String(m.id),
      senderRole: isAdmin ? 'admin' : 'user',
      senderName: isAdmin ? 'CA Support' : userName,
      body: sanitizePlainText(String(m.body || ''), 800),
      createdAt: String(m.created_at || row.created_at || new Date().toISOString()),
    };
  });

  const lastMsg = messages[messages.length - 1];
  const status: FeedbackThread['status'] =
    lastMsg?.senderRole === 'admin' ? 'replied' : 'open';

  const updatedAt =
    sortedMsgs[sortedMsgs.length - 1]?.created_at
      ? String(sortedMsgs[sortedMsgs.length - 1].created_at)
      : String(row.created_at || new Date().toISOString());

  return {
    id: String(row.id),
    userId,
    userName,
    userEmail,
    subject: sanitizePlainText(String(row.subject || 'Support Inquiry'), 120),
    status,
    messages,
    updatedAt,
  };
}

import { AppError, createErrorReferenceId } from '../services/errorHandling';

export function deriveItemIdempotencyKey(baseKey: string | undefined, index: number, total: number): string {
  const cleanBase = sanitizePlainText(baseKey || '', 80) || `ord-${Date.now()}`;
  return total <= 1 ? cleanBase : `${cleanBase}-${index + 1}`;
}

export function toFriendlySupabaseError(err: unknown, fallback: string): Error {
  const referenceId = createErrorReferenceId('CA');
  if (!err) {
    return new AppError({ message: fallback, status: 500, kind: 'server', referenceId });
  }
  const statusVal =
    typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status?: unknown }).status || 0)
      : 0;
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message?: unknown }).message || fallback)
      : String(err);

  const lower = raw.toLowerCase();
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('load failed')) {
    return new AppError({
      message: 'You appear to be offline or unable to reach the server. Check your connection and retry.',
      status: 0,
      kind: 'offline',
      referenceId,
    });
  }
  if (lower.includes('aborterror') || lower.includes('aborted') || lower.includes('timeout') || lower.includes('timed out')) {
    return new AppError({
      message: 'Request timed out. Please check your connection and try again.',
      status: 408,
      kind: 'timeout',
      referenceId,
    });
  }
  if (statusVal >= 500 || lower.includes('internal server error') || lower.includes('bad gateway') || lower.includes('service unavailable')) {
    return new AppError({
      message: 'Service temporarily unavailable. Please try again in a moment.',
      status: statusVal >= 500 ? statusVal : 500,
      kind: 'server',
      referenceId,
    });
  }
  if (lower.includes('invalid login credentials')) {
    return new AppError({
      message: 'Incorrect email or password.',
      status: 401,
      kind: 'auth',
      referenceId,
      retryable: false,
    });
  }
  if (lower.includes('email not confirmed')) {
    return new AppError({
      message: 'Please confirm your email address before signing in.',
      status: 401,
      kind: 'auth',
      referenceId,
      retryable: false,
    });
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return new AppError({
      message: 'An account with this email already exists. Please sign in instead.',
      status: 409,
      kind: 'validation',
      referenceId,
      retryable: false,
    });
  }
  if (lower.includes('permission denied') || lower.includes('row-level security')) {
    return new AppError({
      message: 'You do not have permission to perform this action. Please sign in with the right account.',
      status: 403,
      kind: 'auth',
      referenceId,
      retryable: false,
    });
  }
  if (lower.includes('self-referral') || lower.includes('own referral')) {
    return new AppError({
      message: 'You cannot use your own Seller Referral ID on your own order.',
      status: 400,
      kind: 'validation',
      referenceId,
      retryable: false,
    });
  }
  if (lower.includes('referral')) {
    return new AppError({
      message: 'Seller Referral ID is invalid or inactive.',
      status: 400,
      kind: 'validation',
      referenceId,
      retryable: false,
    });
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return new AppError({
      message: 'Too many attempts. Please wait a moment and try again.',
      status: 429,
      kind: 'rate_limit',
      referenceId,
      retryable: true,
    });
  }

  return new AppError({
    message: sanitizePlainText(raw, 240) || fallback,
    status: statusVal || 400,
    kind: statusVal >= 500 ? 'server' : 'validation',
    referenceId,
    retryable: statusVal >= 500 || statusVal === 0,
  });
}
