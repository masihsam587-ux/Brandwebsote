/**
 * Standalone Express + PostgreSQL REST API Reference for Railway Deployment
 * -------------------------------------------------------------------------
 * Install on Railway service: npm i express cors dotenv pg
 * Configure env vars: DATABASE_URL, ADMIN_PASSWORD, ADMIN_TOKEN_SECRET, ALLOWED_ORIGIN
 */
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
// import { Pool } from 'pg';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '4mb' }));

// Example pg pool:
// const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
const failuresByIp = new Map<string, { count: number; resetAt: number }>();

function signAdminToken(): string {
  const payload = Buffer.from(JSON.stringify({ scope: 'admin', exp: Date.now() + 900_000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return res.status(401).json({ error: 'Unauthorized' });
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp: number };
  if (parsed.exp < Date.now()) return res.status(401).json({ error: 'Token expired' });
  next();
}

// Rate-limited backend admin password verification
app.post('/api/admin/login', (req, res) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const bucket = failuresByIp.get(ip);
  if (bucket && bucket.resetAt > now && bucket.count >= 5) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again in 15 minutes.' });
  }
  const candidate = String(req.body?.password || '');
  if (!ADMIN_PASSWORD || candidate !== ADMIN_PASSWORD) {
    failuresByIp.set(ip, {
      count: bucket && bucket.resetAt > now ? bucket.count + 1 : 1,
      resetAt: bucket && bucket.resetAt > now ? bucket.resetAt : now + 900_000,
    });
    return res.status(401).json({ error: 'Invalid admin password.' });
  }
  failuresByIp.delete(ip);
  res.json({ token: signAdminToken() });
});

/*
 * Production PostgreSQL Parameterized Routes (using `pool.query`):
 *
 * GET  /api/products                -> SELECT id, slug, title, description, price, category_id, cover_image, extra_images FROM products
 * GET  /api/sellers/validate/:code  -> SELECT id, name FROM profiles WHERE role = 'seller' AND is_active_seller = true AND upper(seller_code) = upper($1)
 * POST /api/orders                  -> Validates seller referral if payment_method = 'installments', inserts order with status = 'pending'
 * PATCH /api/admin/orders/:id/status (requireAdmin) ->
 *      Updates status; when status = 'complete' and referral_seller_id IS NOT NULL:
 *      sets commission_amount = round(total_amount * 0.10), commission_credited = true inside a DB transaction.
 */

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'cinematic-arts-api' }));

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`Railway API example listening on :${port}`));
