import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  X,
  Lock,
  BarChart3,
  Package,
  ShoppingCart,
  Bell,
  MessageSquare,
  Check,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  ArrowLeft,
  Phone,
  MapPin,
  UserCheck,
  Search,
  FileText,
} from 'lucide-react';
import { adminService, api, productService, storageService } from '../api';
import { DEFAULT_TERMS_POLICY } from '../api/seedData';
import type {
  AdminOverview,
  Category,
  FeedbackThread,
  InstallmentPlan,
  ManualDashboardEntry,
  Order,
  OrderStatus,
  Product,
  TermsPolicyDocument,
  User,
} from '../api/types';
import { formatPKR, calculateOrderPaidSummary } from '../utils/commerce';
import { queryClient } from '../api/queryClient';
import { maskPhone } from '../utils/security';
import {
  adminManualEntrySchema,
  adminProductSchema,
  adminTermsSchema,
} from '../utils/validation';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AdminWorkspaceSkeleton, FriendlyErrorState } from './Skeletons';
import { CALoader, CALoadingOverlay, CAProcessButton } from './CALoader';

const ADMIN_INACTIVITY_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

function decodeTokenExpMs(token: string): number | null {
  try {
    const part = token.split('.')[0];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const parsed = JSON.parse(atob(padded)) as { exp?: number };
    if (typeof parsed.exp === 'number') {
      return parsed.exp < 1e12 ? parsed.exp * 1000 : parsed.exp;
    }
    return null;
  } catch {
    return null;
  }
}

interface AdminConsoleProps {
  mode: 'modal' | 'page';
  active?: boolean;
  onClose?: () => void;
}

type AdminTab = 'dashboard' | 'orders' | 'notifications' | 'feedback' | 'products' | 'terms';

