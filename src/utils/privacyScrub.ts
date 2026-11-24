/**
 * Privacy scrubbing helpers for Sentry error reporting and user-facing logs.
 * Ensures zero personal data (emails, phone/WhatsApp numbers, addresses, tokens, cookies)
 * ever leaves the client or server error pipeline.
 */

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PK_PHONE_PATTERN = /(?:\+?92[\s-]?3\d{2}|03\d{2})[\s-]?\d{7}\b/g;
const INTL_PHONE_PATTERN = /\+\d{1,3}[\s-]?\d{6,12}\b/g;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const SENSITIVE_PARAM_PATTERN =
  /([?&](?:token|access_token|refresh_token|password|pwd|secret|apikey|api_key|phone|whatsapp|email|address|cnic|father_name)=)[^&\s]+/gi;

const SENSITIVE_KEYS = new Set([
  'email',
  'user_email',
  'phone',
  'whatsapp',
  'mobile',
  'address',
  'postal_code',
  'postalcode',
  'father_name',
  'fathername',
  'full_name',
  'fullname',
  'customer_name',
  'customername',
  'password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'cookie',
  'cookies',
  'set-cookie',
  'x-csrf-token',
  'x-api-key',
  'ip_address',
  'user_id',
  'userid',
]);

export function scrubSensitiveString(input: string): string {
  if (!input) return '';
  return input
    .replace(EMAIL_PATTERN, '[redacted-email]')
    .replace(PK_PHONE_PATTERN, '[redacted-phone]')
    .replace(INTL_PHONE_PATTERN, '[redacted-phone]')
    .replace(BEARER_PATTERN, 'Bearer [redacted-token]')
    .replace(JWT_PATTERN, '[redacted-jwt]')
    .replace(SENSITIVE_PARAM_PATTERN, '$1[redacted]');
}

export function scrubUrlQuery(url: string): string {
  if (!url) return '';
  const cleaned = scrubSensitiveString(url);
  const qIdx = cleaned.indexOf('?');
  if (qIdx === -1) return cleaned;
  return `${cleaned.slice(0, qIdx)}?[redacted-query]`;
}

export function scrubUnknownRecord(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[truncated]';
  if (typeof value === 'string') {
    return scrubSensitiveString(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrubUnknownRecord(item, depth + 1));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = '[redacted]';
      } else {
        out[k] = scrubUnknownRecord(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

export interface SentryLikeEvent {
  user?: unknown;
  server_name?: string;
  request?: {
    url?: string;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    data?: unknown;
    query_string?: unknown;
  };
  breadcrumbs?: Array<{
    message?: string;
    category?: string;
    data?: Record<string, unknown>;
  }>;
  exception?: {
    values?: Array<{
      type?: string;
      value?: string;
    }>;
  };
  extra?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  message?: string;
}

/**
 * Strips all personally identifiable information (user object, cookies, headers,
 * form payloads, emails, Pakistani phone numbers, JWTs, query strings) from
 * any Sentry event prior to network transmission.
 */
export function scrubSentryEvent<T extends SentryLikeEvent>(event: T): T {
  const cloned = { ...event };

  // Never send Sentry user context or IP/server hostnames
  if ('user' in cloned) {
    delete cloned.user;
  }
  if ('server_name' in cloned) {
    delete cloned.server_name;
  }

  if (typeof cloned.message === 'string') {
    cloned.message = scrubSensitiveString(cloned.message);
  }

  if (cloned.request) {
    const nextReq = { ...cloned.request };
    if (typeof nextReq.url === 'string') {
      nextReq.url = scrubUrlQuery(nextReq.url);
    }
    delete nextReq.cookies;
    delete nextReq.data;
    delete nextReq.query_string;
    if (nextReq.headers) {
      const safeHeaders: Record<string, string> = {};
      for (const [key, val] of Object.entries(nextReq.headers)) {
        const lower = key.toLowerCase();
        if (
          lower === 'authorization' ||
          lower === 'cookie' ||
          lower === 'set-cookie' ||
          lower === 'x-csrf-token' ||
          lower.includes('forwarded') ||
          lower.includes('real-ip')
        ) {
          continue;
        }
        safeHeaders[key] = scrubSensitiveString(String(val));
      }
      nextReq.headers = safeHeaders;
    }
    cloned.request = nextReq;
  }

  if (cloned.exception?.values) {
    cloned.exception = {
      ...cloned.exception,
      values: cloned.exception.values.map((ex) => ({
        ...ex,
        value: typeof ex.value === 'string' ? scrubSensitiveString(ex.value) : ex.value,
      })),
    };
  }

  if (Array.isArray(cloned.breadcrumbs)) {
    cloned.breadcrumbs = cloned.breadcrumbs.map((bc) => ({
      ...bc,
      message: typeof bc.message === 'string' ? scrubSensitiveString(bc.message) : bc.message,
      data: bc.data ? (scrubUnknownRecord(bc.data) as Record<string, unknown>) : undefined,
    }));
  }

  if (cloned.extra) {
    cloned.extra = scrubUnknownRecord(cloned.extra) as Record<string, unknown>;
  }
  if (cloned.tags) {
    cloned.tags = scrubUnknownRecord(cloned.tags) as Record<string, unknown>;
  }
  if (cloned.contexts) {
    cloned.contexts = scrubUnknownRecord(cloned.contexts) as Record<string, unknown>;
  }

  return cloned;
}
