import * as Sentry from '@sentry/react';
import { getOrAssignErrorReferenceId, normalizeAppError } from './errorHandling';
import { scrubSensitiveString, scrubSentryEvent, type SentryLikeEvent } from '../utils/privacyScrub';

let sentryInitialized = false;

function readSentryConfig(): { dsn: string; environment: string } {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env || {};
  return {
    dsn: String(env.VITE_SENTRY_DSN || '').trim(),
    environment: String(env.VITE_SENTRY_ENVIRONMENT || 'production').trim() || 'production',
  };
}

/**
 * Initializes Sentry browser SDK via VITE_SENTRY_DSN env placeholder.
 * Sends ZERO personal data (scope.setUser(null) + recursive beforeSend/beforeBreadcrumb scrubber).
 */
export function initSentry(): boolean {
  if (typeof window === 'undefined' || sentryInitialized) {
    return sentryInitialized;
  }
  const { dsn, environment } = readSentryConfig();
  if (!dsn) {
    return false;
  }

  try {
    Sentry.init({
      dsn,
      environment,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      beforeSend(event) {
        return scrubSentryEvent(event as unknown as SentryLikeEvent) as unknown as typeof event;
      },
      beforeBreadcrumb(breadcrumb) {
        return {
          ...breadcrumb,
          message:
            typeof breadcrumb.message === 'string'
              ? scrubSensitiveString(breadcrumb.message)
              : breadcrumb.message,
          data: undefined, // Never attach raw input/payload breadcrumb data
        };
      },
    });
    sentryInitialized = true;
    return true;
  } catch {
    return false;
  }
}

/**
 * Captures server errors, timeouts, and React ErrorBoundary failures with a
 * short support reference ID and strictly zero PII.
 */
export function captureAppException(
  err: unknown,
  context?: { referenceId?: string; kind?: string; status?: number; source?: string }
): string {
  const normalized = normalizeAppError(err);
  const referenceId = context?.referenceId || getOrAssignErrorReferenceId(err) || normalized.referenceId;

  if (!sentryInitialized) {
    return referenceId;
  }

  try {
    const safeErr =
      err instanceof Error
        ? new Error(scrubSensitiveString(err.message))
        : new Error(scrubSensitiveString(normalized.message));

    if (err instanceof Error) {
      safeErr.name = err.name;
      safeErr.stack = err.stack ? scrubSensitiveString(err.stack) : undefined;
    }

    Sentry.withScope((scope) => {
      scope.setTag('ca_reference_id', referenceId);
      scope.setTag('error_kind', context?.kind || normalized.kind);
      if (context?.status || normalized.status) {
        scope.setTag('http_status', String(context?.status ?? normalized.status));
      }
      if (context?.source) {
        scope.setTag('error_source', context.source);
      }
      scope.setUser(null);
      Sentry.captureException(safeErr);
    });
  } catch {
    // Sentry telemetry must never throw inside error handlers
  }

  return referenceId;
}

export function isSentryEnabled(): boolean {
  return sentryInitialized;
}
