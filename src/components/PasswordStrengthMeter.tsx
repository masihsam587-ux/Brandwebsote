import { Check, Circle } from 'lucide-react';
import { evaluatePasswordStrength } from '../utils/security';

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, checks } = evaluatePasswordStrength(password);

  const barColors = [
    'bg-red-500',
    'bg-red-500',
    'bg-amber-500',
    'bg-emerald-500',
    'bg-emerald-600',
  ];

  const requirements = [
    { ok: checks.minLength, text: 'At least 8 characters' },
    { ok: checks.hasUpper, text: 'Uppercase letter (A-Z)' },
    { ok: checks.hasLower, text: 'Lowercase letter (a-z)' },
    { ok: checks.hasDigitOrSymbol, text: 'Number or symbol' },
  ];

  return (
    <div className="mt-2 space-y-2 rounded-xl bg-[var(--ca-surface-subtle)] p-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[var(--ca-text-muted)]">Password strength</span>
        <span className="font-semibold text-[var(--ca-text)]">{label}</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-1.5 rounded-sm transition-colors ${
              score >= step ? barColors[score] : 'bg-[var(--ca-border)]'
            }`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-1 text-[11px]">
        {requirements.map((req) => (
          <li
            key={req.text}
            className={`flex items-center gap-1 ${
              req.ok
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-[var(--ca-text-muted)]'
            }`}
          >
            {req.ok ? <Check className="h-3 w-3 shrink-0" /> : <Circle className="h-2.5 w-2.5 shrink-0" />}
            <span>{req.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
