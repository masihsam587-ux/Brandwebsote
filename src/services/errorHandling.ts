import { scrubSensitiveString } from '../utils/privacyScrub';

export type AppErrorKind =
  | 'offline'
  | 'timeout'
  | 'server'
  | 'rate_limit'
  | 'auth'
  | 'validation'
  | 'unknown';

export interface NormalizedAppError {
  kind: AppErrorKind;
  status: number;
  referenceId: string;
  title: string;
  message: string;
  retryable: boolean;
}

const REFERENCE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates a compact, readable support reference ID such as `CA-7K9M-2P4X`
 * with zero PII or timestamps encoded.
 */
export function createErrorReferenceId(prefix = 'CA'): string {
  const bytes = new Uint8Array(8);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const chars = Array.from(bytes, (b) => REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length]);
  return `${prefix.toUpperCase()}-${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}`;
}

export class AppError extends Error {
  status: number;
  kind: AppErrorKind;
  referenceId: string;
  retryable: boolean;
  title: string;

  constructor(options: {
    message: string;
    status?: number;
    kind?: AppErrorKind;
    referenceId?: string;
    retryable?: boolean;
    title?: string;
  }) {
    super(options.message);
    this.name = 'AppError';
    this.status = options.status ?? 500;
    this.kind = options.kind ?? 'unknown';
    this.referenceId = options.referenceId || createErrorReferenceId('CA');
    this.retryable = options.retryable ?? (this.status === 0 || this.status === 408 || this.status >= 500);
    this.title = options.title || 'Request interrupted';
  }
}

const trackedErrorIds = new WeakMap<object, string>();

export function getOrAssignErrorReferenceId(err: unknown): string {
  if (err && typeof err === 'object') {
    const rec = err as { referenceId?: unknown };
    if (typeof rec.referenceId === 'string' && /^CA-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(rec.referenceId)) {
      return rec.referenceId;
    }
    const existing = trackedErrorIds.get(err);
    if (existing) return existing;
    const created = createErrorReferenceId('CA');
    trackedErrorIds.set(err, created);
    return created;
  }
  return createErrorReferenceId('CA');
}

function extractStatus(err: unknown): number {
  if (!err || typeof err !== 'object') return 0;
  const rec = err as { status?: unknown; statusCode?: unknown; code?: unknown };
  if (typeof rec.status === 'number' && Number.isFinite(rec.status)) return rec.status;
  if (typeof rec.statusCode === 'number' && Number.isFinite(rec.statusCode)) return rec.statusCode;
  if (typeof rec.code === 'string' && /^\d{3}$/.test(rec.code)) return Number(rec.code);
  return 0;
}

function extractRawMessage(err: unknown): string {
  if (!err) return '';
  if (err instanceof Error) return err.message || '';
  if (typeof err === 'object' && 'message' in err) {
    return String((err as { message?: unknown }).message || '');
  }
  return String(err);
}

/**
 * Classifies 500s, timeouts, and offline states into friendly, consistent
 * user messages tagged with a short support reference ID.
 */
export function normalizeAppError(
  err: unknown,
  options?: { offline?: boolean; fallbackMessage?: string }
): NormalizedAppError {
  const referenceId = getOrAssignErrorReferenceId(err);
  const status = extractStatus(err);
  const raw = extractRawMessage(err);
  const lower = raw.toLowerCase();

  const browserOffline =
    options?.offline === true ||
    (typeof navigator !== 'undefined' && navigator.onLine === false);

  if (
    browserOffline ||
    status === 0 && (
      lower.includes('failed to fetch') ||
      lower.includes('networkerror') ||
      lower.includes('network request failed') ||
      lower.includes('network connection unavailable') ||
      lower.includes('load failed') ||
      lower.includes('err_internet_disconnected')
    )
  ) {
    return {
      kind: 'offline',
      status: 0,
      referenceId,
      title: 'You appear to be offline',
      message: 'Your internet connection looks offline. Check your Wi-Fi or mobile data and retry.',
      retryable: true,
    };
  }

  if (
    status === 408 ||
    status === 504 ||
    (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) ||
    lower.includes('timed out') ||
    lower.includes('timeout') ||
    lower.includes('aborterror') ||
    lower.includes('request was aborted')
  ) {
    return {
      kind: 'timeout',
      status: status || 408,
      referenceId,
      title: 'Connection timed out',
      message: 'The request took too long to respond. Please check your connection and try again.',
      retryable: true,
    };
  }

  if (
    status >= 500 ||
    lower.includes('service temporarily unavailable') ||
    lower.includes('internal server error') ||
    lower.includes('bad gateway') ||
    lower.includes('gateway timeout') ||
    lower.includes('econnreset')
  ) {
    return {
      kind: 'server',
      status: status >= 500 ? status : 500,
      referenceId,
      title: 'Temporary service issue',
      message:
        'Our storefront service encountered a temporary problem. Nothing was lost—please retry in a moment.',
      retryable: true,
    };
  }

  if (status === 429 || lower.includes('too many') || lower.includes('rate limit')) {
    return {
      kind: 'rate_limit',
      status: 429,
      referenceId,
      title: 'Too many requests',
      message: 'Please pause for a few seconds before trying again.',
      retryable: true,
    };
  }

  if (status === 401 || status === 403 || lower.includes('authentication required') || lower.includes('permission denied')) {
    return {
      kind: 'auth',
      status: status || 401,
      referenceId,
      title: 'Access required',
      message: scrubSensitiveString(raw) || 'Please sign in with the appropriate account to continue.',
      retryable: false,
    };
  }

  const scrubbed = scrubSensitiveString(raw).trim();
  const safeMessage =
    scrubbed &&
    scrubbed.length <= 220 &&
    !/sql|syntaxerror|prisma|pg_|postgres|stack|at\s+[A-Za-z0-9_$.]+\s+\(/i.test(scrubbed)
      ? scrubbed
      : options?.fallbackMessage || 'Something unexpected went wrong. Please try again.';

  return {
    kind: status >= 400 && status < 500 ? 'validation' : 'unknown',
    status: status || 500,
    referenceId,
    title: 'Request could not be completed',
    message: safeMessage,
    retryable: status === 0 || status >= 500,
  };
}

export interface GlobalErrorState {
  title: string;
  message: string;
  kind: AppErrorKind;
  referenceId: string;
  retryable: boolean;
  timestamp: number;
}

type GlobalErrorListener = () => void;

let currentGlobalError: GlobalErrorState | null = null;
let currentRetryCallback: (() => void) | null = null;
const listeners = new Set<GlobalErrorListener>();

function emitChange() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore subscriber errors
    }
  });
}

export function subscribeGlobalError(listener: GlobalErrorListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getGlobalErrorSnapshot(): GlobalErrorState | null {
  return currentGlobalError;
}

export function reportGlobalError(err: unknown, retryFn?: () => void): NormalizedAppError {
  const normalized = normalizeAppError(err);
  currentGlobalError = {
    title: normalized.title,
    message: normalized.message,
    kind: normalized.kind,
    referenceId: normalized.referenceId,
    retryable: normalized.retryable,
    timestamp: Date.now(),
  };
  if (retryFn) {
    currentRetryCallback = retryFn;
  }
  emitChange();
  return normalized;
}

export function clearGlobalError(): void {
  if (!currentGlobalError && !currentRetryCallback) return;
  currentGlobalError = null;
  currentRetryCallback = null;
  emitChange();
}

export function triggerGlobalErrorRetry(fallbackRetry?: () => void): void {
  const retryFn = currentRetryCallback || fallbackRetry;
  clearGlobalError();
  if (retryFn) {
    retryFn();
  }
}
