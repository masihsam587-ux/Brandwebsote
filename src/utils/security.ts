import DOMPurify from 'dompurify';

function stripControlChars(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    out += code < 32 || code === 127 ? ' ' : input[i];
  }
  return out;
}

function hasControlChars(input: string): boolean {
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

/**
 * Strip all HTML/script tags and normalize whitespace for plain-text fields
 * (names, notes, feedback, notifications, product copy, referral IDs).
 */
export function sanitizePlainText(input: unknown, maxLength = 500): string {
  const raw = typeof input === 'string' ? input : String(input ?? '');
  const stripped =
    typeof window !== 'undefined'
      ? DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
      : raw.replace(/<[^>]*>/g, '');

  return stripControlChars(stripped)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize constrained rich text if ever rendered inside markup.
 * Still enforces strict allowlist without scripts, iframes, or inline handlers.
 */
export function sanitizeRichText(html: string, maxLength = 4000): string {
  const clean = DOMPurify.sanitize(html.slice(0, maxLength), {
    ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'br', 'p', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
  });
  return clean;
}

/**
 * Prevent Open Redirect vulnerabilities:
 * Only allow relative internal application paths starting with a single '/'.
 */
export function sanitizeUrlPath(candidate: string | null | undefined, fallback = '/profile'): string {
  if (!candidate || typeof candidate !== 'string') return fallback;
  const trimmed = candidate.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback;
  }
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/i.test(trimmed)) {
    return fallback;
  }
  // Reject control characters that browsers normalize
  if (hasControlChars(trimmed)) {
    return fallback;
  }
  return trimmed.slice(0, 200);
}

/**
 * Allow only safe https:/mailto:/tel: links for external href bindings.
 */
export function sanitizeExternalUrl(url: string, fallback = '#'): string {
  const trimmed = url.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'mailto:' || parsed.protocol === 'tel:') {
      return parsed.toString();
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function validateSafeSlug(slug: string): boolean {
  return (
    slug.length >= 1 &&
    slug.length <= 120 &&
    /^[a-z0-9-]+$/.test(slug) &&
    !slug.startsWith('-') &&
    !slug.endsWith('-') &&
    !slug.includes('--')
  );
}

/**
 * Mask sensitive phone numbers inside list tables (e.g. 0335••••722).
 */
export function maskPhone(phone: string | undefined | null): string {
  if (!phone) return '—';
  const clean = phone.trim();
  if (clean.length <= 6) return '••••';
  return `${clean.slice(0, 4)}••••${clean.slice(-3)}`;
}

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  checks: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasDigitOrSymbol: boolean;
  };
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasDigitOrSymbol: /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };
  const passed = Object.values(checks).filter(Boolean).length as 0 | 1 | 2 | 3 | 4;
  const labels: Record<0 | 1 | 2 | 3 | 4, PasswordStrengthResult['label']> = {
    0: 'Too weak',
    1: 'Weak',
    2: 'Fair',
    3: 'Good',
    4: 'Strong',
  };
  return { score: passed, label: labels[passed], checks };
}

export function createIdempotencyKey(prefix = 'ca'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const lastActionMap = new Map<string, number>();

export function canTriggerAction(actionKey: string, cooldownMs = 800): boolean {
  const now = Date.now();
  const prev = lastActionMap.get(actionKey) || 0;
  if (now - prev < cooldownMs) return false;
  lastActionMap.set(actionKey, now);
  return true;
}

export function isValidAdminHash(hash: string): boolean {
  return hash.toLowerCase() === '#admin' || hash.toLowerCase().endsWith('#admin');
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall back to textarea selection in restricted iframe contexts
    }
  }
  if (typeof document !== 'undefined') {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return Boolean(ok);
    } catch {
      return false;
    }
  }
  return false;
}
