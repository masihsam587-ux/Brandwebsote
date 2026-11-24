import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocale } from '../i18n';

export interface BreadcrumbNode {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbNode[] }) {
  const { isRtl } = useLocale();

  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--ca-text-muted)]">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={`${item.label}-${idx}`} className="inline-flex items-center gap-1.5">
            {idx > 0 && (
              <ChevronRight
                aria-hidden="true"
                className={`h-3.5 w-3.5 opacity-60 ${isRtl ? 'rotate-180' : ''}`}
              />
            )}
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="inline-flex min-h-[32px] items-center hover:text-[var(--ca-text)] hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={isLast ? 'page' : undefined}
                className={isLast ? 'font-medium text-[var(--ca-text)]' : ''}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