export function AdminConsole({ mode, active = true, onClose }: AdminConsoleProps) {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();
  const isSupabaseMode = api.mode === 'supabase';

  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [adminEmail, setAdminEmail] = useState(authUser?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authBtnStatus, setAuthBtnStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remainingLockoutSec, setRemainingLockoutSec] = useState(0);

  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [feedback, setFeedback] = useState<FeedbackThread[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [manualEntries, setManualEntries] = useState<ManualDashboardEntry[]>([]);
  const [termsDoc, setTermsDoc] = useState<TermsPolicyDocument>(DEFAULT_TERMS_POLICY);

  // Per-action loading states
  const [savingTerms, setSavingTerms] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [sendingNotif, setSendingNotif] = useState(false);
  const [replyingFeedbackId, setReplyingFeedbackId] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingPlans, setSavingPlans] = useState(false);

  // Manual Dashboard Entry form state
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualLabel, setManualLabel] = useState('');
  const [manualRevenue, setManualRevenue] = useState('');
  const [manualCogs, setManualCogs] = useState('');
  const [manualOrdersCount, setManualOrdersCount] = useState('1');
  const [manualCommission, setManualCommission] = useState('0');
  const [manualNotes, setManualNotes] = useState('');

  // Notification composer state (default to specific user to prevent accidental broadcasts)
  const [notifMode, setNotifMode] = useState<'all' | 'user'>('user');
  const [userSearch, setUserSearch] = useState('');
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMsg, setNotifMsg] = useState('');

  // Feedback reply & user filter state
  const [replyMap, setReplyMap] = useState<Record<string, string>>({});
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackUserFilter, setFeedbackUserFilter] = useState<string>('all');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<'all' | 'open' | 'replied'>('all');

  // Product editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [prodTitle, setProdTitle] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCost, setProdCost] = useState('');
  const [prodCat, setProdCat] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCover, setProdCover] = useState('');
  const [prodExtra, setProdExtra] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [visibleOrdersCount, setVisibleOrdersCount] = useState(12);
  const [visibleProductsCount, setVisibleProductsCount] = useState(24);

  const lockAdminSession = useCallback(
    (reason?: string) => {
      setAdminToken(null);
      setAuthBtnStatus('idle');
      setSelectedOrder(null);
      setOverview(null);
      setOrders([]);
      setUsers([]);
      setFeedback([]);
      setManualEntries([]);
      setDataError(null);
      setPassword('');
      setConfirmPassword('');
      queryClient.removeQueries({ queryKey: ['admin'] });
      if (reason) {
        showToast(reason, 'info');
      }
    },
    [showToast]
  );

  // Ensure <meta name="robots" content="noindex,nofollow"> while Admin view / #admin lock modal is active
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    let robots = document.head.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const existed = Boolean(robots);
    const prevContent = robots?.getAttribute('content') || 'index,follow';
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'noindex,nofollow');
    return () => {
      if (!robots) return;
      if (existed) {
        robots.setAttribute('content', prevContent);
      } else {
        robots.remove();
      }
    };
  }, [active]);

  // 60-second client lockout ticker after 5 failed attempts
  useEffect(() => {
    if (!lockoutUntil) {
      setRemainingLockoutSec(0);
      return;
    }
    const tick = () => {
      const diff = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (diff <= 0) {
        setLockoutUntil(null);
        setRemainingLockoutSec(0);
        setFailedAttempts(0);
      } else {
        setRemainingLockoutSec(diff);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [lockoutUntil]);

  // 15-minute inactivity auto-lock + JWT/HMAC exp watcher
  useEffect(() => {
    if (!active || !adminToken) return;

    let inactivityTimer: number;
    const resetInactivity = () => {
      window.clearTimeout(inactivityTimer);
      inactivityTimer = window.setTimeout(() => {
        lockAdminSession('Admin auto-locked after 15 minutes of inactivity.');
      }, ADMIN_INACTIVITY_MS);
    };

    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'pointerdown', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetInactivity, { passive: true }));
    resetInactivity();

    const expMs = decodeTokenExpMs(adminToken);
    const expChecker = window.setInterval(() => {
      if (expMs && Date.now() >= expMs) {
        lockAdminSession('Admin session token expired. Locked for security.');
      }
    }, 15000);

    return () => {
      window.clearTimeout(inactivityTimer);
      window.clearInterval(expChecker);
      events.forEach((ev) => window.removeEventListener(ev, resetInactivity));
    };
  }, [active, adminToken, lockAdminSession]);

  useEffect(() => {
    if (!active) return;
    setAuthError(null);
    if (authUser?.email && !adminEmail) {
      setAdminEmail(authUser.email);
    }
    if (!adminToken) {
      adminService
        .getAuthStatus()
        .then((s) => setConfigured(s.configured))
        .catch(() => setConfigured(true));
    }
  }, [active, adminToken, authUser?.email, adminEmail]);

  const loadAllAdminData = useCallback(
    async (token: string) => {
      setLoadingData(true);
      setDataError(null);
      try {
        const [ov, ords, usrs, fbs, prods, cats, pls, mans, terms] = await Promise.all([
          adminService.getOverview(token),
          adminService.listAllOrders(token),
          adminService.listAllUsers(token),
          adminService.listFeedbackThreads(token),
          adminService.listAdminProducts(token),
          productService.listCategories(),
          productService.listInstallmentPlans(),
          adminService.listManualEntries(token),
          productService.getTermsPolicy(),
        ]);
        setOverview(ov);
        setOrders(ords);
        setUsers(usrs);
        setFeedback(fbs);
        setProducts(prods);
        setCategories(cats);
        setPlans(pls);
        setManualEntries(mans);
        setTermsDoc(terms);
        if (cats.length > 0 && !prodCat) setProdCat(cats[0].id);
        if (usrs.length > 0 && !targetUserId) setTargetUserId(usrs[0].id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load admin workspace';
        if (/401|403|unauthori|expired|token|password/i.test(msg)) {
          showToast(msg, 'error');
          lockAdminSession();
        } else {
          setDataError(msg);
          showToast(msg, 'error');
        }
      } finally {
        setLoadingData(false);
      }
    },
    [lockAdminSession, prodCat, showToast, targetUserId]
  );

  useEffect(() => {
    if (active && adminToken) {
      loadAllAdminData(adminToken);
    }
  }, [active, adminToken, loadAllAdminData]);

  useEffect(() => {
    if (!selectedOrder) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedOrder(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedOrder]);

  const triggerAuthError = (msg: string) => {
    setAuthError(msg);
    setAuthBtnStatus('error');
    window.setTimeout(() => setAuthBtnStatus('idle'), 500);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authLoading || remainingLockoutSec > 0) return;
    setAuthError(null);
    setAuthBtnStatus('idle');

    if (isSupabaseMode && !adminEmail.trim() && !authUser?.email) {
      triggerAuthError('Admin email is required.');
      return;
    }
    if (!password) {
      triggerAuthError('Password is required.');
      return;
    }
    if (configured === false) {
      if (password.length < 8) {
        triggerAuthError('Initial admin password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        triggerAuthError('Passwords do not match.');
        return;
      }
    }

    setAuthLoading(true);
    try {
      const res =
        configured === false
          ? await adminService.setupInitialPassword(password)
          : await adminService.verifyAdminPassword(
              password,
              (adminEmail || authUser?.email || '').trim() || undefined
            );
      setAdminToken(res.token);
      setFailedAttempts(0);
      setLockoutUntil(null);
      setPassword('');
      setConfirmPassword('');
      setAuthBtnStatus('success');
      showToast('Admin session verified (15m auto-lock active).', 'success');
    } catch (err) {
      const nextFails = failedAttempts + 1;
      setFailedAttempts(nextFails);
      if (nextFails >= MAX_FAILED_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_SECONDS * 1000;
        setLockoutUntil(until);
        setRemainingLockoutSec(LOCKOUT_SECONDS);
        triggerAuthError(
          `Too many incorrect attempts. Locked for ${LOCKOUT_SECONDS}s (server rate limits also apply).`
        );
      } else {
        const base = err instanceof Error ? err.message : 'Verification failed.';
        triggerAuthError(`${base} (${MAX_FAILED_ATTEMPTS - nextFails} attempts remaining)`);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOrderStatus = async (orderId: string, status: OrderStatus) => {
    if (!adminToken) return;
    try {
      const updated = await adminService.updateOrderStatus(adminToken, orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      if (selectedOrder?.id === orderId) setSelectedOrder(updated);
      const ov = await adminService.getOverview(adminToken);
      setOverview(ov);
      showToast(
        status === 'complete' && updated.referralSellerId
          ? `Order ${orderId} completed · 10% commission credited.`
          : `Order ${orderId} updated to ${status}.`,
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  };

  const handleToggleInstallment = async (
    orderId: string,
    installmentNumber: number,
    paid: boolean,
    isAdvance = false
  ) => {
    if (!adminToken) return;
    try {
      const updated = await adminService.toggleInstallmentPayment(
        adminToken,
        orderId,
        installmentNumber,
        paid,
        isAdvance
      );
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      setSelectedOrder(updated);
      showToast('Installment ledger updated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update ledger', 'error');
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || sendingNotif) return;
    if (notifMode === 'user' && !targetUserId) {
      showToast('Please select a specific user to notify.', 'error');
      return;
    }
    if (!notifTitle.trim() || !notifMsg.trim()) {
      showToast('Title and message are required.', 'error');
      return;
    }
    setSendingNotif(true);
    try {
      await adminService.sendNotification(adminToken, {
        targetUserId: notifMode === 'all' ? null : targetUserId,
        title: notifTitle,
        message: notifMsg,
      });
      setNotifTitle('');
      setNotifMsg('');
      const recipient = users.find((u) => u.id === targetUserId);
      showToast(
        notifMode === 'all'
          ? 'Broadcast sent to all users.'
          : `Private notification sent to ${recipient?.name || 'selected user'}.`,
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Dispatch failed', 'error');
    } finally {
      setSendingNotif(false);
    }
  };

  const handleFeedbackReply = async (threadId: string) => {
    if (!adminToken || replyingFeedbackId) return;
    const text = (replyMap[threadId] || '').trim();
    if (!text) return;
    const targetThread = feedback.find((t) => t.id === threadId);
    setReplyingFeedbackId(threadId);
    try {
      const updated = await adminService.replyFeedbackThread(adminToken, threadId, text);
      setFeedback((prev) => prev.map((t) => (t.id === threadId ? updated : t)));
      setReplyMap((prev) => ({ ...prev, [threadId]: '' }));
      showToast(
        `Private reply sent to ${targetThread?.userName || 'customer'} only.`,
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to reply', 'error');
    } finally {
      setReplyingFeedbackId(null);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || savingProduct) return;
    const parsedProd = adminProductSchema.safeParse({
      title: prodTitle,
      price: prodPrice,
      costPrice: prodCost,
      categoryId: prodCat || categories[0]?.id,
      description: prodDesc,
    });
    if (!parsedProd.success) {
      showToast(parsedProd.error.issues[0]?.message || 'Check product details.', 'error');
      return;
    }
    setSavingProduct(true);
    try {
      const extraImages = prodExtra
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const saved = await adminService.saveProduct(adminToken, {
        id: editingId || undefined,
        title: parsedProd.data.title,
        price: parsedProd.data.price,
        costPrice: parsedProd.data.costPrice,
        categoryId: parsedProd.data.categoryId,
        description: parsedProd.data.description,
        coverImage: prodCover || undefined,
        extraImages,
      });
      setProducts((prev) =>
        editingId ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev]
      );
      setEditingId(null);
      setProdTitle('');
      setProdPrice('');
      setProdCost('');
      setProdDesc('');
      setProdCover('');
      setProdExtra('');
      const ov = await adminService.getOverview(adminToken);
      setOverview(ov);
      queryClient.invalidateQueries({ queryKey: ['home'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('Product saved.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save product', 'error');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleUploadCover = async (file: File | undefined) => {
    if (!file || uploadingCover) return;
    setUploadingCover(true);
    try {
      const url = await storageService.uploadImage(file, 'products');
      setProdCover(url);
      showToast('Cover image ready.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!adminToken || !newCatName.trim() || savingCategory) return;
    setSavingCategory(true);
    try {
      const created = await adminService.saveCategory(adminToken, { name: newCatName });
      setCategories((prev) => [...prev, created]);
      setProdCat(created.id);
      setNewCatName('');
      queryClient.invalidateQueries({ queryKey: ['home'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToast(`Category "${created.name}" created.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create category', 'error');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleSavePlans = async () => {
    if (!adminToken || savingPlans) return;
    setSavingPlans(true);
    try {
      const updated = await adminService.saveInstallmentPlans(adminToken, plans);
      setPlans(updated);
      showToast('Installment plans updated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update plans', 'error');
    } finally {
      setSavingPlans(false);
    }
  };

  const handleAddManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || savingManual) return;
    const parsedEntry = adminManualEntrySchema.safeParse({
      date: manualDate,
      label: manualLabel,
      revenue: manualRevenue || 0,
      costOfGoods: manualCogs || 0,
      commissionAmount: manualCommission || 0,
      ordersCount: manualOrdersCount || 1,
      notes: manualNotes.trim() || undefined,
    });
    if (!parsedEntry.success) {
      showToast(parsedEntry.error.issues[0]?.message || 'Check manual entry fields.', 'error');
      return;
    }
    setSavingManual(true);
    try {
      const created = await adminService.addManualEntry(adminToken, {
        date: parsedEntry.data.date,
        label: parsedEntry.data.label,
        revenue: parsedEntry.data.revenue,
        costOfGoods: parsedEntry.data.costOfGoods,
        commissionAmount: parsedEntry.data.commissionAmount,
        ordersCount: parsedEntry.data.ordersCount,
        notes: parsedEntry.data.notes,
      });
      setManualEntries((prev) => [created, ...prev]);
      const ov = await adminService.getOverview(adminToken);
      setOverview(ov);
      setManualLabel('');
      setManualRevenue('');
      setManualCogs('');
      setManualOrdersCount('1');
      setManualCommission('0');
      setManualNotes('');
      setManualFormOpen(false);
      showToast('Manual dashboard entry added & charts updated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not add manual entry', 'error');
    } finally {
      setSavingManual(false);
    }
  };

  const handleDeleteManualEntry = async (entryId: string) => {
    if (!adminToken) return;
    try {
      await adminService.deleteManualEntry(adminToken, entryId);
      setManualEntries((prev) => prev.filter((m) => m.id !== entryId));
      const ov = await adminService.getOverview(adminToken);
      setOverview(ov);
      showToast('Manual entry removed.', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete entry', 'error');
    }
  };

  const handleSaveTermsPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    const parsedTerms = adminTermsSchema.safeParse({
      effectiveLabel: termsDoc.effectiveLabel,
      title: termsDoc.title,
      sections: termsDoc.sections,
      footerNote: termsDoc.footerNote,
    });
    if (!parsedTerms.success) {
      showToast(parsedTerms.error.issues[0]?.message || 'Check policy fields.', 'error');
      return;
    }
    setSavingTerms(true);
    try {
      const saved = await adminService.saveTermsPolicy(adminToken, {
        effectiveLabel: parsedTerms.data.effectiveLabel,
        title: parsedTerms.data.title,
        sections: parsedTerms.data.sections,
        footerNote: parsedTerms.data.footerNote,
      });
      setTermsDoc(saved);
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      showToast('Terms & Policy updated live on /terms.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update Terms & Policy', 'error');
    } finally {
      setSavingTerms(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.id.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.sellerCode || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  const isModal = mode === 'modal';

  const adminBusy =
    savingTerms ||
    savingManual ||
    sendingNotif ||
    savingProduct ||
    uploadingCover ||
    savingCategory ||
    savingPlans;

  // Dedicated Full-Screen Glass Lock Screen when not yet verified
  if (!adminToken) {
    return (
      <div
        className={
          isModal
            ? 'glass-panel ca-fade-in relative w-full max-w-md overflow-hidden rounded-2xl p-6 shadow-xl sm:p-8'
            : 'glass-panel ca-fade-in relative mx-auto my-8 w-full max-w-md overflow-hidden rounded-2xl p-6 sm:p-8'
        }
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ca-accent)]/12 font-display text-sm font-semibold text-[var(--ca-accent)]">
              CA
            </div>
            <h2 className="font-display text-2xl font-semibold text-[var(--ca-text)]">
              {configured === false ? 'Set Admin Password' : 'Admin Lock Screen'}
            </h2>
          </div>

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close admin lock screen"
              className="btn-press inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--ca-text-muted)] hover:bg-[var(--ca-surface-subtle)] hover:text-[var(--ca-text)]"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <p className="text-xs leading-relaxed text-[var(--ca-text-muted)]">
          {configured === false
            ? 'No ADMIN_PASSWORD env secret is set yet. Claim your initial admin password (hashed server-side).'
            : 'Enter your server-verified administrator password to unlock. Sessions auto-lock after 15 minutes of inactivity.'}
        </p>

        <form onSubmit={handleAuthSubmit} className="mt-5 space-y-4">
          {authError && remainingLockoutSec === 0 && (
            <div
              role="alert"
              className="ca-shake rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-600 dark:text-red-400"
            >
              {authError}
            </div>
          )}

          {remainingLockoutSec > 0 && (
            <div
              role="alert"
              aria-live="polite"
              className="ca-shake rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-300"
            >
              Too many incorrect attempts. Locked for{' '}
              <span className="font-mono-nums font-bold">{remainingLockoutSec}s</span> (backend rate limits also apply).
            </div>
          )}

          {isSupabaseMode && configured !== false && (
            <div>
              <label
                htmlFor="admin-email-input"
                className="block text-xs font-medium text-[var(--ca-text-muted)]"
              >
                Admin Email
              </label>
              <input
                id="admin-email-input"
                type="email"
                required
                value={adminEmail}
                disabled={remainingLockoutSec > 0}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none disabled:opacity-50"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="admin-password-input"
              className="block text-xs font-medium text-[var(--ca-text-muted)]"
            >
              Admin Password
            </label>
            <div className="relative mt-1">
              <input
                id="admin-password-input"
                type={showPwd ? 'text' : 'password'}
                value={password}
                disabled={remainingLockoutSec > 0}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus={isModal}
                placeholder="Enter administrator password"
                className={`w-full rounded-xl border bg-[var(--ca-surface-solid)] px-3.5 py-2.5 pr-12 text-sm text-[var(--ca-text)] focus:outline-none disabled:opacity-50 ${
                  authError
                    ? 'border-red-500/70 focus:border-red-500'
                    : 'border-[var(--ca-border)] focus:border-[var(--ca-accent)]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label="Toggle password visibility"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {configured === false && (
            <div>
              <label
                htmlFor="admin-password-confirm"
                className="block text-xs font-medium text-[var(--ca-text-muted)]"
              >
                Confirm Admin Password
              </label>
              <input
                id="admin-password-confirm"
                type={showPwd ? 'text' : 'password'}
                value={confirmPassword}
                disabled={remainingLockoutSec > 0}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none disabled:opacity-50"
              />
            </div>
          )}

          <CAProcessButton
            type="submit"
            loading={authLoading}
            status={authBtnStatus}
            disabled={remainingLockoutSec > 0}
            className="w-full rounded-xl bg-[var(--ca-text)] py-3 text-sm font-semibold text-[var(--ca-bg)] hover:opacity-90"
          >
            <Lock className="h-4 w-4" />
            {configured === false
              ? 'Claim Password & Unlock'
              : remainingLockoutSec > 0
              ? `Locked (${remainingLockoutSec}s)`
              : 'Unlock'}
          </CAProcessButton>

          <div className="flex items-center justify-between pt-1 text-xs">
            {isModal && onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="btn-press inline-flex min-h-[44px] items-center gap-1.5 font-medium text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to site
              </button>
            ) : (
              <Link
                to="/"
                className="btn-press inline-flex min-h-[44px] items-center gap-1.5 font-medium text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to site
              </Link>
            )}
            <span className="text-[11px] text-[var(--ca-text-muted)]">
              Backend rate-limited
            </span>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      className={
        isModal
          ? 'glass-panel ca-fade-in flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl shadow-xl'
          : 'glass-panel ca-fade-in flex w-full flex-col overflow-hidden rounded-2xl'
      }
    >
      <CALoadingOverlay
        open={adminBusy}
        label={
          uploadingCover
            ? 'Uploading image...'
            : savingTerms
            ? 'Saving Terms & Policy...'
            : 'Saving changes...'
        }
      />

      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--ca-border)] px-4 py-3.5 sm:px-7 sm:py-4">
        <div className="flex min-w-0 items-center gap-2">
          <Lock className="h-4 w-4 shrink-0 text-[var(--ca-accent)]" />
          <span className="font-display truncate text-base font-semibold text-[var(--ca-text)] sm:text-xl">
            CA Admin Console
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => lockAdminSession('Admin console locked.')}
            className="btn-press inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[var(--ca-border)] px-3 py-1.5 text-xs font-medium text-[var(--ca-text-muted)] hover:bg-[var(--ca-surface-subtle)] hover:text-[var(--ca-text)]"
          >
            <Lock className="h-3.5 w-3.5" />
            Lock
          </button>
          {isModal && onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close admin panel"
              className="btn-press inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--ca-text-muted)] hover:bg-[var(--ca-surface-subtle)] hover:text-[var(--ca-text)]"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            <Link
              to="/"
              className="btn-press inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-[var(--ca-border)] px-3 py-1.5 text-xs font-medium text-[var(--ca-text-muted)] hover:bg-[var(--ca-surface-subtle)] hover:text-[var(--ca-text)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to site
            </Link>
          )}
        </div>
      </div>

      <div className={isModal ? 'flex flex-1 flex-col overflow-hidden' : 'flex flex-col'}>
        {/* Section Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-[var(--ca-border)] px-5 py-2.5 sm:px-7">
          {(
            [
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'orders', label: `Orders (${orders.length})`, icon: ShoppingCart },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'feedback', label: `Feedback (${feedback.length})`, icon: MessageSquare },
              { id: 'products', label: 'Products & Plans', icon: Package },
              { id: 'terms', label: 'Terms & Policy', icon: FileText },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`btn-press inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-medium transition-colors ${
                  tab === item.id
                    ? 'bg-[var(--ca-text)] text-[var(--ca-bg)]'
                    : 'text-[var(--ca-text-muted)] hover:bg-[var(--ca-surface-subtle)] hover:text-[var(--ca-text)]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className={isModal ? 'flex-1 overflow-y-auto p-5 sm:p-7' : 'p-5 sm:p-7'}>
          {loadingData && !overview ? (
            <AdminWorkspaceSkeleton />
          ) : dataError && !overview ? (
            <FriendlyErrorState
              title="Could not load admin workspace"
              message={dataError}
              onRetry={() => adminToken && loadAllAdminData(adminToken)}
            />
          ) : (
            <div className="ca-fade-in">
                {/* 1. DASHBOARD */}
                {tab === 'dashboard' && overview && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-xl bg-[var(--ca-surface-subtle)] p-4">
                        <span className="text-xs text-[var(--ca-text-muted)]">Completed Revenue</span>
                        <p className="font-mono-nums mt-1 text-xl font-bold text-[var(--ca-text)]">
                          {formatPKR(overview.revenue)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[var(--ca-surface-subtle)] p-4">
                        <span className="text-xs text-[var(--ca-text-muted)]">Gross Profit</span>
                        <p className="font-mono-nums mt-1 text-xl font-bold text-[var(--ca-text)]">
                          {formatPKR(overview.grossProfit)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[var(--ca-surface-subtle)] p-4">
                        <span className="text-xs text-[var(--ca-text-muted)]">
                          Net Profit ({overview.profitMarginPct}% Margin)
                        </span>
                        <p className="font-mono-nums mt-1 text-xl font-bold text-[var(--ca-text)]">
                          {formatPKR(overview.netProfit)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[var(--ca-surface-subtle)] p-4">
                        <span className="text-xs text-[var(--ca-text-muted)]">Total Orders</span>
                        <p className="font-mono-nums mt-1 text-xl font-bold text-[var(--ca-text)]">
                          {overview.ordersCount} ({overview.pendingOrdersCount} pending)
                        </p>
                      </div>
                      <div className="rounded-xl bg-[var(--ca-surface-subtle)] p-4">
                        <span className="text-xs text-[var(--ca-text-muted)]">
                          Seller Commissions Payable (10%)
                        </span>
                        <p className="font-mono-nums mt-1 text-xl font-bold text-[var(--ca-accent)]">
                          {formatPKR(overview.commissionsPayable)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[var(--ca-surface-subtle)] p-4">
                        <span className="text-xs text-[var(--ca-text-muted)]">Cost of Goods Sold</span>
                        <p className="font-mono-nums mt-1 text-xl font-bold text-[var(--ca-text)]">
                          {formatPKR(overview.costOfGoods)}
                        </p>
                      </div>
                    </div>

                    {/* Charts by Day & Month */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="rounded-xl bg-[var(--ca-surface-subtle)] p-5">
                        <h3 className="text-sm font-semibold text-[var(--ca-text)]">
                          Orders &amp; Volume by Day
                        </h3>
                        <div className="mt-4 flex h-40 items-end gap-3 overflow-x-auto">
                          {overview.dailySeries.length === 0 ? (
                            <p className="text-xs text-[var(--ca-text-muted)]">No daily activity yet.</p>
                          ) : (
                            overview.dailySeries.map((d) => {
                              const max = Math.max(...overview.dailySeries.map((x) => x.revenue), 1);
                              const pct = Math.max(12, Math.round((d.revenue / max) * 100));
                              return (
                                <div key={d.label} className="flex min-w-[2.5rem] max-w-12 flex-1 flex-col items-center gap-1.5">
                                  <span className="font-mono-nums text-[10px] text-[var(--ca-text-muted)]">
                                    {d.orders}
                                  </span>
                                  <div className="flex h-24 w-full items-end rounded-lg bg-[var(--ca-surface-subtle)] p-1">
                                    <div
                                      style={{ height: `${pct}%` }}
                                      className="w-full rounded bg-[var(--ca-text)]"
                                      title={`${d.label}: ${formatPKR(d.revenue)}`}
                                    />
                                  </div>
                                  <span className="font-mono-nums text-[10px] text-[var(--ca-text-muted)]">
                                    {d.label}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl bg-[var(--ca-surface-subtle)] p-5">
                        <h3 className="text-sm font-semibold text-[var(--ca-text)]">
                          Monthly Completed Revenue vs Net Profit
                        </h3>
                        <div className="mt-4 space-y-3">
                          {overview.monthlySeries.length === 0 ? (
                            <p className="text-xs text-[var(--ca-text-muted)]">No completed months yet.</p>
                          ) : (
                            overview.monthlySeries.map((m) => {
                              const max = Math.max(...overview.monthlySeries.map((x) => x.revenue), 1);
                              const revPct = m.revenue > 0 ? Math.max(4, Math.round((m.revenue / max) * 100)) : 0;
                              const profPct = m.profit > 0 ? Math.max(4, Math.round((m.profit / max) * 100)) : 0;
                              return (
                                <div key={m.label} className="space-y-1">
                                  <div className="flex flex-wrap justify-between gap-2 text-xs">
                                    <span className="font-mono-nums font-medium">{m.label}</span>
                                    <span className="font-mono-nums text-[var(--ca-text-muted)]">
                                      {formatPKR(m.revenue)} · Profit {formatPKR(m.profit)}
                                    </span>
                                  </div>
                                  <div className="h-2.5 w-full overflow-hidden rounded-sm bg-[var(--ca-surface-solid)]">
                                    <div
                                      style={{ width: `${revPct}%` }}
                                      className="h-full bg-[var(--ca-text)]"
                                    />
                                  </div>
                                  <div className="h-1.5 w-full overflow-hidden rounded-sm bg-[var(--ca-surface-solid)]">
                                    <div
                                      style={{ width: `${profPct}%` }}
                                      className="h-full bg-[var(--ca-accent)]"
                                    />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Manual Dashboard Data Entry & Ledger */}
                    <div className="rounded-xl bg-[var(--ca-surface-subtle)] p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-[var(--ca-text)]">
                            Manual Dashboard Data Entries
                          </h3>
                          <p className="text-xs text-[var(--ca-text-muted)]">
                            Record offline store sales, COGS, and commissions so KPIs and charts reflect all business figures.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setManualFormOpen((v) => !v)}
                          className="btn-press inline-flex items-center gap-1.5 rounded-xl bg-[var(--ca-text)] px-3.5 py-2 text-xs font-semibold text-[var(--ca-bg)]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {manualFormOpen ? 'Close Entry Form' : 'Add Manual Entry'}
                        </button>
                      </div>

                      {manualFormOpen && (
                        <form
                          onSubmit={handleAddManualEntry}
                          className="grid grid-cols-1 gap-3 rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-bg)] p-4 sm:grid-cols-3"
                        >
                          <div>
                            <label className="block text-[11px] text-[var(--ca-text-muted)]">
                              Entry Date *
                            </label>
                            <input
                              type="date"
                              required
                              value={manualDate}
                              onChange={(e) => setManualDate(e.target.value)}
                              className="font-mono-nums mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] text-[var(--ca-text-muted)]">
                              Batch / Sale Description *
                            </label>
                            <input
                              type="text"
                              required
                              value={manualLabel}
                              onChange={(e) => setManualLabel(e.target.value)}
                              placeholder="e.g. Store Walk-In Batch"
                              className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[var(--ca-text-muted)]">
                              Revenue (PKR) *
                            </label>
                            <input
                              type="number"
                              min={0}
                              required
                              value={manualRevenue}
                              onChange={(e) => setManualRevenue(e.target.value)}
                              placeholder="25000"
                              className="font-mono-nums mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[var(--ca-text-muted)]">
                              Cost of Goods (PKR) *
                            </label>
                            <input
                              type="number"
                              min={0}
                              required
                              value={manualCogs}
                              onChange={(e) => setManualCogs(e.target.value)}
                              placeholder="14000"
                              className="font-mono-nums mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[var(--ca-text-muted)]">
                              Orders Count
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={manualOrdersCount}
                              onChange={(e) => setManualOrdersCount(e.target.value)}
                              className="font-mono-nums mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[var(--ca-text-muted)]">
                              Commission Paid/Payable (PKR)
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={manualCommission}
                              onChange={(e) => setManualCommission(e.target.value)}
                              className="font-mono-nums mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] text-[var(--ca-text-muted)]">
                              Notes (optional)
                            </label>
                            <input
                              type="text"
                              value={manualNotes}
                              onChange={(e) => setManualNotes(e.target.value)}
                              placeholder="Optional batch details"
                              className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs"
                            />
                          </div>
                          <div className="sm:col-span-3 flex justify-end">
                            <CAProcessButton
                              type="submit"
                              loading={savingManual}
                              className="rounded-xl bg-[var(--ca-accent)] px-4 py-2 text-xs font-semibold text-[var(--ca-accent-fg)]"
                            >
                              Save &amp; Update Dashboard
                            </CAProcessButton>
                          </div>
                        </form>
                      )}

                      {manualEntries.length === 0 ? (
                        <p className="text-xs text-[var(--ca-text-muted)]">
                          No manual dashboard entries recorded.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {manualEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3.5 py-2.5 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-[var(--ca-text)]">
                                  {entry.label}{' '}
                                  <span className="font-mono-nums font-normal text-[var(--ca-text-muted)]">
                                    · {entry.date} ({entry.ordersCount}{' '}
                                    {entry.ordersCount === 1 ? 'order' : 'orders'})
                                  </span>
                                </p>
                                <p className="font-mono-nums mt-0.5 text-[11px] text-[var(--ca-text-muted)]">
                                  Revenue {formatPKR(entry.revenue)} · COGS {formatPKR(entry.costOfGoods)}
                                  {entry.commissionAmount > 0
                                    ? ` · Commission ${formatPKR(entry.commissionAmount)}`
                                    : ''}
                                  {entry.notes ? ` · ${entry.notes}` : ''}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteManualEntry(entry.id)}
                                aria-label={`Delete ${entry.label}`}
                                className="rounded-lg border border-red-500/20 p-1.5 text-red-600 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. ORDERS (Click any card -> Glassmorphism Popup Modal) */}
                {tab === 'orders' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ca-text-muted)]">
                      <span>Tap any order card to open full customer &amp; installment details.</span>
                      <span className="font-mono-nums font-medium text-[var(--ca-text)]">
                        {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                      </span>
                    </div>

                    {orders.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[var(--ca-border)] p-8 text-center text-xs text-[var(--ca-text-muted)]">
                        No orders placed yet.
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {orders.slice(0, visibleOrdersCount).map((ord) => (
                            <button
                              key={ord.id}
                              type="button"
                              onClick={() => setSelectedOrder(ord)}
                              className={`btn-press flex w-full flex-col justify-between rounded-xl p-4 text-left transition-all ${
                                selectedOrder?.id === ord.id
                                  ? 'bg-[var(--ca-surface-subtle)] ring-1 ring-[var(--ca-accent)]'
                                  : 'bg-[var(--ca-surface-subtle)]/75 hover:bg-[var(--ca-surface-subtle)]'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono-nums text-xs font-bold text-[var(--ca-text)]">
                                    {ord.id}
                                  </span>
                                  <span className="rounded-full bg-[var(--ca-accent)]/12 px-2.5 py-0.5 text-[11px] font-medium capitalize text-[var(--ca-accent)]">
                                    {ord.status}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm font-semibold text-[var(--ca-text)]">
                                  {ord.customerName}
                                </p>
                                <p className="font-mono-nums text-xs text-[var(--ca-text-muted)]">
                                  {ord.city} · {maskPhone(ord.phone)}
                                </p>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
                                <span className="text-[var(--ca-text-muted)]">
                                  {ord.paymentMethod === 'installments'
                                    ? `Installments (${ord.planLabel})`
                                    : 'Cash on Delivery'}
                                  {ord.referralCode ? ` · Ref ${ord.referralCode}` : ''}
                                </span>
                                <span className="font-mono-nums font-semibold text-[var(--ca-text)]">
                                  {formatPKR(ord.totalAmount)}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                        {orders.length > visibleOrdersCount && (
                          <div className="flex justify-center pt-2">
                            <button
                              type="button"
                              onClick={() => setVisibleOrdersCount((c) => c + 12)}
                              className="btn-press rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-4 py-2 text-xs font-semibold text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]"
                            >
                              Load More Orders ({orders.length - visibleOrdersCount} remaining)
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* 3. NOTIFICATIONS */}
                {tab === 'notifications' && (
                  <form onSubmit={handleSendNotification} className="max-w-xl space-y-4">
                    <div className="flex gap-2 rounded-xl bg-[var(--ca-surface-subtle)] p-1">
                      <button
                        type="button"
                        onClick={() => setNotifMode('user')}
                        className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
                          notifMode === 'user'
                            ? 'bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm'
                            : 'text-[var(--ca-text-muted)]'
                        }`}
                      >
                        Specific User (Private)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifMode('all')}
                        className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
                          notifMode === 'all'
                            ? 'bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm'
                            : 'text-[var(--ca-text-muted)]'
                        }`}
                      >
                        Broadcast to All Users
                      </button>
                    </div>

                    {notifMode === 'user' && (
                      <div className="space-y-2 rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] p-4">
                        <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                          Select Customer or Seller (only this account receives the message)
                        </label>
                        <input
                          type="text"
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          placeholder="Search name, email, user ID, or CA-..."
                          className="w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-xs"
                        />
                        <div className="max-h-44 space-y-1 overflow-y-auto">
                          {filteredUsers.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => setTargetUserId(u.id)}
                              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs ${
                                targetUserId === u.id
                                  ? 'bg-[var(--ca-text)] text-[var(--ca-bg)]'
                                  : 'hover:bg-[var(--ca-surface-subtle)]'
                              }`}
                            >
                              <span className="truncate font-medium">
                                {u.name} <span className="opacity-70">({u.email})</span>
                              </span>
                              <span className="font-mono-nums shrink-0 opacity-75">
                                {u.sellerCode ? `${u.sellerCode} · ` : ''}
                                {u.id}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div
                      className={`rounded-xl border px-3.5 py-2.5 text-xs ${
                        notifMode === 'all'
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200'
                          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                      }`}
                    >
                      {notifMode === 'all' ? (
                        <span>Notice: This will broadcast to every registered user.</span>
                      ) : (
                        <span>
                          Private Recipient:{' '}
                          <strong>
                            {users.find((u) => u.id === targetUserId)?.name || 'None selected'}
                          </strong>
                          {users.find((u) => u.id === targetUserId)?.email
                            ? ` (${users.find((u) => u.id === targetUserId)?.email})`
                            : ''}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                        Notification Title
                      </label>
                      <input
                        type="text"
                        value={notifTitle}
                        onChange={(e) => setNotifTitle(e.target.value)}
                        placeholder="Eid Collection Dispatch Schedule"
                        className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                        Message
                      </label>
                      <textarea
                        rows={3}
                        value={notifMsg}
                        onChange={(e) => setNotifMsg(e.target.value)}
                        placeholder="Write your announcement or direct update..."
                        className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2 text-sm"
                      />
                    </div>

                    <CAProcessButton
                      type="submit"
                      loading={sendingNotif}
                      className="rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-sm font-semibold text-[var(--ca-bg)]"
                    >
                      {notifMode === 'all' ? 'Send Broadcast to All' : 'Send Private Notification'}
                    </CAProcessButton>
                  </form>
                )}

                {/* 4. FEEDBACK & COMPLAINTS (User-Targeted Private Support Inbox) */}
                {tab === 'feedback' && (() => {
                  const uniqueSenders = Array.from(
                    new Map(
                      feedback.map((t) => [
                        t.userId,
                        { id: t.userId, name: t.userName, email: t.userEmail },
                      ])
                    ).values()
                  );
                  const filteredThreads = feedback.filter((t) => {
                    if (feedbackUserFilter !== 'all' && t.userId !== feedbackUserFilter) return false;
                    if (feedbackStatusFilter !== 'all' && t.status !== feedbackStatusFilter) return false;
                    const q = feedbackSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      t.userName.toLowerCase().includes(q) ||
                      t.userEmail.toLowerCase().includes(q) ||
                      t.userId.toLowerCase().includes(q) ||
                      t.subject.toLowerCase().includes(q)
                    );
                  });

                  return (
                    <div className="space-y-4">
                      {/* Specific User Filter & Search Controls */}
                      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] p-4 sm:grid-cols-3">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ca-text-muted)]" />
                          <input
                            type="text"
                            value={feedbackSearch}
                            onChange={(e) => setFeedbackSearch(e.target.value)}
                            placeholder="Search user name, email, or subject..."
                            aria-label="Search feedback by user or subject"
                            className="w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] py-2 pl-8 pr-3 text-xs"
                          />
                        </div>

                        <select
                          aria-label="Filter feedback by specific user"
                          value={feedbackUserFilter}
                          onChange={(e) => setFeedbackUserFilter(e.target.value)}
                          className="w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-xs"
                        >
                          <option value="all">All Users Who Sent Feedback ({uniqueSenders.length})</option>
                          {uniqueSenders.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.email})
                            </option>
                          ))}
                        </select>

                        <div className="flex gap-1 rounded-xl bg-[var(--ca-surface-subtle)] p-1 text-xs">
                          {(
                            [
                              { id: 'all', label: 'All' },
                              { id: 'open', label: 'Needs Reply' },
                              { id: 'replied', label: 'Replied' },
                            ] as const
                          ).map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => setFeedbackStatusFilter(st.id)}
                              className={`flex-1 rounded-lg py-1.5 font-medium ${
                                feedbackStatusFilter === st.id
                                  ? 'bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm'
                                  : 'text-[var(--ca-text-muted)]'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {filteredThreads.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-[var(--ca-border)] p-8 text-center text-sm text-[var(--ca-text-muted)]">
                          No customer feedback threads match this filter.
                        </p>
                      ) : (
                        filteredThreads.map((thread) => (
                          <div
                            key={thread.id}
                            className="space-y-3 rounded-xl bg-[var(--ca-surface-subtle)] p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                              <div>
                                <p className="text-sm font-semibold text-[var(--ca-text)]">
                                  {thread.subject}
                                </p>
                                <p className="mt-0.5 text-xs text-[var(--ca-text-muted)]">
                                  From: <strong className="text-[var(--ca-text)]">{thread.userName}</strong>{' '}
                                  ({thread.userEmail}) · <span className="font-mono-nums">{thread.userId}</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
                                    thread.status === 'open'
                                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                  }`}
                                >
                                  {thread.status === 'open' ? 'Needs reply' : thread.status}
                                </span>
                                {feedbackUserFilter !== thread.userId && (
                                  <button
                                    type="button"
                                    onClick={() => setFeedbackUserFilter(thread.userId)}
                                    className="rounded-lg border border-[var(--ca-border)] px-2 py-1 text-[11px] font-medium text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"
                                  >
                                    Focus User
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              {thread.messages.map((m) => (
                                <div
                                  key={m.id}
                                  className={`rounded-xl px-3.5 py-2.5 text-xs ${
                                    m.senderRole === 'admin'
                                      ? 'bg-[var(--ca-accent)]/12 text-[var(--ca-text)]'
                                      : 'bg-[var(--ca-surface-subtle)] text-[var(--ca-text)]'
                                  }`}
                                >
                                  <span className="font-semibold">{m.senderName}: </span>
                                  <span>{m.body}</span>
                                </div>
                              ))}
                            </div>

                            <div className="space-y-1.5 rounded-xl bg-[var(--ca-surface-subtle)]/70 p-2.5">
                              <p className="flex items-start gap-1.5 text-[11px] leading-relaxed font-medium text-[var(--ca-text-muted)]">
                                <UserCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <span>
                                  Replying privately to{' '}
                                  <strong className="text-[var(--ca-text)]">{thread.userName}</strong>{' '}
                                  ({thread.userEmail}) only
                                </span>
                              </p>
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <input
                                  type="text"
                                  value={replyMap[thread.id] || ''}
                                  onChange={(e) =>
                                    setReplyMap((prev) => ({ ...prev, [thread.id]: e.target.value }))
                                  }
                                  placeholder={`Write private reply to ${thread.userName}...`}
                                  className="flex-1 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-xs"
                                />
                                <CAProcessButton
                                  type="button"
                                  loading={replyingFeedbackId === thread.id}
                                  onClick={() => handleFeedbackReply(thread.id)}
                                  className="rounded-xl bg-[var(--ca-text)] px-4 py-2 text-xs font-semibold text-[var(--ca-bg)]"
                                >
                                  Reply to {thread.userName.split(' ')[0]}
                                </CAProcessButton>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })()}

                {/* 5. PRODUCTS, CATEGORIES & INSTALLMENT PLANS */}
                {tab === 'products' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      {/* Add/Edit Product */}
                      <form
                        onSubmit={handleSaveProduct}
                        className="space-y-3 rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] p-5"
                      >
                        <h3 className="text-sm font-semibold">
                          {editingId ? 'Edit Product' : 'Add New Product'}
                        </h3>
                        <input
                          type="text"
                          required
                          value={prodTitle}
                          onChange={(e) => setProdTitle(e.target.value)}
                          placeholder="Product Title"
                          className="w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-sm"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="number"
                            required
                            value={prodPrice}
                            onChange={(e) => setProdPrice(e.target.value)}
                            placeholder="Selling Price (PKR)"
                            className="font-mono-nums w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-sm"
                          />
                          <input
                            type="number"
                            required
                            value={prodCost}
                            onChange={(e) => setProdCost(e.target.value)}
                            placeholder="Cost Price (PKR)"
                            className="font-mono-nums w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-sm"
                          />
                        </div>
                        <select
                          value={prodCat}
                          onChange={(e) => setProdCat(e.target.value)}
                          className="w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-sm"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <textarea
                          rows={2}
                          value={prodDesc}
                          onChange={(e) => setProdDesc(e.target.value)}
                          placeholder="Product description..."
                          className="w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-sm"
                        />
                        <div className="space-y-1.5">
                          <label className="block text-xs text-[var(--ca-text-muted)]">
                            Cover Image (upload or URL)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={prodCover}
                              onChange={(e) => setProdCover(e.target.value)}
                              placeholder="/src/assets/images/..."
                              className="min-w-0 flex-1 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-xs"
                            />
                            <label className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--ca-border)] px-3 py-2 text-xs font-medium hover:bg-[var(--ca-surface-subtle)]">
                              {uploadingCover ? <CALoader size="sm" /> : null}
                              <span>{uploadingCover ? 'Uploading...' : 'Upload'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={uploadingCover}
                                className="hidden"
                                onChange={(e) => handleUploadCover(e.target.files?.[0])}
                              />
                            </label>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={prodExtra}
                          onChange={(e) => setProdExtra(e.target.value)}
                          placeholder="Extra gallery image URLs (comma-separated)"
                          className="w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-xs"
                        />
                        <div className="flex gap-2 pt-1">
                          <CAProcessButton
                            type="submit"
                            loading={savingProduct}
                            className="rounded-xl bg-[var(--ca-text)] px-4 py-2 text-xs font-semibold text-[var(--ca-bg)]"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {editingId ? 'Save Changes' : 'Create Product'}
                          </CAProcessButton>
                          {editingId && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(null);
                                setProdTitle('');
                                setProdPrice('');
                                setProdCost('');
                                setProdDesc('');
                                setProdCover('');
                                setProdExtra('');
                              }}
                              className="rounded-xl border border-[var(--ca-border)] px-3 py-2 text-xs"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </form>

                      {/* Existing Products & Category Creator */}
                      <div className="space-y-4">
                        <div className="flex gap-2 rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] p-4">
                          <input
                            type="text"
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            placeholder="New category name..."
                            className="min-w-0 flex-1 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-xs"
                          />
                          <CAProcessButton
                            type="button"
                            loading={savingCategory}
                            onClick={handleCreateCategory}
                            className="shrink-0 rounded-xl bg-[var(--ca-text)] px-3.5 py-2 text-xs font-semibold text-[var(--ca-bg)]"
                          >
                            Add Category
                          </CAProcessButton>
                        </div>

                        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                          {products.slice(0, visibleProductsCount).map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] p-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-[var(--ca-text)]">
                                  {p.title}
                                </p>
                                <p className="font-mono-nums text-[11px] text-[var(--ca-text-muted)]">
                                  Sell {formatPKR(p.price)} · Cost {formatPKR(p.costPrice || 0)} ·{' '}
                                  {p.categoryName}
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(p.id);
                                    setProdTitle(p.title);
                                    setProdPrice(String(p.price));
                                    setProdCost(String(p.costPrice || 0));
                                    setProdCat(p.categoryId);
                                    setProdDesc(p.description);
                                    setProdCover(p.coverImage);
                                    setProdExtra((p.extraImages || []).join(', '));
                                  }}
                                  className="rounded-lg border border-[var(--ca-border)] px-2.5 py-1 text-xs"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!adminToken) return;
                                    await adminService.deleteProduct(adminToken, p.id);
                                    setProducts((prev) => prev.filter((x) => x.id !== p.id));
                                    queryClient.invalidateQueries({ queryKey: ['home'] });
                                    queryClient.invalidateQueries({ queryKey: ['products'] });
                                    showToast('Product removed.', 'info');
                                  }}
                                  aria-label={`Delete ${p.title}`}
                                  className="rounded-lg border border-red-500/20 p-1.5 text-red-600 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {products.length > visibleProductsCount && (
                            <button
                              type="button"
                              onClick={() => setVisibleProductsCount((c) => c + 24)}
                              className="w-full rounded-xl border border-[var(--ca-border)] py-2 text-xs font-medium text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]"
                            >
                              Show More Products ({products.length - visibleProductsCount} remaining)
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Global Installment Plan Settings */}
                    <div className="rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold">Global Installment Plan Settings</h3>
                          <p className="text-xs text-[var(--ca-text-muted)]">
                            Changes apply immediately across the Calculator and all product Buy screens.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const nextMonths = plans.length > 0 ? Math.max(...plans.map((p) => p.months)) + 1 : 2;
                              setPlans((prev) => [
                                ...prev,
                                {
                                  id: `plan-${nextMonths}m-${Date.now().toString(36)}`,
                                  label: `${nextMonths} Months`,
                                  months: nextMonths,
                                  advancePercent: 0,
                                  markupPercent: 15,
                                  active: true,
                                },
                              ]);
                            }}
                            className="inline-flex items-center gap-1 rounded-xl border border-[var(--ca-border)] px-3 py-2 text-xs font-medium hover:bg-[var(--ca-surface-subtle)]"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Plan
                          </button>
                          <CAProcessButton
                            type="button"
                            loading={savingPlans}
                            onClick={handleSavePlans}
                            className="rounded-xl bg-[var(--ca-text)] px-4 py-2 text-xs font-semibold text-[var(--ca-bg)]"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Save Plans
                          </CAProcessButton>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {plans.map((pl, idx) => (
                          <div
                            key={pl.id}
                            className="space-y-2 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] p-3 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <input
                                type="text"
                                value={pl.label}
                                onChange={(e) => {
                                  const next = [...plans];
                                  next[idx] = { ...pl, label: e.target.value };
                                  setPlans(next);
                                }}
                                aria-label="Plan label"
                                className="min-w-0 flex-1 rounded-lg border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-2 py-1 font-semibold"
                              />
                              <input
                                type="checkbox"
                                checked={pl.active}
                                onChange={(e) => {
                                  const next = [...plans];
                                  next[idx] = { ...pl, active: e.target.checked };
                                  setPlans(next);
                                }}
                                aria-label={`Enable ${pl.label}`}
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[11px] text-[var(--ca-text-muted)]">
                                  Months
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={36}
                                  value={pl.months}
                                  onChange={(e) => {
                                    const next = [...plans];
                                    next[idx] = { ...pl, months: Number(e.target.value) };
                                    setPlans(next);
                                  }}
                                  className="font-mono-nums mt-0.5 w-full rounded-lg border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-2 py-1"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] text-[var(--ca-text-muted)]">
                                  Interest Rate %
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={200}
                                  value={pl.markupPercent}
                                  onChange={(e) => {
                                    const next = [...plans];
                                    next[idx] = { ...pl, markupPercent: Number(e.target.value) };
                                    setPlans(next);
                                  }}
                                  className="font-mono-nums mt-0.5 w-full rounded-lg border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-2 py-1"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] text-[var(--ca-text-muted)]">
                                  Advance %
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={90}
                                  value={pl.advancePercent}
                                  onChange={(e) => {
                                    const next = [...plans];
                                    next[idx] = { ...pl, advancePercent: Number(e.target.value) };
                                    setPlans(next);
                                  }}
                                  className="font-mono-nums mt-0.5 w-full rounded-lg border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-2 py-1"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. TERMS & POLICY EDITOR */}
                {tab === 'terms' && (
                  <form onSubmit={handleSaveTermsPolicy} className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-[var(--ca-text)]">
                          Store Terms &amp; Installment Policy
                        </h3>
                        <p className="text-xs text-[var(--ca-text-muted)]">
                          Updates publish immediately to the public /terms page.
                        </p>
                      </div>
                      <CAProcessButton
                        type="submit"
                        loading={savingTerms}
                        className="rounded-xl bg-[var(--ca-text)] px-4 py-2 text-xs font-semibold text-[var(--ca-bg)]"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Save Terms &amp; Policy
                      </CAProcessButton>
                    </div>

                    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] p-5 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                          Header Eyebrow / Effective Label
                        </label>
                        <input
                          type="text"
                          required
                          value={termsDoc.effectiveLabel}
                          onChange={(e) =>
                            setTermsDoc((prev) => ({ ...prev, effectiveLabel: e.target.value }))
                          }
                          className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3.5 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                          Page Title
                        </label>
                        <input
                          type="text"
                          required
                          value={termsDoc.title}
                          onChange={(e) =>
                            setTermsDoc((prev) => ({ ...prev, title: e.target.value }))
                          }
                          className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3.5 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {termsDoc.sections.map((sec, idx) => (
                        <div
                          key={sec.id}
                          className="space-y-2.5 rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] p-4"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              required
                              value={sec.heading}
                              onChange={(e) => {
                                const next = [...termsDoc.sections];
                                next[idx] = { ...sec, heading: e.target.value };
                                setTermsDoc((prev) => ({ ...prev, sections: next }));
                              }}
                              placeholder="Section Heading"
                              className="min-w-0 flex-1 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-sm font-semibold"
                            />
                            {termsDoc.sections.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setTermsDoc((prev) => ({
                                    ...prev,
                                    sections: prev.sections.filter((s) => s.id !== sec.id),
                                  }))
                                }
                                aria-label={`Remove ${sec.heading}`}
                                className="rounded-xl border border-red-500/20 p-2 text-red-600 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <textarea
                            rows={3}
                            required
                            value={sec.body}
                            onChange={(e) => {
                              const next = [...termsDoc.sections];
                              next[idx] = { ...sec, body: e.target.value };
                              setTermsDoc((prev) => ({ ...prev, sections: next }));
                            }}
                            placeholder="Policy paragraph text..."
                            className="w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-xs leading-relaxed"
                          />
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() =>
                          setTermsDoc((prev) => ({
                            ...prev,
                            sections: [
                              ...prev.sections,
                              {
                                id: `sec-${Date.now().toString(36)}`,
                                heading: `${prev.sections.length + 1}. New Policy Section`,
                                body: '',
                              },
                            ],
                          }))
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2 text-xs font-medium hover:bg-[var(--ca-surface-subtle)]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Policy Section
                      </button>
                    </div>

                    <div className="rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] p-4">
                      <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                        Footer Contact Note
                      </label>
                      <input
                        type="text"
                        value={termsDoc.footerNote}
                        onChange={(e) =>
                          setTermsDoc((prev) => ({ ...prev, footerNote: e.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-xs"
                      />
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

      {/* Glassmorphism Popup Modal for Selected Order Details (portaled above backdrop-filter stacking contexts) */}
      {selectedOrder &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Order details for ${selectedOrder.customerName}`}
            onClick={() => setSelectedOrder(null)}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-3 sm:p-6"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="glass-panel flex max-h-[84dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl shadow-xl sm:max-h-[90dvh]"
            >
              {/* Popup Header */}
              <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-2 sm:px-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display truncate text-xl font-semibold text-[var(--ca-text)]">
                      {selectedOrder.customerName}
                    </h3>
                    <span className="rounded-full bg-[var(--ca-accent)]/15 px-2.5 py-0.5 text-[11px] font-medium capitalize text-[var(--ca-accent)]">
                      {selectedOrder.status}
                    </span>
                  </div>
                  <p className="font-mono-nums mt-0.5 text-xs text-[var(--ca-text-muted)]">
                    {selectedOrder.id} · {new Date(selectedOrder.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  aria-label="Close order details popup"
                  className="shrink-0 rounded-xl border border-[var(--ca-border)] p-2 text-[var(--ca-text-muted)] hover:bg-[var(--ca-surface-subtle)] hover:text-[var(--ca-text)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Popup Body */}
              <div className="flex-1 space-y-4 overflow-y-auto p-5 text-xs sm:p-6">
                {/* Customer Contact & Shipping */}
                <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)]/80 p-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="flex items-center gap-1.5 font-semibold text-[var(--ca-text)]">
                      <Phone className="h-3.5 w-3.5 text-[var(--ca-accent)]" />
                      Contact Details
                    </p>
                    <p className="text-[var(--ca-text-muted)]">
                      Phone:{' '}
                      <a
                        href={`tel:${selectedOrder.phone}`}
                        className="font-medium text-[var(--ca-text)] underline-offset-2 hover:underline"
                      >
                        {selectedOrder.phone}
                      </a>
                    </p>
                    <p className="text-[var(--ca-text-muted)]">
                      WhatsApp:{' '}
                      <a
                        href={`https://wa.me/${selectedOrder.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[var(--ca-text)] underline-offset-2 hover:underline"
                      >
                        {selectedOrder.whatsapp}
                      </a>
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <p className="flex items-center gap-1.5 font-semibold text-[var(--ca-text)]">
                      <MapPin className="h-3.5 w-3.5 text-[var(--ca-accent)]" />
                      Delivery Destination
                    </p>
                    <p className="text-[var(--ca-text)]">{selectedOrder.address}</p>
                    <p className="text-[var(--ca-text-muted)]">
                      {selectedOrder.city} · Postal {selectedOrder.postalCode}
                    </p>
                  </div>

                  {selectedOrder.notes && (
                    <p className="border-t border-[var(--ca-border)] pt-2 text-[var(--ca-text-muted)] sm:col-span-2">
                      <strong className="text-[var(--ca-text)]">Customer Notes:</strong>{' '}
                      {selectedOrder.notes}
                    </p>
                  )}
                </div>

                {/* Referral Commission Banner */}
                {selectedOrder.referralCode && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--ca-accent)]/30 bg-[var(--ca-accent)]/10 px-4 py-3">
                    <div>
                      <p className="font-semibold text-[var(--ca-text)]">
                        Referred by Seller{' '}
                        <span className="font-mono-nums">{selectedOrder.referralCode}</span>
                      </p>
                      <p className="text-[11px] text-[var(--ca-text-muted)]">
                        10% referral commission (
                        {selectedOrder.commissionCredited
                          ? 'Credited to seller'
                          : 'Pending completion'}
                        )
                      </p>
                    </div>
                    <span className="font-mono-nums text-sm font-bold text-[var(--ca-accent)]">
                      {formatPKR(selectedOrder.commissionAmount)}
                    </span>
                  </div>
                )}

                {/* Items List */}
                <div className="rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)]/80 p-4">
                  <p className="font-semibold text-[var(--ca-text)]">Ordered Pieces</p>
                  <ul className="mt-2 space-y-2">
                    {selectedOrder.items.map((it, i) => (
                      <li key={i} className="flex items-center justify-between gap-3">
                        <span className="text-[var(--ca-text)]">
                          {it.title} × {it.quantity}{' '}
                          {it.selectedSize ? `(${it.selectedSize})` : ''}
                        </span>
                        <span className="font-mono-nums shrink-0 font-medium text-[var(--ca-text)]">
                          {formatPKR(it.unitPrice * it.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center justify-between border-t border-[var(--ca-border)] pt-2.5 text-sm font-bold text-[var(--ca-text)]">
                    <span>
                      Total (
                      {selectedOrder.paymentMethod === 'installments'
                        ? selectedOrder.planLabel
                        : 'COD'}
                      )
                    </span>
                    <span className="font-mono-nums">{formatPKR(selectedOrder.totalAmount)}</span>
                  </div>
                </div>

                {/* Installment Payments Received Tracker */}
                {selectedOrder.paymentMethod === 'installments' && (
                  <div className="rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)]/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-[var(--ca-text)]">Installments Received</strong>
                      <span className="font-mono-nums font-semibold text-[var(--ca-text)]">
                        Paid {formatPKR(calculateOrderPaidSummary(selectedOrder).paidAmount)} /{' '}
                        {formatPKR(selectedOrder.totalAmount)}
                      </span>
                    </div>
                    <div className="mt-2.5 space-y-1.5">
                      {selectedOrder.advanceAmount > 0 && (
                        <label className="flex items-center justify-between rounded-xl bg-[var(--ca-surface-subtle)] px-3 py-2">
                          <span>Advance ({formatPKR(selectedOrder.advanceAmount)})</span>
                          <input
                            type="checkbox"
                            checked={selectedOrder.advancePaid}
                            onChange={(e) =>
                              handleToggleInstallment(
                                selectedOrder.id,
                                0,
                                e.target.checked,
                                true
                              )
                            }
                          />
                        </label>
                      )}
                      {selectedOrder.installmentSchedule.map((row) => (
                        <label
                          key={row.installmentNumber}
                          className="flex items-center justify-between rounded-xl bg-[var(--ca-surface-subtle)] px-3 py-2"
                        >
                          <span>
                            Month {row.installmentNumber} · {row.dueDate} ·{' '}
                            <span className="font-mono-nums">{formatPKR(row.amount)}</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={row.paid}
                            onChange={(e) =>
                              handleToggleInstallment(
                                selectedOrder.id,
                                row.installmentNumber,
                                e.target.checked,
                                false
                              )
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ca-border)] pt-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleOrderStatus(selectedOrder.id, 'rejected')}
                      className="rounded-xl border border-red-500/30 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOrderStatus(selectedOrder.id, 'proceeding')}
                      className="rounded-xl border border-[var(--ca-border)] px-3 py-2 text-xs font-medium text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]"
                    >
                      Proceed
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOrderStatus(selectedOrder.id, 'complete')}
                      className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Complete &amp; Credit 10%
                    </button>
                  </div>

                  {selectedOrder.userId && selectedOrder.userId !== 'guest' && (
                    <button
                      type="button"
                      onClick={() => {
                        setNotifMode('user');
                        setTargetUserId(selectedOrder.userId);
                        setSelectedOrder(null);
                        setTab('notifications');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--ca-border)] px-3 py-2 text-xs font-medium text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]"
                    >
                      <Bell className="h-3.5 w-3.5" />
                      Message User
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
