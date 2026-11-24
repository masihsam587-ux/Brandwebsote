import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Bell,
  Award,
  LogOut,
  Trash2,
  Copy,
  Check,
  Share2,
  Send,
  Sun,
  Moon,
} from 'lucide-react';
import { feedbackService, notificationService, userService } from '../api';
import { clearAllClientCaches } from '../api/queryClient';
import type { FeedbackThread, NotificationItem, SellerDashboardData } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { calculateOrderPaidSummary, formatPKR } from '../utils/commerce';
import { canTriggerAction, sanitizePlainText } from '../utils/security';
import {
  extractZodFieldErrors,
  feedbackCreateSchema,
  feedbackReplySchema,
  profileUpdateSchema,
} from '../utils/validation';
import {
  NotificationListSkeleton,
  SellerDashboardSkeleton,
  FriendlyErrorState,
} from '../components/Skeletons';
import { CALoadingOverlay, CAProcessButton } from '../components/CALoader';
import { RouteGuard } from '../components/RouteGuard';
import { SeoHead } from '../components/SeoHead';

type ProfileTab = 'account' | 'notifications' | 'seller';

export function ProfilePage() {
  const { user, unreadNotifications, refreshUnreadCount, setUser, logout } = useAuth();
  const { clearCart } = useCart();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<ProfileTab>('account');

  // Editable Profile fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileBtnStatus, setProfileBtnStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Notifications & Feedback
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [threads, setThreads] = useState<FeedbackThread[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingThreadId, setReplyingThreadId] = useState<string | null>(null);
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [extrasError, setExtrasError] = useState<string | null>(null);

  // Seller Dashboard
  const [sellerData, setSellerData] = useState<SellerDashboardData | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Delete account confirmation modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setPhone(user.phone || '');
    setWhatsapp(user.whatsapp || '');
    setAddress(user.address || '');
    setCity(user.city || '');
    setPostalCode(user.postalCode || '');
  }, [user]);

  const loadAccountExtras = useCallback(async () => {
    if (!user) return;
    setLoadingExtras(true);
    setExtrasError(null);
    try {
      const [notifs, fbs] = await Promise.all([
        notificationService.listNotifications(),
        feedbackService.listMyThreads(),
      ]);
      setNotifications(notifs);
      setThreads(fbs);
      if (user.role === 'seller') {
        const sd = await userService.getSellerDashboard();
        setSellerData(sd);
      }
    } catch (err) {
      setExtrasError(err instanceof Error ? err.message : 'Could not load account data.');
    } finally {
      setLoadingExtras(false);
    }
  }, [user]);

  useEffect(() => {
    loadAccountExtras();
  }, [loadAccountExtras]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || savingProfile) return;
    if (!canTriggerAction('profile-save', 800)) return;
    setProfileErrors({});

    const parsed = profileUpdateSchema.safeParse({
      name,
      phone,
      whatsapp,
      address,
      city,
      postalCode,
    });

    if (!parsed.success) {
      setProfileErrors(extractZodFieldErrors(parsed.error));
      setProfileBtnStatus('error');
      window.setTimeout(() => setProfileBtnStatus('idle'), 500);
      showToast('Please correct the highlighted profile fields.', 'error');
      return;
    }

    setSavingProfile(true);
    setProfileBtnStatus('idle');
    try {
      const updated = await userService.updateProfile({
        name: sanitizePlainText(parsed.data.name, 80),
        phone: sanitizePlainText(parsed.data.phone, 24),
        whatsapp: sanitizePlainText(parsed.data.whatsapp, 24),
        address: sanitizePlainText(parsed.data.address, 200),
        city: sanitizePlainText(parsed.data.city, 60),
        postalCode: sanitizePlainText(parsed.data.postalCode, 16),
      });
      setUser(updated);
      setProfileBtnStatus('success');
      showToast('Profile updated.', 'success');
      window.setTimeout(() => setProfileBtnStatus('idle'), 900);
    } catch (err) {
      setProfileBtnStatus('error');
      window.setTimeout(() => setProfileBtnStatus('idle'), 500);
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreateFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sendingFeedback) return;
    if (!canTriggerAction('feedback-create', 1000)) return;

    const parsed = feedbackCreateSchema.safeParse({ subject: newSubject, message: newMessage });
    if (!parsed.success) {
      showToast(parsed.error.issues[0]?.message || 'Enter a valid subject and message.', 'error');
      return;
    }

    setSendingFeedback(true);
    try {
      const thread = await feedbackService.createThread(
        sanitizePlainText(parsed.data.subject, 120),
        sanitizePlainText(parsed.data.message, 800)
      );
      setThreads((prev) => [thread, ...prev]);
      setNewSubject('');
      setNewMessage('');
      showToast('Message sent to CA Support.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not send message', 'error');
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleReplyThread = async (threadId: string) => {
    const rawText = replyText[threadId] || '';
    if (replyingThreadId) return;
    if (!canTriggerAction(`feedback-reply-${threadId}`, 800)) return;

    const parsed = feedbackReplySchema.safeParse({ body: rawText });
    if (!parsed.success) {
      showToast(parsed.error.issues[0]?.message || 'Reply cannot be empty.', 'error');
      return;
    }

    setReplyingThreadId(threadId);
    try {
      const updated = await feedbackService.replyToThread(
        threadId,
        sanitizePlainText(parsed.data.body, 800)
      );
      setThreads((prev) => prev.map((t) => (t.id === threadId ? updated : t)));
      setReplyText((prev) => ({ ...prev, [threadId]: '' }));
      showToast('Reply sent.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Reply failed', 'error');
    } finally {
      setReplyingThreadId(null);
    }
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await refreshUnreadCount();
  };

  const handleDeleteAccount = async () => {
    if (deletingAccount || !user) return;
    setDeletingAccount(true);
    try {
      await userService.deleteAccount(deleteConfirmEmail.trim());
      clearCart();
      clearAllClientCaches();
      setUser(null);
      setDeleteOpen(false);
      showToast('Your account has been deleted.', 'info');
      navigate('/');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Email confirmation mismatch', 'error');
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleShareSellerId = () => {
    if (!sellerData) return;
    const shareText = `Shop Cinematic Arts (CA) with my verified Seller Referral ID: ${sellerData.sellerCode} — unlock 2, 3, or 4 month PKR installments at ${window.location.origin}/shop`;
    if (navigator.share) {
      navigator.share({ title: 'Cinematic Arts Referral', text: shareText }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareText);
      showToast('Referral invitation copied to clipboard.', 'success');
    }
  };

  return (
    <>
      <SeoHead
        title={user ? `${user.name} — Profile | Cinematic Arts (CA)` : 'Your Account — Cinematic Arts (CA)'}
        description="Manage your Cinematic Arts profile, notifications, support replies, and Seller Referral Dashboard."
        canonicalPath="/profile"
        noIndex
      />

      <RouteGuard
        requireAuth
        fallbackTitle="Your CA Account"
        fallbackDescription="Sign in to edit delivery details, inspect order notifications, message store support, or access your Seller Referral Dashboard."
      >
        {user && (
          <>
            <CALoadingOverlay
              open={savingProfile || sendingFeedback || deletingAccount}
              label={
                deletingAccount
                  ? 'Deleting account...'
                  : sendingFeedback
                  ? 'Sending message to CA Support...'
                  : 'Saving profile...'
              }
            />

            <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
              {/* Profile Header */}
              <div className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[var(--ca-surface-subtle)] text-lg font-semibold text-[var(--ca-text)]">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      user.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h1 className="font-display text-2xl font-semibold text-[var(--ca-text)] sm:text-3xl">
                      {user.name}
                    </h1>
                    <p className="text-xs text-[var(--ca-text-muted)]">
                      {user.email} · {user.role === 'seller' ? `Verified Seller (${user.sellerCode})` : 'Customer Account'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--ca-border)] px-3 py-2 text-xs font-medium text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]"
                  >
                    {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                    {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      clearCart();
                      showToast('Signed out.', 'info');
                      navigate('/');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--ca-border)] px-3.5 py-2 text-xs font-medium text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div
                role="tablist"
                className="mt-6 flex flex-wrap gap-1.5 rounded-xl bg-[var(--ca-surface-subtle)] p-1.5"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'account'}
                  onClick={() => setTab('account')}
                  className={`btn-press inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                    tab === 'account'
                      ? 'bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm'
                      : 'text-[var(--ca-text-muted)]'
                  }`}
                >
                  <UserIcon className="h-3.5 w-3.5" />
                  Account Info
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'notifications'}
                  onClick={() => setTab('notifications')}
                  className={`btn-press inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                    tab === 'notifications'
                      ? 'bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm'
                      : 'text-[var(--ca-text-muted)]'
                  }`}
                >
                  <Bell className="h-3.5 w-3.5" />
                  Notifications &amp; Support {unreadNotifications > 0 ? `(${unreadNotifications})` : ''}
                </button>

                {user.role === 'seller' && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'seller'}
                    onClick={() => setTab('seller')}
                    className={`btn-press inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                      tab === 'seller'
                        ? 'bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm'
                        : 'text-[var(--ca-text-muted)]'
                    }`}
                  >
                    <Award className="h-3.5 w-3.5" />
                    Seller Dashboard
                  </button>
                )}
              </div>

              {/* TAB 1: ACCOUNT */}
              {tab === 'account' && (
                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <form
                    onSubmit={handleSaveProfile}
                    noValidate
                    className="glass-panel space-y-4 rounded-2xl p-6 lg:col-span-2"
                  >
                    <h2 className="font-display text-2xl font-semibold">Edit Delivery Details</h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                          Full Name
                        </label>
                        <input
                          type="text"
                          maxLength={80}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                        />
                        {profileErrors.name && (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{profileErrors.name}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                          Phone
                        </label>
                        <input
                          type="tel"
                          maxLength={24}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                        />
                        {profileErrors.phone && (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{profileErrors.phone}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                          WhatsApp
                        </label>
                        <input
                          type="tel"
                          maxLength={24}
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                        />
                        {profileErrors.whatsapp && (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{profileErrors.whatsapp}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                          City
                        </label>
                        <input
                          type="text"
                          maxLength={60}
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                        />
                        {profileErrors.city && (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{profileErrors.city}</p>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                          Street Address
                        </label>
                        <input
                          type="text"
                          maxLength={200}
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                        />
                        {profileErrors.address && (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{profileErrors.address}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          maxLength={12}
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                        />
                        {profileErrors.postalCode && (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{profileErrors.postalCode}</p>
                        )}
                      </div>
                    </div>
                    <CAProcessButton
                      type="submit"
                      loading={savingProfile}
                      status={profileBtnStatus}
                      className="rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-bg)]"
                    >
                      Save Changes
                    </CAProcessButton>
                  </form>

                  <div className="space-y-4">
                    <div className="glass-panel rounded-2xl p-6">
                      <h3 className="text-sm font-semibold">Quick Links</h3>
                      <div className="mt-3 flex flex-col gap-2 text-xs">
                        <Link
                          to="/orders"
                          className="rounded-xl bg-[var(--ca-surface-subtle)] px-3.5 py-2.5 font-medium hover:opacity-85"
                        >
                          View Bag &amp; My Orders
                        </Link>
                        <Link
                          to="/shop"
                          className="rounded-xl bg-[var(--ca-surface-subtle)] px-3.5 py-2.5 font-medium hover:opacity-85"
                        >
                          Browse Catalog
                        </Link>
                      </div>
                    </div>

                    <div className="glass-panel rounded-2xl p-6">
                      <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
                        Delete Account
                      </h3>
                      <p className="mt-1 text-xs text-[var(--ca-text-muted)]">
                        Permanently remove your profile from Cinematic Arts.
                      </p>
                      <button
                        type="button"
                        onClick={() => setDeleteOpen(true)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: NOTIFICATIONS & THREADED FEEDBACK */}
              {tab === 'notifications' && (
                <div className="mt-6">
                  {loadingExtras ? (
                    <NotificationListSkeleton />
                  ) : extrasError ? (
                    <FriendlyErrorState
                      title="Could not load notifications"
                      message={extrasError}
                      onRetry={loadAccountExtras}
                    />
                  ) : (
                    <div className="ca-fade-in grid grid-cols-1 gap-6 lg:grid-cols-2">
                      {/* Notifications Inbox */}
                      <div className="glass-panel rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h2 className="font-display text-2xl font-semibold">Notifications</h2>
                          {unreadNotifications > 0 && (
                            <button
                              type="button"
                              onClick={handleMarkAllRead}
                              className="text-xs font-medium text-[var(--ca-accent)] hover:underline"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>

                        {notifications.length === 0 ? (
                          <p className="text-sm text-[var(--ca-text-muted)]">No notifications yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {notifications.map((n) => (
                              <div
                                key={n.id}
                                onClick={async () => {
                                  if (!n.read) {
                                    await notificationService.markAsRead(n.id);
                                    setNotifications((prev) =>
                                      prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
                                    );
                                    await refreshUnreadCount();
                                  }
                                }}
                                className={`rounded-xl p-4 transition-colors ${
                                  n.read
                                    ? 'bg-[var(--ca-surface-subtle)]'
                                    : 'bg-[var(--ca-accent)]/10 ring-1 ring-[var(--ca-accent)]/40'
                                }`}
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-[var(--ca-text)]">{n.title}</span>
                                  <span className="text-[var(--ca-text-muted)]">
                                    {n.read ? 'Read' : 'Unread'}
                                  </span>
                                </div>
                                <p className="mt-1.5 text-xs leading-relaxed text-[var(--ca-text-muted)]">
                                  {n.message}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Feedback & Support Threads */}
                      <div className="glass-panel rounded-2xl p-6 space-y-5">
                        <h2 className="font-display text-2xl font-semibold">Feedback &amp; Support Replies</h2>

                        <form onSubmit={handleCreateFeedback} className="space-y-2.5 pb-2">
                          <input
                            type="text"
                            required
                            maxLength={120}
                            value={newSubject}
                            onChange={(e) => setNewSubject(e.target.value)}
                            placeholder="Subject (e.g. Sizing or Order Inquiry)"
                            className="w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2 text-xs"
                          />
                          <textarea
                            rows={2}
                            required
                            maxLength={800}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Write your question or feedback..."
                            className="w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2 text-xs"
                          />
                          <CAProcessButton
                            type="submit"
                            loading={sendingFeedback}
                            className="rounded-xl bg-[var(--ca-text)] px-4 py-2 text-xs font-semibold text-[var(--ca-bg)]"
                          >
                            <Send className="h-3 w-3" />
                            Send to Store Support
                          </CAProcessButton>
                        </form>

                        <div className="space-y-4">
                          {threads.map((thread) => (
                            <div
                              key={thread.id}
                              className="rounded-xl bg-[var(--ca-surface-subtle)] p-4 space-y-3"
                            >
                              <p className="text-xs font-semibold text-[var(--ca-text)]">{thread.subject}</p>
                              <div className="space-y-2">
                                {thread.messages.map((m) => (
                                  <div
                                    key={m.id}
                                    className={`rounded-xl px-3 py-2 text-xs ${
                                      m.senderRole === 'admin'
                                        ? 'bg-[var(--ca-accent)]/12 text-[var(--ca-text)]'
                                        : 'bg-[var(--ca-surface-subtle)] text-[var(--ca-text)]'
                                    }`}
                                  >
                                    <strong>{m.senderName}: </strong>
                                    {m.body}
                                  </div>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  maxLength={800}
                                  value={replyText[thread.id] || ''}
                                  onChange={(e) =>
                                    setReplyText((prev) => ({ ...prev, [thread.id]: e.target.value }))
                                  }
                                  placeholder="Reply back..."
                                  className="flex-1 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-1.5 text-xs"
                                />
                                <CAProcessButton
                                  type="button"
                                  loading={replyingThreadId === thread.id}
                                  onClick={() => handleReplyThread(thread.id)}
                                  className="rounded-xl bg-[var(--ca-text)] px-3.5 py-1.5 text-xs font-semibold text-[var(--ca-bg)]"
                                >
                                  Reply
                                </CAProcessButton>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SELLER DASHBOARD */}
              {tab === 'seller' && (
                <RouteGuard requiredRole="seller">
                  <div className="mt-6">
                    {loadingExtras || (!sellerData && !extrasError) ? (
                      <SellerDashboardSkeleton />
                    ) : extrasError ? (
                      <FriendlyErrorState
                        title="Could not load seller dashboard"
                        message={extrasError}
                        onRetry={loadAccountExtras}
                      />
                    ) : sellerData ? (
                      <div className="ca-fade-in space-y-6">
                        {/* Seller ID + KPIs */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                          <div className="glass-panel rounded-2xl p-5 md:col-span-2">
                            <span className="text-xs text-[var(--ca-text-muted)]">Unique Seller Referral ID</span>
                            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                              <span className="font-mono-nums text-2xl font-bold text-[var(--ca-accent)]">
                                {sellerData.sellerCode}
                              </span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard?.writeText(sellerData.sellerCode);
                                    setCopiedId(true);
                                    window.setTimeout(() => setCopiedId(false), 2000);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-1.5 text-xs font-medium"
                                >
                                  {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                  {copiedId ? 'Copied' : 'Copy'}
                                </button>
                                <button
                                  type="button"
                                  onClick={handleShareSellerId}
                                  className="inline-flex items-center gap-1 rounded-xl bg-[var(--ca-text)] px-3 py-1.5 text-xs font-medium text-[var(--ca-bg)]"
                                >
                                  <Share2 className="h-3.5 w-3.5" />
                                  Share
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="glass-panel rounded-2xl p-5">
                            <span className="text-xs text-[var(--ca-text-muted)]">Commission Earned (10%)</span>
                            <p className="font-mono-nums mt-1 text-2xl font-bold text-[var(--ca-text)]">
                              {formatPKR(sellerData.commissionEarned)}
                            </p>
                            <p className="mt-0.5 text-[11px] text-[var(--ca-text-muted)]">
                              {sellerData.completedReferrals} completed of {sellerData.totalReferrals} referrals
                            </p>
                          </div>

                          <div className="glass-panel rounded-2xl p-5">
                            <span className="text-xs text-[var(--ca-text-muted)]">Pending Commission</span>
                            <p className="font-mono-nums mt-1 text-2xl font-bold text-[var(--ca-text)]">
                              {formatPKR(sellerData.pendingCommission)}
                            </p>
                            <p className="mt-0.5 text-[11px] text-[var(--ca-text-muted)]">
                              Credited on order completion
                            </p>
                          </div>
                        </div>

                        {/* Installment Recovery Tracker & Monthly Earnings Chart */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                          <div className="glass-panel rounded-2xl p-6 space-y-4">
                            <h2 className="font-display text-2xl font-semibold">
                              Installment Recovery Tracker
                            </h2>
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div className="rounded-xl bg-[var(--ca-surface-subtle)] p-3">
                                <span className="text-[var(--ca-text-muted)]">Financed</span>
                                <p className="font-mono-nums mt-1 font-bold">
                                  {formatPKR(sellerData.recoverySummary.totalFinanced)}
                                </p>
                              </div>
                              <div className="rounded-xl bg-[var(--ca-surface-subtle)] p-3">
                                <span className="text-[var(--ca-text-muted)]">Recovered</span>
                                <p className="font-mono-nums mt-1 font-bold text-[var(--ca-text)]">
                                  {formatPKR(sellerData.recoverySummary.totalRecovered)}
                                </p>
                              </div>
                              <div className="rounded-xl bg-[var(--ca-surface-subtle)] p-3">
                                <span className="text-[var(--ca-text-muted)]">Remaining</span>
                                <p className="font-mono-nums mt-1 font-bold text-[var(--ca-accent)]">
                                  {formatPKR(sellerData.recoverySummary.totalRemaining)}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2.5 pt-2">
                              {sellerData.referredOrders.length === 0 ? (
                                <p className="text-xs text-[var(--ca-text-muted)]">No referred orders yet.</p>
                              ) : (
                                sellerData.referredOrders.map((ord) => {
                                  const sum = calculateOrderPaidSummary(ord);
                                  return (
                                    <div
                                      key={ord.id}
                                      className="rounded-xl bg-[var(--ca-surface-subtle)] p-3.5 text-xs"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono-nums font-bold">
                                          {ord.id} · {ord.customerName}
                                        </span>
                                        <span className="rounded-full bg-[var(--ca-accent)]/12 px-2.5 py-0.5 text-[11px] font-medium capitalize text-[var(--ca-accent)]">
                                          {ord.status}
                                        </span>
                                      </div>
                                      <div className="mt-1 flex justify-between text-[var(--ca-text-muted)]">
                                        <span>
                                          {ord.paymentMethod === 'installments'
                                            ? `Paid ${formatPKR(sum.paidAmount)} / Remaining ${formatPKR(sum.remainingAmount)}`
                                            : `COD ${formatPKR(ord.totalAmount)}`}
                                        </span>
                                        <span className="font-mono-nums font-semibold text-[var(--ca-text)]">
                                          Comm: {formatPKR(ord.commissionAmount)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div className="glass-panel rounded-2xl p-6">
                              <h2 className="font-display text-2xl font-semibold">Monthly Earnings</h2>
                              <div className="mt-4 space-y-3">
                                {sellerData.monthlyEarnings.length === 0 ? (
                                  <p className="text-xs text-[var(--ca-text-muted)]">
                                    Completed referred commissions will chart here by month.
                                  </p>
                                ) : (
                                  sellerData.monthlyEarnings.map((m) => {
                                    const max = Math.max(...sellerData.monthlyEarnings.map((x) => x.commission), 1);
                                    const pct = Math.max(8, Math.round((m.commission / max) * 100));
                                    return (
                                      <div key={m.month} className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                          <span className="font-mono-nums font-semibold">{m.month}</span>
                                          <span className="font-mono-nums">
                                            {formatPKR(m.commission)} ({m.orders} {m.orders === 1 ? 'order' : 'orders'})
                                          </span>
                                        </div>
                                        <div className="h-2.5 w-full overflow-hidden rounded-sm bg-[var(--ca-surface-subtle)]">
                                          <div style={{ width: `${pct}%` }} className="h-full bg-[var(--ca-accent)]" />
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                            <div className="glass-panel rounded-2xl p-6">
                              <h3 className="text-sm font-semibold">My Personal Installment Purchases</h3>
                              <div className="mt-3 space-y-2">
                                {sellerData.ownInstallmentOrders.length === 0 ? (
                                  <p className="text-xs text-[var(--ca-text-muted)]">
                                    You have no personal installment purchases.
                                  </p>
                                ) : (
                                  sellerData.ownInstallmentOrders.map((ord) => {
                                    const sum = calculateOrderPaidSummary(ord);
                                    return (
                                      <div
                                        key={ord.id}
                                        className="flex items-center justify-between rounded-xl bg-[var(--ca-surface-subtle)] px-3.5 py-2.5 text-xs"
                                      >
                                        <span className="font-mono-nums font-semibold">{ord.id}</span>
                                        <span className="font-mono-nums text-[var(--ca-text-muted)]">
                                          Paid {formatPKR(sum.paidAmount)} / {formatPKR(ord.totalAmount)}
                                        </span>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </RouteGuard>
              )}
            </section>

            {/* Delete Account Modal */}
            {deleteOpen && (
              <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              >
                <div className="glass-panel max-w-md rounded-2xl p-6 shadow-xl">
                  <h3 className="font-display text-2xl font-semibold text-red-600 dark:text-red-400">
                    Confirm Account Deletion
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--ca-text-muted)]">
                    Type your account email (<strong className="text-[var(--ca-text)]">{user.email}</strong>) to permanently delete your profile.
                  </p>
                  <input
                    type="email"
                    value={deleteConfirmEmail}
                    onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                    placeholder={user.email}
                    className="mt-4 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2 text-sm"
                  />
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteOpen(false)}
                      className="btn-press min-h-[44px] rounded-xl border border-[var(--ca-border)] px-4 py-2 text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <CAProcessButton
                      type="button"
                      loading={deletingAccount}
                      onClick={handleDeleteAccount}
                      className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white"
                    >
                      Confirm Delete
                    </CAProcessButton>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </RouteGuard>
    </>
  );
}
