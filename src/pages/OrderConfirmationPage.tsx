import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Copy,
  Check,
  PackageCheck,
  ShoppingBag,
  MessageCircle,
  Clock,
} from 'lucide-react';
import { orderService } from '../api';
import type { Order } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLocale } from '../i18n';
import { formatPKR } from '../utils/commerce';
import { STORE_CONFIG } from '../services/siteConfig';
import { getOrderReceipt } from '../services/orderReceipts';
import { copyTextToClipboard } from '../utils/security';
import { SeoHead } from '../components/SeoHead';
import { CALoader } from '../components/CALoader';

export function OrderConfirmationPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { localize } = useLocale();

  const routeOrder = (location.state as { order?: Order } | null)?.order || null;
  const orderIdParam = searchParams.get('id') || routeOrder?.id || '';

  const [order, setOrder] = useState<Order | null>(() => {
    if (routeOrder) return routeOrder;
    return orderIdParam ? getOrderReceipt(orderIdParam) : null;
  });
  const [loading, setLoading] = useState<boolean>(!order && Boolean(orderIdParam && user));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (order || !orderIdParam || !user) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    orderService
      .listMyOrders()
      .then((list) => {
        if (!active) return;
        const found = list.find((o) => o.id === orderIdParam) || null;
        setOrder(found);
      })
      .catch(() => {
        // Ignore lookup error cleanly; fallback view displays orderIdParam
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [order, orderIdParam, user]);

  const handleCopyId = async () => {
    const idToCopy = order?.id || orderIdParam;
    if (!idToCopy) return;
    const ok = await copyTextToClipboard(idToCopy);
    if (ok) {
      setCopied(true);
      showToast(`Copied Order ID ${idToCopy}`, 'success');
      window.setTimeout(() => setCopied(false), 1800);
    } else {
      showToast(`Order ID: ${idToCopy}`, 'info');
    }
  };

  const displayOrderId = order?.id || orderIdParam;
  const whatsappText = encodeURIComponent(
    displayOrderId
      ? `Salam Cinematic Arts, checking on my Order ID ${displayOrderId}.`
      : 'Salam Cinematic Arts, I need help with my recent order.'
  );
  const whatsappHref = `${STORE_CONFIG.whatsappUrl}?text=${whatsappText}`;

  return (
    <>
      <SeoHead
        title="Order Confirmed — Cinematic Arts (CA)"
        description="Your Cinematic Arts order confirmation and reference ID."
        canonicalPath="/order-confirmed"
        noIndex
      />

      <section
        data-testid="order-confirmation-screen"
        className="ca-fade-in mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16"
      >
        {loading ? (
          <div className="glass-panel flex min-h-[280px] items-center justify-center rounded-2xl p-8">
            <CALoader size="md" label="Loading order confirmation..." />
          </div>
        ) : !displayOrderId ? (
          <div className="glass-panel rounded-2xl p-8 text-center">
            <h1 className="font-display text-3xl font-semibold text-[var(--ca-text)]">
              No Recent Order Found
            </h1>
            <p className="mt-2 text-sm text-[var(--ca-text-muted)]">
              Check your order tracker for live status or continue browsing the catalog.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to={localize('/orders')}
                className="btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-sm font-semibold text-[var(--ca-bg)]"
              >
                <PackageCheck className="h-4 w-4" />
                View My Orders
              </Link>
              <Link
                to={localize('/shop')}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--ca-border)] px-5 py-2.5 text-sm font-medium text-[var(--ca-text)]"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-6 sm:p-8">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <p className="mt-4 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Order Submitted Successfully
              </p>
              <h1 className="font-display mt-1 text-3xl font-semibold text-[var(--ca-text)] sm:text-4xl">
                Thank you for your order
              </h1>
              <p className="mt-2 text-sm text-[var(--ca-text-muted)]">
                Our Peshawar team has received your order and marked it <strong>Pending</strong> verification.
              </p>
            </div>

            {/* Highlighted Order ID Box */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--ca-surface-subtle)] p-4 sm:p-5">
              <div>
                <span className="block text-xs text-[var(--ca-text-muted)]">Order Reference ID</span>
                <p
                  data-testid="confirmed-order-id"
                  className="font-mono-nums mt-0.5 text-xl font-bold text-[var(--ca-text)] sm:text-2xl"
                >
                  {displayOrderId}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyId}
                className="btn-press inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[var(--ca-surface-solid)] px-4 py-2 text-xs font-semibold text-[var(--ca-text)] hover:opacity-85"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy Order ID'}
              </button>
            </div>

            {/* Order Details Summary */}
            {order && (
              <div className="mt-6 space-y-5">
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                  <div className="rounded-xl bg-[var(--ca-surface-subtle)]/70 p-3">
                    <span className="block text-[var(--ca-text-muted)]">Status</span>
                    <span className="mt-1 inline-flex items-center gap-1 font-semibold capitalize text-[var(--ca-accent)]">
                      <Clock className="h-3.5 w-3.5" />
                      {order.status}
                    </span>
                  </div>
                  <div className="rounded-xl bg-[var(--ca-surface-subtle)]/70 p-3">
                    <span className="block text-[var(--ca-text-muted)]">Payment</span>
                    <span className="mt-1 block font-semibold text-[var(--ca-text)]">
                      {order.paymentMethod === 'installments'
                        ? `Installments (${order.planLabel || 'Plan'})`
                        : 'Cash on Delivery'}
                    </span>
                  </div>
                  <div className="col-span-2 rounded-xl bg-[var(--ca-surface-subtle)]/70 p-3 sm:col-span-1">
                    <span className="block text-[var(--ca-text-muted)]">Total Payable</span>
                    <span className="font-mono-nums mt-1 block font-bold text-[var(--ca-text)]">
                      {formatPKR(order.totalAmount)}
                    </span>
                  </div>
                </div>

                {order.paymentMethod === 'installments' && (
                  <div className="rounded-xl border border-[var(--ca-border)] p-4 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-[var(--ca-text)]">Installment Breakdown</span>
                      {order.referralCode && (
                        <span className="font-mono-nums text-[var(--ca-text-muted)]">
                          Seller Ref: <strong className="text-[var(--ca-text)]">{order.referralCode}</strong>
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-[var(--ca-text-muted)]">
                      {order.advanceAmount > 0 ? `Advance: ${formatPKR(order.advanceAmount)} · ` : ''}
                      Monthly: <strong className="font-mono-nums text-[var(--ca-text)]">{formatPKR(order.monthlyAmount)} / mo</strong>
                    </p>
                  </div>
                )}

                <div>
                  <h2 className="text-xs font-semibold text-[var(--ca-text-muted)]">Items Ordered</h2>
                  <ul className="mt-2 space-y-2 text-sm">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--ca-surface-subtle)]/50 px-3.5 py-2.5">
                        <span className="text-[var(--ca-text)]">
                          {item.title} × {item.quantity}{' '}
                          {item.selectedSize ? (
                            <span className="text-xs text-[var(--ca-text-muted)]">({item.selectedSize})</span>
                          ) : null}
                        </span>
                        <span className="font-mono-nums text-xs font-semibold text-[var(--ca-text)]">
                          {formatPKR(item.unitPrice * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="text-xs text-[var(--ca-text-muted)]">
                  Delivering to <strong className="text-[var(--ca-text)]">{order.customerName}</strong> in{' '}
                  <strong className="text-[var(--ca-text)]">{order.city}</strong>.
                </p>
              </div>
            )}

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                to={localize('/orders')}
                className="btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-sm font-semibold text-[var(--ca-bg)] hover:opacity-90"
              >
                <PackageCheck className="h-4 w-4" />
                Track in My Orders
              </Link>
              <Link
                to={localize('/shop')}
                className="btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--ca-border)] px-5 py-2.5 text-sm font-medium text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]"
              >
                <ShoppingBag className="h-4 w-4" />
                Continue Shopping
              </Link>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--ca-accent)] hover:underline"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp Support
              </a>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
