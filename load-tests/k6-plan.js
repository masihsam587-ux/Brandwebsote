/**
 * Cinematic Arts (CA) — k6 Load, Readiness & Security Stress Test Plan
 *
 * Profiles:
 *   LOAD_PROFILE=smoke   (default — safe for local & CI pass/fail verification)
 *   LOAD_PROFILE=stress  (staging 10,000-VU CDN storefront + sustained API load)
 *
 * Run locally (smoke pass/fail gate):
 *   BASE_URL=http://127.0.0.1:3000 k6 run load-tests/k6-plan.js
 *
 * Run staging stress test:
 *   BASE_URL=https://staging.cinematicarts.pk LOAD_PROFILE=stress k6 run load-tests/k6-plan.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const PROFILE = (__ENV.LOAD_PROFILE || 'smoke').toLowerCase();
const IS_STRESS = PROFILE === 'stress';

const errorRate = new Rate('ca_errors');
const healthLatency = new Trend('ca_health_latency_ms');
const catalogLatency = new Trend('ca_catalog_latency_ms');
const orderLatency = new Trend('ca_order_latency_ms');

export const options = {
  scenarios: IS_STRESS
    ? {
        health_probe: {
          executor: 'constant-arrival-rate',
          exec: 'probeHealth',
          rate: 10,
          timeUnit: '1s',
          duration: '7m',
          preAllocatedVUs: 10,
          maxVUs: 30,
        },
        cdn_storefront_burst: {
          executor: 'ramping-vus',
          exec: 'browseStorefront',
          startVUs: 50,
          stages: [
            { duration: '1m', target: 1000 },
            { duration: '2m', target: 5000 },
            { duration: '3m', target: 10000 },
            { duration: '1m', target: 0 },
          ],
          gracefulRampDown: '30s',
        },
        api_catalog_queries: {
          executor: 'constant-arrival-rate',
          exec: 'queryCatalogApi',
          rate: 250,
          timeUnit: '1s',
          duration: '5m',
          preAllocatedVUs: 100,
          maxVUs: 600,
        },
        api_checkout_flow: {
          executor: 'ramping-arrival-rate',
          exec: 'submitIdempotentOrder',
          startRate: 5,
          timeUnit: '1s',
          preAllocatedVUs: 20,
          maxVUs: 200,
          stages: [
            { duration: '2m', target: 40 },
            { duration: '2m', target: 80 },
            { duration: '1m', target: 0 },
          ],
        },
      }
    : {
        // Default smoke profile: validates SLAs and pass/fail thresholds cleanly on a single instance
        health_probe: {
          executor: 'constant-vus',
          exec: 'probeHealth',
          vus: 2,
          duration: '30s',
        },
        cdn_storefront_burst: {
          executor: 'ramping-vus',
          exec: 'browseStorefront',
          startVUs: 5,
          stages: [
            { duration: '15s', target: 25 },
            { duration: '15s', target: 50 },
            { duration: '10s', target: 0 },
          ],
          gracefulRampDown: '5s',
        },
        api_catalog_queries: {
          executor: 'constant-arrival-rate',
          exec: 'queryCatalogApi',
          rate: 20,
          timeUnit: '1s',
          duration: '30s',
          preAllocatedVUs: 15,
          maxVUs: 50,
        },
        api_checkout_flow: {
          executor: 'constant-arrival-rate',
          exec: 'submitIdempotentOrder',
          rate: 3,
          timeUnit: '1s',
          duration: '30s',
          preAllocatedVUs: 5,
          maxVUs: 20,
        },
      },

  // Explicit Pass / Fail SLA Targets
  thresholds: {
    http_req_failed: ['rate<0.01'], // < 1% HTTP failure rate
    ca_errors: ['rate<0.01'], // < 1% business/assertion error rate
    checks: ['rate>0.99'], // > 99% functional checks passing
    ca_health_latency_ms: ['p(95)<100'], // /api/health p95 < 100ms
    ca_catalog_latency_ms: ['p(95)<250'], // Product & plan catalog p95 < 250ms
    ca_order_latency_ms: ['p(95)<600'], // Idempotent COD order write p95 < 600ms
    'http_req_duration{scenario:cdn_storefront_burst}': ['p(95)<200'], // SSR/static HTML p95 < 200ms
  },
};

export function probeHealth() {
  const res = http.get(`${BASE_URL}/api/health`, {
    tags: { name: 'GET_API_Health' },
  });
  healthLatency.add(res.timings.duration);
  const ok = check(res, {
    'health 200': (r) => r.status === 200,
    'health status ok': (r) => r.json('status') === 'ok',
  });
  errorRate.add(!ok);
  sleep(1);
}

export function browseStorefront() {
  const home = http.get(`${BASE_URL}/`, {
    tags: { name: 'GET_Home_HTML' },
  });
  const ok = check(home, {
    'home 200': (r) => r.status === 200,
    'nosniff header present': (r) => r.headers['X-Content-Type-Options'] === 'nosniff',
  });
  errorRate.add(!ok);
  sleep(Math.random() * 1.5 + 0.5);
}

export function queryCatalogApi() {
  const res = http.get(`${BASE_URL}/api/products?page=1&limit=12&sort=latest`, {
    tags: { name: 'GET_Products_Page1' },
  });
  catalogLatency.add(res.timings.duration);
  const ok = check(res, {
    'products 200': (r) => r.status === 200,
    'returns json array': (r) => Array.isArray(r.json()),
  });
  errorRate.add(!ok);

  const plans = http.get(`${BASE_URL}/api/installment-plans`, {
    tags: { name: 'GET_Installment_Plans' },
  });
  const plansOk = check(plans, {
    'installment plans 200': (r) => r.status === 200,
  });
  errorRate.add(!plansOk);
}

export function submitIdempotentOrder() {
  const idemKey = `k6-${__VU}-${__ITER}`;
  const payload = JSON.stringify({
    items: [
      {
        productId: 'prod-1',
        title: 'Storefront Test Item',
        unitPrice: 1, // Server MUST ignore client price and use DB price
        quantity: 1,
        selectedSize: 'M',
        image: '/src/assets/images/womens_unstitched_suit_1795333234539.jpg',
      },
    ],
    customerName: 'Load Test Customer',
    phone: '03355329722',
    whatsapp: '03355329722',
    address: 'Street 1, Peshawar',
    city: 'Peshawar',
    postalCode: '25000',
    paymentMethod: 'cod',
    idempotencyKey: idemKey,
  });

  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Idempotency-Key': idemKey,
  };

  // Send twice with identical Idempotency-Key to confirm deduplication under load
  const first = http.post(`${BASE_URL}/api/orders`, payload, {
    headers,
    tags: { name: 'POST_Order' },
  });
  orderLatency.add(first.timings.duration);

  if (first.status === 201 || first.status === 200) {
    const second = http.post(`${BASE_URL}/api/orders`, payload, {
      headers,
      tags: { name: 'POST_Order_Retry' },
    });
    const deduped = check(second, {
      'idempotent replay matches order id': (r) =>
        (r.status === 200 || r.status === 201) && r.json('id') === first.json('id'),
    });
    errorRate.add(!deduped);
  } else if (first.status !== 429) {
    // 429 is expected when a single VU IP exceeds the per-IP order rate limit
    errorRate.add(true);
  }
}

export function handleSummary(data) {
  const thresholdEntries = Object.entries(data.metrics || {})
    .filter(([, metric]) => metric && metric.thresholds)
    .map(([name, metric]) => {
      const checks = Object.entries(metric.thresholds)
        .map(([expr, result]) => `  - ${name} [${expr}]: ${result.ok ? 'PASS' : 'FAIL'}`)
        .join('\n');
      return checks;
    })
    .join('\n');

  const allPassed = Object.values(data.metrics || {}).every(
    (metric) =>
      !metric?.thresholds ||
      Object.values(metric.thresholds).every((t) => Boolean(t.ok))
  );

  const verdict = [
    '',
    '============================================================',
    `Cinematic Arts (CA) k6 Load Test Verdict (${PROFILE.toUpperCase()}): ${allPassed ? 'PASS' : 'FAIL'}`,
    '============================================================',
    thresholdEntries || 'No thresholds evaluated.',
    '============================================================',
    '',
  ].join('\n');

  return {
    stdout: verdict,
  };
}
