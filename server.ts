import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import {
  buildSitemapXml,
  fetchCatalogSnapshot,
  type CatalogSnapshot,
} from './src/services/catalogSnapshot';
import {
  generateLlmsTxt,
  generateRobotsTxt,
  STORE_CONFIG,
} from './src/services/siteConfig';
import {
  registerProductSlugRedirect,
  resolveProductSlugRedirect,
} from './src/services/slugRedirects';
import { injectSsrIntoTemplate } from './src/services/ssrHtml';
import {
  DEFAULT_TERMS_POLICY,
  SEED_CATEGORIES,
  SEED_FEEDBACK,
  SEED_INSTALLMENT_PLANS,
  SEED_NOTIFICATIONS,
  SEED_ORDERS,
  SEED_PRODUCTS,
  SEED_USERS,
} from './src/api/seedData';
import type {
  Category,
  FeedbackThread,
  InstallmentPlan,
  ManualDashboardEntry,
  NotificationItem,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  TermsPolicyDocument,
  User,
} from './src/api/types';
import {
  calculateAdminAnalytics,
  calculateCommission,
  calculateInstallmentPlan,
  calculateOrderPaidSummary,
  deriveProductStockStatus,
  generateSellerId,
  sanitizeText,
  slugify,
} from './src/utils/commerce';

dotenv.config();

function readCliArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  const prefixed = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  return prefixed ? prefixed.slice(flag.length + 1) : undefined;
}

const IS_PROD = process.env.NODE_ENV === 'production';
const cliPort = Number(readCliArg('--port'));
const envPort = Number(process.env.PORT);
const PORT =
  Number.isInteger(cliPort) && cliPort > 0
    ? cliPort
    : IS_PROD
    ? Number.isInteger(envPort) && envPort > 0
      ? envPort
      : 3000
    : Number.isInteger(envPort) && envPort > 0 && envPort !== 8080
    ? envPort
    : 3000;
const HOST = readCliArg('--host')?.trim() || '0.0.0.0';
const ADMIN_TOKEN_SECRET =
  process.env.ADMIN_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
const USER_TOKEN_SECRET =
  process.env.USER_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY?.trim() || '';

const ADMIN_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes short-lived token
const USER_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const adminLoginRateLimits = new Map<string, RateLimitBucket>();
const authLoginRateLimits = new Map<string, RateLimitBucket>();
const signupRateLimits = new Map<string, RateLimitBucket>();
const forgotRateLimits = new Map<string, RateLimitBucket>();
const orderRateLimits = new Map<string, RateLimitBucket>();
const orderIdempotencyCache = new Map<string, Order>();

// Server-side hashed admin password fallback (populated only on first-run setup if ADMIN_PASSWORD env is unset)
let claimedAdminHash: { salt: string; hash: string } | null = null;

function hashSecret(password: string, existingSalt?: string): { salt: string; hash: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyHash(password: string, salt: string, expectedHex: string): boolean {
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

function isAdminConfigured(): boolean {
  return (
    Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim().length > 0) ||
    claimedAdminHash !== null
  );
}

function verifyAdminSecret(candidate: string): boolean {
  const envPass = process.env.ADMIN_PASSWORD?.trim();
  if (envPass) {
    const a = Buffer.from(candidate);
    const b = Buffer.from(envPass);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
  if (claimedAdminHash) {
    return verifyHash(candidate, claimedAdminHash.salt, claimedAdminHash.hash);
  }
  return false;
}

function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Za-z]/.test(password) &&
    /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  );
}

function signToken(payload: Record<string, unknown>, secret: string, ttlMs: number): string {
  const body = { ...payload, exp: Date.now() + ttlMs };
  const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken<T extends { exp: number }>(token: string, secret: string): T | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T;
    if (typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(req: Request): Record<string, string> {
  const raw = req.headers.cookie;
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

function isHttpsRequest(req: Request): boolean {
  return Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
}

function setSessionCookies(req: Request, res: Response, userToken: string) {
  const secureAttr = isHttpsRequest(req) || IS_PROD ? '; Secure' : '';
  const maxAgeSec = Math.floor(USER_TOKEN_TTL_MS / 1000);
  const csrfToken = crypto.randomBytes(24).toString('base64url');
  res.append(
    'Set-Cookie',
    `ca_user_session=${encodeURIComponent(userToken)}; HttpOnly; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secureAttr}`
  );
  res.append(
    'Set-Cookie',
    `ca_csrf_token=${encodeURIComponent(csrfToken)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secureAttr}`
  );
}

function ensureCsrfCookie(req: Request, res: Response) {
  const cookies = parseCookies(req);
  if (!cookies.ca_csrf_token) {
    const secureAttr = isHttpsRequest(req) || IS_PROD ? '; Secure' : '';
    const csrfToken = crypto.randomBytes(24).toString('base64url');
    res.append(
      'Set-Cookie',
      `ca_csrf_token=${encodeURIComponent(csrfToken)}; Path=/; SameSite=Lax${secureAttr}`
    );
  }
}

function clearSessionCookies(req: Request, res: Response) {
  const secureAttr = isHttpsRequest(req) || IS_PROD ? '; Secure' : '';
  res.append(
    'Set-Cookie',
    `ca_user_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secureAttr}`
  );
  res.append(
    'Set-Cookie',
    `ca_csrf_token=; Path=/; Max-Age=0; SameSite=Lax${secureAttr}`
  );
}

function consumeRateLimit(
  map: Map<string, RateLimitBucket>,
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number; remaining: number } {
  const now = Date.now();
  const existing = map.get(key);
  if (!existing || existing.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0, remaining: maxAttempts - 1 };
  }
  if (existing.count >= maxAttempts) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remaining: 0,
    };
  }
  existing.count += 1;
  map.set(key, existing);
  return {
    allowed: true,
    retryAfterSec: 0,
    remaining: Math.max(0, maxAttempts - existing.count),
  };
}

