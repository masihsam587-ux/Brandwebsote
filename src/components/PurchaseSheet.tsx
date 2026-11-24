import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { X, Check, ShieldCheck, ArrowRight, Minus, Plus } from 'lucide-react';
import { orderService, productService } from '../api';
import type { InstallmentPlan, Order, PaymentMethod } from '../api/types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLocale } from '../i18n';
import {
  calculateInstallmentPlan,
  deriveProductStockStatus,
  formatPKR,
} from '../utils/commerce';
import { saveOrderReceipt } from '../services/orderReceipts';
import { normalizeAppError } from '../services/errorHandling';
import { canTriggerAction, createIdempotencyKey, sanitizePlainText } from '../utils/security';
import { checkoutSchema, extractZodFieldErrors } from '../utils/validation';
import { ResilientImage } from './ProductCard';
import { CALoadingOverlay, CAProcessButton } from './CALoader';
import { TurnstileField } from './TurnstileField';

export function PurchaseSheet() {
  const { checkoutModalProduct, closeBuySheet, addItem } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { localize, t } = useLocale();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [step, setStep] = useState<'configure' | 'checkout' | 'success'>('configure');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  // Checkout fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Peshawar');
  const [postalCode, setPostalCode] = useState('25000');
  const [notes, setNotes] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const idempotencyKeyRef = useRef<string>(createIdempotencyKey('ord'));
  const [referralState, setReferralState] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    sellerName?: string;
  }>({ status: 'idle' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!checkoutModalProduct) return;
    const prod = checkoutModalProduct.product;
    setStep('configure');
    setSelectedImage(prod.coverImage);
    setSelectedSize(checkoutModalProduct.size || prod.sizes?.[0] || 'One Size');
    setQuantity(checkoutModalProduct.quantity || 1);
    setPaymentMethod(checkoutModalProduct.paymentMethod || 'cod');
    setFormErrors({});
    setSubmitError(null);
    setSubmitStatus('idle');
    setCreatedOrder(null);
    setReferralCode('');
    setHoneypot('');
    setTurnstileToken('');
    idempotencyKeyRef.current = createIdempotencyKey('ord');
    setReferralState({ status: 'idle' });

    if (user) {
      setFullName(user.name || '');
      setPhone(user.phone || '');
      setWhatsapp(user.whatsapp || user.phone || '');
      setAddress(user.address || '');
      setCity(user.city || 'Peshawar');
      setPostalCode(user.postalCode || '25000');
    }

    productService.listInstallmentPlans().then((loaded) => {
      setPlans(loaded);
      if (checkoutModalProduct.planId && loaded.some((p) => p.id === checkoutModalProduct.planId)) {
        setSelectedPlanId(checkoutModalProduct.planId);
      } else if (loaded.length > 0) {
        setSelectedPlanId(loaded[0].id);
      }
    });
  }, [checkoutModalProduct, user]);

  // Live validate seller code when entered
  useEffect(() => {
    const clean = referralCode.trim();
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
    }, 240);
    return () => window.clearTimeout(timer);
  }, [referralCode]);

  const activePlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || plans[0],
    [plans, selectedPlanId]
  );

  const calc = useMemo(() => {
    if (!checkoutModalProduct || !activePlan) return null;
    return calculateInstallmentPlan(checkoutModalProduct.product.price, quantity, activePlan);
  }, [checkoutModalProduct, activePlan, quantity]);

  if (!checkoutModalProduct) return null;
  const { product } = checkoutModalProduct;
  const allImages = [product.coverImage, ...(product.extraImages || [])];
  const stockStatus = deriveProductStockStatus(product);
  const sheetStockLabel =
    stockStatus.level === 'out_of_stock'
      ? t.product.outOfStock
      : stockStatus.level === 'low_stock'
      ? t.product.lowStock
      : t.product.inStock;

  const handleProceedToCheckout = () => {
    if (!stockStatus.isAvailable) return;
    setStep('checkout');
  };

  const handleAddToBag = () => {
    if (!stockStatus.isAvailable) return;
    addItem(product, quantity, selectedSize);
    showToast(`Added ${product.title} to your bag.`, 'success');
    closeBuySheet();
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !canTriggerAction('purchase-sheet-submit', 1200)) return;
    setSubmitError(null);

    const parsed = checkoutSchema.safeParse({
      fullName,
      phone,
      whatsapp,
      address,
      city,
      postalCode,
      notes,
      paymentMethod,
      referralCode,
    });

    if (!parsed.success) {
      setFormErrors(extractZodFieldErrors(parsed.error));
      setSubmitStatus('error');
      window.setTimeout(() => setSubmitStatus('idle'), 500);
      return;
    }

    if (paymentMethod === 'installments') {
      const check = await orderService.validateSellerReferral(parsed.data.referralCode);
      if (!check.valid) {
        setFormErrors({
          referralCode:
            'Seller Referral ID not found or inactive. Installment orders require a verified CA Seller ID (format CA-XXXXXX).',
        });
        setSubmitStatus('error');
        window.setTimeout(() => setSubmitStatus('idle'), 500);
        return;
      }
    }

    setFormErrors({});
    setSubmitStatus('idle');
    setSubmitting(true);
    try {
      const order = await orderService.createOrder({
        items: [
          {
            productId: product.id,
            title: product.title,
            unitPrice: product.price,
            quantity,
            selectedSize,
            image: product.coverImage,
          },
        ],
        customerName: sanitizePlainText(parsed.data.fullName, 80),
        phone: parsed.data.phone,
        whatsapp: parsed.data.whatsapp,
        address: sanitizePlainText(parsed.data.address, 200),
        city: sanitizePlainText(parsed.data.city, 60),
        postalCode: parsed.data.postalCode,
        notes: sanitizePlainText(parsed.data.notes || '', 300),
        paymentMethod,
        planId: paymentMethod === 'installments' ? activePlan?.id : undefined,
        referralCode: parsed.data.referralCode || undefined,
        idempotencyKey: idempotencyKeyRef.current,
        turnstileToken: turnstileToken || undefined,
        honeypot,
      });
      idempotencyKeyRef.current = createIdempotencyKey('ord');
      saveOrderReceipt(order);
      setCreatedOrder(order);
      setSubmitStatus('success');
      await queryClient.invalidateQueries({ queryKey: ['orders', 'mine'] });
      showToast(`Order ${order.id} submitted as Pending.`, 'success');
      closeBuySheet();
      navigate(`${localize('/order-confirmed')}?id=${encodeURIComponent(order.id)}`, {
        state: { order },
      });
    } catch (err) {
      const normalized = normalizeAppError(err, { fallbackMessage: 'Unable to submit order.' });
      setSubmitError(
        normalized.kind === 'server' || normalized.kind === 'timeout' || normalized.kind === 'offline'
          ? `${normalized.message} (Ref: ${normalized.referenceId})`
          : normalized.message
      );
      setSubmitStatus('error');
      window.setTimeout(() => setSubmitStatus('idle'), 500);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <CALoadingOverlay open={submitting} label="Placing your order..." />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Purchase ${product.title}`}
        className="ca-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      >
        <div className="ca-sheet-up glass-sheet relative max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl p-5 sm:rounded-2xl sm:p-7">
          <div className="flex items-center justify-between gap-4 pb-2">
            <div>
              <p className="text-xs text-[var(--ca-text-muted)]">
                {product.categoryName} · {step === 'configure' ? 'Select option' : step === 'checkout' ? 'Delivery & verification' : 'Order received'}
              </p>
              <h2 className="font-display mt-0.5 text-2xl font-semibold text-[var(--ca-text)]">
                {product.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeBuySheet}
              aria-label="Close purchase sheet"
              className="btn-press inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--ca-text-muted)] hover:bg-[var(--ca-surface-subtle)] hover:text-[var(--ca-text)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

        {step === 'configure' && (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Gallery */}
            <div>
              <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--ca-surface-subtle)]">
                <ResilientImage
                  src={selectedImage}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
              </div>
              {allImages.length > 1 && (
                <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(img)}
                      aria-label={`View image ${i + 1}`}
                      className={`h-14 w-18 shrink-0 overflow-hidden rounded-xl border transition-all ${
                        selectedImage === img
                          ? 'border-[var(--ca-accent)] ring-1 ring-[var(--ca-accent)]'
                          : 'border-[var(--ca-border)] opacity-75 hover:opacity-100'
                      }`}
                    >
                      <ResilientImage src={img} alt={`${product.title} angle ${i + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-4 text-sm leading-relaxed text-[var(--ca-text-muted)]">
                {product.description}
              </p>
            </div>

            {/* Configuration */}
            <div className="flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-nums text-2xl font-semibold text-[var(--ca-text)]">
                      {formatPKR(product.price)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        stockStatus.level === 'out_of_stock'
                          ? 'bg-red-500/12 text-red-700 dark:text-red-300'
                          : stockStatus.level === 'low_stock'
                          ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                          : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {sheetStockLabel}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--ca-text-muted)]">
                    Total: <strong className="font-mono-nums text-[var(--ca-text)]">{formatPKR(product.price * quantity)}</strong>
                  </span>
                </div>

                {/* Size & Quantity */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {product.sizes && product.sizes.length > 0 && (
                    <div>
                      <span className="block text-xs font-medium text-[var(--ca-text-muted)]">Size / Fit</span>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {product.sizes.map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setSelectedSize(sz)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                              selectedSize === sz
                                ? 'border-[var(--ca-text)] bg-[var(--ca-text)] text-[var(--ca-bg)]'
                                : 'border-[var(--ca-border)] text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="block text-xs font-medium text-[var(--ca-text-muted)]">Quantity</span>
                    <div className="mt-1.5 inline-flex items-center rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-subtle)]/60">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        aria-label="Decrease quantity"
                        className="p-2 text-[var(--ca-text)] hover:opacity-70"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-mono-nums min-w-[2rem] text-center text-sm font-medium">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                        aria-label="Increase quantity"
                        className="p-2 text-[var(--ca-text)] hover:opacity-70"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Payment Option Selector */}
                <div>
                  <span className="block text-xs font-medium text-[var(--ca-text-muted)]">
                    Payment Method
                  </span>
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-[var(--ca-surface-subtle)] p-1">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                        paymentMethod === 'cod'
                          ? 'bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm'
                          : 'text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]'
                      }`}
                    >
                      Cash on Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('installments')}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                        paymentMethod === 'installments'
                          ? 'bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm'
                          : 'text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]'
                      }`}
                    >
                      PKR Installments
                    </button>
                  </div>
                </div>

                {paymentMethod === 'installments' && (
                  <div className="rounded-xl bg-[var(--ca-surface-subtle)] p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {plans.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPlanId(p.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            selectedPlanId === p.id
                              ? 'bg-[var(--ca-accent)] text-[var(--ca-accent-fg)]'
                              : 'bg-[var(--ca-surface-solid)] text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]'
                          }`}
                        >
                          {p.label} ({p.markupPercent}%)
                        </button>
                      ))}
                    </div>

                    {calc && (
                      <dl className="mt-4 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <dt className="text-[var(--ca-text-muted)]">Product Subtotal</dt>
                          <dd className="font-mono-nums font-medium text-[var(--ca-text)]">
                            {formatPKR(calc.subtotal)}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-[var(--ca-text-muted)]">
                            Interest ({calc.markupPercent}%)
                          </dt>
                          <dd className="font-mono-nums font-semibold text-[var(--ca-accent)]">
                            + {formatPKR(calc.markupAmount)}
                          </dd>
                        </div>
                        {calc.advancePercent > 0 && (
                          <div className="flex justify-between">
                            <dt className="text-[var(--ca-text-muted)]">
                              Advance ({calc.advancePercent}%)
                            </dt>
                            <dd className="font-mono-nums font-semibold text-[var(--ca-text)]">
                              {formatPKR(calc.advanceAmount)}
                            </dd>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <dt className="text-[var(--ca-text-muted)]">
                            Monthly ({calc.months} months)
                          </dt>
                          <dd className="font-mono-nums font-semibold text-[var(--ca-text)]">
                            {formatPKR(calc.monthlyAmount)} / mo
                          </dd>
                        </div>
                        <div className="flex justify-between pt-2">
                          <dt className="font-medium text-[var(--ca-text)]">Total Payable</dt>
                          <dd className="font-mono-nums font-bold text-[var(--ca-text)]">
                            {formatPKR(calc.totalPayable)}
                          </dd>
                        </div>
                      </dl>
                    )}
                    <p className="mt-2.5 text-[11px] text-[var(--ca-text-muted)]">
                      Requires an active Seller Referral ID at checkout.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2.5 pt-2 sm:flex-row">
                <button
                  type="button"
                  disabled={!stockStatus.isAvailable}
                  onClick={handleAddToBag}
                  className={`flex-1 rounded-xl border border-[var(--ca-border)] px-4 py-3 text-sm font-medium text-[var(--ca-text)] ${
                    stockStatus.isAvailable
                      ? 'btn-press hover:bg-[var(--ca-surface-subtle)]'
                      : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  Add to Bag
                </button>
                <button
                  type="button"
                  disabled={!stockStatus.isAvailable}
                  onClick={handleProceedToCheckout}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
                    stockStatus.isAvailable
                      ? 'btn-press bg-[var(--ca-text)] text-[var(--ca-bg)] hover:opacity-90'
                      : 'cursor-not-allowed bg-[var(--ca-surface-subtle)] text-[var(--ca-text-muted)] opacity-60'
                  }`}
                >
                  {stockStatus.isAvailable ? 'Proceed to Checkout' : t.product.outOfStock}
                  {stockStatus.isAvailable && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'checkout' && (
          <form onSubmit={handleSubmitOrder} className="mt-5 space-y-4">
            <div className="rounded-xl bg-[var(--ca-surface-subtle)] p-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[var(--ca-text)]">
                  {product.title} × {quantity} ({selectedSize})
                </span>
                <span className="font-mono-nums font-bold text-[var(--ca-text)]">
                  {paymentMethod === 'installments' && calc
                    ? `Total ${formatPKR(calc.totalPayable)} (${activePlan?.label})`
                    : `COD Total ${formatPKR(product.price * quantity)}`}
                </span>
              </div>
              {paymentMethod === 'installments' && calc && (
                <p className="mt-1 text-[var(--ca-text-muted)]">
                  Interest {calc.markupPercent}% (+{formatPKR(calc.markupAmount)})
                  {calc.advanceAmount > 0 ? ` · Advance ${formatPKR(calc.advanceAmount)}` : ''} ·{' '}
                  {calc.months} × {formatPKR(calc.monthlyAmount)}/mo
                </p>
              )}
            </div>

            {submitError && (
              <div role="alert" className="ca-shake rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-600 dark:text-red-400">
                {submitError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
                />
                {formErrors.fullName && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03355329722"
                  className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
                />
                {formErrors.phone && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                  WhatsApp Number *
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="03355329722"
                  className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
                />
                {formErrors.whatsapp && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.whatsapp}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                  City *
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Peshawar"
                  className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
                />
                {formErrors.city && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.city}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                  Complete Delivery Address *
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House / Street / Sector"
                  className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
                />
                {formErrors.address && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.address}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                  Postal Code *
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="25000"
                  className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
                />
                {formErrors.postalCode && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.postalCode}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                  Seller Referral ID {paymentMethod === 'installments' ? '(Required *)' : '(Optional)'}
                </label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="CA-XXXXXX"
                  className="font-mono-nums mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm uppercase text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
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
                {formErrors.referralCode && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {formErrors.referralCode}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                  Order Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tailoring or delivery timing notes..."
                  className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <TurnstileField
                  action="checkout"
                  onToken={setTurnstileToken}
                  honeypot={honeypot}
                  onHoneypotChange={setHoneypot}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('configure')}
                className="btn-press min-h-[44px] rounded-xl border border-[var(--ca-border)] px-4 py-2.5 text-sm font-medium text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]"
              >
                Back
              </button>
              <CAProcessButton
                type="submit"
                loading={submitting}
                status={submitStatus}
                className="rounded-xl bg-[var(--ca-text)] px-6 py-2.5 text-sm font-semibold text-[var(--ca-bg)] hover:opacity-90"
              >
                Confirm &amp; Place Order
              </CAProcessButton>
            </div>
          </form>
        )}

        {step === 'success' && createdOrder && (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Check className="h-7 w-7" />
            </div>
            <h3 className="font-display mt-4 text-3xl font-semibold text-[var(--ca-text)]">
              Order {createdOrder.id} Placed
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--ca-text-muted)]">
              Your order is currently <strong>Pending</strong> verification by our Peshawar store.
              {createdOrder.paymentMethod === 'installments'
                ? ` Installment schedule (${createdOrder.planLabel}) is attached to your order tracker.`
                : ' Cash on Delivery will be collected upon dispatch.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  closeBuySheet();
                  navigate('/orders');
                }}
                className="btn-press rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-sm font-semibold text-[var(--ca-bg)]"
              >
                View My Orders
              </button>
              <button
                type="button"
                onClick={closeBuySheet}
                className="rounded-xl border border-[var(--ca-border)] px-5 py-2.5 text-sm font-medium text-[var(--ca-text)]"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
}
