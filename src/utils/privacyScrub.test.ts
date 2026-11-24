import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scrubSensitiveString,
  scrubSentryEvent,
  scrubUrlQuery,
  scrubUnknownRecord,
} from './privacyScrub';

test('scrubSensitiveString redacts emails, Pakistani phones, intl phones, Bearer tokens, JWTs, and sensitive query params', () => {
  const raw =
    'Failed for customer@example.com phone 0335-5329722 alt +92 3001234567 token Bearer abc.def.123 jwt eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
  const cleaned = scrubSensitiveString(raw);

  assert.equal(cleaned.includes('customer@example.com'), false);
  assert.equal(cleaned.includes('0335-5329722'), false);
  assert.equal(cleaned.includes('+92 3001234567'), false);
  assert.equal(cleaned.includes('abc.def.123'), false);
  assert.equal(cleaned.includes('eyJhbGci'), false);
  assert.match(cleaned, /\[redacted-email\]/);
  assert.match(cleaned, /\[redacted-phone\]/);
  assert.match(cleaned, /Bearer \[redacted-token\]/);
  assert.match(cleaned, /\[redacted-jwt\]/);
});

test('scrubUrlQuery strips query strings cleanly', () => {
  assert.equal(
    scrubUrlQuery('https://cinematicarts.pk/auth?token=secret123&email=test@example.com'),
    'https://cinematicarts.pk/auth?[redacted-query]'
  );
  assert.equal(
    scrubUrlQuery('https://cinematicarts.pk/shop'),
    'https://cinematicarts.pk/shop'
  );
});

test('scrubUnknownRecord redacts nested PII keys and values', () => {
  const input = {
    customerName: 'Amina Tariq',
    phone: '03355329722',
    address: 'House 4, Peshawar',
    nested: {
      email: 'amina@example.com',
      route: '/checkout?phone=03355329722',
      status: 500,
    },
  };

  const out = scrubUnknownRecord(input) as Record<string, unknown>;
  assert.equal(out.customerName, '[redacted]');
  assert.equal(out.phone, '[redacted]');
  assert.equal(out.address, '[redacted]');
  const nested = out.nested as Record<string, unknown>;
  assert.equal(nested.email, '[redacted]');
  assert.equal(String(nested.route).includes('03355329722'), false);
  assert.equal(nested.status, 500);
});

test('scrubSentryEvent removes user context, server_name, cookies, body data, auth headers, and PII from exceptions', () => {
  const dirtyEvent = {
    user: { id: 'usr-123', email: 'buyer@example.com', ip_address: '10.0.0.1' },
    server_name: 'prod-web-01',
    message: 'Order failed for buyer@example.com (03355329722)',
    request: {
      url: 'https://cinematicarts.pk/api/orders?phone=03355329722',
      cookies: { ca_user_session: 'secret-cookie' },
      data: { fullName: 'Amina', address: 'Street 9' },
      query_string: 'email=buyer@example.com',
      headers: {
        Authorization: 'Bearer super-secret',
        Cookie: 'session=abc',
        'X-Forwarded-For': '203.0.113.5',
        Accept: 'application/json',
      },
    },
    exception: {
      values: [
        {
          type: 'Error',
          value: 'PostgREST error for user@example.com +923355329722',
        },
      ],
    },
    extra: {
      referenceId: 'CA-7K9M-2P4X',
      email: 'leaked@example.com',
    },
  };

  const clean = scrubSentryEvent(dirtyEvent);

  assert.equal('user' in clean, false);
  assert.equal('server_name' in clean, false);
  assert.equal(clean.message?.includes('buyer@example.com'), false);
  assert.equal(clean.message?.includes('03355329722'), false);

  assert.equal(clean.request?.cookies, undefined);
  assert.equal(clean.request?.data, undefined);
  assert.equal(clean.request?.query_string, undefined);
  assert.equal(clean.request?.url, 'https://cinematicarts.pk/api/orders?[redacted-query]');
  assert.equal(clean.request?.headers?.Authorization, undefined);
  assert.equal(clean.request?.headers?.Cookie, undefined);
  assert.equal(clean.request?.headers?.['X-Forwarded-For'], undefined);
  assert.equal(clean.request?.headers?.Accept, 'application/json');

  assert.equal(clean.exception?.values?.[0]?.value?.includes('user@example.com'), false);
  assert.equal(clean.exception?.values?.[0]?.value?.includes('923355329722'), false);
  assert.equal(clean.extra?.referenceId, 'CA-7K9M-2P4X');
  assert.equal(clean.extra?.email, '[redacted]');
});
