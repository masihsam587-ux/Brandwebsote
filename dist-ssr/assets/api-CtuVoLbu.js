import DOMPurify from "dompurify";
import { createClient } from "@supabase/supabase-js";
// src/utils/privacyScrub.ts
/**
* Privacy scrubbing helpers for Sentry error reporting and user-facing logs.
* Ensures zero personal data (emails, phone/WhatsApp numbers, addresses, tokens, cookies)
* ever leaves the client or server error pipeline.
*/
var EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
var PK_PHONE_PATTERN = /(?:\+?92[\s-]?3\d{2}|03\d{2})[\s-]?\d{7}\b/g;
var INTL_PHONE_PATTERN = /\+\d{1,3}[\s-]?\d{6,12}\b/g;
var BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
var JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
var SENSITIVE_PARAM_PATTERN = /([?&](?:token|access_token|refresh_token|password|pwd|secret|apikey|api_key|phone|whatsapp|email|address|cnic|father_name)=)[^&\s]+/gi;
function scrubSensitiveString(input) {
	if (!input) return "";
	return input.replace(EMAIL_PATTERN, "[redacted-email]").replace(PK_PHONE_PATTERN, "[redacted-phone]").replace(INTL_PHONE_PATTERN, "[redacted-phone]").replace(BEARER_PATTERN, "Bearer [redacted-token]").replace(JWT_PATTERN, "[redacted-jwt]").replace(SENSITIVE_PARAM_PATTERN, "$1[redacted]");
}
// src/services/errorHandling.ts
var REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
/**
* Generates a compact, readable support reference ID such as `CA-7K9M-2P4X`
* with zero PII or timestamps encoded.
*/
function createErrorReferenceId(prefix = "CA") {
	const bytes = /* @__PURE__ */ new Uint8Array(8);
	if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) globalThis.crypto.getRandomValues(bytes);
	else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
	const chars = Array.from(bytes, (b) => REFERENCE_ALPHABET[b % 32]);
	return `${prefix.toUpperCase()}-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}`;
}
var AppError = class extends Error {
	constructor(options) {
		super(options.message);
		this.name = "AppError";
		this.status = options.status ?? 500;
		this.kind = options.kind ?? "unknown";
		this.referenceId = options.referenceId || createErrorReferenceId("CA");
		this.retryable = options.retryable ?? (this.status === 0 || this.status === 408 || this.status >= 500);
		this.title = options.title || "Request interrupted";
	}
};
var trackedErrorIds = /* @__PURE__ */ new WeakMap();
function getOrAssignErrorReferenceId(err) {
	if (err && typeof err === "object") {
		const rec = err;
		if (typeof rec.referenceId === "string" && /^CA-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(rec.referenceId)) return rec.referenceId;
		const existing = trackedErrorIds.get(err);
		if (existing) return existing;
		const created = createErrorReferenceId("CA");
		trackedErrorIds.set(err, created);
		return created;
	}
	return createErrorReferenceId("CA");
}
function extractStatus(err) {
	if (!err || typeof err !== "object") return 0;
	const rec = err;
	if (typeof rec.status === "number" && Number.isFinite(rec.status)) return rec.status;
	if (typeof rec.statusCode === "number" && Number.isFinite(rec.statusCode)) return rec.statusCode;
	if (typeof rec.code === "string" && /^\d{3}$/.test(rec.code)) return Number(rec.code);
	return 0;
}
function extractRawMessage(err) {
	if (!err) return "";
	if (err instanceof Error) return err.message || "";
	if (typeof err === "object" && "message" in err) return String(err.message || "");
	return String(err);
}
/**
* Classifies 500s, timeouts, and offline states into friendly, consistent
* user messages tagged with a short support reference ID.
*/
function normalizeAppError(err, options) {
	const referenceId = getOrAssignErrorReferenceId(err);
	const status = extractStatus(err);
	const raw = extractRawMessage(err);
	const lower = raw.toLowerCase();
	if (options?.offline === true || typeof navigator !== "undefined" && navigator.onLine === false || status === 0 && (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("network request failed") || lower.includes("network connection unavailable") || lower.includes("load failed") || lower.includes("err_internet_disconnected"))) return {
		kind: "offline",
		status: 0,
		referenceId,
		title: "You appear to be offline",
		message: "Your internet connection looks offline. Check your Wi-Fi or mobile data and retry.",
		retryable: true
	};
	if (status === 408 || status === 504 || err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError") || lower.includes("timed out") || lower.includes("timeout") || lower.includes("aborterror") || lower.includes("request was aborted")) return {
		kind: "timeout",
		status: status || 408,
		referenceId,
		title: "Connection timed out",
		message: "The request took too long to respond. Please check your connection and try again.",
		retryable: true
	};
	if (status >= 500 || lower.includes("service temporarily unavailable") || lower.includes("internal server error") || lower.includes("bad gateway") || lower.includes("gateway timeout") || lower.includes("econnreset")) return {
		kind: "server",
		status: status >= 500 ? status : 500,
		referenceId,
		title: "Temporary service issue",
		message: "Our storefront service encountered a temporary problem. Nothing was lost—please retry in a moment.",
		retryable: true
	};
	if (status === 429 || lower.includes("too many") || lower.includes("rate limit")) return {
		kind: "rate_limit",
		status: 429,
		referenceId,
		title: "Too many requests",
		message: "Please pause for a few seconds before trying again.",
		retryable: true
	};
	if (status === 401 || status === 403 || lower.includes("authentication required") || lower.includes("permission denied")) return {
		kind: "auth",
		status: status || 401,
		referenceId,
		title: "Access required",
		message: scrubSensitiveString(raw) || "Please sign in with the appropriate account to continue.",
		retryable: false
	};
	const scrubbed = scrubSensitiveString(raw).trim();
	const safeMessage = scrubbed && scrubbed.length <= 220 && !/sql|syntaxerror|prisma|pg_|postgres|stack|at\s+[A-Za-z0-9_$.]+\s+\(/i.test(scrubbed) ? scrubbed : options?.fallbackMessage || "Something unexpected went wrong. Please try again.";
	return {
		kind: status >= 400 && status < 500 ? "validation" : "unknown",
		status: status || 500,
		referenceId,
		title: "Request could not be completed",
		message: safeMessage,
		retryable: status === 0 || status >= 500
	};
}
var currentGlobalError = null;
var currentRetryCallback = null;
var listeners = /* @__PURE__ */ new Set();
function emitChange() {
	listeners.forEach((fn) => {
		try {
			fn();
		} catch {}
	});
}
function subscribeGlobalError(listener) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
function getGlobalErrorSnapshot() {
	return currentGlobalError;
}
function reportGlobalError(err, retryFn) {
	const normalized = normalizeAppError(err);
	currentGlobalError = {
		title: normalized.title,
		message: normalized.message,
		kind: normalized.kind,
		referenceId: normalized.referenceId,
		retryable: normalized.retryable,
		timestamp: Date.now()
	};
	if (retryFn) currentRetryCallback = retryFn;
	emitChange();
	return normalized;
}
function clearGlobalError() {
	if (!currentGlobalError && !currentRetryCallback) return;
	currentGlobalError = null;
	currentRetryCallback = null;
	emitChange();
}
function triggerGlobalErrorRetry(fallbackRetry) {
	const retryFn = currentRetryCallback || fallbackRetry;
	clearGlobalError();
	if (retryFn) retryFn();
}
// src/api/seedData.ts
var SEED_CATEGORIES = [
	{
		id: "cat-womens-unstitched",
		name: "Women's Unstitched",
		slug: "womens-unstitched",
		description: "3-piece and 2-piece unstitched embroidered lawn, cotton, and chiffon suits.",
		image: "/src/assets/images/womens_unstitched_suit_1795333234539.jpg"
	},
	{
		id: "cat-boys-trousers",
		name: "Boys' Trousers",
		slug: "boys-trousers",
		description: "Comfortable slim-fit cotton chinos, cargo pants, and everyday trousers for boys.",
		image: "/src/assets/images/boys_trousers_collection_1795333233867.jpg"
	},
	{
		id: "cat-jackets",
		name: "Jackets",
		slug: "jackets",
		description: "Warm bomber, fleece-lined, and seasonal casual jackets.",
		image: "/src/assets/images/winter_casual_jacket_1795333234968.jpg"
	},
	{
		id: "cat-hoodies",
		name: "Hoodies",
		slug: "hoodies",
		description: "Soft brushed-fleece pullover and everyday hoodies.",
		image: "/src/assets/images/fleece_hoodie_studio_1795333235567.jpg"
	},
	{
		id: "cat-shirts",
		name: "Shirts",
		slug: "shirts",
		description: "Cotton Oxford and casual button-down shirts for daily and formal wear.",
		image: "/src/assets/images/cotton_dress_shirt_1795333237089.jpg"
	},
	{
		id: "cat-tshirts",
		name: "T-Shirts",
		slug: "t-shirts",
		description: "Breathable combed cotton crew-neck and everyday t-shirts.",
		image: "/src/assets/images/combed_cotton_tshirt_1795333235825.jpg"
	},
	{
		id: "cat-accessories",
		name: "Accessories",
		slug: "accessories",
		description: "Watches, scarves, bags, and everyday wardrobe accessories.",
		image: "/src/assets/images/product_chronograph_watch_1795274847788.jpg"
	}
];
var DEFAULT_TERMS_POLICY = {
	effectiveLabel: "Peshawar, Pakistan · Effective 2026",
	title: "Terms of Service & Installment Rules",
	sections: [
		{
			id: "sec-1",
			heading: "1. Business Identity & Pricing",
			body: "Cinematic Arts (CA) operates out of Peshawar, Khyber Pakhtunkhwa, Pakistan, selling women's unstitched clothes, boys' trousers, jackets, hoodies, shirts, t-shirts, and accessories. All retail prices, interest calculations, and installment schedules are denominated exclusively in Pakistani Rupees (PKR)."
		},
		{
			id: "sec-2",
			heading: "2. Cash on Delivery & Return Policy",
			body: "Cash on Delivery (COD) orders are available across major Pakistani cities without a referral code. Unworn garments and uncut unstitched fabrics with original tags may be exchanged for sizing or quality issues within 7 calendar days of delivery."
		},
		{
			id: "sec-3",
			heading: "3. PKR Installment Financing Terms",
			body: "Installment orders are offered on 2-month (15% interest), 3-month (25% interest), and 4-month (40% interest) plans and require an active, verified CA Seller Referral ID at checkout. Orders remain Pending until verified by CA administration, and monthly installments are tracked in the customer Orders ledger."
		},
		{
			id: "sec-4",
			heading: "4. Seller Referral Commission Rules",
			body: "Registered sellers receive a unique referral code (format CA-XXXXXX). Active sellers earn a 10% commission on the total value of each referred order once the order status reaches Complete. Cancelled or rejected orders do not accrue commission."
		}
	],
	footerNote: "Questions? Email masihsam587@gmail.com or call 03355329722.",
	updatedAt: "2026-11-22T00:00:00.000Z"
};
// src/utils/commerce.ts
function deriveProductStockStatus(product, lowStockThreshold = 5) {
	if (product.inStock === false || product.stockLevel === "out_of_stock" || typeof product.stockQuantity === "number" && product.stockQuantity <= 0) return {
		level: "out_of_stock",
		isAvailable: false,
		remainingUnits: 0
	};
	if (product.stockLevel === "low_stock" || typeof product.stockQuantity === "number" && product.stockQuantity <= lowStockThreshold) return {
		level: "low_stock",
		isAvailable: true,
		remainingUnits: typeof product.stockQuantity === "number" ? product.stockQuantity : void 0
	};
	return {
		level: "in_stock",
		isAvailable: true,
		remainingUnits: typeof product.stockQuantity === "number" ? product.stockQuantity : void 0
	};
}
function formatPKR(amount) {
	return `PKR ${(Number.isFinite(amount) ? Math.round(amount) : 0).toLocaleString("en-PK")}`;
}
function slugify(text) {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}
/**
* Computes exact PKR installment figures:
* - Interest (markupPercent: e.g. 15% for 2m, 25% for 3m, 40% for 4m) applies to the product subtotal.
* - totalPayable = subtotal + markupAmount.
* - Optional advancePercent (default 0%) is taken from totalPayable.
* - Remaining financedBalance is split across `months`, with any rounding delta applied to the final month
*   so sum(advance + monthly payments) equals totalPayable to the exact rupee.
*/
function calculateInstallmentPlan(unitPrice, quantity, plan, startDateIso = (/* @__PURE__ */ new Date()).toISOString()) {
	const subtotal = Math.max(0, Math.round(unitPrice)) * Math.max(1, Math.floor(quantity));
	const months = Math.max(1, Math.floor(plan.months));
	const advancePercent = Math.min(90, Math.max(0, plan.advancePercent));
	const markupPercent = Math.max(0, plan.markupPercent);
	const markupAmount = Math.round(subtotal * markupPercent / 100);
	const totalPayable = subtotal + markupAmount;
	const advanceAmount = Math.round(totalPayable * advancePercent / 100);
	const financedBalance = Math.max(0, totalPayable - advanceAmount);
	const baseMonthly = Math.floor(financedBalance / months);
	const remainder = financedBalance - baseMonthly * months;
	const startDate = new Date(startDateIso);
	const schedule = [];
	for (let i = 1; i <= months; i++) {
		const due = new Date(startDate);
		due.setMonth(due.getMonth() + i);
		const amount = i === months ? baseMonthly + remainder : baseMonthly;
		schedule.push({
			installmentNumber: i,
			dueDate: due.toISOString().slice(0, 10),
			amount,
			paid: false,
			paidAt: null
		});
	}
	return {
		subtotal,
		advancePercent,
		advanceAmount,
		markupPercent,
		markupAmount,
		totalPayable,
		financedBalance,
		months,
		monthlyAmount: baseMonthly,
		schedule
	};
}
function calculateOrderPaidSummary(order) {
	if (order.paymentMethod === "cod") {
		const paid = order.status === "complete" ? order.totalAmount : 0;
		return {
			paidAmount: paid,
			remainingAmount: Math.max(0, order.totalAmount - paid),
			progressPercent: order.status === "complete" ? 100 : 0
		};
	}
	const advance = order.advancePaid ? order.advanceAmount : 0;
	const installmentsPaid = (order.installmentSchedule || []).filter((item) => item.paid).reduce((sum, item) => sum + item.amount, 0);
	const paidAmount = Math.min(order.totalAmount, advance + installmentsPaid);
	return {
		paidAmount,
		remainingAmount: Math.max(0, order.totalAmount - paidAmount),
		progressPercent: order.totalAmount > 0 ? Math.round(paidAmount / order.totalAmount * 100) : 0
	};
}
function calculateCommission(orderTotal, rate = .1) {
	if (!Number.isFinite(orderTotal) || orderTotal <= 0) return 0;
	return Math.round(orderTotal * rate);
}
function generateSellerId(prefix = "CA") {
	const digits = Math.floor(1e5 + Math.random() * 9e5);
	return `${prefix.toUpperCase()}-${digits}`;
}
function calculateAdminAnalytics(orders, products, manualEntries = []) {
	const productMap = new Map(products.map((p) => [p.id, p]));
	const activeOrders = orders.filter((o) => o.status !== "rejected");
	const completedOrders = orders.filter((o) => o.status === "complete");
	let revenue = 0;
	let costOfGoods = 0;
	let commissionsPayable = 0;
	let manualOrdersTotal = 0;
	for (const order of completedOrders) {
		revenue += order.totalAmount;
		for (const item of order.items) {
			const unitCost = productMap.get(item.productId)?.costPrice ?? Math.round(item.unitPrice * .55);
			costOfGoods += unitCost * item.quantity;
		}
		if (order.referralSellerId) commissionsPayable += order.commissionAmount ?? calculateCommission(order.totalAmount);
	}
	for (const entry of manualEntries) {
		const rev = Math.max(0, Number(entry.revenue) || 0);
		const cogs = Math.max(0, Number(entry.costOfGoods) || 0);
		const comm = Math.max(0, Number(entry.commissionAmount) || 0);
		const cnt = Math.max(1, Math.floor(Number(entry.ordersCount) || 1));
		revenue += rev;
		costOfGoods += cogs;
		commissionsPayable += comm;
		manualOrdersTotal += cnt;
	}
	const grossProfit = revenue - costOfGoods;
	const netProfit = grossProfit - commissionsPayable;
	const profitMarginPct = revenue > 0 ? Number((netProfit / revenue * 100).toFixed(1)) : 0;
	const dailyBuckets = /* @__PURE__ */ new Map();
	const monthlyBuckets = /* @__PURE__ */ new Map();
	for (const order of activeOrders) {
		const dayKey = order.createdAt.slice(0, 10);
		const prevDay = dailyBuckets.get(dayKey) || {
			revenue: 0,
			orders: 0
		};
		prevDay.revenue += order.totalAmount;
		prevDay.orders += 1;
		dailyBuckets.set(dayKey, prevDay);
		const monthKey = order.createdAt.slice(0, 7);
		const prevMonth = monthlyBuckets.get(monthKey) || {
			revenue: 0,
			profit: 0
		};
		if (order.status === "complete") {
			let cogs = 0;
			for (const item of order.items) {
				const prod = productMap.get(item.productId);
				cogs += (prod?.costPrice ?? Math.round(item.unitPrice * .55)) * item.quantity;
			}
			const comm = order.referralSellerId ? order.commissionAmount ?? calculateCommission(order.totalAmount) : 0;
			prevMonth.revenue += order.totalAmount;
			prevMonth.profit += order.totalAmount - cogs - comm;
		}
		monthlyBuckets.set(monthKey, prevMonth);
	}
	for (const entry of manualEntries) {
		const dayKey = (entry.date || entry.createdAt).slice(0, 10);
		const rev = Math.max(0, Number(entry.revenue) || 0);
		const cogs = Math.max(0, Number(entry.costOfGoods) || 0);
		const comm = Math.max(0, Number(entry.commissionAmount) || 0);
		const cnt = Math.max(1, Math.floor(Number(entry.ordersCount) || 1));
		const prevDay = dailyBuckets.get(dayKey) || {
			revenue: 0,
			orders: 0
		};
		prevDay.revenue += rev;
		prevDay.orders += cnt;
		dailyBuckets.set(dayKey, prevDay);
		const monthKey = dayKey.slice(0, 7);
		const prevMonth = monthlyBuckets.get(monthKey) || {
			revenue: 0,
			profit: 0
		};
		prevMonth.revenue += rev;
		prevMonth.profit += rev - cogs - comm;
		monthlyBuckets.set(monthKey, prevMonth);
	}
	const dailySeries = Array.from(dailyBuckets.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-7).map(([label, vals]) => ({
		label: label.slice(5),
		...vals
	}));
	const monthlySeries = Array.from(monthlyBuckets.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([label, vals]) => ({
		label,
		...vals
	}));
	return {
		revenue,
		costOfGoods,
		grossProfit,
		commissionsPayable,
		netProfit,
		profitMarginPct,
		ordersCount: orders.length + manualOrdersTotal,
		completedOrdersCount: completedOrders.length + manualOrdersTotal,
		pendingOrdersCount: orders.filter((o) => o.status === "pending").length,
		dailySeries,
		monthlySeries
	};
}
"".replace(/\/$/, "");
// src/utils/fileSecurity.ts
var ALLOWED_EXTENSIONS = /* @__PURE__ */ new Set([
	"jpg",
	"jpeg",
	"png",
	"webp"
]);
var ALLOWED_MIME_TYPES = /* @__PURE__ */ new Set([
	"image/jpeg",
	"image/png",
	"image/webp"
]);
var MAX_BYTES = {
	avatars: 2097152,
	products: 5242880
};
var MAX_DIMENSION = {
	avatars: 768,
	products: 1400
};
function hasValidMagicBytes(bytes, mime) {
	if (bytes.length < 12) return false;
	if (mime === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
	if (mime === "image/png") return bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10;
	if (mime === "image/webp") {
		const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
		const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
		return riff === "RIFF" && webp === "WEBP";
	}
	return false;
}
/**
* Validates extension, MIME, and magic bytes, strips EXIF/metadata by
* decoding onto a clean HTML5 canvas, resizes large uploads, and outputs
* a sanitized File with a randomized UUID filename + safe DataURL fallback.
*/
async function processSecureImageUpload(file, folder) {
	const maxBytes = MAX_BYTES[folder];
	const ext = file.name.split(".").pop()?.toLowerCase() || "";
	if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error("Only .jpg, .jpeg, .png, and .webp image files are allowed.");
	if (!ALLOWED_MIME_TYPES.has(file.type)) throw new Error("Unsupported file MIME type. Use JPG, PNG, or WebP.");
	if (file.size <= 0 || file.size > maxBytes) {
		const limitMb = Math.round(maxBytes / 1048576);
		throw new Error(`Image must be ${limitMb} MB or smaller.`);
	}
	const headerBuf = await file.slice(0, 16).arrayBuffer();
	if (!hasValidMagicBytes(new Uint8Array(headerBuf), file.type)) throw new Error("File signature does not match a valid JPG, PNG, or WebP image.");
	const objectUrl = URL.createObjectURL(file);
	try {
		const img = await new Promise((resolve, reject) => {
			const el = new Image();
			el.onload = () => resolve(el);
			el.onerror = () => reject(/* @__PURE__ */ new Error("Image appears corrupted or unreadable."));
			el.src = objectUrl;
		});
		const maxDim = MAX_DIMENSION[folder];
		const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
		const width = Math.max(1, Math.round(img.naturalWidth * scale));
		const height = Math.max(1, Math.round(img.naturalHeight * scale));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Canvas image processing unavailable in this browser.");
		ctx.drawImage(img, 0, 0, width, height);
		const outputMime = "image/webp";
		const blob = await new Promise((resolve, reject) => {
			canvas.toBlob((b) => b ? resolve(b) : reject(/* @__PURE__ */ new Error("Could not re-encode sanitized image.")), outputMime, .86);
		});
		const randomName = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? `${crypto.randomUUID()}.webp` : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.webp`;
		return {
			sanitizedFile: new File([blob], randomName, { type: outputMime }),
			dataUrl: canvas.toDataURL(outputMime, .86)
		};
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}
// src/utils/security.ts
function stripControlChars(input) {
	let out = "";
	for (let i = 0; i < input.length; i++) {
		const code = input.charCodeAt(i);
		out += code < 32 || code === 127 ? " " : input[i];
	}
	return out;
}
function hasControlChars(input) {
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
function sanitizePlainText(input, maxLength = 500) {
	const raw = typeof input === "string" ? input : String(input ?? "");
	return stripControlChars(typeof window !== "undefined" ? DOMPurify.sanitize(raw, {
		ALLOWED_TAGS: [],
		ALLOWED_ATTR: []
	}) : raw.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim().slice(0, maxLength);
}
/**
* Prevent Open Redirect vulnerabilities:
* Only allow relative internal application paths starting with a single '/'.
*/
function sanitizeUrlPath(candidate, fallback = "/profile") {
	if (!candidate || typeof candidate !== "string") return fallback;
	const trimmed = candidate.trim();
	if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;
	if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/i.test(trimmed)) return fallback;
	if (hasControlChars(trimmed)) return fallback;
	return trimmed.slice(0, 200);
}
function validateSafeSlug(slug) {
	return slug.length >= 1 && slug.length <= 120 && /^[a-z0-9-]+$/.test(slug) && !slug.startsWith("-") && !slug.endsWith("-") && !slug.includes("--");
}
/**
* Mask sensitive phone numbers inside list tables (e.g. 0335••••722).
*/
function maskPhone(phone) {
	if (!phone) return "—";
	const clean = phone.trim();
	if (clean.length <= 6) return "••••";
	return `${clean.slice(0, 4)}••••${clean.slice(-3)}`;
}
function evaluatePasswordStrength(password) {
	const checks = {
		minLength: password.length >= 8,
		hasUpper: /[A-Z]/.test(password),
		hasLower: /[a-z]/.test(password),
		hasDigitOrSymbol: /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
	};
	const passed = Object.values(checks).filter(Boolean).length;
	return {
		score: passed,
		label: {
			0: "Too weak",
			1: "Weak",
			2: "Fair",
			3: "Good",
			4: "Strong"
		}[passed],
		checks
	};
}
function createIdempotencyKey(prefix = "ca") {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return `${prefix}-${crypto.randomUUID()}`;
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
var lastActionMap = /* @__PURE__ */ new Map();
function canTriggerAction(actionKey, cooldownMs = 800) {
	const now = Date.now();
	if (now - (lastActionMap.get(actionKey) || 0) < cooldownMs) return false;
	lastActionMap.set(actionKey, now);
	return true;
}
function isValidAdminHash(hash) {
	return hash.toLowerCase() === "#admin" || hash.toLowerCase().endsWith("#admin");
}
// src/lib/supabaseClient.js
var SUPABASE_URL = "https://wqbdpaxcmrrsxehcvdna.supabase.co".trim();
var SUPABASE_ANON_KEY = "sb_publishable__nqJ-wQOuLakzxthcYSEdw_rkI37k2u".trim();
var REQUEST_TIMEOUT_MS = 15e3;
/**
* Fetch wrapper with AbortController timeout so hung connections fail cleanly.
* Respects any caller-supplied AbortSignal as well.
*/
function fetchWithTimeout(input, init = {}) {
	const controller = new globalThis.AbortController();
	const timeoutId = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	const callerSignal = init.signal;
	if (callerSignal) {
		if (callerSignal.aborted) controller.abort();
		else callerSignal.addEventListener("abort", () => controller.abort(), { once: true });
	}
	return globalThis.fetch(input, {
		...init,
		signal: controller.signal
	}).finally(() => {
		globalThis.clearTimeout(timeoutId);
	});
}
var cachedClient = null;
function isSupabaseConfigured() {
	return Boolean(SUPABASE_ANON_KEY);
}
function getSupabase() {
	if (!cachedClient) cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: true
		},
		global: { fetch: fetchWithTimeout }
	});
	return cachedClient;
}
isSupabaseConfigured() && getSupabase();
// src/utils/supabaseMapping.ts
var DEFAULT_FALLBACK_IMAGE = "/src/assets/images/womens_unstitched_suit_1795333234539.jpg";
var CATEGORY_METADATA_BY_SLUG = new Map(SEED_CATEGORIES.map((c) => [c.slug, c]));
var CATEGORY_METADATA_BY_NAME = new Map(SEED_CATEGORIES.map((c) => [c.name.toLowerCase(), c]));
function buildProductSlug(title, id) {
	const base = slugify(title || "piece") || "piece";
	const idSuffix = slugify(id).slice(0, 8) || "item";
	return `${base.slice(0, 100)}-${idSuffix}`.replace(/-+/g, "-").replace(/(^-|-$)/g, "") || "piece";
}
function defaultSizesForCategory(categoryName) {
	const lower = categoryName.toLowerCase();
	if (lower.includes("unstitched")) return ["3-Piece Unstitched"];
	if (lower.includes("trouser")) return [
		"26",
		"28",
		"30",
		"32"
	];
	if (lower.includes("accessor")) return ["One Size"];
	return [
		"S",
		"M",
		"L",
		"XL"
	];
}
function mapDbCategory(row) {
	const name = sanitizePlainText(String(row.name || "Collection"), 80);
	const rawSlug = slugify(name) || "collection";
	const seedMatch = CATEGORY_METADATA_BY_NAME.get(name.toLowerCase()) || CATEGORY_METADATA_BY_SLUG.get(rawSlug);
	return {
		id: String(row.id),
		name,
		slug: seedMatch?.slug || rawSlug,
		description: seedMatch?.description || `${name} pieces crafted for Cinematic Arts (CA).`,
		image: seedMatch?.image || DEFAULT_FALLBACK_IMAGE
	};
}
function mapDbProduct(row, categoriesById) {
	const id = String(row.id);
	const title = sanitizePlainText(String(row.title || "Atelier Piece"), 120);
	const categoryId = String(row.category_id || "");
	const joinedCat = row.categories;
	const categoryName = sanitizePlainText(joinedCat?.name || categoriesById?.get(categoryId) || "Collection", 60);
	const coverImage = row.cover_image ? String(row.cover_image) : DEFAULT_FALLBACK_IMAGE;
	const extraImages = (Array.isArray(row.images) ? row.images.filter((u) => typeof u === "string" && u.trim().length > 0) : []).filter((u) => u !== coverImage);
	const rawCosts = row.product_costs;
	let costPrice;
	if (Array.isArray(rawCosts) && rawCosts.length > 0) {
		const first = rawCosts[0];
		if (first && first.cost_price !== void 0 && first.cost_price !== null) costPrice = Number(first.cost_price);
	} else if (rawCosts && typeof rawCosts === "object") {
		const obj = rawCosts;
		if (obj.cost_price !== void 0 && obj.cost_price !== null) costPrice = Number(obj.cost_price);
	}
	return {
		id,
		slug: row.slug ? String(row.slug) : buildProductSlug(title, id),
		title,
		description: sanitizePlainText(String(row.description || ""), 1200),
		price: Number(row.price || 0),
		costPrice,
		categoryId,
		categoryName,
		coverImage,
		extraImages,
		sizes: defaultSizesForCategory(categoryName),
		inStock: row.is_active !== false,
		featured: row.is_active !== false,
		createdAt: String(row.created_at || (/* @__PURE__ */ new Date()).toISOString())
	};
}
function mapDbPlan(row) {
	const months = Math.max(1, Math.round(Number(row.months || 2)));
	return {
		id: `plan-${months}m`,
		label: `${months} Months`,
		months,
		advancePercent: Number(row.advance_percent ?? 0),
		markupPercent: Number(row.markup_percent ?? 0),
		active: row.is_active !== false
	};
}
function parsePlanMonths(planId) {
	if (!planId) return null;
	const match = /(\d+)/.exec(planId);
	if (!match) return null;
	const num = Number(match[1]);
	return Number.isFinite(num) && num >= 1 ? num : null;
}
function mapDbProfile(row) {
	const mappedRole = String(row.role || "user").toLowerCase() === "seller" ? "seller" : "user";
	const sellerCode = row.seller_code ? sanitizePlainText(String(row.seller_code), 20) : void 0;
	return {
		id: String(row.id),
		role: mappedRole,
		name: sanitizePlainText(String(row.full_name || row.name || row.email || "Member"), 80),
		email: sanitizePlainText(String(row.email || ""), 120),
		phone: row.phone ? sanitizePlainText(String(row.phone), 24) : void 0,
		whatsapp: row.whatsapp ? sanitizePlainText(String(row.whatsapp), 24) : void 0,
		address: row.address ? sanitizePlainText(String(row.address), 200) : void 0,
		city: row.city ? sanitizePlainText(String(row.city), 60) : "Peshawar",
		postalCode: row.postal_code ? sanitizePlainText(String(row.postal_code), 16) : void 0,
		fatherName: row.father_name ? sanitizePlainText(String(row.father_name), 80) : void 0,
		avatarUrl: row.avatar_url ? String(row.avatar_url) : void 0,
		sellerCode,
		isActiveSeller: mappedRole === "seller" && Boolean(sellerCode),
		createdAt: String(row.created_at || (/* @__PURE__ */ new Date()).toISOString())
	};
}
function mapDbOrder(row) {
	const payMethod = row.pay_method === "installment" ? "installments" : "cod";
	const planMonths = row.plan_months ? Number(row.plan_months) : void 0;
	const sortedPayments = [...Array.isArray(row.installment_payments) ? row.installment_payments : []].sort((a, b) => Number(a.due_no ?? 0) - Number(b.due_no ?? 0));
	const advanceRow = sortedPayments.find((p) => Number(p.due_no) === 0);
	const installmentSchedule = sortedPayments.filter((p) => Number(p.due_no) > 0).map((p) => ({
		installmentNumber: Number(p.due_no),
		dueDate: String(p.due_date || "").slice(0, 10),
		amount: Number(p.amount || 0),
		paid: Boolean(p.is_paid),
		paidAt: p.paid_at ? String(p.paid_at) : null
	}));
	const rawCommissions = row.commissions;
	let commissionAmount = 0;
	let commissionCredited = false;
	if (Array.isArray(rawCommissions) && rawCommissions.length > 0) {
		const first = rawCommissions[0];
		commissionAmount = Number(first.amount || 0);
		commissionCredited = true;
	} else if (rawCommissions && typeof rawCommissions === "object") {
		const obj = rawCommissions;
		if (obj.amount !== void 0) {
			commissionAmount = Number(obj.amount || 0);
			commissionCredited = true;
		}
	}
	const totalAmount = Number(row.total_amount ?? row.subtotal ?? 0);
	const sellerId = row.seller_id ? String(row.seller_id) : void 0;
	if (commissionAmount === 0 && sellerId && totalAmount > 0) commissionAmount = calculateCommission(totalAmount);
	const status = String(row.status || "pending");
	if (status === "complete" && sellerId && commissionAmount > 0) commissionCredited = true;
	const joinedProduct = row.products;
	const itemImage = joinedProduct?.cover_image ? String(joinedProduct.cover_image) : DEFAULT_FALLBACK_IMAGE;
	return {
		id: String(row.id),
		userId: String(row.user_id || "guest"),
		customerName: sanitizePlainText(String(row.customer_name || ""), 80),
		phone: sanitizePlainText(String(row.phone || ""), 24),
		whatsapp: sanitizePlainText(String(row.whatsapp || ""), 24),
		address: sanitizePlainText(String(row.address || ""), 200),
		city: sanitizePlainText(String(row.city || "Peshawar"), 60),
		postalCode: sanitizePlainText(String(row.postal_code || ""), 16),
		notes: sanitizePlainText(String(row.notes || ""), 300),
		items: [{
			productId: String(row.product_id || ""),
			title: sanitizePlainText(String(row.product_title || "Atelier Piece"), 120),
			unitPrice: Number(row.unit_price || 0),
			quantity: Math.max(1, Number(row.quantity || 1)),
			selectedSize: row.size ? sanitizePlainText(String(row.size), 40) : void 0,
			image: itemImage
		}],
		paymentMethod: payMethod,
		planId: planMonths ? `plan-${planMonths}m` : void 0,
		planLabel: planMonths ? `${planMonths} Months` : void 0,
		advanceAmount: Number(row.advance_amount || 0),
		advancePaid: advanceRow ? Boolean(advanceRow.is_paid) : status === "complete",
		monthlyAmount: Number(row.monthly_amount || 0),
		totalAmount,
		installmentSchedule,
		referralCode: row.referral_code ? sanitizePlainText(String(row.referral_code), 20) : void 0,
		referralSellerId: sellerId,
		commissionAmount,
		commissionCredited,
		status,
		createdAt: String(row.created_at || (/* @__PURE__ */ new Date()).toISOString())
	};
}
function mapDbNotification(row, currentUserId) {
	const title = sanitizePlainText(String(row.title || "Notification"), 120);
	const body = sanitizePlainText(String(row.body ?? row.message ?? ""), 800);
	const reads = Array.isArray(row.notification_reads) ? row.notification_reads : [];
	const isRead = currentUserId ? reads.some((r) => String(r.user_id) === currentUserId) : false;
	const lowerTitle = title.toLowerCase();
	let kind = row.user_id ? "order" : "broadcast";
	if (lowerTitle.includes("reply") || lowerTitle.includes("support") || lowerTitle.includes("feedback")) kind = "feedback_reply";
	else if (lowerTitle.includes("commission")) kind = "commission";
	else if (lowerTitle.includes("order")) kind = "order";
	return {
		id: String(row.id),
		userId: row.user_id ? String(row.user_id) : null,
		title,
		message: body,
		kind,
		read: isRead,
		createdAt: String(row.created_at || (/* @__PURE__ */ new Date()).toISOString())
	};
}
function mapDbFeedbackThread(row, profileLookup) {
	const userId = String(row.user_id || "");
	const profile = profileLookup?.get(userId);
	const sortedMsgs = [...Array.isArray(row.feedback_messages) ? row.feedback_messages : []].sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
	const userName = sanitizePlainText(profile?.name || "Customer", 80);
	const userEmail = sanitizePlainText(profile?.email || "", 120);
	const messages = sortedMsgs.map((m) => {
		const isAdmin = Boolean(m.from_admin);
		return {
			id: String(m.id),
			senderRole: isAdmin ? "admin" : "user",
			senderName: isAdmin ? "CA Support" : userName,
			body: sanitizePlainText(String(m.body || ""), 800),
			createdAt: String(m.created_at || row.created_at || (/* @__PURE__ */ new Date()).toISOString())
		};
	});
	const status = messages[messages.length - 1]?.senderRole === "admin" ? "replied" : "open";
	const updatedAt = sortedMsgs[sortedMsgs.length - 1]?.created_at ? String(sortedMsgs[sortedMsgs.length - 1].created_at) : String(row.created_at || (/* @__PURE__ */ new Date()).toISOString());
	return {
		id: String(row.id),
		userId,
		userName,
		userEmail,
		subject: sanitizePlainText(String(row.subject || "Support Inquiry"), 120),
		status,
		messages,
		updatedAt
	};
}
function deriveItemIdempotencyKey(baseKey, index, total) {
	const cleanBase = sanitizePlainText(baseKey || "", 80) || `ord-${Date.now()}`;
	return total <= 1 ? cleanBase : `${cleanBase}-${index + 1}`;
}
function toFriendlySupabaseError(err, fallback) {
	const referenceId = createErrorReferenceId("CA");
	if (!err) return new AppError({
		message: fallback,
		status: 500,
		kind: "server",
		referenceId
	});
	const statusVal = typeof err === "object" && err !== null && "status" in err ? Number(err.status || 0) : 0;
	const raw = err instanceof Error ? err.message : typeof err === "object" && err !== null && "message" in err ? String(err.message || fallback) : String(err);
	const lower = raw.toLowerCase();
	if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("load failed")) return new AppError({
		message: "You appear to be offline or unable to reach the server. Check your connection and retry.",
		status: 0,
		kind: "offline",
		referenceId
	});
	if (lower.includes("aborterror") || lower.includes("aborted") || lower.includes("timeout") || lower.includes("timed out")) return new AppError({
		message: "Request timed out. Please check your connection and try again.",
		status: 408,
		kind: "timeout",
		referenceId
	});
	if (statusVal >= 500 || lower.includes("internal server error") || lower.includes("bad gateway") || lower.includes("service unavailable")) return new AppError({
		message: "Service temporarily unavailable. Please try again in a moment.",
		status: statusVal >= 500 ? statusVal : 500,
		kind: "server",
		referenceId
	});
	if (lower.includes("invalid login credentials")) return new AppError({
		message: "Incorrect email or password.",
		status: 401,
		kind: "auth",
		referenceId,
		retryable: false
	});
	if (lower.includes("email not confirmed")) return new AppError({
		message: "Please confirm your email address before signing in.",
		status: 401,
		kind: "auth",
		referenceId,
		retryable: false
	});
	if (lower.includes("user already registered") || lower.includes("already exists")) return new AppError({
		message: "An account with this email already exists. Please sign in instead.",
		status: 409,
		kind: "validation",
		referenceId,
		retryable: false
	});
	if (lower.includes("permission denied") || lower.includes("row-level security")) return new AppError({
		message: "You do not have permission to perform this action. Please sign in with the right account.",
		status: 403,
		kind: "auth",
		referenceId,
		retryable: false
	});
	if (lower.includes("self-referral") || lower.includes("own referral")) return new AppError({
		message: "You cannot use your own Seller Referral ID on your own order.",
		status: 400,
		kind: "validation",
		referenceId,
		retryable: false
	});
	if (lower.includes("referral")) return new AppError({
		message: "Seller Referral ID is invalid or inactive.",
		status: 400,
		kind: "validation",
		referenceId,
		retryable: false
	});
	if (lower.includes("rate limit") || lower.includes("too many requests")) return new AppError({
		message: "Too many attempts. Please wait a moment and try again.",
		status: 429,
		kind: "rate_limit",
		referenceId,
		retryable: true
	});
	return new AppError({
		message: sanitizePlainText(raw, 240) || fallback,
		status: statusVal || 400,
		kind: statusVal >= 500 ? "server" : "validation",
		referenceId,
		retryable: statusVal >= 500 || statusVal === 0
	});
}
// src/api/supabaseAdapter.js
var pendingAvatarFile = null;
var pendingAvatarObjectUrl = null;
function clearPendingAvatar() {
	pendingAvatarFile = null;
	if (pendingAvatarObjectUrl && typeof globalThis.URL !== "undefined") globalThis.URL.revokeObjectURL(pendingAvatarObjectUrl);
	pendingAvatarObjectUrl = null;
}
async function flushPendingAvatarUpload(sb, userId) {
	if (!pendingAvatarFile || !userId) return null;
	const fileToUpload = pendingAvatarFile;
	const path = `${userId}/${fileToUpload.name}`;
	const { error: upErr } = await sb.storage.from("avatars").upload(path, fileToUpload, {
		upsert: true,
		contentType: fileToUpload.type
	});
	if (upErr) throw toFriendlySupabaseError(upErr, "Could not upload profile portrait.");
	const { data } = sb.storage.from("avatars").getPublicUrl(path);
	const publicUrl = data?.publicUrl || null;
	if (publicUrl) await sb.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
	clearPendingAvatar();
	return publicUrl;
}
async function fetchProfileRow(sb, userId) {
	const { data, error } = await sb.from("profiles").select("id,email,full_name,role,seller_code,phone,whatsapp,address,postal_code,father_name,avatar_url,created_at").eq("id", userId).maybeSingle();
	if (error) throw toFriendlySupabaseError(error, "Could not load user profile.");
	return data;
}
async function requireAuthUser(sb) {
	const { data, error } = await sb.auth.getUser();
	if (error || !data?.user) throw new Error("Please sign in to continue.");
	return data.user;
}
async function requireAdminUser(sb) {
	const user = await requireAuthUser(sb);
	const profile = await fetchProfileRow(sb, user.id);
	if (!profile || String(profile.role).toLowerCase() !== "admin") throw new Error("Admin privileges required.");
	return {
		user,
		profile
	};
}
function subscribeToUserRealtime$1(userId, onChange) {
	if (!isSupabaseConfigured() || !userId) return () => {};
	try {
		const sb = getSupabase();
		const channel = sb.channel(`ca-user-${userId}`).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "notifications",
			filter: `user_id=eq.${userId}`
		}, () => onChange()).on("postgres_changes", {
			event: "INSERT",
			schema: "public",
			table: "notifications",
			filter: "user_id=is.null"
		}, () => onChange()).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "orders",
			filter: `user_id=eq.${userId}`
		}, () => onChange()).subscribe();
		return () => {
			sb.removeChannel(channel);
		};
	} catch {
		return () => {};
	}
}
// src/api/adapters/supabaseAdapter.ts
var supabaseAdapter = {
	mode: "supabase",
	authService: {
		async getSession() {
			const sb = getSupabase();
			const { data, error } = await sb.auth.getSession();
			if (error || !data.session) return null;
			const userId = data.session.user.id;
			let profile = await fetchProfileRow(sb, userId);
			if (pendingAvatarFile) try {
				await flushPendingAvatarUpload(sb, userId);
				profile = await fetchProfileRow(sb, userId);
			} catch {}
			if (!profile) {
				const meta = data.session.user.user_metadata || {};
				return {
					user: mapDbProfile({
						id: userId,
						email: data.session.user.email || "",
						full_name: meta.full_name || meta.name || data.session.user.email || "Member",
						role: meta.role || "user",
						seller_code: meta.seller_code || null
					}),
					token: data.session.access_token
				};
			}
			return {
				user: mapDbProfile(profile),
				token: data.session.access_token
			};
		},
		async login(payload) {
			if (payload.honeypot && payload.honeypot.trim().length > 0) throw new Error("Request blocked by spam verification.");
			const sb = getSupabase();
			const { data, error } = await sb.auth.signInWithPassword({
				email: payload.email.trim().toLowerCase(),
				password: payload.password
			});
			if (error || !data.session || !data.user) throw toFriendlySupabaseError(error, "Sign in failed.");
			if (pendingAvatarFile) try {
				await flushPendingAvatarUpload(sb, data.user.id);
			} catch {}
			const profile = await fetchProfileRow(sb, data.user.id);
			if (!profile) throw new Error("Profile record not found for this account.");
			return {
				user: mapDbProfile(profile),
				token: data.session.access_token
			};
		},
		async signup(payload) {
			if (payload.honeypot && payload.honeypot.trim().length > 0) throw new Error("Request blocked by spam verification.");
			const sb = getSupabase();
			const cleanEmail = payload.email.trim().toLowerCase();
			const cleanName = sanitizePlainText(payload.name, 80);
			const isSeller = payload.role === "seller";
			const fallbackSellerCode = isSeller ? generateSellerId("CA") : null;
			const userMeta = {
				role: payload.role,
				full_name: cleanName,
				name: cleanName,
				phone: isSeller ? sanitizePlainText(payload.phone, 24) : null,
				whatsapp: isSeller ? sanitizePlainText(payload.whatsapp, 24) : null,
				address: isSeller ? sanitizePlainText(payload.address, 200) : null,
				postal_code: isSeller ? sanitizePlainText(payload.postalCode, 16) : null,
				father_name: isSeller ? sanitizePlainText(payload.fatherName, 80) : null,
				seller_code: fallbackSellerCode
			};
			const { data, error } = await sb.auth.signUp({
				email: cleanEmail,
				password: payload.password,
				options: {
					data: userMeta,
					emailRedirectTo: typeof globalThis.window !== "undefined" ? `${globalThis.window.location.origin}/auth` : void 0
				}
			});
			if (error || !data.user) throw toFriendlySupabaseError(error, "Could not create account.");
			if (!data.session) return {
				user: mapDbProfile({
					id: data.user.id,
					email: cleanEmail,
					full_name: cleanName,
					role: payload.role,
					seller_code: void 0
				}),
				token: "",
				emailConfirmationRequired: true
			};
			let uploadedAvatarUrl = null;
			if (pendingAvatarFile) try {
				uploadedAvatarUrl = await flushPendingAvatarUpload(sb, data.user.id);
			} catch {
				uploadedAvatarUrl = null;
			}
			else if (isSeller && payload.avatarUrl && !payload.avatarUrl.startsWith("blob:")) uploadedAvatarUrl = payload.avatarUrl;
			const existing = await fetchProfileRow(sb, data.user.id);
			const profilePatch = {
				id: data.user.id,
				email: cleanEmail,
				full_name: cleanName,
				role: existing?.role || payload.role,
				seller_code: existing?.seller_code || fallbackSellerCode,
				phone: isSeller ? sanitizePlainText(payload.phone, 24) : existing?.phone ?? null,
				whatsapp: isSeller ? sanitizePlainText(payload.whatsapp, 24) : existing?.whatsapp ?? null,
				address: isSeller ? sanitizePlainText(payload.address, 200) : existing?.address ?? null,
				postal_code: isSeller ? sanitizePlainText(payload.postalCode, 16) : existing?.postal_code ?? null,
				father_name: isSeller ? sanitizePlainText(payload.fatherName, 80) : existing?.father_name ?? null,
				avatar_url: uploadedAvatarUrl || existing?.avatar_url || null
			};
			const { data: savedProfile, error: profErr } = await sb.from("profiles").upsert(profilePatch, { onConflict: "id" }).select("id,email,full_name,role,seller_code,phone,whatsapp,address,postal_code,father_name,avatar_url,created_at").single();
			if (profErr || !savedProfile) throw toFriendlySupabaseError(profErr, "Could not save user profile.");
			return {
				user: mapDbProfile(savedProfile),
				token: data.session.access_token,
				emailConfirmationRequired: false
			};
		},
		async requestPasswordReset(email) {
			const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: typeof globalThis.window !== "undefined" ? `${globalThis.window.location.origin}/auth` : void 0 });
			if (error) throw toFriendlySupabaseError(error, "Password reset failed.");
			return { message: "If an account matches that address, reset instructions were dispatched." };
		},
		async logout() {
			const sb = getSupabase();
			clearPendingAvatar();
			await sb.auth.signOut();
		}
	},
	productService: {
		async listProducts(params) {
			let query = getSupabase().from("products").select("id,category_id,title,description,price,cover_image,images,is_active,created_at,categories(name)").eq("is_active", true);
			if (params?.categoryId && params.categoryId !== "all") query = query.eq("category_id", params.categoryId);
			if (params?.search) {
				const cleanSearch = sanitizePlainText(params.search, 80).replace(/[%_,]/g, "");
				if (cleanSearch) query = query.ilike("title", `%${cleanSearch}%`);
			}
			if (params?.sort === "price_asc") query = query.order("price", { ascending: true });
			else if (params?.sort === "price_desc") query = query.order("price", { ascending: false });
			else query = query.order("created_at", { ascending: false });
			if (params?.page && params?.limit) {
				const from = Math.max(0, (params.page - 1) * params.limit);
				query = query.range(from, from + params.limit - 1);
			}
			const { data, error } = await query;
			if (error) throw toFriendlySupabaseError(error, "Could not load products.");
			return (data || []).map((row) => mapDbProduct(row));
		},
		async getProductBySlug(slug) {
			if (!validateSafeSlug(slug)) return null;
			const { data, error } = await getSupabase().from("products").select("id,category_id,title,description,price,cover_image,images,is_active,created_at,categories(name)").eq("is_active", true);
			if (error) throw toFriendlySupabaseError(error, "Could not load product details.");
			return (data || []).map((row) => mapDbProduct(row)).find((p) => p.slug === slug || p.id === slug) || null;
		},
		async listCategories() {
			const { data, error } = await getSupabase().from("categories").select("id,name,created_at").order("name", { ascending: true });
			if (error) throw toFriendlySupabaseError(error, "Could not load categories.");
			return (data || []).map((row) => mapDbCategory(row));
		},
		async listInstallmentPlans() {
			const { data, error } = await getSupabase().from("plans").select("months,markup_percent,advance_percent,is_active").eq("is_active", true).order("months", { ascending: true });
			if (error) throw toFriendlySupabaseError(error, "Could not load installment plans.");
			return (data || []).map((row) => mapDbPlan(row));
		},
		async getTermsPolicy() {
			return { ...DEFAULT_TERMS_POLICY };
		}
	},
	orderService: {
		async validateSellerReferral(code) {
			const clean = sanitizePlainText(code, 20).toUpperCase();
			if (!/^CA-[A-Z0-9]{4,12}$/.test(clean)) return { valid: false };
			const { data, error } = await getSupabase().rpc("check_referral", { p_code: clean });
			if (error) return { valid: false };
			return { valid: Boolean(data) };
		},
		async createOrder(payload) {
			if (payload.honeypot && payload.honeypot.trim().length > 0) throw new Error("Request blocked by spam verification.");
			if (!payload.items || payload.items.length === 0) throw new Error("Select at least one product before placing an order.");
			const sb = getSupabase();
			const payMethod = payload.paymentMethod === "installments" ? "installment" : "cash";
			const planMonths = payMethod === "installment" ? parsePlanMonths(payload.planId) : null;
			const referralCode = payload.referralCode?.trim() ? sanitizePlainText(payload.referralCode, 20).toUpperCase() : null;
			if (payMethod === "installment" && !referralCode) throw new Error("Installment orders require an active CA Seller Referral ID.");
			const createdOrderIds = [];
			for (let i = 0; i < payload.items.length; i += 1) {
				const item = payload.items[i];
				const idemKey = deriveItemIdempotencyKey(payload.idempotencyKey, i, payload.items.length);
				const { data: orderId, error } = await sb.rpc("place_order", {
					p_product_id: item.productId,
					p_qty: Math.max(1, Math.floor(item.quantity)),
					p_size: sanitizePlainText(item.selectedSize || "Standard", 40),
					p_pay: payMethod,
					p_months: planMonths,
					p_referral: referralCode,
					p_name: sanitizePlainText(payload.customerName, 80),
					p_phone: sanitizePlainText(payload.phone, 24),
					p_whatsapp: sanitizePlainText(payload.whatsapp, 24),
					p_address: sanitizePlainText(payload.address, 200),
					p_city: sanitizePlainText(payload.city, 60),
					p_postal: sanitizePlainText(payload.postalCode, 16),
					p_notes: sanitizePlainText(payload.notes || "", 300),
					p_idem: idemKey
				});
				if (error || !orderId) throw toFriendlySupabaseError(error, "Could not place order.");
				createdOrderIds.push(String(orderId));
			}
			const primaryId = createdOrderIds[0];
			const { data: row, error: fetchErr } = await sb.from("orders").select("*,installment_payments(*),commissions(*),products(cover_image)").eq("id", primaryId).maybeSingle();
			if (fetchErr || !row) return {
				id: primaryId,
				userId: "current",
				customerName: sanitizePlainText(payload.customerName, 80),
				phone: sanitizePlainText(payload.phone, 24),
				whatsapp: sanitizePlainText(payload.whatsapp, 24),
				address: sanitizePlainText(payload.address, 200),
				city: sanitizePlainText(payload.city, 60),
				postalCode: sanitizePlainText(payload.postalCode, 16),
				notes: sanitizePlainText(payload.notes || "", 300),
				items: payload.items,
				paymentMethod: payload.paymentMethod,
				planId: payload.planId,
				planLabel: planMonths ? `${planMonths} Months` : void 0,
				advanceAmount: 0,
				advancePaid: false,
				monthlyAmount: 0,
				totalAmount: 0,
				installmentSchedule: [],
				referralCode: referralCode || void 0,
				commissionAmount: 0,
				commissionCredited: false,
				status: "pending",
				createdAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			return mapDbOrder(row);
		},
		async listMyOrders() {
			const sb = getSupabase();
			const { data: userData } = await sb.auth.getUser();
			if (!userData?.user) return [];
			const { data, error } = await sb.from("orders").select("*,installment_payments(*),commissions(*),products(cover_image)").eq("user_id", userData.user.id).order("created_at", { ascending: false });
			if (error) throw toFriendlySupabaseError(error, "Could not load your orders.");
			return (data || []).map((row) => mapDbOrder(row));
		}
	},
	userService: {
		async updateProfile(patch) {
			const sb = getSupabase();
			const user = await requireAuthUser(sb);
			let nextAvatarUrl = patch.avatarUrl;
			if (pendingAvatarFile) nextAvatarUrl = await flushPendingAvatarUpload(sb, user.id);
			const updateBody = {};
			if (patch.name !== void 0) updateBody.full_name = sanitizePlainText(patch.name, 80);
			if (patch.phone !== void 0) updateBody.phone = sanitizePlainText(patch.phone, 24);
			if (patch.whatsapp !== void 0) updateBody.whatsapp = sanitizePlainText(patch.whatsapp, 24);
			if (patch.address !== void 0) updateBody.address = sanitizePlainText(patch.address, 200);
			if (patch.postalCode !== void 0) updateBody.postal_code = sanitizePlainText(patch.postalCode, 16);
			if (nextAvatarUrl !== void 0 && !String(nextAvatarUrl).startsWith("blob:")) updateBody.avatar_url = nextAvatarUrl;
			const { data, error } = await sb.from("profiles").update(updateBody).eq("id", user.id).select("id,email,full_name,role,seller_code,phone,whatsapp,address,postal_code,father_name,avatar_url,created_at").single();
			if (error || !data) throw toFriendlySupabaseError(error, "Could not update profile.");
			return mapDbProfile(data);
		},
		async deleteAccount(confirmationEmail) {
			const sb = getSupabase();
			const user = await requireAuthUser(sb);
			const expected = String(user.email || "").trim().toLowerCase();
			if (!expected || confirmationEmail.trim().toLowerCase() !== expected) throw new Error("Confirmation email does not match your account email.");
			const { error } = await sb.rpc("delete_my_account");
			if (error) throw toFriendlySupabaseError(error, "Could not delete account.");
			clearPendingAvatar();
			await sb.auth.signOut();
		},
		async getSellerDashboard() {
			const sb = getSupabase();
			const user = await requireAuthUser(sb);
			const profile = await fetchProfileRow(sb, user.id);
			if (!profile || profile.role !== "seller" || !profile.seller_code) throw new Error("Seller account required.");
			const [{ data: rpcRows, error: rpcErr }, { data: ownOrdersData }] = await Promise.all([sb.rpc("get_seller_referrals"), sb.from("orders").select("*,installment_payments(*),commissions(*),products(cover_image)").eq("user_id", user.id).eq("pay_method", "installment").order("created_at", { ascending: false })]);
			if (rpcErr) throw toFriendlySupabaseError(rpcErr, "Could not load seller referral ledger.");
			const referredOrders = (Array.isArray(rpcRows) ? rpcRows : []).map((r) => mapDbOrder({
				...r,
				id: r.order_id || r.id,
				pay_method: r.pay_method || "cash",
				seller_id: r.seller_id || user.id,
				customer_name: r.customer_name || "Referred Customer",
				total_amount: r.total_amount ?? r.order_total ?? 0,
				commissions: r.commission_amount !== void 0 ? [{ amount: r.commission_amount }] : r.commissions
			}));
			let commissionEarned = 0;
			let pendingCommission = 0;
			let totalFinanced = 0;
			let totalRecovered = 0;
			const monthBuckets = /* @__PURE__ */ new Map();
			for (const ord of referredOrders) {
				const comm = ord.commissionAmount || calculateCommission(ord.totalAmount);
				if (ord.status === "complete") {
					commissionEarned += comm;
					const monthKey = ord.createdAt.slice(0, 7);
					const prev = monthBuckets.get(monthKey) || {
						month: monthKey,
						commission: 0,
						orders: 0
					};
					prev.commission += comm;
					prev.orders += 1;
					monthBuckets.set(monthKey, prev);
				} else if (ord.status === "pending" || ord.status === "proceeding") pendingCommission += comm;
				if (ord.paymentMethod === "installments") {
					const sum = calculateOrderPaidSummary(ord);
					totalFinanced += ord.totalAmount;
					totalRecovered += sum.paidAmount;
				}
			}
			const monthlyEarnings = Array.from(monthBuckets.values()).sort((a, b) => a.month.localeCompare(b.month));
			return {
				sellerCode: String(profile.seller_code),
				totalReferrals: referredOrders.length,
				completedReferrals: referredOrders.filter((o) => o.status === "complete").length,
				commissionEarned,
				pendingCommission,
				referredOrders,
				recoverySummary: {
					totalFinanced,
					totalRecovered,
					totalRemaining: Math.max(0, totalFinanced - totalRecovered)
				},
				ownInstallmentOrders: (ownOrdersData || []).map((row) => mapDbOrder(row)),
				monthlyEarnings
			};
		}
	},
	notificationService: {
		async listNotifications() {
			const sb = getSupabase();
			const { data: userData } = await sb.auth.getUser();
			const userId = userData?.user?.id;
			if (!userId) return [];
			const { data, error } = await sb.from("notifications").select("id,user_id,title,body,created_at,notification_reads(user_id)").order("created_at", { ascending: false });
			if (error) throw toFriendlySupabaseError(error, "Could not load notifications.");
			return (data || []).map((row) => mapDbNotification(row, userId));
		},
		async markAsRead(id) {
			const sb = getSupabase();
			const user = await requireAuthUser(sb);
			const { error } = await sb.from("notification_reads").upsert({
				notification_id: id,
				user_id: user.id
			}, {
				onConflict: "notification_id,user_id",
				ignoreDuplicates: true
			});
			if (error) throw toFriendlySupabaseError(error, "Could not mark notification as read.");
		},
		async markAllRead() {
			const sb = getSupabase();
			const user = await requireAuthUser(sb);
			const unreadIds = (await this.listNotifications()).filter((n) => !n.read).map((n) => n.id);
			if (unreadIds.length === 0) return;
			const rows = unreadIds.map((notifId) => ({
				notification_id: notifId,
				user_id: user.id
			}));
			const { error } = await sb.from("notification_reads").upsert(rows, {
				onConflict: "notification_id,user_id",
				ignoreDuplicates: true
			});
			if (error) throw toFriendlySupabaseError(error, "Could not mark notifications read.");
		}
	},
	feedbackService: {
		async listMyThreads() {
			const sb = getSupabase();
			const user = await requireAuthUser(sb);
			const profile = await fetchProfileRow(sb, user.id);
			const lookup = /* @__PURE__ */ new Map([[user.id, {
				name: String(profile?.full_name || user.email || "Customer"),
				email: String(profile?.email || user.email || "")
			}]]);
			const { data, error } = await sb.from("feedback").select("id,user_id,kind,subject,created_at,feedback_messages(*)").eq("user_id", user.id).order("created_at", { ascending: false });
			if (error) throw toFriendlySupabaseError(error, "Could not load support threads.");
			return (data || []).map((row) => mapDbFeedbackThread(row, lookup));
		},
		async createThread(subject, message) {
			const sb = getSupabase();
			const user = await requireAuthUser(sb);
			const profile = await fetchProfileRow(sb, user.id);
			const { data: fbRow, error: fbErr } = await sb.from("feedback").insert({
				user_id: user.id,
				kind: "feedback",
				subject: sanitizePlainText(subject, 120)
			}).select("id,user_id,kind,subject,created_at").single();
			if (fbErr || !fbRow) throw toFriendlySupabaseError(fbErr, "Could not create feedback thread.");
			const { error: msgErr } = await sb.from("feedback_messages").insert({
				feedback_id: fbRow.id,
				sender_id: user.id,
				from_admin: false,
				body: sanitizePlainText(message, 800)
			});
			if (msgErr) throw toFriendlySupabaseError(msgErr, "Could not send message.");
			const { data: fullRow, error: fetchErr } = await sb.from("feedback").select("id,user_id,kind,subject,created_at,feedback_messages(*)").eq("id", fbRow.id).single();
			if (fetchErr || !fullRow) throw toFriendlySupabaseError(fetchErr, "Message sent, but thread reload failed.");
			return mapDbFeedbackThread(fullRow, /* @__PURE__ */ new Map([[user.id, {
				name: String(profile?.full_name || user.email || "Customer"),
				email: String(profile?.email || user.email || "")
			}]]));
		},
		async replyToThread(threadId, body) {
			const sb = getSupabase();
			const user = await requireAuthUser(sb);
			const profile = await fetchProfileRow(sb, user.id);
			const { error: msgErr } = await sb.from("feedback_messages").insert({
				feedback_id: threadId,
				sender_id: user.id,
				from_admin: false,
				body: sanitizePlainText(body, 800)
			});
			if (msgErr) throw toFriendlySupabaseError(msgErr, "Could not send reply.");
			const { data: fullRow, error: fetchErr } = await sb.from("feedback").select("id,user_id,kind,subject,created_at,feedback_messages(*)").eq("id", threadId).single();
			if (fetchErr || !fullRow) throw toFriendlySupabaseError(fetchErr, "Could not reload thread.");
			return mapDbFeedbackThread(fullRow, /* @__PURE__ */ new Map([[user.id, {
				name: String(profile?.full_name || user.email || "Customer"),
				email: String(profile?.email || user.email || "")
			}]]));
		}
	},
	adminService: {
		async getAuthStatus() {
			return { configured: true };
		},
		async setupInitialPassword() {
			throw new Error("Admin accounts use Supabase Auth with profiles.role = admin.");
		},
		async verifyAdminPassword(password, email) {
			const sb = getSupabase();
			let targetEmail = email ? email.trim().toLowerCase() : "";
			if (!targetEmail) {
				const { data: cur } = await sb.auth.getUser();
				targetEmail = cur?.user?.email ? String(cur.user.email).trim().toLowerCase() : "";
			}
			if (!targetEmail) throw new Error("Enter your admin email and password.");
			const { data, error } = await sb.auth.signInWithPassword({
				email: targetEmail,
				password
			});
			if (error || !data.session || !data.user) throw toFriendlySupabaseError(error, "Admin verification failed.");
			const profile = await fetchProfileRow(sb, data.user.id);
			if (!profile || String(profile.role).toLowerCase() !== "admin") {
				await sb.auth.signOut();
				throw new Error("Access denied: this account does not have admin privileges.");
			}
			return { token: data.session.access_token };
		},
		async getOverview(_adminToken) {
			const sb = getSupabase();
			await requireAdminUser(sb);
			const [{ data: statsData }, orders, products] = await Promise.all([
				sb.rpc("admin_stats"),
				this.listAllOrders(_adminToken),
				this.listAdminProducts(_adminToken)
			]);
			const analytics = calculateAdminAnalytics(orders, products, []);
			if (statsData && typeof statsData === "object") {
				const s = Array.isArray(statsData) ? statsData[0] : statsData;
				if (s && typeof s === "object") {
					const rev = Number(s.revenue ?? s.total_revenue ?? analytics.revenue);
					const cogs = Number(s.cost_of_goods ?? s.cogs ?? analytics.costOfGoods);
					const comm = Number(s.commissions_payable ?? s.commissions ?? analytics.commissionsPayable);
					const gross = Number(s.gross_profit ?? rev - cogs);
					const net = Number(s.net_profit ?? gross - comm);
					return {
						...analytics,
						revenue: Number.isFinite(rev) ? rev : analytics.revenue,
						costOfGoods: Number.isFinite(cogs) ? cogs : analytics.costOfGoods,
						grossProfit: Number.isFinite(gross) ? gross : analytics.grossProfit,
						commissionsPayable: Number.isFinite(comm) ? comm : analytics.commissionsPayable,
						netProfit: Number.isFinite(net) ? net : analytics.netProfit,
						profitMarginPct: rev > 0 ? Number((net / rev * 100).toFixed(1)) : analytics.profitMarginPct,
						ordersCount: Number(s.orders_count ?? s.total_orders ?? analytics.ordersCount),
						completedOrdersCount: Number(s.completed_orders_count ?? s.completed_orders ?? analytics.completedOrdersCount),
						pendingOrdersCount: Number(s.pending_orders_count ?? s.pending_orders ?? analytics.pendingOrdersCount)
					};
				}
			}
			return analytics;
		},
		async listManualEntries(_adminToken) {
			return [];
		},
		async addManualEntry(_adminToken, _entry) {
			throw new Error("Manual ledger entries are disabled in Supabase mode (no manual_entries table in database).");
		},
		async deleteManualEntry(_adminToken, _entryId) {
			throw new Error("Manual ledger entries are disabled in Supabase mode (no manual_entries table in database).");
		},
		async listAllOrders(_adminToken) {
			const sb = getSupabase();
			await requireAdminUser(sb);
			const { data, error } = await sb.from("orders").select("*,installment_payments(*),commissions(*),products(cover_image)").order("created_at", { ascending: false });
			if (error) throw toFriendlySupabaseError(error, "Could not load orders.");
			return (data || []).map((row) => mapDbOrder(row));
		},
		async updateOrderStatus(_adminToken, orderId, status) {
			const sb = getSupabase();
			await requireAdminUser(sb);
			const { error } = await sb.rpc("set_order_status", {
				p_order: orderId,
				p_status: status
			});
			if (error) throw toFriendlySupabaseError(error, "Could not update order status.");
			const { data: row, error: fetchErr } = await sb.from("orders").select("*,installment_payments(*),commissions(*),products(cover_image)").eq("id", orderId).single();
			if (fetchErr || !row) throw toFriendlySupabaseError(fetchErr, "Could not reload order.");
			return mapDbOrder(row);
		},
		async toggleInstallmentPayment(_adminToken, orderId, installmentNumber, _paid, isAdvance) {
			const sb = getSupabase();
			await requireAdminUser(sb);
			const targetDueNo = isAdvance ? 0 : installmentNumber;
			const { data: paymentRow, error: payLookupErr } = await sb.from("installment_payments").select("id").eq("order_id", orderId).eq("due_no", targetDueNo).maybeSingle();
			if (payLookupErr || !paymentRow) throw toFriendlySupabaseError(payLookupErr, "Installment payment row not found.");
			const { error } = await sb.rpc("mark_installment_paid", { p_payment: paymentRow.id });
			if (error) throw toFriendlySupabaseError(error, "Could not update installment payment.");
			const { data: row, error: fetchErr } = await sb.from("orders").select("*,installment_payments(*),commissions(*),products(cover_image)").eq("id", orderId).single();
			if (fetchErr || !row) throw toFriendlySupabaseError(fetchErr, "Could not reload order.");
			return mapDbOrder(row);
		},
		async listAllUsers(_adminToken) {
			const sb = getSupabase();
			await requireAdminUser(sb);
			const { data, error } = await sb.from("profiles").select("id,email,full_name,role,seller_code,phone,whatsapp,address,postal_code,father_name,avatar_url,created_at").order("created_at", { ascending: false });
			if (error) throw toFriendlySupabaseError(error, "Could not load users.");
			return (data || []).map((row) => mapDbProfile(row));
		},
		async sendNotification(_adminToken, payload) {
			const sb = getSupabase();
			await requireAdminUser(sb);
			const { error } = await sb.from("notifications").insert({
				user_id: payload.targetUserId || null,
				title: sanitizePlainText(payload.title, 120),
				body: sanitizePlainText(payload.message, 800)
			});
			if (error) throw toFriendlySupabaseError(error, "Could not send notification.");
		},
		async listFeedbackThreads(_adminToken) {
			const sb = getSupabase();
			await requireAdminUser(sb);
			const [{ data: fbData, error: fbErr }, { data: profData }] = await Promise.all([sb.from("feedback").select("id,user_id,kind,subject,created_at,feedback_messages(*)").order("created_at", { ascending: false }), sb.from("profiles").select("id,full_name,email")]);
			if (fbErr) throw toFriendlySupabaseError(fbErr, "Could not load feedback threads.");
			const lookup = /* @__PURE__ */ new Map();
			for (const p of profData || []) lookup.set(String(p.id), {
				name: String(p.full_name || p.email || "Customer"),
				email: String(p.email || "")
			});
			return (fbData || []).map((row) => mapDbFeedbackThread(row, lookup));
		},
		async replyFeedbackThread(_adminToken, threadId, body) {
			const sb = getSupabase();
			const { user } = await requireAdminUser(sb);
			const cleanBody = sanitizePlainText(body, 800);
			const { error: msgErr } = await sb.from("feedback_messages").insert({
				feedback_id: threadId,
				sender_id: user.id,
				from_admin: true,
				body: cleanBody
			});
			if (msgErr) throw toFriendlySupabaseError(msgErr, "Could not send reply.");
			const { data: fullRow, error: fetchErr } = await sb.from("feedback").select("id,user_id,kind,subject,created_at,feedback_messages(*)").eq("id", threadId).single();
			if (fetchErr || !fullRow) throw toFriendlySupabaseError(fetchErr, "Could not reload feedback thread.");
			const profile = await fetchProfileRow(sb, fullRow.user_id);
			return mapDbFeedbackThread(fullRow, /* @__PURE__ */ new Map([[String(fullRow.user_id), {
				name: String(profile?.full_name || profile?.email || "Customer"),
				email: String(profile?.email || "")
			}]]));
		},
		async listAdminProducts(_adminToken) {
			const sb = getSupabase();
			await requireAdminUser(sb);
			const { data, error } = await sb.from("products").select("id,category_id,title,description,price,cover_image,images,is_active,created_at,categories(name),product_costs(cost_price)").order("created_at", { ascending: false });
			if (error) throw toFriendlySupabaseError(error, "Could not load admin catalog.");
			return (data || []).map((row) => mapDbProduct(row));
		},
		async saveProduct(_adminToken, product) {
			const sb = getSupabase();
			await requireAdminUser(sb);
			const cleanTitle = sanitizePlainText(product.title, 120);
			const cleanDesc = sanitizePlainText(product.description || "", 1200);
			const cover = product.coverImage ? String(product.coverImage) : "/src/assets/images/womens_unstitched_suit_1795333234539.jpg";
			const images = Array.isArray(product.extraImages) ? product.extraImages.filter((u) => typeof u === "string" && u.trim().length > 0) : [];
			const rowPayload = {
				category_id: product.categoryId,
				title: cleanTitle,
				description: cleanDesc,
				price: Number(product.price),
				cover_image: cover,
				images,
				is_active: product.inStock !== false
			};
			let savedId = product.id;
			if (savedId) {
				const { error: upErr } = await sb.from("products").update(rowPayload).eq("id", savedId);
				if (upErr) throw toFriendlySupabaseError(upErr, "Could not update product.");
			} else {
				const { data: ins, error: insErr } = await sb.from("products").insert(rowPayload).select("id").single();
				if (insErr || !ins) throw toFriendlySupabaseError(insErr, "Could not create product.");
				savedId = String(ins.id);
			}
			if (product.costPrice !== void 0) {
				const { error: costErr } = await sb.from("product_costs").upsert({
					product_id: savedId,
					cost_price: Math.max(0, Number(product.costPrice) || 0)
				}, { onConflict: "product_id" });
				if (costErr) throw toFriendlySupabaseError(costErr, "Could not save product cost.");
			}
			const { data: fullRow, error: fetchErr } = await sb.from("products").select("id,category_id,title,description,price,cover_image,images,is_active,created_at,categories(name),product_costs(cost_price)").eq("id", savedId).single();
			if (fetchErr || !fullRow) throw toFriendlySupabaseError(fetchErr, "Product saved, but reload failed.");
			return mapDbProduct(fullRow);
		},
		async deleteProduct(_adminToken, productId) {
			const sb = getSupabase();
			await requireAdminUser(sb);
			const cleanId = String(productId || "").trim();
			if (!cleanId) throw new Error("Product ID is required.");
			await sb.from("product_costs").delete().eq("product_id", cleanId);
			const { data: deletedRows, error } = await sb.from("products").delete().eq("id", cleanId).select("id");
			if (!error && Array.isArray(deletedRows) && deletedRows.length > 0) return { outcome: "deleted" };
			if (error && (error.code === "23503" || /foreign key|violates/i.test(error.message || ""))) {
				const { data: softRows, error: softErr } = await sb.from("products").update({ is_active: false }).eq("id", cleanId).select("id");
				if (softErr || !softRows || softRows.length === 0) throw toFriendlySupabaseError(softErr || error, "Product is linked to existing orders and could not be archived. Check Supabase RLS policies.");
				return { outcome: "archived" };
			}
			if (error) throw toFriendlySupabaseError(error, "Could not delete product.");
			throw new Error("Product was not removed from Supabase. Verify your admin user has DELETE permission on the products table.");
		},
		async saveCategory(_adminToken, category) {
			const sb = getSupabase();
			await requireAdminUser(sb);
			const cleanName = sanitizePlainText(category.name, 80);
			if (category.id) {
				const { data, error } = await sb.from("categories").update({ name: cleanName }).eq("id", category.id).select("id,name,created_at").single();
				if (error || !data) throw toFriendlySupabaseError(error, "Could not update category.");
				return mapDbCategory(data);
			}
			const { data, error } = await sb.from("categories").insert({ name: cleanName }).select("id,name,created_at").single();
			if (error || !data) throw toFriendlySupabaseError(error, "Could not create category.");
			return mapDbCategory(data);
		},
		async deleteCategory(_adminToken, categoryId, options) {
			const sb = getSupabase();
			await requireAdminUser(sb);
			const cleanCatId = String(categoryId || "").trim();
			if (!cleanCatId) throw new Error("Category ID is required.");
			const { data: childProds, error: childErr } = await sb.from("products").select("id,title").eq("category_id", cleanCatId);
			if (childErr) throw toFriendlySupabaseError(childErr, "Could not check category products.");
			const deletedProductIds = [];
			if (Array.isArray(childProds) && childProds.length > 0) {
				if (!options?.cascadeProducts) throw new Error(`This category still has ${childProds.length} product(s). Delete or reassign them first, or choose "Delete with products".`);
				const childIds = childProds.map((p) => String(p.id));
				await sb.from("product_costs").delete().in("product_id", childIds);
				for (const childId of childIds) {
					const { data: removedChild, error: remErr } = await sb.from("products").delete().eq("id", childId).select("id");
					if (remErr && (remErr.code === "23503" || /foreign key|violates/i.test(remErr.message || ""))) throw new Error("Cannot delete this category because at least one product in it is linked to existing orders. Move those products to another category first.");
					if (remErr) throw toFriendlySupabaseError(remErr, "Could not delete products inside this category.");
					if (!removedChild || removedChild.length === 0) throw new Error("Could not delete products inside this category (check Supabase DELETE policy on products).");
					deletedProductIds.push(childId);
				}
			}
			const { data: deletedCats, error: delErr } = await sb.from("categories").delete().eq("id", cleanCatId).select("id");
			if (delErr) {
				if (delErr.code === "23503" || /foreign key|violates/i.test(delErr.message || "")) throw new Error("Cannot delete this category because existing products or orders still reference it in Supabase.");
				throw toFriendlySupabaseError(delErr, "Could not delete category.");
			}
			if (!deletedCats || deletedCats.length === 0) throw new Error("Category was not removed from Supabase. Verify your admin user has DELETE permission on the categories table.");
			return { deletedProductIds };
		},
		async saveInstallmentPlans(_adminToken, plans) {
			const sb = getSupabase();
			await requireAdminUser(sb);
			const payload = (plans || []).map((pl) => ({
				months: Math.max(1, Math.round(Number(pl.months))),
				markup_percent: Math.max(0, Number(pl.markupPercent)),
				advance_percent: Math.max(0, Math.min(90, Number(pl.advancePercent))),
				is_active: Boolean(pl.active)
			}));
			const { error } = await sb.from("plans").upsert(payload, { onConflict: "months" });
			if (error) throw toFriendlySupabaseError(error, "Could not update installment plans.");
			const { data, error: fetchErr } = await sb.from("plans").select("months,markup_percent,advance_percent,is_active").order("months", { ascending: true });
			if (fetchErr) throw toFriendlySupabaseError(fetchErr, "Could not reload installment plans.");
			return (data || []).map((row) => mapDbPlan(row));
		},
		async saveTermsPolicy(_adminToken, _doc) {
			throw new Error("Terms & Policy edits require a store_settings table in Supabase (currently using default policy).");
		}
	},
	storageService: { async uploadImage(file, folder) {
		const { sanitizedFile } = await processSecureImageUpload(file, folder);
		const sb = getSupabase();
		if (folder === "avatars") {
			const { data: userData } = await sb.auth.getUser();
			const userId = userData?.user?.id;
			if (!userId) {
				clearPendingAvatar();
				pendingAvatarFile = sanitizedFile;
				pendingAvatarObjectUrl = globalThis.URL.createObjectURL(sanitizedFile);
				return pendingAvatarObjectUrl;
			}
			const path = `${userId}/${sanitizedFile.name}`;
			const { error } = await sb.storage.from("avatars").upload(path, sanitizedFile, {
				upsert: true,
				contentType: sanitizedFile.type
			});
			if (error) throw toFriendlySupabaseError(error, "Avatar upload failed.");
			const { data } = sb.storage.from("avatars").getPublicUrl(path);
			return data.publicUrl;
		}
		const path = `products/${sanitizedFile.name}`;
		const { error } = await sb.storage.from("product-images").upload(path, sanitizedFile, {
			upsert: true,
			contentType: sanitizedFile.type
		});
		if (error) throw toFriendlySupabaseError(error, "Product image upload failed.");
		const { data } = sb.storage.from("product-images").getPublicUrl(path);
		return data.publicUrl;
	} }
};
var subscribeToUserRealtime = subscribeToUserRealtime$1;
// src/api/index.ts
var selectedBackend = "supabase".toLowerCase();
function resolveAdapter() {
	switch (selectedBackend) {
		case "supabase": return supabaseAdapter;
	}
}
var api = resolveAdapter();
var { authService, productService, orderService, userService, notificationService, feedbackService, adminService, storageService } = api;
export { subscribeGlobalError as A, DEFAULT_TERMS_POLICY as C, getOrAssignErrorReferenceId as D, getGlobalErrorSnapshot as E, scrubSensitiveString as M, normalizeAppError as O, formatPKR as S, createErrorReferenceId as T, sanitizePlainText as _, notificationService as a, calculateOrderPaidSummary as b, storageService as c, getSupabase as d, canTriggerAction as f, maskPhone as g, isValidAdminHash as h, feedbackService as i, triggerGlobalErrorRetry as j, reportGlobalError as k, userService as l, evaluatePasswordStrength as m, api as n, orderService as o, createIdempotencyKey as p, authService as r, productService as s, adminService as t, subscribeToUserRealtime as u, sanitizeUrlPath as v, clearGlobalError as w, deriveProductStockStatus as x, calculateInstallmentPlan as y };
