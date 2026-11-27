import {
  createErrorReferenceId,
  type AppErrorKind,
} from '../services/errorHandling';
import { captureAppException } from '../services/sentry';

export interface HttpRequestOptions extends Omit<RequestInit, 'signal'> {
  token?: string | null;
  timeoutMs?: number;
  idempotencyKey?: string;
  signal?: AbortSignal;
  retries?: number;
}

export class ApiClientError extends Error {
  status: number;
  kind: AppErrorKind;
  referenceId: string;
  retryable: boolean;

  constructor(
    message: string,
    status = 500,
    options?: { kind?: AppErrorKind; referenceId?: string; retryable?: boolean }
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.referenceId = options?.referenceId || createErrorReferenceId('CA');
    this.kind =
      options?.kind ||
      (status === 0
        ? 'offline'
        : status === 408 || status === 504
        ? 'timeout'
        : status >= 500
        ? 'server'
        : status === 429
        ? 'rate_limit'
        : status === 401 || status === 403
        ? 'auth'
        : 'validation');
    this.retryable =
      options?.retryable ?? (status === 0 || status === 408 || status === 429 || status >= 500);
  }
}

const DEFAULT_TIMEOUT_MS = 12_000;
const BASE_URL = ((import.meta.env && import.meta.env.VITE_API_BASE_URL) || '').replace(/\/$/, '');

function readCookie(name: string): string | null {
  if (typeof document === 'undefined' || !document.cookie) return null;
  for (const part of document.cookie.split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return part.slice(eq + 1).trim();
      }
    }
  }
  return null;
}

function normalizeServerError(status: number, rawMessage?: string): string {
  if (status === 429) {
    return rawMessage || 'Too many requests. Please pause a moment before retrying.';
  }
  if (status === 401) {
    return rawMessage || 'Authentication required or session expired.';
  }
  if (status === 403) {
    return rawMessage || 'You do not have permission to perform this action.';
  }
  if (status >= 500) {
    return 'Service temporarily unavailable. Please try again in a moment.';
  }
  if (rawMessage && rawMessage.length <= 220 && !/stack|sql|syntaxerror|prisma|pg_/i.test(rawMessage)) {
    return rawMessage;
  }
  return `Request could not be completed (${status}).`;
}

function mergeSignals(timeoutMs: number, externalSignal?: AbortSignal): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(new Error('Request timed out')), timeoutMs);

  const onAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason);
    else externalSignal.addEventListener('abort', onAbort, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onAbort);
    },
  };
}

export async function httpRequest<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
  const {
    token,
    headers,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    idempotencyKey,
    signal: externalSignal,
    retries,
    method = 'GET',
    ...rest
  } = options;

  const upperMethod = method.toUpperCase();
  const isSafeOrIdempotent =
    upperMethod === 'GET' || upperMethod === 'HEAD' || Boolean(idempotencyKey);
  const maxAttempts = isSafeOrIdempotent ? Math.min(3, Math.max(1, (retries ?? 2) + 1)) : 1;

  const csrfToken = readCookie('ca_csrf_token');
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { signal, cleanup } = mergeSignals(timeoutMs, externalSignal);
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        ...rest,
        method: upperMethod,
        credentials: 'include',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(headers || {}),
        },
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = normalizeServerError(
          res.status,
          typeof payload?.error === 'string' ? payload.error : undefined
        );
        // Only retry transient 502/503/504 responses on safe/idempotent calls
        if (isSafeOrIdempotent && [502, 503, 504].includes(res.status) && attempt < maxAttempts) {
          const backoff = 250 * 2 ** (attempt - 1) + Math.floor(Math.random() * 150);
          await new Promise((r) => window.setTimeout(r, backoff));
          continue;
        }
        const serverRefId =
          typeof payload?.referenceId === 'string' && payload.referenceId
            ? payload.referenceId
            : createErrorReferenceId('CA');
        const apiErr = new ApiClientError(message, res.status, { referenceId: serverRefId });
        if (res.status >= 500) {
          captureAppException(apiErr, {
            referenceId: apiErr.referenceId,
            kind: apiErr.kind,
            status: res.status,
            source: 'httpRequest',
          });
        }
        throw apiErr;
      }

      return payload as T;
    } catch (err) {
      lastError = err;
      if (err instanceof ApiClientError || externalSignal?.aborted) {
        throw err;
      }
      if (isSafeOrIdempotent && attempt < maxAttempts) {
        const backoff = 250 * 2 ** (attempt - 1) + Math.floor(Math.random() * 150);
        await new Promise((r) => window.setTimeout(r, backoff));
        continue;
      }
      if (err instanceof Error && err.name === 'AbortError') {
        const timeoutErr = new ApiClientError(
          'Request timed out. Please check your connection and try again.',
          408,
          { kind: 'timeout' }
        );
        captureAppException(timeoutErr, {
          referenceId: timeoutErr.referenceId,
          kind: 'timeout',
          status: 408,
          source: 'httpRequest',
        });
        throw timeoutErr;
      }
      const netErr = new ApiClientError(
        'Network connection unavailable. Please try again.',
        0,
        { kind: 'offline' }
      );
      captureAppException(netErr, {
        referenceId: netErr.referenceId,
        kind: 'offline',
        status: 0,
        source: 'httpRequest',
      });
      throw netErr;
    } finally {
      cleanup();
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new ApiClientError('Network request failed.', 500, { kind: 'server' });
}
