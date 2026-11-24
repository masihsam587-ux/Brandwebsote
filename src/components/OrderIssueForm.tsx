import { useState } from 'react';
import { RefreshCw, AlertTriangle, ChevronDown, ChevronUp, MessageCircle, Check } from 'lucide-react';
import type { Order } from '../api/types';
import { sanitizePlainText } from '../utils/security';
import { STORE_CONFIG } from '../services/siteConfig';

interface OrderIssueFormProps {
  order: Order;
}

type IssueKind = 'exchange' | 'problem';

interface PreparedIssuePreview {
  reference: string;
  kind: IssueKind;
  itemTitle: string;
  reason: string;
  replacementSize: string;
  details: string;
}

const EXCHANGE_REASONS = [
  'Need a different size',
  'Prefer another item / color',
  'Wrong size delivered',
];

const PROBLEM_REASONS = [
  'Damaged or torn in transit',
  'Missing piece in parcel',
  'Stitching or fabric defect',
  'Wrong item received',
  'Billing or installment query',
];

export function OrderIssueForm({ order }: OrderIssueFormProps) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<IssueKind>('exchange');
  const [selectedItem, setSelectedItem] = useState(order.items[0]?.title || 'Order item');
  const [reason, setReason] = useState(EXCHANGE_REASONS[0]);
  const [replacementSize, setReplacementSize] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedIssuePreview | null>(null);

  const reasons = kind === 'exchange' ? EXCHANGE_REASONS : PROBLEM_REASONS;

  const handleKindChange = (next: IssueKind) => {
    setKind(next);
    setReason(next === 'exchange' ? EXCHANGE_REASONS[0] : PROBLEM_REASONS[0]);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanDetails = sanitizePlainText(details, 400);
    const cleanSize = sanitizePlainText(replacementSize, 40);

    if (kind === 'exchange' && cleanSize.length < 1) {
      setError('Please enter your preferred replacement size or item note.');
      return;
    }
    if (cleanDetails.length < 10) {
      setError('Please share a brief description (at least 10 characters).');
      return;
    }

    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    setPrepared({
      reference: `REQ-${suffix}`,
      kind,
      itemTitle: selectedItem,
      reason,
      replacementSize: cleanSize,
      details: cleanDetails,
    });
  };

  const whatsappHref = prepared
    ? `${STORE_CONFIG.whatsappUrl}?text=${encodeURIComponent(
        [
          `Salam Cinematic Arts, ${prepared.kind === 'exchange' ? 'Exchange Request' : 'Order Problem Report'} (${prepared.reference})`,
          `Order ID: ${order.id}`,
          `Item: ${prepared.itemTitle}`,
          `Reason: ${prepared.reason}`,
          prepared.replacementSize ? `Preferred Size: ${prepared.replacementSize}` : null,
          `Details: ${prepared.details}`,
        ]
          .filter(Boolean)
          .join('\n')
      )}`
    : STORE_CONFIG.whatsappUrl;

  return (
    <div className="pt-2">
      <button
        type="button"
        data-testid={`toggle-order-issue-${order.id}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2 text-xs font-medium text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]"
      >
        <RefreshCw className="h-3.5 w-3.5 text-[var(--ca-accent)]" />
        Report a problem / request exchange
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div
          data-testid={`order-issue-panel-${order.id}`}
          className="ca-fade-in mt-3 rounded-xl bg-[var(--ca-surface-subtle)] p-4 sm:p-5"
        >
          <div className="mb-3 flex items-start gap-2 rounded-xl bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-[11px] text-[var(--ca-text-muted)]">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ca-accent)]" />
            <span>
              Request preview only: database recording will activate once database changes are confirmed. You can prepare your request summary and forward it directly on WhatsApp.
            </span>
          </div>

          {prepared ? (
            <div data-testid="order-issue-prepared" className="space-y-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <Check className="h-4 w-4" />
                <span className="font-semibold">
                  Request summary prepared ({prepared.reference})
                </span>
              </div>
              <dl className="grid grid-cols-1 gap-2 rounded-xl bg-[var(--ca-surface-solid)] p-3.5 sm:grid-cols-2">
                <div>
                  <dt className="text-[var(--ca-text-muted)]">Request Type</dt>
                  <dd className="font-medium capitalize text-[var(--ca-text)]">{prepared.kind}</dd>
                </div>
                <div>
                  <dt className="text-[var(--ca-text-muted)]">Affected Item</dt>
                  <dd className="font-medium text-[var(--ca-text)]">{prepared.itemTitle}</dd>
                </div>
                <div>
                  <dt className="text-[var(--ca-text-muted)]">Reason</dt>
                  <dd className="font-medium text-[var(--ca-text)]">{prepared.reason}</dd>
                </div>
                {prepared.replacementSize && (
                  <div>
                    <dt className="text-[var(--ca-text-muted)]">Preferred Replacement Size</dt>
                    <dd className="font-medium text-[var(--ca-text)]">{prepared.replacementSize}</dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="text-[var(--ca-text-muted)]">Details</dt>
                  <dd className="mt-0.5 text-[var(--ca-text)]">{prepared.details}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-press inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[var(--ca-text)] px-4 py-2 text-xs font-semibold text-[var(--ca-bg)]"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Send via WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setPrepared(null)}
                  className="min-h-[40px] rounded-xl border border-[var(--ca-border)] px-3.5 py-2 text-xs font-medium text-[var(--ca-text)] hover:bg-[var(--ca-surface-solid)]"
                >
                  Edit Request
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-3 text-xs">
              {error && (
                <div role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--ca-surface-solid)] p-1">
                <button
                  type="button"
                  onClick={() => handleKindChange('exchange')}
                  className={`min-h-[36px] rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                    kind === 'exchange'
                      ? 'bg-[var(--ca-text)] text-[var(--ca-bg)]'
                      : 'text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]'
                  }`}
                >
                  Request Exchange
                </button>
                <button
                  type="button"
                  onClick={() => handleKindChange('problem')}
                  className={`min-h-[36px] rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                    kind === 'problem'
                      ? 'bg-[var(--ca-text)] text-[var(--ca-bg)]'
                      : 'text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]'
                  }`}
                >
                  Report a Problem
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-medium text-[var(--ca-text-muted)]">
                    Item in Order {order.id}
                  </label>
                  <select
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs text-[var(--ca-text)]"
                  >
                    {order.items.map((it, idx) => (
                      <option key={`${it.productId}-${idx}`} value={it.title}>
                        {it.title} {it.selectedSize ? `(${it.selectedSize})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[var(--ca-text-muted)]">
                    Reason
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs text-[var(--ca-text)]"
                  >
                    {reasons.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {kind === 'exchange' && (
                  <div className="sm:col-span-2">
                    <label className="block font-medium text-[var(--ca-text-muted)]">
                      Preferred Replacement Size / Color *
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      value={replacementSize}
                      onChange={(e) => setReplacementSize(e.target.value)}
                      placeholder="e.g. Size L or Navy color"
                      className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs text-[var(--ca-text)]"
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block font-medium text-[var(--ca-text-muted)]">
                    Describe what happened *
                  </label>
                  <textarea
                    rows={2}
                    maxLength={400}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Share condition details, delivery note, or sizing request..."
                    className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs text-[var(--ca-text)]"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="btn-press inline-flex min-h-[40px] items-center rounded-xl bg-[var(--ca-accent)] px-4 py-2 text-xs font-semibold text-[var(--ca-accent-fg)]"
                >
                  Prepare Request Summary
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
