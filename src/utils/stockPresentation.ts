import type { StockLevel } from '../api/types';

export interface StockBadgeLabels {
  inStock: string;
  lowStock: string;
  outOfStock: string;
}

export function getStockPresentation(
  stock: { level: StockLevel; remainingUnits?: number },
  labels: StockBadgeLabels,
  includeRemainingCount = false
): { label: string; badgeClass: string } {
  if (stock.level === 'out_of_stock') {
    return {
      label: labels.outOfStock,
      badgeClass: 'bg-red-500/12 text-red-700 dark:text-red-300',
    };
  }

  if (stock.level === 'low_stock') {
    const label =
      includeRemainingCount && typeof stock.remainingUnits === 'number'
        ? `${labels.lowStock} (${stock.remainingUnits} left)`
        : labels.lowStock;
    return {
      label,
      badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
    };
  }

  return {
    label: labels.inStock,
    badgeClass: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  };
}
