import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Minus, Plus, CheckCircle2, Clock, XCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { orderService } from '../api';
import type { OrderStatus } from '../api/types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLocale } from '../i18n';
import { calculateOrderPaidSummary, formatPKR } from '../utils/commerce';
import { saveOrderReceipt } from '../services/orderReceipts';
import { normalizeAppError } from '../services/errorHandling';
import { canTriggerAction, createIdempotencyKey, sanitizePlainText } from '../utils/security';
import { checkoutSchema, extractZodFieldErrors } from '../utils/validation';
import { CardListSkeleton, FriendlyErrorState } from '../components/Skeletons';
import { ResilientImage } from '../components/ProductCard';
import { OrderIssueForm } from '../components/OrderIssueForm';
import { CALoadingOverlay, CAProcessButton } from '../components/CALoader';
import { TurnstileField } from '../components/TurnstileField';
import { SeoHead } from '../components/SeoHead';

const STATUS_STEPS: OrderStatus[] = ['pending', 'proceeding', 'complete'];

export function OrdersPage() {
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { localize } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: orders = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['orders', 'mine', user?.id || 'guest'],
    enabled: Boolean(user),
    queryFn: () => orderService.listMyOrders(),
  });

  const fetchError = queryError
    ? queryError instanceof Error
      ? queryError.message
      : 'Unable to load orders right now.'
    : null;

  // Cart quick COD checkout state
  const [bagCheckoutOpen, setBagCheckoutOpen] = useState(false);
  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(user?.city || 'Peshawar');
  const [postalCode, setPostalCode] = useState(user?.postalCode || '25000');
  const [referralCode, setReferralCode] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const idempotencyKeyRef = useRef<string>(createIdempotencyKey('bag'));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [referralState, setReferralState] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    sellerName?: string;
  }>({ status: 'idle' });
  const [submittingBag, setSubmittingBag] = useState(false);
  const [bagBtnStatus, setBagBtnStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setPhone(user.phone || '');
      setWhatsapp(user.whatsapp || user.phone || '');
      setAddress(user.address || '');
      setCity(user.city || 'Peshawar');
      setPostalCode(user.postalCode || '25000');
    }
  }, [user]);

  useEffect(() => {
    const clean = referralCode.trim().toUpperCase();
    if (!clean) {
      setReferralState({ status: 'idle' });
      return;
    }
    setReferralState({ status: 'checking' });
    const timer = window.setTimeout(async () => {
      try {
        const res = await orderService.validateSellerReferral(clean);
        if (res.valid) {
          setReferralState({ status: 'valid', sellerName: res.sellerName });
        } else {
          setReferralState({ status: 'invalid' });
        }
      } catch {
        setReferralState({ status: 'invalid' });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [referralCode]);

  const handleBagCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || submittingBag) return;
    if (!canTriggerAction('bag-checkout', 1200)) return;
    setFieldErrors({});

    const parsed = checkoutSchema.safeParse({
      fullName,
      phone,
      whatsapp: whatsapp || phone,
      address,
      city,
      postalCode,
      notes: '',
      paymentMethod: 'cod',
      referralCode: referralCode.trim(),
    });

    if (!parsed.success) {
      setFieldErrors(extractZodFieldErrors(parsed.error));
      setBagBtnStatus('error');
      window.setTimeout(() => setBagBtnStatus('idle'), 500);
      showToast('Please review the highlighted checkout fields.', 'error');
      return;
    }

    if (parsed.data.referralCode) {
      const refCheck = await orderService.validateSellerReferral(parsed.data.referralCode);
      if (!refCheck.valid) {
        setFieldErrors({ referralCode: 'Entered Seller Referral ID is invalid or inactive.' });
        setBagBtnStatus('error');
        window.setTimeout(() => setBagBtnStatus('idle'), 500);
        showToast('Entered Seller Referral ID is invalid or inactive.', 'error');
        return;
      }
    }

    setSubmittingBag(true);
    setBagBtnStatus('idle');
    try {
      const order = await orderService.createOrder({
        items,
        customerName: sanitizePlainText(parsed.data.fullName, 80),
        phone: sanitizePlainText(parsed.data.phone, 24),
        whatsapp: sanitizePlainText(parsed.data.whatsapp, 24),
        address: sanitizePlainText(parsed.data.address, 200),
        city: sanitizePlainText(parsed.data.city, 60),
        postalCode: sanitizePlainText(parsed.data.postalCode, 16),
        paymentMethod: 'cod',
        referralCode: parsed.data.referralCode || undefined,
        idempotencyKey: idempotencyKeyRef.current,
        honeypot: honeypot || undefined,
        turnstileToken: turnstileToken || undefined,
      });
      clearCart();
      saveOrderReceipt(order);
      idempotencyKeyRef.current = createIdempotencyKey('bag');
      setBagBtnStatus('success');
      setBagCheckoutOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['orders', 'mine'] });
      showToast(`Order ${order.id} submitted.`, 'success');
      navigate(`${localize('/order-confirmed')}?id=${encodeURIComponent(order.id)}`, {
        state: { order },
      });
    } catch (err) {
      setBagBtnStatus('error');
      window.setTimeout(() => setBagBtnStatus('idle'), 500);
      const normalized = normalizeAppError(err, { fallbackMessage: 'Checkout failed' });
      showToast(`${normalized.message} (Ref: ${normalized.referenceId})`, 'error');
    } finally {
      setSubmittingBag(false);
    }
  };

  return (
    <>
      <CALoadingOverlay open={submittingBag} label="Placing your COD order..." />
      <SeoHead
        title="Bag & My Orders — Cinematic Arts (CA)"
        description="Manage your shopping bag, track live order status, and inspect monthly PKR installment schedules."
        canonicalPath="/orders"
        noIndex
      />

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 space-y-10">
        {/* Shopping Bag Section */}
        <div>
          <div className="flex items-end justify-between gap-4">
            <h1 className="font-display text-3xl font-semibold text-[var(--ca-text)] sm:text-4xl">
              Bag &amp; Order Tracker
            </h1>
            <Link to="/shop" className="text-xs font-medium text-[var(--ca-accent)] hover:underline">
              Continue Shopping
            </Link>
          </div>

          {items.length > 0 && (
            <div className="glass-panel mt-5 rounded-2xl p-5 sm:p-6">
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.selectedSize}`}
                    className="flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="h-16 w-20 overflow-hidden rounded-xl bg-[var(--ca-surface-subtle)]">
                        <ResilientImage
                          src={item.image}
                          alt={item.title}
                          width={160}
                          height={120}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--ca-text)]">{item.title}</p>
                        <p className="text-xs text-[var(--ca-text-muted)]">
                          {item.selectedSize || 'Standard'} ·{' '}
                          <span className="font-mono-nums">{formatPKR(item.unitPrice)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-center rounded-xl border border-[var(--ca-border)]">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.productId, item.selectedSize, item.quantity - 1)
                          }
                          aria-label={`Decrease ${item.title} quantity`}
                          className="p-1.5"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="font-mono-nums min-w-[1.75rem] text-center text-xs font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.productId, item.selectedSize, item.quantity + 1)
                          }
                          aria-label={`Increase ${item.title} quantity`}
                          className="p-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId, item.selectedSize)}
                        aria-label={`Remove ${item.title}`}
                        className="rounded-lg p-1.5 text-[var(--ca-text-muted)] hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-2">
                <div>
                  <span className="text-xs text-[var(--ca-text-muted)]">Bag Subtotal</span>
                  <p className="font-mono-nums text-xl font-bold text-[var(--ca-text)]">
                    {formatPKR(subtotal)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBagCheckoutOpen((v) => !v)}
                  className="btn-press inline-flex items-center gap-2 rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-bg)]"
                >
                  {bagCheckoutOpen ? 'Hide Checkout Form' : 'Checkout Bag (COD)'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {bagCheckoutOpen && (
                <form
                  onSubmit={handleBagCheckout}
                  noValidate
                  className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                  <div>
                    <input
                      required
                      maxLength={80}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                    />
                    {fieldErrors.fullName && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.fullName}</p>
                    )}
                  </div>
                  <div>
                    <input
                      required
                      maxLength={24}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Mobile Number (0335...)"
                      className="w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                    />
                    {fieldErrors.phone && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.phone}</p>
                    )}
                  </div>
                  <div>
                    <input
                      maxLength={24}
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="WhatsApp Number"
                      className="w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                    />
                    {fieldErrors.whatsapp && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.whatsapp}</p>
                    )}
                  </div>
                  <div>
                    <input
                      required
                      maxLength={12}
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="Postal Code"
                      className="w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                    />
                    {fieldErrors.postalCode && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.postalCode}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      required
                      maxLength={200}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Full Address"
                      className="w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                    />
                    {fieldErrors.address && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.address}</p>
                    )}
                  </div>
                  <div>
                    <input
                      required
                      maxLength={60}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      className="w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                    />
                    {fieldErrors.city && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.city}</p>
                    )}
                  </div>
                  <div>
                    <input
                      maxLength={20}
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="Seller Referral ID (optional)"
                      className="font-mono-nums w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm uppercase"
                    />
                    {referralState.status === 'valid' && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verified Seller: {referralState.sellerName}
                      </p>
                    )}
                    {referralState.status === 'invalid' && referralCode.trim() && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        Seller ID not recognized or inactive.
                      </p>
                    )}
                    {fieldErrors.referralCode && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {fieldErrors.referralCode}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <TurnstileField
                      action="bag_checkout"
                      onToken={setTurnstileToken}
                      honeypot={honeypot}
                      onHoneypotChange={setHoneypot}
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <CAProcessButton
                      type="submit"
                      loading={submittingBag}
                      status={bagBtnStatus}
                      className="rounded-xl bg-[var(--ca-accent)] px-6 py-2.5 text-xs font-semibold text-[var(--ca-accent-fg)]"
                    >
                      Place COD Order
                    </CAProcessButton>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Submitted Orders & Installment Schedules */}
        <div>
          <h2 className="font-display text-2xl font-semibold text-[var(--ca-text)]">
            My Orders &amp; Installments
          </h2>

          {!user ? (
            <div className="glass-panel mt-4 rounded-2xl p-8 text-center">
              <p className="text-sm text-[var(--ca-text-muted)]">
                Sign in to view your saved orders, live tracking status, and installment repayment
                schedule.
              </p>
              <Link
                to="/auth?redirect=/orders"
                className="btn-press mt-4 inline-flex items-center rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-bg)]"
              >
                Sign In to Account
              </Link>
            </div>
          ) : loading ? (
            <div className="mt-4">
              <CardListSkeleton rows={3} />
            </div>
          ) : fetchError ? (
            <div className="mt-4">
              <FriendlyErrorState
                title="Could not load your orders"
                message={fetchError}
                error={queryError}
                onRetry={() => refetch()}
              />
            </div>
          ) : orders.length === 0 ? (
            <div className="ca-fade-in glass-panel mt-4 rounded-2xl p-8 text-center">
              <p className="text-sm text-[var(--ca-text-muted)]">No orders placed yet.</p>
              <Link
                to="/shop"
                className="btn-press mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-surface-subtle)] px-4 py-2 text-xs font-semibold text-[var(--ca-text)]"
              >
                Browse Storefront
              </Link>
            </div>
          ) : (
            <div className="ca-fade-in mt-4 space-y-5">
              {orders.map((order) => {
                const paidSummary = calculateOrderPaidSummary(order);
                const currentStepIndex = STATUS_STEPS.indexOf(order.status);

                return (
                  <article key={order.id} className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-nums text-sm font-bold text-[var(--ca-text)]">
                            {order.id}
                          </span>
                          <span className="text-xs text-[var(--ca-text-muted)]">·</span>
                          <span className="text-xs text-[var(--ca-text-muted)]">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--ca-text-muted)]">
                          {order.paymentMethod === 'installments'
                            ? `Installments (${order.planLabel}) · Ref ${order.referralCode}`
                            : 'Cash on Delivery'}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-mono-nums text-base font-bold text-[var(--ca-text)]">
                          {formatPKR(order.totalAmount)}
                        </p>
                        <span
                          className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
                            order.status === 'complete'
                              ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                              : order.status === 'rejected'
                              ? 'bg-red-500/12 text-red-600 dark:text-red-400'
                              : 'bg-[var(--ca-accent)]/12 text-[var(--ca-accent)]'
                          }`}
                        >
                          {order.status === 'complete' ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : order.status === 'rejected' ? (
                            <XCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {order.status}
                        </span>
                      </div>
                    </div>

                    {/* Live Status Stepper */}
                    {order.status !== 'rejected' && (
                      <div className="grid grid-cols-3 gap-2">
                        {STATUS_STEPS.map((st, idx) => {
                          const reached = currentStepIndex >= idx;
                          return (
                            <div key={st} className="space-y-1.5">
                              <div
                                className={`h-1.5 rounded-sm transition-colors ${
                                  reached
                                    ? 'bg-[var(--ca-accent)]'
                                    : 'bg-[var(--ca-surface-subtle)]'
                                }`}
                              />
                              <p
                                className={`text-[11px] font-medium capitalize ${
                                  reached ? 'text-[var(--ca-text)]' : 'text-[var(--ca-text-muted)]'
                                }`}
                              >
                                {st}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Items */}
                    <div className="space-y-2">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-[var(--ca-text)]">
                            {it.title} × {it.quantity}{' '}
                            {it.selectedSize ? `(${it.selectedSize})` : ''}
                          </span>
                          <span className="font-mono-nums text-[var(--ca-text-muted)]">
                            {formatPKR(it.unitPrice * it.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Installment Schedule */}
                    {order.paymentMethod === 'installments' && (
                      <div className="rounded-xl bg-[var(--ca-surface-subtle)] p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-[var(--ca-text)]">
                            Installment Repayment Schedule
                          </span>
                          <span className="font-mono-nums text-[var(--ca-text-muted)]">
                            Paid <strong className="text-[var(--ca-text)]">{formatPKR(paidSummary.paidAmount)}</strong> · Remaining{' '}
                            <strong className="text-[var(--ca-text)]">{formatPKR(paidSummary.remainingAmount)}</strong>
                          </span>
                        </div>

                        <div className="h-2 w-full overflow-hidden rounded-sm bg-[var(--ca-surface-solid)]">
                          <div
                            style={{ width: `${paidSummary.progressPercent}%` }}
                            className="h-full bg-[var(--ca-accent)] transition-all"
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                          {order.advanceAmount > 0 && (
                            <div className="flex items-center justify-between rounded-xl bg-[var(--ca-surface-solid)] px-3 py-2">
                              <span>Advance</span>
                              <span className="font-mono-nums font-semibold">
                                {formatPKR(order.advanceAmount)} · {order.advancePaid ? 'Paid' : 'Due'}
                              </span>
                            </div>
                          )}
                          {order.installmentSchedule.map((row) => (
                            <div
                              key={row.installmentNumber}
                              className="flex items-center justify-between rounded-xl bg-[var(--ca-surface-solid)] px-3 py-2"
                            >
                              <span>
                                #{row.installmentNumber} ({row.dueDate})
                              </span>
                              <span
                                className={`font-mono-nums font-semibold ${
                                  row.paid ? 'text-emerald-600 dark:text-emerald-400' : ''
                                }`}
                              >
                                {formatPKR(row.amount)} · {row.paid ? 'Paid' : 'Due'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Deferred-DB UI: Report a problem / request exchange (not wired to DB until schema confirmation) */}
                    <OrderIssueForm order={order} />
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
