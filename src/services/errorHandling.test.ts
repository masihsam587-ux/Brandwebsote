import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AppError,
  clearGlobalError,
  createErrorReferenceId,
  getGlobalErrorSnapshot,
  normalizeAppError,
  reportGlobalError,
  triggerGlobalErrorRetry,
} from './errorHandling';

test('createErrorReferenceId produces CA-XXXX-XXXX alphanumeric format', () => {
  const id = createErrorReferenceId('CA');
  assert.match(id, /^CA-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
});

test('normalizeAppError classifies HTTP 500s, timeouts, and offline states with stable reference IDs', () => {
  const serverErr = Object.assign(new Error('Internal Server Error'), { status: 503 });
  const normalizedServer = normalizeAppError(serverErr);
  assert.equal(normalizedServer.kind, 'server');
  assert.equal(normalizedServer.status, 503);
  assert.equal(normalizedServer.retryable, true);
  assert.match(normalizedServer.referenceId, /^CA-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  // Re-normalizing the same Error object retains its assigned reference ID
  assert.equal(normalizeAppError(serverErr).referenceId, normalizedServer.referenceId);

  const timeoutErr = new Error('The request timed out after 15000ms');
  timeoutErr.name = 'AbortError';
  const normalizedTimeout = normalizeAppError(timeoutErr);
  assert.equal(normalizedTimeout.kind, 'timeout');
  assert.equal(normalizedTimeout.retryable, true);
  assert.match(normalizedTimeout.message, /took too long/i);

  const offlineErr = normalizeAppError(new Error('Failed to fetch'), { offline: true });
  assert.equal(offlineErr.kind, 'offline');
  assert.equal(offlineErr.status, 0);
  assert.equal(offlineErr.retryable, true);
  assert.match(offlineErr.message, /offline/i);
});

test('normalizeAppError suppresses internal SQL/Postgres stack details and scrubs PII', () => {
  const sqlLeak = new Error('postgres syntax error near SELECT * FROM users email=a@b.com');
  const normalized = normalizeAppError(sqlLeak, { fallbackMessage: 'Safe fallback message' });
  assert.equal(normalized.message, 'Safe fallback message');

  const appErr = new AppError({
    message: 'Database pool exhausted',
    status: 500,
    kind: 'server',
    referenceId: 'CA-ABCD-2345',
  });
  const normalizedApp = normalizeAppError(appErr);
  assert.equal(normalizedApp.referenceId, 'CA-ABCD-2345');
  assert.equal(normalizedApp.kind, 'server');
});

test('globalErrorStore records error state and invokes retry callback cleanly', () => {
  clearGlobalError();
  assert.equal(getGlobalErrorSnapshot(), null);

  let retried = 0;
  const err = Object.assign(new Error('Gateway Timeout'), { status: 504 });
  const reported = reportGlobalError(err, () => {
    retried += 1;
  });

  const snap = getGlobalErrorSnapshot();
  assert.ok(snap);
  assert.equal(snap?.kind, 'timeout');
  assert.equal(snap?.referenceId, reported.referenceId);

  triggerGlobalErrorRetry();
  assert.equal(retried, 1);
  assert.equal(getGlobalErrorSnapshot(), null);
});