function checkRateLimitOnly(
  map: Map<string, RateLimitBucket>,
  key: string,
  maxAttempts: number
): { blocked: boolean; retryAfterSec: number } {
  const now = Date.now();
  const existing = map.get(key);
  if (existing && existing.resetAt > now && existing.count >= maxAttempts) {
    return {
      blocked: true,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { blocked: false, retryAfterSec: 0 };
}

async function verifyTurnstileIfConfigured(token: unknown, remoteIp: string): Promise<boolean> {
  if (!TURNSTILE_SECRET_KEY) return true;
  if (typeof token !== 'string' || !token.trim()) return false;
  try {
    const body = new URLSearchParams();
    body.set('secret', TURNSTILE_SECRET_KEY);
    body.set('response', token.trim());
    if (remoteIp && remoteIp !== 'unknown') body.set('remoteip', remoteIp);

    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!resp.ok) return false;
    const data = (await resp.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch {
    return false;
  }
}

// Seed user credential hash uses env var if explicitly configured or random ephemeral secret (zero hardcoded passwords)
const SEED_CREDENTIAL_SECRET =
  process.env.DEMO_USER_PASSWORD?.trim() || crypto.randomBytes(24).toString('hex');

interface StoredUser extends User {
  passwordHash: { salt: string; hash: string };
}

const store = {
  categories: [...SEED_CATEGORIES] as Category[],
  products: [...SEED_PRODUCTS] as Product[],
  plans: [...SEED_INSTALLMENT_PLANS] as InstallmentPlan[],
  users: SEED_USERS.map((u) => ({
    ...u,
    passwordHash: hashSecret(SEED_CREDENTIAL_SECRET),
  })) as StoredUser[],
  orders: [...SEED_ORDERS] as Order[],
  notifications: [...SEED_NOTIFICATIONS] as NotificationItem[],
  feedback: [...SEED_FEEDBACK] as FeedbackThread[],
  manualEntries: [] as ManualDashboardEntry[],
  termsPolicy: { ...DEFAULT_TERMS_POLICY } as TermsPolicyDocument,
};

function sanitizeUser(u: StoredUser): User {
  const { passwordHash: _ignored, ...safe } = u;
  return safe;
}

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Admin authorization required.' });
    return;
  }
  const token = auth.slice('Bearer '.length).trim();
  const payload = verifyToken<{ scope: string; exp: number }>(token, ADMIN_TOKEN_SECRET);
  if (!payload || payload.scope !== 'admin') {
    res.status(401).json({ error: 'Admin session expired or invalid. Press Ctrl+Shift+A to sign in again.' });
    return;
  }
  next();
}

function extractUserToken(req: Request): { token: string | null; fromCookie: boolean } {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return { token: auth.slice('Bearer '.length).trim(), fromCookie: false };
  }
  const cookies = parseCookies(req);
  if (cookies.ca_user_session) {
    return { token: cookies.ca_user_session, fromCookie: true };
  }
  return { token: null, fromCookie: false };
}

function requireUser(req: Request, res: Response, next: NextFunction) {
  const { token, fromCookie } = extractUserToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  // Enforce CSRF double-submit verification for state-changing cookie sessions
  if (fromCookie && !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase())) {
    const cookies = parseCookies(req);
    const headerCsrf = String(req.headers['x-csrf-token'] || '');
    if (!cookies.ca_csrf_token || !headerCsrf || cookies.ca_csrf_token !== headerCsrf) {
      res.status(403).json({ error: 'Invalid CSRF verification token.' });
      return;
    }
  }
  const payload = verifyToken<{ userId: string; exp: number }>(token, USER_TOKEN_SECRET);
  if (!payload) {
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
    return;
  }
  const found = store.users.find((u) => u.id === payload.userId);
  if (!found) {
    res.status(401).json({ error: 'Account not found.' });
    return;
  }
  (req as Request & { currentUser?: StoredUser }).currentUser = found;
  next();
}

function optionalUser(req: Request): StoredUser | null {
  const { token } = extractUserToken(req);
  if (!token) return null;
  const payload = verifyToken<{ userId: string; exp: number }>(token, USER_TOKEN_SECRET);
  if (!payload) return null;
  return store.users.find((u) => u.id === payload.userId) || null;
}

