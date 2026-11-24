import { useEffect, useMemo, useState } from 'react';
import { Calculator, Minus, Plus, ShoppingBag } from 'lucide-react';
import { productService } from '../api';
import type { InstallmentPlan, Product } from '../api/types';
import { useCart } from '../context/CartContext';
import { calculateInstallmentPlan, formatPKR } from '../utils/commerce';

interface InstallmentCalculatorProps {
  products?: Product[];
  plans?: InstallmentPlan[];
  initialProductId?: string;
}

export function InstallmentCalculator({
  products: propProducts,
  plans: propPlans,
  initialProductId,
}: InstallmentCalculatorProps) {
  const { openBuySheet } = useCart();

  const [products, setProducts] = useState<Product[]>(propProducts || []);
  const [plans, setPlans] = useState<InstallmentPlan[]>(propPlans || []);
  const [inputMode, setInputMode] = useState<'product' | 'custom'>('product');
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [customAmount, setCustomAmount] = useState<string>('10000');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  useEffect(() => {
    if (propProducts && propProducts.length > 0) {
      setProducts(propProducts);
      if (!selectedProductId) {
        setSelectedProductId(initialProductId || propProducts[0].id);
      }
    } else {
      productService
        .listProducts({ sort: 'latest' })
        .then((list) => {
          setProducts(list);
          if (list.length > 0) {
            setSelectedProductId((prev) => prev || initialProductId || list[0].id);
          }
        })
        .catch(() => {});
    }
  }, [propProducts, initialProductId, selectedProductId]);

  useEffect(() => {
    if (propPlans && propPlans.length > 0) {
      setPlans(propPlans);
      if (!selectedPlanId) setSelectedPlanId(propPlans[0].id);
    } else {
      productService
        .listInstallmentPlans()
        .then((list) => {
          setPlans(list);
          if (list.length > 0) setSelectedPlanId((prev) => prev || list[0].id);
        })
        .catch(() => {});
    }
  }, [propPlans, selectedPlanId]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || products[0] || null,
    [products, selectedProductId]
  );

  const activePlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || plans[0] || null,
    [plans, selectedPlanId]
  );

  const unitPrice = useMemo(() => {
    if (inputMode === 'custom' || !selectedProduct) {
      const parsed = Math.max(0, Math.round(Number(customAmount) || 0));
      return parsed;
    }
    return selectedProduct.price;
  }, [inputMode, selectedProduct, customAmount]);

  const effectiveQty = inputMode === 'custom' ? 1 : quantity;

  const activeCalc = useMemo(() => {
    if (!activePlan) return null;
    return calculateInstallmentPlan(unitPrice, effectiveQty, activePlan);
  }, [unitPrice, effectiveQty, activePlan]);

  const comparisons = useMemo(
    () =>
      plans.map((plan) => ({
        plan,
        calc: calculateInstallmentPlan(unitPrice, effectiveQty, plan),
      })),
    [plans, unitPrice, effectiveQty]
  );

  return (
    <div
      data-testid="installment-calculator"
      className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Calculator className="h-5 w-5 text-[var(--ca-accent)]" />
          <h3 className="font-display text-2xl font-semibold text-[var(--ca-text)] sm:text-3xl">
            Installment Calculator
          </h3>
        </div>

        <div className="inline-flex rounded-xl bg-[var(--ca-surface-subtle)] p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setInputMode('product')}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              inputMode === 'product'
                ? 'bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm'
                : 'text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]'
            }`}
          >
            Select Product
          </button>
          <button
            type="button"
            onClick={() => setInputMode('custom')}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              inputMode === 'custom'
                ? 'bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm'
                : 'text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]'
            }`}
          >
            Custom PKR Amount
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Inputs */}
        <div className="space-y-4 lg:col-span-5">
          {inputMode === 'product' && products.length > 0 ? (
            <>
              <div>
                <label
                  htmlFor="calc-product-select"
                  className="block text-xs font-medium text-[var(--ca-text-muted)]"
                >
                  Choose Product
                </label>
                <select
                  id="calc-product-select"
                  value={selectedProduct?.id || ''}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} — {formatPKR(p.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl bg-[var(--ca-surface-subtle)] px-4 py-3">
                <div>
                  <span className="block text-xs text-[var(--ca-text-muted)]">Quantity</span>
                  <span className="font-mono-nums text-sm font-semibold text-[var(--ca-text)]">
                    Cash price: {formatPKR(unitPrice * effectiveQty)}
                  </span>
                </div>
                <div className="inline-flex items-center rounded-xl bg-[var(--ca-surface-solid)]">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Calculator decrease quantity"
                    className="p-2 text-[var(--ca-text)] hover:opacity-70"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-mono-nums min-w-[2rem] text-center text-sm font-semibold">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                    aria-label="Calculator increase quantity"
                    className="p-2 text-[var(--ca-text)] hover:opacity-70"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label
                htmlFor="calc-custom-amount"
                className="block text-xs font-medium text-[var(--ca-text-muted)]"
              >
                Enter Product Price (PKR)
              </label>
              <input
                id="calc-custom-amount"
                type="number"
                min={0}
                step={100}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="10000"
                className="font-mono-nums mt-1.5 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-base font-semibold text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
              />
            </div>
          )}

          {/* Plan Selector */}
          <div>
            <span className="block text-xs font-medium text-[var(--ca-text-muted)]">
              Installment Duration &amp; Interest Rate
            </span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {plans.map((p) => {
                const selected = activePlan?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlanId(p.id)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                      selected
                        ? 'border-[var(--ca-accent)] bg-[var(--ca-accent)] text-[var(--ca-accent-fg)] shadow-sm'
                        : 'border-[var(--ca-border)] bg-[var(--ca-surface-solid)] text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]'
                    }`}
                  >
                    <span className="block text-xs font-bold">{p.label}</span>
                    <span
                      className={`font-mono-nums text-[11px] ${
                        selected ? 'opacity-90' : 'text-[var(--ca-text-muted)]'
                      }`}
                    >
                      {p.markupPercent}% interest
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {inputMode === 'product' && selectedProduct && activePlan && (
            <button
              type="button"
              onClick={() =>
                openBuySheet(
                  selectedProduct,
                  quantity,
                  selectedProduct.sizes?.[0] || 'One Size',
                  { paymentMethod: 'installments', planId: activePlan.id }
                )
              }
              className="btn-press inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ca-text)] px-4 py-3 text-xs font-semibold text-[var(--ca-bg)] hover:opacity-90"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Buy {selectedProduct.title} on {activePlan.label}
            </button>
          )}
        </div>

        {/* Right Live Breakdown & Side-by-Side Comparison */}
        <div className="space-y-4 lg:col-span-7">
          {activeCalc && activePlan && (
            <div className="rounded-xl bg-[var(--ca-surface-subtle)] p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3">
                <div>
                  <span className="text-xs font-medium text-[var(--ca-text-muted)]">
                    Selected Plan ({activePlan.label})
                  </span>
                  <p className="font-mono-nums mt-0.5 text-2xl font-bold text-[var(--ca-text)]">
                    {formatPKR(activeCalc.totalPayable)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[var(--ca-text-muted)]">Monthly Installment</span>
                  <p className="font-mono-nums text-lg font-bold text-[var(--ca-accent)]">
                    {formatPKR(activeCalc.monthlyAmount)} / mo × {activeCalc.months}
                  </p>
                </div>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                <div className="rounded-xl bg-[var(--ca-surface-solid)] p-3">
                  <dt className="text-[var(--ca-text-muted)]">Base Product Price</dt>
                  <dd className="font-mono-nums mt-1 font-semibold text-[var(--ca-text)]">
                    {formatPKR(activeCalc.subtotal)}
                  </dd>
                </div>
                <div className="rounded-xl bg-[var(--ca-surface-solid)] p-3">
                  <dt className="text-[var(--ca-text-muted)]">
                    Interest ({activeCalc.markupPercent}%)
                  </dt>
                  <dd className="font-mono-nums mt-1 font-semibold text-[var(--ca-accent)]">
                    + {formatPKR(activeCalc.markupAmount)}
                  </dd>
                </div>
                <div className="rounded-xl bg-[var(--ca-surface-solid)] p-3 col-span-2 sm:col-span-1">
                  <dt className="text-[var(--ca-text-muted)]">
                    {activeCalc.advancePercent > 0
                      ? `Advance (${activeCalc.advancePercent}%)`
                      : 'Advance Required'}
                  </dt>
                  <dd className="font-mono-nums mt-1 font-semibold text-[var(--ca-text)]">
                    {activeCalc.advancePercent > 0 ? formatPKR(activeCalc.advanceAmount) : 'PKR 0 (0%)'}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* All Active Plans Comparison Strip */}
          {comparisons.length > 0 && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {comparisons.map(({ plan, calc }) => {
                const isSelected = activePlan?.id === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`rounded-xl p-3.5 text-left transition-all ${
                      isSelected
                        ? 'bg-[var(--ca-accent)]/12 ring-1 ring-[var(--ca-accent)]'
                        : 'bg-[var(--ca-surface-subtle)] hover:bg-[var(--ca-surface-subtle)]/80'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--ca-text)]">{plan.label}</span>
                      <span className="font-mono-nums font-semibold text-[var(--ca-accent)]">
                        {plan.markupPercent}%
                      </span>
                    </div>
                    <p className="font-mono-nums mt-1.5 text-sm font-bold text-[var(--ca-text)]">
                      {formatPKR(calc.totalPayable)}
                    </p>
                    <p className="font-mono-nums mt-0.5 text-[11px] text-[var(--ca-text-muted)]">
                      {formatPKR(calc.monthlyAmount)} / mo · +{formatPKR(calc.markupAmount)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