const ALLOWED_ORIGINS = new Set(
  [
    STORE_CONFIG.siteUrl,
    `http://localhost:${PORT}`,
    `http://127.0.0.1:${PORT}`,
    ...(process.env.CORS_ORIGIN || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  ].map((o) => o.replace(/\/$/, ''))
);

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Strict HTTP Security Headers on every response
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (IS_PROD) {
      res.setHeader('X-Frame-Options', 'DENY');
    }
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    if (isHttpsRequest(req)) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    if (IS_PROD) {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' https://challenges.cloudflare.com https://plausible.io; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://plausible.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"
      );
    }
    next();
  });

  // Strict CORS allowlist + custom header enforcement on mutating API calls
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin?.replace(/\/$/, '');
    const host = req.headers.host;
    const sameHostOrigin = host ? `${isHttpsRequest(req) ? 'https' : 'http'}://${host}` : '';

    if (origin) {
      if (origin === sameHostOrigin || ALLOWED_ORIGINS.has(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Idempotency-Key'
        );
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
      } else {
        res.status(403).json({ error: 'Origin not allowed by CORS policy.' });
        return;
      }
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    // Require custom XHR header on mutating API calls to block naive cross-site form posts
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase())) {
      const xRequestedWith = req.headers['x-requested-with'];
      const contentType = req.headers['content-type'] || '';
      if (xRequestedWith !== 'XMLHttpRequest' && !contentType.includes('application/json')) {
        res.status(403).json({ error: 'Missing required request verification header.' });
        return;
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.use(express.json({ limit: '4mb' }));

  // ==================== HEALTH / UPTIME PROBE ====================
  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      status: 'healthy',
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // ==================== ADMIN AUTH (RATE LIMITED) ====================
  app.get('/api/admin/status', (_req, res) => {
    res.json({ configured: isAdminConfigured() });
  });

  app.post('/api/admin/setup', (req, res) => {
    if (isAdminConfigured()) {
      res.status(409).json({ error: 'Admin password is already configured.' });
      return;
    }
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!isStrongPassword(password)) {
      res.status(400).json({
        error: 'Admin password must be at least 8 characters and include letters and numbers or symbols.',
      });
      return;
    }
    claimedAdminHash = hashSecret(password);
    const token = signToken({ scope: 'admin' }, ADMIN_TOKEN_SECRET, ADMIN_TOKEN_TTL_MS);
    res.status(201).json({ token });
  });

  app.post('/api/admin/login', (req, res) => {
    if (!isAdminConfigured()) {
      res.status(409).json({ error: 'Admin password not configured yet.' });
      return;
    }
    const ip = getClientIp(req);
    const check = checkRateLimitOnly(adminLoginRateLimits, ip, RATE_LIMIT_MAX_ATTEMPTS);
    if (check.blocked) {
      res.setHeader('Retry-After', String(check.retryAfterSec));
      res.status(429).json({
        error: `Too many failed attempts. Try again in ${Math.ceil(check.retryAfterSec / 60)} minute(s).`,
      });
      return;
    }

    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!verifyAdminSecret(password)) {
      const fail = consumeRateLimit(
        adminLoginRateLimits,
        ip,
        RATE_LIMIT_MAX_ATTEMPTS,
        RATE_LIMIT_WINDOW_MS
      );
      res.status(401).json({
        error:
          fail.remaining > 0
            ? `Invalid admin password. ${fail.remaining} attempt(s) remaining.`
            : 'Rate limit exceeded. Account verification locked for 15 minutes.',
      });
      return;
    }

    adminLoginRateLimits.delete(ip);
    const token = signToken({ scope: 'admin' }, ADMIN_TOKEN_SECRET, ADMIN_TOKEN_TTL_MS);
    res.json({ token });
  });

  // ==================== PUBLIC CATALOG & REFERRAL ====================
  app.get('/api/products', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId.slice(0, 80) : '';
    const search =
      typeof req.query.search === 'string' ? req.query.search.slice(0, 80).toLowerCase().trim() : '';
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'latest';
    const page = Number(req.query.page || 0);
    const limit = Number(req.query.limit || 0);

    let list = store.products.map(({ costPrice: _hidden, ...publicProd }) => publicProd);
    if (categoryId && categoryId !== 'all') {
      list = list.filter((p) => p.categoryId === categoryId);
    }
    if (search) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search) ||
          p.categoryName.toLowerCase().includes(search)
      );
    }
    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (Number.isInteger(page) && page >= 1 && Number.isInteger(limit) && limit >= 1) {
      const safeLimit = Math.min(48, limit);
      const offset = (page - 1) * safeLimit;
      list = list.slice(offset, offset + safeLimit);
    }

    res.json(list);
  });

  app.get('/api/products/:slug', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    const slug = String(req.params.slug || '');
    if (
      slug.length > 120 ||
      !/^[a-z0-9-]+$/.test(slug) ||
      slug.startsWith('-') ||
      slug.endsWith('-') ||
      slug.includes('--')
    ) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const found = store.products.find((p) => p.slug === slug);
    if (!found) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const { costPrice: _hidden, ...publicProd } = found;
    res.json(publicProd);
  });

  app.get('/api/categories', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.json(store.categories);
  });

  app.get('/api/installment-plans', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.json(store.plans.filter((p) => p.active));
  });

  app.get('/api/terms', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.json(store.termsPolicy);
  });

  app.get('/api/sellers/validate/:code', (req, res) => {
    const code = sanitizeText(String(req.params.code || ''), 24).toUpperCase();
    if (!/^CA-[A-Z0-9]{4,12}$/.test(code)) {
      res.json({ valid: false });
      return;
    }
    const seller = store.users.find(
      (u) => u.role === 'seller' && u.isActiveSeller && u.sellerCode?.toUpperCase() === code
    );
    if (!seller) {
      res.json({ valid: false });
      return;
    }
    const requester = optionalUser(req);
    if (requester && requester.id === seller.id) {
      res.json({ valid: false, selfReferral: true });
      return;
    }
    res.json({ valid: true, sellerId: seller.id, sellerName: seller.name });
  });

  // ==================== AUTH ROUTES (HTTP-ONLY COOKIE + RATE LIMITED) ====================
  app.get('/api/auth/session', (req, res) => {
    ensureCsrfCookie(req, res);
    const { token } = extractUserToken(req);
    if (!token) {
      res.json({ user: null });
      return;
    }
    const payload = verifyToken<{ userId: string; exp: number }>(token, USER_TOKEN_SECRET);
    if (!payload) {
      clearSessionCookies(req, res);
      res.json({ user: null });
      return;
    }
    const found = store.users.find((u) => u.id === payload.userId);
    if (!found) {
      clearSessionCookies(req, res);
      res.json({ user: null });
      return;
    }
    res.json({ user: sanitizeUser(found), token });
  });

  app.post('/api/auth/logout', (req, res) => {
    clearSessionCookies(req, res);
    res.json({ ok: true });
  });

  app.post('/api/auth/login', async (req, res) => {
    const ip = getClientIp(req);
    const rate = consumeRateLimit(authLoginRateLimits, ip, 10, RATE_LIMIT_WINDOW_MS);
    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfterSec));
      res.status(429).json({ error: 'Too many login attempts. Please wait a few minutes.' });
      return;
    }

    if (typeof req.body?.honeypot === 'string' && req.body.honeypot.trim().length > 0) {
      res.status(400).json({ error: 'Request rejected by bot protection.' });
      return;
    }
    if (!(await verifyTurnstileIfConfigured(req.body?.turnstileToken, ip))) {
      res.status(400).json({ error: 'Human verification challenge failed.' });
      return;
    }

    const email = sanitizeText(String(req.body?.email || ''), 120).toLowerCase();
    const password = String(req.body?.password || '');
    const user = store.users.find((u) => u.email.toLowerCase() === email);
    if (!user || !verifyHash(password, user.passwordHash.salt, user.passwordHash.hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    authLoginRateLimits.delete(ip);
    const token = signToken({ userId: user.id }, USER_TOKEN_SECRET, USER_TOKEN_TTL_MS);
    setSessionCookies(req, res, token);
    res.json({ user: sanitizeUser(user), token });
  });

  app.post('/api/auth/signup', async (req, res) => {
    const ip = getClientIp(req);
    const rate = consumeRateLimit(signupRateLimits, ip, 5, RATE_LIMIT_WINDOW_MS);
    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfterSec));
      res.status(429).json({ error: 'Too many registrations from this address. Try again later.' });
      return;
    }

    if (typeof req.body?.honeypot === 'string' && req.body.honeypot.trim().length > 0) {
      res.status(400).json({ error: 'Request rejected by bot protection.' });
      return;
    }
    if (!(await verifyTurnstileIfConfigured(req.body?.turnstileToken, ip))) {
      res.status(400).json({ error: 'Human verification challenge failed.' });
      return;
    }

    const role = req.body?.role === 'seller' ? 'seller' : 'user';
    const name = sanitizeText(String(req.body?.name || ''), 80);
    const email = sanitizeText(String(req.body?.email || ''), 120).toLowerCase();
    const password = String(req.body?.password || '');

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Valid name and email address are required.' });
      return;
    }
    if (!isStrongPassword(password)) {
      res.status(400).json({
        error: 'Password must be at least 8 characters and include letters and numbers or symbols.',
      });
      return;
    }
    if (store.users.some((u) => u.email.toLowerCase() === email)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    let sellerCode: string | undefined;
    if (role === 'seller') {
      const phone = sanitizeText(String(req.body?.phone || ''), 24);
      const whatsapp = sanitizeText(String(req.body?.whatsapp || ''), 24);
      const address = sanitizeText(String(req.body?.address || ''), 200);
      const postalCode = sanitizeText(String(req.body?.postalCode || ''), 16);
      const fatherName = sanitizeText(String(req.body?.fatherName || ''), 80);
      if (!phone || !whatsapp || !address || !postalCode || !fatherName) {
        res.status(400).json({ error: 'All seller verification fields are required.' });
        return;
      }
      do {
        sellerCode = generateSellerId('CA');
      } while (store.users.some((u) => u.sellerCode === sellerCode));
    }

    const rawAvatar = typeof req.body?.avatarUrl === 'string' ? req.body.avatarUrl : undefined;
    const safeAvatar =
      rawAvatar && (rawAvatar.startsWith('data:image/') || rawAvatar.startsWith('https://'))
        ? rawAvatar.slice(0, 1_500_000)
        : undefined;

    const created: StoredUser = {
      id: `usr-${crypto.randomUUID().slice(0, 8)}`,
      role,
      name,
      email,
      phone: req.body?.phone ? sanitizeText(String(req.body.phone), 24) : undefined,
      whatsapp: req.body?.whatsapp ? sanitizeText(String(req.body.whatsapp), 24) : undefined,
      address: req.body?.address ? sanitizeText(String(req.body.address), 200) : undefined,
      city: req.body?.city ? sanitizeText(String(req.body.city), 60) : 'Peshawar',
      postalCode: req.body?.postalCode ? sanitizeText(String(req.body.postalCode), 16) : undefined,
      fatherName: req.body?.fatherName ? sanitizeText(String(req.body.fatherName), 80) : undefined,
      avatarUrl: safeAvatar,
      sellerCode,
      isActiveSeller: role === 'seller',
      passwordHash: hashSecret(password),
      createdAt: new Date().toISOString(),
    };

    store.users.push(created);
    const token = signToken({ userId: created.id }, USER_TOKEN_SECRET, USER_TOKEN_TTL_MS);
    setSessionCookies(req, res, token);
    res.status(201).json({ user: sanitizeUser(created), token });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const ip = getClientIp(req);
    const rate = consumeRateLimit(forgotRateLimits, ip, 5, RATE_LIMIT_WINDOW_MS);
    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfterSec));
      res.status(429).json({ error: 'Too many reset requests. Please try again later.' });
      return;
    }

    const email = sanitizeText(String(req.body?.email || ''), 120).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }
    res.json({
      message:
        'If an account matches that email, password recovery instructions have been dispatched.',
    });
  });

  app.post('/api/auth/update-password', requireUser, (req, res) => {
    const user = (req as Request & { currentUser?: StoredUser }).currentUser;
    if (!user) {
      res.status(401).json({ error: 'Session expired. Please request a new reset link.' });
      return;
    }
    const newPassword = String(req.body?.password || '');
    if (!isStrongPassword(newPassword)) {
      res.status(400).json({
        error: 'Password must be at least 8 characters and include letters and numbers or symbols.',
      });
      return;
    }
    user.passwordHash = hashSecret(newPassword);
    res.json({ message: 'Your password has been updated. You are now signed in.' });
  });

  // ==================== ORDERS (IDEMPOTENT & SERVER-RECOMPUTED) ====================
  app.post('/api/orders', async (req, res) => {
    const ip = getClientIp(req);
    const rate = consumeRateLimit(orderRateLimits, ip, 20, RATE_LIMIT_WINDOW_MS);
    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfterSec));
      res.status(429).json({ error: 'Order submission limit reached. Please pause before retrying.' });
      return;
    }

    const body = req.body || {};
    if (typeof body.honeypot === 'string' && body.honeypot.trim().length > 0) {
      res.status(400).json({ error: 'Order rejected by automated protection.' });
      return;
    }
    if (!(await verifyTurnstileIfConfigured(body.turnstileToken, ip))) {
      res.status(400).json({ error: 'Human verification challenge failed.' });
      return;
    }

    const rawIdemKey =
      (typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : '') ||
      (typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '');
    const idempotencyKey = sanitizeText(rawIdemKey, 100);
    if (idempotencyKey && orderIdempotencyCache.has(idempotencyKey)) {
      res.status(200).json(orderIdempotencyCache.get(idempotencyKey));
      return;
    }

    const user = optionalUser(req);
    const paymentMethod = body.paymentMethod === 'installments' ? 'installments' : 'cod';
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0 || rawItems.length > 50) {
      res.status(400).json({ error: 'Order must contain between 1 and 50 line items.' });
      return;
    }

    const customerName = sanitizeText(String(body.customerName || ''), 80);
    const phone = sanitizeText(String(body.phone || ''), 24);
    const whatsapp = sanitizeText(String(body.whatsapp || phone), 24);
    const address = sanitizeText(String(body.address || ''), 200);
    const city = sanitizeText(String(body.city || 'Peshawar'), 60);
    const postalCode = sanitizeText(String(body.postalCode || ''), 16);
    if (!customerName || !phone || !address || !city || !postalCode) {
      res.status(400).json({ error: 'Customer contact and delivery address fields are required.' });
      return;
    }

    const referralCode = sanitizeText(String(body.referralCode || ''), 24).toUpperCase();
    let seller: StoredUser | undefined;
    if (referralCode) {
      seller = store.users.find(
        (u) => u.role === 'seller' && u.isActiveSeller && u.sellerCode?.toUpperCase() === referralCode
      );
      if (seller && user && seller.id === user.id) {
        res.status(400).json({ error: 'You cannot use your own Seller Referral ID.' });
        return;
      }
      if (paymentMethod === 'installments' && !seller) {
        res.status(400).json({ error: 'Installment orders require a valid active Seller Referral ID.' });
        return;
      }
    } else if (paymentMethod === 'installments') {
      res.status(400).json({ error: 'Seller Referral ID is required for installment orders.' });
      return;
    }

    // Always look up authoritative prices from catalog
    const canonicalItems: OrderItem[] = [];
    let baseSubtotal = 0;
    for (const raw of rawItems) {
      const productId = sanitizeText(String(raw?.productId || ''), 80);
      const prod = store.products.find((p) => p.id === productId);
      if (!prod) {
        res.status(400).json({ error: 'One or more ordered items are no longer available.' });
        return;
      }
      const stockStatus = deriveProductStockStatus(prod);
      if (!stockStatus.isAvailable) {
        res.status(400).json({ error: `"${prod.title}" is currently out of stock.` });
        return;
      }
      const rawQty = Math.max(1, Math.min(20, Math.floor(Number(raw?.quantity || 1))));
      if (
        typeof stockStatus.remainingUnits === 'number' &&
        rawQty > stockStatus.remainingUnits
      ) {
        res.status(400).json({
          error: `Only ${stockStatus.remainingUnits} unit(s) of "${prod.title}" remaining in stock.`,
        });
        return;
      }
      const qty = rawQty;
      baseSubtotal += prod.price * qty;
      canonicalItems.push({
        productId: prod.id,
        title: prod.title,
        unitPrice: prod.price,
        quantity: qty,
        selectedSize: raw?.selectedSize ? sanitizeText(String(raw.selectedSize), 32) : undefined,
        image: prod.coverImage,
      });
    }

    let advanceAmount = 0;
    let monthlyAmount = 0;
    let totalAmount = baseSubtotal;
    let installmentSchedule: Order['installmentSchedule'] = [];
    let planLabel: string | undefined;

    if (paymentMethod === 'installments') {
      const plan = store.plans.find((p) => p.id === body.planId && p.active) || store.plans[0];
      const calc = calculateInstallmentPlan(baseSubtotal, 1, plan);
      advanceAmount = calc.advanceAmount;
      monthlyAmount = calc.monthlyAmount;
      totalAmount = calc.totalPayable;
      installmentSchedule = calc.schedule;
      planLabel = plan.label;
    }

    const newOrder: Order = {
      id: `CA-ORD-${Math.floor(1045 + Math.random() * 8900)}`,
      userId: user?.id || 'guest',
      customerName,
      phone,
      whatsapp,
      address,
      city,
      postalCode,
      notes: sanitizeText(String(body.notes || ''), 300),
      items: canonicalItems,
      paymentMethod,
      planId: typeof body.planId === 'string' ? body.planId : undefined,
      planLabel,
      advanceAmount,
      advancePaid: false,
      monthlyAmount,
      totalAmount,
      installmentSchedule,
      referralCode: seller ? seller.sellerCode : undefined,
      referralSellerId: seller ? seller.id : undefined,
      commissionAmount: seller ? calculateCommission(totalAmount) : 0,
      commissionCredited: false,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    store.orders.unshift(newOrder);
    if (idempotencyKey) {
      if (orderIdempotencyCache.size >= 2000) {
        const oldestKey = orderIdempotencyCache.keys().next().value;
        if (oldestKey) orderIdempotencyCache.delete(oldestKey);
      }
      orderIdempotencyCache.set(idempotencyKey, newOrder);
    }
    res.status(201).json(newOrder);
  });

  app.get('/api/orders/mine', requireUser, (req, res) => {
    const user = (req as Request & { currentUser: StoredUser }).currentUser;
    res.json(store.orders.filter((o) => o.userId === user.id));
  });

  // ==================== USER & SELLER PROFILE ====================
  app.patch('/api/user/profile', requireUser, (req, res) => {
    const user = (req as Request & { currentUser: StoredUser }).currentUser;
    const allowed: (keyof User)[] = ['name', 'phone', 'whatsapp', 'address', 'city', 'postalCode', 'avatarUrl'];
    for (const key of allowed) {
      if (typeof req.body?.[key] === 'string') {
        if (key === 'avatarUrl') {
          const val = req.body[key];
          if (val.startsWith('data:image/') || val.startsWith('https://')) {
            user.avatarUrl = val.slice(0, 1_500_000);
          }
        } else {
          (user as unknown as Record<string, unknown>)[key] = sanitizeText(req.body[key], 200);
        }
      }
    }
    res.json(sanitizeUser(user));
  });

  app.delete('/api/user/account', requireUser, (req, res) => {
    const user = (req as Request & { currentUser: StoredUser }).currentUser;
    const confirmationEmail =
      typeof req.body?.confirmationEmail === 'string'
        ? req.body.confirmationEmail.trim().toLowerCase()
        : '';
    if (confirmationEmail && confirmationEmail !== user.email.toLowerCase()) {
      res.status(400).json({ error: 'Confirmation email does not match your account.' });
      return;
    }
    store.users = store.users.filter((u) => u.id !== user.id);
    clearSessionCookies(req, res);
    res.json({ ok: true });
  });

  app.get('/api/user/seller-dashboard', requireUser, (req, res) => {
    const user = (req as Request & { currentUser: StoredUser }).currentUser;
    if (user.role !== 'seller' || !user.sellerCode) {
      res.status(403).json({ error: 'Seller account required.' });
      return;
    }
    const referredOrders = store.orders.filter((o) => o.referralSellerId === user.id);
    const commissionEarned = referredOrders
      .filter((o) => o.status === 'complete' && o.commissionCredited)
      .reduce((s, o) => s + o.commissionAmount, 0);
    const pendingCommission = referredOrders
      .filter((o) => o.status === 'pending' || o.status === 'proceeding')
      .reduce((s, o) => s + o.commissionAmount, 0);

    let totalFinanced = 0;
    let totalRecovered = 0;
    for (const ord of referredOrders.filter((o) => o.paymentMethod === 'installments' && o.status !== 'rejected')) {
      const summary = calculateOrderPaidSummary(ord);
      totalFinanced += ord.totalAmount;
      totalRecovered += summary.paidAmount;
    }

    const monthlyMap = new Map<string, { commission: number; orders: number }>();
    for (const ord of referredOrders.filter((o) => o.status === 'complete')) {
      const m = ord.createdAt.slice(0, 7);
      const cur = monthlyMap.get(m) || { commission: 0, orders: 0 };
      cur.commission += ord.commissionAmount;
      cur.orders += 1;
      monthlyMap.set(m, cur);
    }

    res.json({
      sellerCode: user.sellerCode,
      totalReferrals: referredOrders.length,
      completedReferrals: referredOrders.filter((o) => o.status === 'complete').length,
      commissionEarned,
      pendingCommission,
      referredOrders,
      recoverySummary: {
        totalFinanced,
        totalRecovered,
        totalRemaining: Math.max(0, totalFinanced - totalRecovered),
      },
      ownInstallmentOrders: store.orders.filter(
        (o) => o.userId === user.id && o.paymentMethod === 'installments'
      ),
      monthlyEarnings: Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({ month, ...data })),
    });
  });

  // ==================== NOTIFICATIONS & FEEDBACK ====================
  app.get('/api/notifications', requireUser, (req, res) => {
    const user = (req as Request & { currentUser: StoredUser }).currentUser;
    res.json(store.notifications.filter((n) => n.userId === null || n.userId === user.id));
  });

  app.post('/api/notifications/:id/read', requireUser, (req, res) => {
    const user = (req as Request & { currentUser: StoredUser }).currentUser;
    const target = store.notifications.find(
      (n) => n.id === req.params.id && (n.userId === null || n.userId === user.id)
    );
    if (target) target.read = true;
    res.json({ ok: true });
  });

  app.get('/api/feedback', requireUser, (req, res) => {
    const user = (req as Request & { currentUser: StoredUser }).currentUser;
    res.json(store.feedback.filter((t) => t.userId === user.id));
  });

  app.post('/api/feedback', requireUser, (req, res) => {
    const user = (req as Request & { currentUser: StoredUser }).currentUser;
    const subject = sanitizeText(String(req.body?.subject || ''), 120);
    const message = sanitizeText(String(req.body?.message || ''), 800);
    if (!subject || !message) {
      res.status(400).json({ error: 'Subject and message are required.' });
      return;
    }
    const thread: FeedbackThread = {
      id: `fb-${crypto.randomUUID().slice(0, 8)}`,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      subject,
      status: 'open',
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-${crypto.randomUUID().slice(0, 8)}`,
          senderRole: 'user',
          senderName: user.name,
          body: message,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    store.feedback.unshift(thread);
    res.status(201).json(thread);
  });

  app.post('/api/feedback/:id/reply', requireUser, (req, res) => {
    const user = (req as Request & { currentUser: StoredUser }).currentUser;
    const thread = store.feedback.find((t) => t.id === req.params.id && t.userId === user.id);
    if (!thread) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }
    const body = sanitizeText(String(req.body?.body || ''), 800);
    if (!body) {
      res.status(400).json({ error: 'Reply message cannot be empty.' });
      return;
    }
    thread.messages.push({
      id: `msg-${crypto.randomUUID().slice(0, 8)}`,
      senderRole: 'user',
      senderName: user.name,
      body,
      createdAt: new Date().toISOString(),
    });
    thread.status = 'open';
    thread.updatedAt = new Date().toISOString();
    res.json(thread);
  });

  // ==================== PROTECTED ADMIN ROUTES ====================
  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    res.json(calculateAdminAnalytics(store.orders, store.products, store.manualEntries));
  });

  app.get('/api/admin/manual-entries', requireAdmin, (_req, res) => {
    res.json(store.manualEntries);
  });

  app.post('/api/admin/manual-entries', requireAdmin, (req, res) => {
    const body = req.body || {};
    const label = sanitizeText(String(body.label || ''), 120);
    if (!label) {
      res.status(400).json({ error: 'Entry label is required.' });
      return;
    }
    const created: ManualDashboardEntry = {
      id: `man-${crypto.randomUUID().slice(0, 8)}`,
      date: sanitizeText(String(body.date || new Date().toISOString().slice(0, 10)), 10),
      label,
      revenue: Math.max(0, Number(body.revenue) || 0),
      costOfGoods: Math.max(0, Number(body.costOfGoods) || 0),
      commissionAmount: Math.max(0, Number(body.commissionAmount) || 0),
      ordersCount: Math.max(1, Math.floor(Number(body.ordersCount) || 1)),
      notes: body.notes ? sanitizeText(String(body.notes), 240) : undefined,
      createdAt: new Date().toISOString(),
    };
    store.manualEntries.unshift(created);
    res.status(201).json(created);
  });

  app.delete('/api/admin/manual-entries/:id', requireAdmin, (req, res) => {
    store.manualEntries = store.manualEntries.filter((m) => m.id !== req.params.id);
    res.json({ ok: true });
  });

  app.get('/api/admin/orders', requireAdmin, (_req, res) => {
    res.json(store.orders);
  });

  app.patch('/api/admin/orders/:id/status', requireAdmin, (req, res) => {
    const order = store.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    const nextStatus = req.body?.status as OrderStatus;
    if (!['pending', 'proceeding', 'complete', 'rejected'].includes(nextStatus)) {
      res.status(400).json({ error: 'Invalid order status.' });
      return;
    }
    order.status = nextStatus;
    if (nextStatus === 'complete' && order.referralSellerId && !order.commissionCredited) {
      order.commissionAmount = calculateCommission(order.totalAmount);
      order.commissionCredited = true;
      store.notifications.unshift({
        id: `notif-${crypto.randomUUID().slice(0, 8)}`,
        userId: order.referralSellerId,
        title: '10% Referral Commission Credited',
        message: `Order ${order.id} completed. Commission of PKR ${order.commissionAmount.toLocaleString('en-PK')} has been credited to your account.`,
        kind: 'commission',
        read: false,
        createdAt: new Date().toISOString(),
      });
    } else if (nextStatus !== 'complete') {
      order.commissionCredited = false;
    }
    res.json(order);
  });

  app.patch('/api/admin/orders/:id/installments', requireAdmin, (req, res) => {
    const order = store.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    if (req.body?.isAdvance) {
      order.advancePaid = Boolean(req.body.paid);
    } else {
      const entry = order.installmentSchedule.find(
        (e) => e.installmentNumber === Number(req.body?.installmentNumber)
      );
      if (entry) {
        entry.paid = Boolean(req.body.paid);
        entry.paidAt = entry.paid ? new Date().toISOString().slice(0, 10) : null;
      }
    }
    res.json(order);
  });

  app.get('/api/admin/users', requireAdmin, (_req, res) => {
    res.json(store.users.map(sanitizeUser));
  });

  app.post('/api/admin/notifications', requireAdmin, (req, res) => {
    const title = sanitizeText(String(req.body?.title || ''), 120);
    const message = sanitizeText(String(req.body?.message || ''), 800);
    const rawTarget = req.body?.targetUserId;
    const targetUserId =
      rawTarget === null || rawTarget === undefined
        ? null
        : typeof rawTarget === 'string'
        ? rawTarget.trim()
        : '';

    if (rawTarget !== null && rawTarget !== undefined && !targetUserId) {
      res.status(400).json({ error: 'Select a specific user for private notification.' });
      return;
    }
    if (targetUserId && !store.users.some((u) => u.id === targetUserId)) {
      res.status(404).json({ error: 'Selected user account not found.' });
      return;
    }
    if (!title || !message) {
      res.status(400).json({ error: 'Title and message are required.' });
      return;
    }
    store.notifications.unshift({
      id: `notif-${crypto.randomUUID().slice(0, 8)}`,
      userId: targetUserId,
      title,
      message,
      kind: 'broadcast',
      read: false,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ ok: true });
  });

  app.get('/api/admin/feedback', requireAdmin, (_req, res) => {
    res.json(store.feedback);
  });

  app.post('/api/admin/feedback/:id/reply', requireAdmin, (req, res) => {
    const thread = store.feedback.find((t) => t.id === req.params.id);
    if (!thread) {
      res.status(404).json({ error: 'Feedback thread not found.' });
      return;
    }
    if (!thread.userId) {
      res.status(400).json({ error: 'Feedback thread has no target user ID.' });
      return;
    }
    const body = sanitizeText(String(req.body?.body || ''), 800);
    if (!body) {
      res.status(400).json({ error: 'Reply body required.' });
      return;
    }
    thread.messages.push({
      id: `msg-${crypto.randomUUID().slice(0, 8)}`,
      senderRole: 'admin',
      senderName: 'CA Admin',
      body,
      createdAt: new Date().toISOString(),
    });
    thread.status = 'replied';
    thread.updatedAt = new Date().toISOString();

    store.notifications.unshift({
      id: `notif-${crypto.randomUUID().slice(0, 8)}`,
      userId: thread.userId,
      title: `Reply: ${thread.subject}`,
      message: body,
      kind: 'feedback_reply',
      relatedFeedbackId: thread.id,
      read: false,
      createdAt: new Date().toISOString(),
    });
    res.json(thread);
  });

  app.get('/api/admin/products', requireAdmin, (_req, res) => {
    res.json(store.products);
  });

  app.post('/api/admin/products', requireAdmin, (req, res) => {
    const body = req.body || {};
    const title = sanitizeText(String(body.title || ''), 120);
    const price = Math.max(0, Number(body.price || 0));
    const costPrice = Math.max(0, Number(body.costPrice || Math.round(price * 0.55)));
    const category = store.categories.find((c) => c.id === body.categoryId) || store.categories[0];

    if (!title || price <= 0) {
      res.status(400).json({ error: 'Product title and positive PKR price are required.' });
      return;
    }

    if (body.id) {
      const existing = store.products.find((p) => p.id === body.id);
      if (!existing) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }
      if (typeof body.slug === 'string' && body.slug.trim()) {
        const nextSlug = slugify(body.slug);
        if (nextSlug && nextSlug !== existing.slug) {
          registerProductSlugRedirect(existing.slug, nextSlug);
          existing.slug = nextSlug;
        }
      }
      existing.title = title;
      existing.price = price;
      existing.costPrice = costPrice;
      existing.description = sanitizeText(String(body.description || existing.description), 1200);
      existing.categoryId = category.id;
      existing.categoryName = category.name;
      if (body.coverImage) existing.coverImage = String(body.coverImage);
      if (Array.isArray(body.extraImages)) existing.extraImages = body.extraImages;
      existing.inStock = body.inStock !== undefined ? Boolean(body.inStock) : existing.inStock;
      invalidateSeoSnapshot();
      res.json(existing);
      return;
    }

    const created: Product = {
      id: `prod-${crypto.randomUUID().slice(0, 8)}`,
      slug: `${slugify(title)}-${Math.floor(100 + Math.random() * 900)}`,
      title,
      description: sanitizeText(String(body.description || ''), 1200),
      price,
      costPrice,
      categoryId: category.id,
      categoryName: category.name,
      coverImage:
        String(body.coverImage || '/src/assets/images/cotton_dress_shirt_1795333237089.jpg'),
      extraImages: Array.isArray(body.extraImages) ? body.extraImages : [],
      sizes: ['S', 'M', 'L', 'XL'],
      inStock: true,
      featured: Boolean(body.featured),
      createdAt: new Date().toISOString(),
    };
    store.products.unshift(created);
    invalidateSeoSnapshot();
    res.status(201).json(created);
  });

  app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    const cleanId = sanitizeText(String(req.params.id || ''), 120);
    if (!cleanId) {
      res.status(400).json({ error: 'Product ID is required.' });
      return;
    }
    const existingIdx = store.products.findIndex((p) => p.id === cleanId);
    if (existingIdx === -1) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    store.products.splice(existingIdx, 1);
    invalidateSeoSnapshot();
    res.json({ ok: true, outcome: 'deleted' });
  });

  app.post('/api/admin/categories', requireAdmin, (req, res) => {
    const name = sanitizeText(String(req.body?.name || ''), 60);
    if (!name) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }
    const created: Category = {
      id: `cat-${slugify(name)}-${Math.floor(10 + Math.random() * 90)}`,
      name,
      slug: slugify(name),
      description: sanitizeText(String(req.body?.description || `${name} collection`), 200),
      image:
        String(req.body?.image || '/src/assets/images/cotton_dress_shirt_1795333237089.jpg'),
    };
    store.categories.push(created);
    invalidateSeoSnapshot();
    res.status(201).json(created);
  });

  app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
    const cleanId = sanitizeText(String(req.params.id || ''), 120);
    if (!cleanId) {
      res.status(400).json({ error: 'Category ID is required.' });
      return;
    }
    const catIdx = store.categories.findIndex((c) => c.id === cleanId);
    if (catIdx === -1) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }
    const category = store.categories[catIdx];
    const linkedProducts = store.products.filter((p) => p.categoryId === cleanId);
    const cascade = req.query.cascade === 'true' || req.body?.cascadeProducts === true;
    if (linkedProducts.length > 0 && !cascade) {
      res.status(409).json({
        error: `Category "${category.name}" still has ${linkedProducts.length} product(s). Delete or reassign them first, or confirm removing them together.`,
      });
      return;
    }
    const deletedProductIds = linkedProducts.map((p) => p.id);
    if (deletedProductIds.length > 0) {
      const removeSet = new Set(deletedProductIds);
      store.products = store.products.filter((p) => !removeSet.has(p.id));
    }
    store.categories.splice(catIdx, 1);
    invalidateSeoSnapshot();
    res.json({ ok: true, deletedProductIds });
  });

  app.put('/api/admin/installment-plans', requireAdmin, (req, res) => {
    const incoming = Array.isArray(req.body?.plans) ? req.body.plans : [];
    store.plans = incoming.map((p: InstallmentPlan) => ({
      id: p.id || `plan-${Math.max(1, Number(p.months ?? 2))}m-${crypto.randomUUID().slice(0, 4)}`,
      label: sanitizeText(String(p.label || `${p.months} Months`), 40),
      months: Math.max(1, Math.min(36, Number(p.months ?? 2))),
      advancePercent: Math.max(0, Math.min(90, Number(p.advancePercent ?? 0))),
      markupPercent: Math.max(0, Math.min(200, Number(p.markupPercent ?? 0))),
      active: Boolean(p.active),
    }));
    invalidateSeoSnapshot();
    res.json(store.plans);
  });

  app.put('/api/admin/terms', requireAdmin, (req, res) => {
    const body = req.body || {};
    const sections = Array.isArray(body.sections)
      ? body.sections
          .map((sec: { id?: string; heading?: string; body?: string }, idx: number) => ({
            id: sanitizeText(String(sec.id || `sec-${idx + 1}`), 40),
            heading: sanitizeText(String(sec.heading || ''), 160),
            body: sanitizeText(String(sec.body || ''), 2500),
          }))
          .filter((sec: { heading: string; body: string }) => sec.heading && sec.body)
      : store.termsPolicy.sections;

    store.termsPolicy = {
      effectiveLabel: sanitizeText(String(body.effectiveLabel || store.termsPolicy.effectiveLabel), 120),
      title: sanitizeText(String(body.title || store.termsPolicy.title), 160),
      sections,
      footerNote: sanitizeText(String(body.footerNote ?? store.termsPolicy.footerNote), 300),
      updatedAt: new Date().toISOString(),
    };
    invalidateSeoSnapshot();
    res.json(store.termsPolicy);
  });

  // ==================== SEO SNAPSHOT, SITEMAP, ROBOTS, LLMS, 301 & SSR ====================
  let cachedCatalogSnapshot: { data: CatalogSnapshot; expiresAt: number } | null = null;
  const SNAPSHOT_TTL_MS = 60_000;

  function invalidateSeoSnapshot() {
    cachedCatalogSnapshot = null;
  }

  async function getLiveCatalogSnapshot(forceRefresh = false): Promise<CatalogSnapshot> {
    const now = Date.now();
    if (!forceRefresh && cachedCatalogSnapshot && cachedCatalogSnapshot.expiresAt > now) {
      return cachedCatalogSnapshot.data;
    }
    const snapshot = await fetchCatalogSnapshot({
      fallbackProducts: store.products,
      fallbackCategories: store.categories,
      fallbackPlans: store.plans,
      fallbackTerms: store.termsPolicy,
    });
    cachedCatalogSnapshot = { data: snapshot, expiresAt: now + SNAPSHOT_TTL_MS };
    return snapshot;
  }

  function resolveRequestOrigin(req: Request): string {
    const configured = (process.env.SITE_URL || process.env.VITE_SITE_URL || '').trim();
    if (configured) return configured.replace(/\/+$/, '');
    const host = req.headers.host;
    if (host) {
      return `${isHttpsRequest(req) ? 'https' : 'http'}://${host}`.replace(/\/+$/, '');
    }
    return STORE_CONFIG.siteUrl;
  }

  function hasValidSeoSecret(req: Request): boolean {
    const expected = (process.env.SEO_REBUILD_SECRET || '').trim();
    if (!expected) return false;
    const headerSecret = String(req.headers['x-seo-secret'] || '').trim();
    const bearer = String(req.headers.authorization || '').startsWith('Bearer ')
      ? String(req.headers.authorization || '').slice('Bearer '.length).trim()
      : '';
    const candidate = headerSecret || bearer;
    if (!candidate) return false;
    const a = Buffer.from(candidate);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  function isHtmlNavigationRequest(req: Request): boolean {
    if (req.method !== 'GET' && req.method !== 'HEAD') return false;
    const reqPath = req.path || '/';
    if (
      reqPath.startsWith('/api/') ||
      reqPath.startsWith('/src/') ||
      reqPath.startsWith('/assets/') ||
      reqPath.startsWith('/@') ||
      reqPath.startsWith('/node_modules/')
    ) {
      return false;
    }
    const lastSegment = reqPath.split('/').pop() || '';
    if (lastSegment.includes('.')) return false;
    const accept = String(req.headers.accept || '');
    return accept.includes('text/html') || accept.includes('*/*') || accept === '';
  }

  async function triggerStaticRebuild(origin: string) {
    const distTemplate = path.resolve(process.cwd(), 'dist', '_template.html');
    const ssrBundle = path.resolve(process.cwd(), 'dist-ssr', 'entry-server.js');
    if (!fs.existsSync(distTemplate) || !fs.existsSync(ssrBundle)) {
      return null;
    }
    const { runPrerender } = await import('./scripts/prerender');
    return runPrerender({ rootDir: process.cwd(), origin });
  }

  app.get('/robots.txt', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.type('text/plain; charset=utf-8').send(
      generateRobotsTxt({ origin: resolveRequestOrigin(req) })
    );
  });

  app.get('/sitemap.xml', async (req, res) => {
    const snapshot = await getLiveCatalogSnapshot();
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.type('application/xml; charset=utf-8').send(
      buildSitemapXml(snapshot, resolveRequestOrigin(req))
    );
  });

  app.get('/llms.txt', async (req, res) => {
    const snapshot = await getLiveCatalogSnapshot();
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.type('text/plain; charset=utf-8').send(
      generateLlmsTxt({
        origin: resolveRequestOrigin(req),
        categories: snapshot.categories,
        products: snapshot.products,
      })
    );
  });

  app.post('/api/seo/rebuild', async (req, res) => {
    const auth = req.headers.authorization;
    const token = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';
    const adminPayload = token ? verifyToken<{ scope: string; exp: number }>(token, ADMIN_TOKEN_SECRET) : null;
    const isAdmin = Boolean(adminPayload && adminPayload.scope === 'admin');
    if (!isAdmin && !hasValidSeoSecret(req)) {
      res.status(401).json({ error: 'Unauthorized SEO rebuild request.' });
      return;
    }
    invalidateSeoSnapshot();
    const snapshot = await getLiveCatalogSnapshot(true);
    const rebuildSummary = await triggerStaticRebuild(resolveRequestOrigin(req));
    res.json({
      ok: true,
      products: snapshot.products.length,
      categories: snapshot.categories.length,
      prerendered: rebuildSummary,
    });
  });

  app.post('/api/seo/webhook/supabase', async (req, res) => {
    if (!hasValidSeoSecret(req)) {
      res.status(401).json({ error: 'Invalid webhook secret.' });
      return;
    }
    invalidateSeoSnapshot();
    const origin = resolveRequestOrigin(req);
    void getLiveCatalogSnapshot(true)
      .then(() => triggerStaticRebuild(origin))
      .catch(() => undefined);
    res.status(202).json({ ok: true, queued: true });
  });

  app.get(['/product/:slug', '/ur/product/:slug'], async (req, res, next) => {
    try {
      const snapshot = await getLiveCatalogSnapshot();
      const targetSlug = resolveProductSlugRedirect(
        String(req.params.slug || ''),
        snapshot.slugRedirects
      );
      if (targetSlug) {
        const prefix = req.path.startsWith('/ur/') ? '/ur' : '';
        res.redirect(301, `${prefix}/product/${targetSlug}`);
        return;
      }
    } catch {
      // Fall through cleanly
    }
    next();
  });

  // ==================== VITE DEV / SSR & STATIC SERVE ====================
  if (!IS_PROD) {
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: disableHmr ? false : undefined,
        watch: disableHmr ? null : {},
      },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      if (!isHtmlNavigationRequest(req)) {
        next();
        return;
      }
      try {
        const rawTemplate = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
        const template = await vite.transformIndexHtml(req.originalUrl, rawTemplate);
        const ssrMod = (await vite.ssrLoadModule('/src/entry-server.tsx')) as {
          renderRoute: typeof import('./src/entry-server').renderRoute;
        };
        const snapshot = await getLiveCatalogSnapshot();
        const origin = resolveRequestOrigin(req);
        const rendered = ssrMod.renderRoute({
          url: req.originalUrl,
          snapshot,
          origin,
        });

        if (rendered.statusCode === 301 && rendered.redirectTo) {
          res.redirect(301, rendered.redirectTo);
          return;
        }
        if (rendered.seoConfig.noIndex) {
          res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        }
        const finalHtml = injectSsrIntoTemplate(template, {
          lang: rendered.lang,
          dir: rendered.dir,
          headTagsHtml: rendered.headTagsHtml,
          html: rendered.html,
          dehydratedState: rendered.dehydratedState,
        });
        res.status(rendered.statusCode).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(finalHtml);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        try {
          const fallbackTemplate = await vite.transformIndexHtml(
            req.originalUrl,
            fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8')
          );
          res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(fallbackTemplate);
        } catch {
          next(err);
        }
      }
    });
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    const ssrBundlePath = path.resolve(process.cwd(), 'dist-ssr', 'entry-server.js');
    const templatePath = fs.existsSync(path.join(distDir, '_template.html'))
      ? path.join(distDir, '_template.html')
      : path.join(distDir, 'index.html');

    app.use(
      express.static(distDir, {
        index: false,
        setHeaders(res, filePath) {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
          }
        },
      })
    );

    app.get('/{*splat}', async (req, res) => {
      if (fs.existsSync(ssrBundlePath) && fs.existsSync(templatePath)) {
        try {
          const ssrMod = (await import(pathToFileURL(ssrBundlePath).href)) as {
            renderRoute: typeof import('./src/entry-server').renderRoute;
          };
          const snapshot = await getLiveCatalogSnapshot();
          const origin = resolveRequestOrigin(req);
          const rendered = ssrMod.renderRoute({
            url: req.originalUrl,
            snapshot,
            origin,
          });
          if (rendered.statusCode === 301 && rendered.redirectTo) {
            res.redirect(301, rendered.redirectTo);
            return;
          }
          if (rendered.seoConfig.noIndex) {
            res.setHeader('X-Robots-Tag', 'noindex, nofollow');
          }
          res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
          const template = fs.readFileSync(templatePath, 'utf8');
          const finalHtml = injectSsrIntoTemplate(template, {
            lang: rendered.lang,
            dir: rendered.dir,
            headTagsHtml: rendered.headTagsHtml,
            html: rendered.html,
            dehydratedState: rendered.dehydratedState,
          });
          res.status(rendered.statusCode).type('html').send(finalHtml);
          return;
        } catch {
          // Fall back to static pre-rendered files below if SSR render fails
        }
      }

      const cleanSub = req.path.replace(/^\/+/, '').replace(/\/+$/, '');
      const staticCandidate = cleanSub
        ? path.resolve(distDir, cleanSub, 'index.html')
        : path.resolve(distDir, 'index.html');
      if (staticCandidate.startsWith(distDir) && fs.existsSync(staticCandidate)) {
        res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
        res.sendFile(staticCandidate);
        return;
      }

      const file404 = path.join(distDir, '404.html');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      if (fs.existsSync(file404)) {
        res.status(404).sendFile(file404);
      } else {
        res.status(404).send('404 Page Not Found');
      }
    });
  }

  // Global Express error handler: never expose stack traces, always include short referenceId
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const refId = `CA-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const status =
      typeof err === 'object' && err !== null && 'status' in err
        ? Math.max(400, Math.min(599, Number((err as { status?: unknown }).status || 500)))
        : 500;
    console.error(`[Server Error] ref=${refId} status=${status} path=${req.path}`);
    if (res.headersSent) return;
    res.status(status).json({
      error:
        status >= 500
          ? 'Service temporarily unavailable. Please try again in a moment.'
          : 'Request could not be completed.',
      referenceId: refId,
    });
  });

  const server = app.listen(PORT, HOST, () => {
    console.log(`Cinematic Arts server listening on http://localhost:${PORT}`);
  });
  server.on('error', (err) => {
    console.error(`Failed to bind server on ${HOST}:${PORT}:`, err);
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Cinematic Arts server:', err);
  process.exit(1);
});
