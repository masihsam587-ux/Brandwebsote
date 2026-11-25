import { D as getOrAssignErrorReferenceId, M as scrubSensitiveString, O as normalizeAppError, a as notificationService, k as reportGlobalError, r as authService, u as subscribeToUserRealtime, w as clearGlobalError } from "./api-CtuVoLbu.js";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as Sentry from "@sentry/react";
import { jsx, jsxs } from "react/jsx-runtime";
import { AlertCircle, Check, CheckCircle2, Info, X } from "lucide-react";
import { z } from "zod";
// src/services/sentry.ts
var sentryInitialized = false;
/**
* Captures server errors, timeouts, and React ErrorBoundary failures with a
* short support reference ID and strictly zero PII.
*/
function captureAppException(err, context) {
	const normalized = normalizeAppError(err);
	const referenceId = context?.referenceId || getOrAssignErrorReferenceId(err) || normalized.referenceId;
	if (!sentryInitialized) return referenceId;
	try {
		const safeErr = err instanceof Error ? new Error(scrubSensitiveString(err.message)) : new Error(scrubSensitiveString(normalized.message));
		if (err instanceof Error) {
			safeErr.name = err.name;
			safeErr.stack = err.stack ? scrubSensitiveString(err.stack) : void 0;
		}
		Sentry.withScope((scope) => {
			scope.setTag("ca_reference_id", referenceId);
			scope.setTag("error_kind", context?.kind || normalized.kind);
			if (context?.status || normalized.status) scope.setTag("http_status", String(context?.status ?? normalized.status));
			if (context?.source) scope.setTag("error_source", context.source);
			scope.setUser(null);
			Sentry.captureException(safeErr);
		});
	} catch {}
	return referenceId;
}
// src/api/queryClient.ts
function handleGlobalQueryFailure(error, source) {
	const normalized = normalizeAppError(error);
	if (normalized.kind === "offline" || normalized.kind === "timeout" || normalized.kind === "server") {
		captureAppException(error, {
			referenceId: normalized.referenceId,
			kind: normalized.kind,
			status: normalized.status,
			source
		});
		reportGlobalError(error, () => {
			queryClient.refetchQueries({ type: "active" });
		});
	}
}
var queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError(error) {
			handleGlobalQueryFailure(error, "query");
		},
		onSuccess() {
			clearGlobalError();
		}
	}),
	mutationCache: new MutationCache({ onError(error) {
		handleGlobalQueryFailure(error, "mutation");
	} }),
	defaultOptions: {
		queries: {
			staleTime: 3e5,
			gcTime: 9e5,
			retry: 1,
			refetchOnWindowFocus: false,
			refetchOnReconnect: true
		},
		mutations: { retry: 0 }
	}
});
/**
* Wipe all cached user/admin/catalog queries and ephemeral cart/wishlist storage on logout or account deletion.
*/
function clearAllClientCaches() {
	queryClient.clear();
	clearGlobalError();
	try {
		localStorage.removeItem("ca_cart_v1");
		localStorage.removeItem("ca_wishlist_v1");
		localStorage.removeItem("ca_mock_session_v1");
		sessionStorage.clear();
	} catch {}
}
// src/context/ToastContext.tsx
var ToastContext = createContext(null);
function ToastProvider({ children }) {
	const [toasts, setToasts] = useState([]);
	const dismiss = useCallback((id) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);
	const showToast = useCallback((title, kind = "info") => {
		const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
		setToasts((prev) => [...prev.slice(-2), {
			id,
			title,
			kind
		}]);
		window.setTimeout(() => dismiss(id), 4200);
	}, [dismiss]);
	useEffect(() => {
		if (new URLSearchParams(window.location.search).get("autostart") === "1") return;
		try {
			if (!sessionStorage.getItem("ca_welcomed")) {
				sessionStorage.setItem("ca_welcomed", "1");
				const timer = window.setTimeout(() => {
					showToast("Welcome to Cinematic Arts (CA) — Clothing & Accessories across Pakistan", "info");
				}, 1200);
				return () => window.clearTimeout(timer);
			}
		} catch {}
	}, [showToast]);
	return /* @__PURE__ */ jsxs(ToastContext.Provider, {
		value: { showToast },
		children: [children, /* @__PURE__ */ jsx("div", {
			"aria-live": "polite",
			className: "pointer-events-none fixed right-4 top-16 z-50 flex max-w-sm flex-col gap-2 sm:right-6",
			children: toasts.map((t) => /* @__PURE__ */ jsxs("div", {
				role: "status",
				className: "ca-toast-in glass-panel pointer-events-auto flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm text-[var(--ca-text)]",
				children: [
					t.kind === "success" && /* @__PURE__ */ jsx(CheckCircle2, { className: "mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" }),
					t.kind === "error" && /* @__PURE__ */ jsx(AlertCircle, { className: "mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" }),
					t.kind === "info" && /* @__PURE__ */ jsx(Info, { className: "mt-0.5 h-4 w-4 shrink-0 text-[var(--ca-accent)]" }),
					/* @__PURE__ */ jsx("span", {
						className: "flex-1 leading-snug",
						children: t.title
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: () => dismiss(t.id),
						"aria-label": "Dismiss notification",
						className: "rounded-lg p-0.5 text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]",
						children: /* @__PURE__ */ jsx(X, { className: "h-3.5 w-3.5" })
					})
				]
			}, t.id))
		})]
	});
}
function useToast() {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error("useToast must be used inside ToastProvider");
	return ctx;
}
// src/context/AuthContext.tsx
var AuthContext = createContext(null);
function AuthProvider({ children }) {
	const [user, setUserState] = useState(null);
	const [loading, setLoading] = useState(true);
	const [unreadNotifications, setUnreadNotifications] = useState(0);
	const refreshUnreadCount = useCallback(async () => {
		try {
			const list = await notificationService.listNotifications();
			setUnreadNotifications(list.filter((n) => !n.read).length);
		} catch {
			setUnreadNotifications(0);
		}
	}, []);
	const refreshSession = useCallback(async () => {
		setLoading(true);
		try {
			const session = await authService.getSession();
			setUserState(session?.user || null);
			if (session?.user) await refreshUnreadCount();
			else setUnreadNotifications(0);
		} catch {
			setUserState(null);
		} finally {
			setLoading(false);
		}
	}, [refreshUnreadCount]);
	useEffect(() => {
		refreshSession();
	}, [refreshSession]);
	useEffect(() => {
		if (!user?.id) return;
		return subscribeToUserRealtime(user.id, () => {
			refreshUnreadCount();
			queryClient.invalidateQueries({ queryKey: ["orders", "mine"] });
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
		});
	}, [user?.id, refreshUnreadCount]);
	const setUser = useCallback((nextUser) => {
		setUserState(nextUser);
		if (!nextUser) {
			setUnreadNotifications(0);
			clearAllClientCaches();
		}
	}, []);
	const login = async (payload) => {
		const session = await authService.login(payload);
		setUserState(session.user);
		await refreshUnreadCount();
		return session.user;
	};
	const signup = async (payload) => {
		const session = await authService.signup(payload);
		if (session.emailConfirmationRequired) {
			setUserState(null);
			setUnreadNotifications(0);
			return {
				...session.user,
				emailConfirmationRequired: true
			};
		}
		setUserState(session.user);
		await refreshUnreadCount();
		return session.user;
	};
	const logout = async () => {
		await authService.logout();
		setUserState(null);
		setUnreadNotifications(0);
		clearAllClientCaches();
	};
	return /* @__PURE__ */ jsx(AuthContext.Provider, {
		value: {
			user,
			loading,
			unreadNotifications,
			refreshSession,
			refreshUnreadCount,
			login,
			signup,
			logout,
			setUser
		},
		children
	});
}
function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
	return ctx;
}
// src/utils/validation.ts
var cleanText = (max, min = 1, label = "Field") => z.string().trim().min(min, `${label} is required.`).max(max, `${label} must be ${max} characters or fewer.`).refine((val) => !/[<>]/.test(val), "HTML angle brackets (< >) are not permitted.");
var pkPhone = (label) => z.string().trim().transform((s) => s.replace(/[\s-]/g, "")).refine((s) => /^(\+92|0)?3\d{9}$/.test(s) || /^\+?[0-9]{10,15}$/.test(s), `Enter a valid ${label} (e.g. 03355329722).`);
var passwordPolicySchema = z.string().min(8, "Password must be at least 8 characters.").max(128, "Password is too long.").refine((p) => /[A-Za-z]/.test(p) && /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p), { message: "Password must include both letters and at least one number or symbol." });
var loginSchema = z.object({
	email: z.string().trim().email("Enter a valid email address.").max(120).toLowerCase(),
	password: z.string().min(1, "Password is required.").max(128)
});
var forgotPasswordSchema = z.object({ email: z.string().trim().email("Enter a valid email address.").max(120).toLowerCase() });
var signupUserSchema = z.object({
	role: z.literal("user"),
	name: cleanText(80, 2, "Full name"),
	email: z.string().trim().email("Enter a valid email address.").max(120).toLowerCase(),
	password: passwordPolicySchema
});
var signupSellerSchema = z.object({
	role: z.literal("seller"),
	name: cleanText(80, 2, "Full name"),
	email: z.string().trim().email("Enter a valid email address.").max(120).toLowerCase(),
	password: passwordPolicySchema,
	fatherName: cleanText(80, 2, "Father's name"),
	phone: pkPhone("mobile number"),
	whatsapp: pkPhone("WhatsApp number"),
	address: cleanText(200, 6, "Residential or office address"),
	city: cleanText(60, 2, "City").optional().default("Peshawar"),
	postalCode: z.string().trim().regex(/^[A-Za-z0-9\-\s]{4,12}$/, "Enter a valid postal code (4-12 characters)."),
	avatarUrl: z.string().max(15e5).optional()
});
var referralCodeSchema = z.string().trim().toUpperCase().refine((code) => code === "" || /^CA-[A-Z0-9]{4,12}$/.test(code), "Seller Referral ID must match format CA-XXXXXX.");
var checkoutSchema = z.object({
	fullName: cleanText(80, 2, "Full name"),
	phone: pkPhone("mobile number"),
	whatsapp: pkPhone("WhatsApp number"),
	address: cleanText(200, 6, "Complete street address"),
	city: cleanText(60, 2, "City"),
	postalCode: z.string().trim().regex(/^[A-Za-z0-9\-\s]{4,12}$/, "Postal code must be 4-12 characters."),
	notes: z.string().trim().max(300, "Notes must be 300 characters or fewer.").refine((v) => !/[<>]/.test(v), "HTML angle brackets are not permitted.").optional().default(""),
	paymentMethod: z.enum(["cod", "installments"]),
	referralCode: referralCodeSchema.default("")
}).superRefine((data, ctx) => {
	if (data.paymentMethod === "installments" && !data.referralCode.trim()) ctx.addIssue({
		code: "custom",
		path: ["referralCode"],
		message: "An active Seller Referral ID (format CA-XXXXXX) is required for installment orders."
	});
});
var profileUpdateSchema = z.object({
	name: cleanText(80, 2, "Full name"),
	phone: z.string().trim().max(24).refine((s) => s === "" || /^(\+92|0)?3\d{9}$|^\+?[0-9\s-]{10,16}$/.test(s), "Enter a valid phone number."),
	whatsapp: z.string().trim().max(24).refine((s) => s === "" || /^(\+92|0)?3\d{9}$|^\+?[0-9\s-]{10,16}$/.test(s), "Enter a valid WhatsApp number."),
	city: cleanText(60, 2, "City"),
	address: cleanText(200, 4, "Street address"),
	postalCode: z.string().trim().regex(/^[A-Za-z0-9\-\s]{4,12}$/, "Postal code must be 4-12 characters.")
});
var feedbackCreateSchema = z.object({
	subject: cleanText(120, 3, "Subject"),
	message: cleanText(800, 4, "Message")
});
var feedbackReplySchema = z.object({ body: cleanText(800, 2, "Reply message") });
var adminManualEntrySchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valid YYYY-MM-DD date is required."),
	label: cleanText(120, 2, "Entry description"),
	revenue: z.coerce.number().min(0, "Revenue cannot be negative.").max(1e8),
	costOfGoods: z.coerce.number().min(0, "Cost cannot be negative.").max(1e8),
	commissionAmount: z.coerce.number().min(0).max(1e8),
	ordersCount: z.coerce.number().int().min(1).max(1e4),
	notes: z.string().trim().max(240).optional()
});
var adminProductSchema = z.object({
	title: cleanText(120, 2, "Product title"),
	price: z.coerce.number().positive("Selling price must be greater than 0 PKR.").max(1e7),
	costPrice: z.coerce.number().min(0, "Cost price cannot be negative.").max(1e7),
	categoryId: z.string().trim().min(1, "Category is required.").max(80),
	description: z.string().trim().max(1200).optional().default("")
});
var adminTermsSchema = z.object({
	effectiveLabel: cleanText(120, 2, "Effective label"),
	title: cleanText(160, 3, "Document title"),
	footerNote: z.string().trim().max(300).optional().default(""),
	sections: z.array(z.object({
		id: z.string().min(1).max(40),
		heading: cleanText(160, 2, "Section heading"),
		body: cleanText(2500, 5, "Section body")
	})).min(1, "At least one policy section is required.")
});
var urlSlugSchema = z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, "Invalid product slug.").refine((s) => !s.startsWith("-") && !s.endsWith("-") && !s.includes("--"), "Invalid product slug.");
var persistedCartItemSchema = z.object({
	productId: z.string().min(1).max(80),
	title: z.string().min(1).max(160),
	unitPrice: z.number().nonnegative().max(1e7),
	quantity: z.number().int().min(1).max(20),
	selectedSize: z.string().max(40).optional(),
	image: z.string().max(1e3)
});
function extractZodFieldErrors(error) {
	const map = {};
	for (const issue of error.issues) {
		const key = String(issue.path[0] || "form");
		if (!map[key]) map[key] = issue.message;
	}
	return map;
}
// src/components/CALoader.tsx
var SIZE_MAP = {
	sm: {
		box: "h-4 w-4",
		text: "text-[7px]",
		stroke: 2.5
	},
	md: {
		box: "h-8 w-8",
		text: "text-[10px]",
		stroke: 2
	},
	lg: {
		box: "h-14 w-14",
		text: "text-base",
		stroke: 1.75
	}
};
function CALoader({ size = "md", label, className = "" }) {
	const cfg = SIZE_MAP[size];
	return /* @__PURE__ */ jsxs("span", {
		role: "status",
		"aria-live": "polite",
		className: `inline-flex flex-col items-center justify-center gap-2 ${className}`,
		children: [/* @__PURE__ */ jsxs("span", {
			className: `relative inline-flex items-center justify-center ${cfg.box}`,
			children: [/* @__PURE__ */ jsxs("svg", {
				viewBox: "0 0 40 40",
				"aria-hidden": "true",
				className: "ca-loader-spin absolute inset-0 h-full w-full",
				children: [/* @__PURE__ */ jsx("circle", {
					cx: "20",
					cy: "20",
					r: "17",
					fill: "none",
					stroke: "currentColor",
					strokeOpacity: "0.18",
					strokeWidth: cfg.stroke
				}), /* @__PURE__ */ jsx("circle", {
					cx: "20",
					cy: "20",
					r: "17",
					fill: "none",
					stroke: "var(--ca-accent)",
					strokeWidth: cfg.stroke,
					strokeLinecap: "round",
					strokeDasharray: "68 38"
				})]
			}), /* @__PURE__ */ jsx("span", {
				className: `ca-loader-pulse font-display font-semibold tracking-wider leading-none ${cfg.text}`,
				children: "CA"
			})]
		}), label ? /* @__PURE__ */ jsx("span", {
			className: "text-xs font-medium text-[var(--ca-text-muted)]",
			children: label
		}) : /* @__PURE__ */ jsx("span", {
			className: "sr-only",
			children: "Loading"
		})]
	});
}
function CALoadingOverlay({ open, label = "Processing request..." }) {
	if (!open) return null;
	return /* @__PURE__ */ jsx("div", {
		role: "dialog",
		"aria-modal": "true",
		"aria-label": label,
		className: "ca-fade-in fixed inset-0 z-[130] flex items-center justify-center bg-black/45 p-4",
		children: /* @__PURE__ */ jsx("div", {
			className: "glass-panel flex min-w-[200px] flex-col items-center rounded-2xl px-8 py-6 text-center shadow-lg",
			children: /* @__PURE__ */ jsx(CALoader, {
				size: "lg",
				label
			})
		})
	});
}
function triggerTapRipple(e) {
	const el = e.currentTarget;
	const rect = el.getBoundingClientRect();
	if (!rect.width || !rect.height) return;
	const dot = document.createElement("span");
	const size = Math.max(rect.width, rect.height) * .65;
	dot.className = "ca-ripple-dot";
	dot.style.width = `${size}px`;
	dot.style.height = `${size}px`;
	dot.style.left = `${e.clientX ? e.clientX - rect.left : rect.width / 2}px`;
	dot.style.top = `${e.clientY ? e.clientY - rect.top : rect.height / 2}px`;
	el.appendChild(dot);
	window.setTimeout(() => dot.remove(), 550);
}
function CAProcessButton({ loading = false, status = "idle", disabled, className = "", children, onPointerDown, ...rest }) {
	const isError = status === "error";
	const isSuccess = status === "success";
	return /* @__PURE__ */ jsxs("button", {
		...rest,
		disabled: loading || disabled,
		onPointerDown: (e) => {
			if (!loading && !disabled) triggerTapRipple(e);
			onPointerDown?.(e);
		},
		className: `btn-press relative inline-flex min-h-[44px] items-center justify-center overflow-hidden transition-all disabled:cursor-not-allowed disabled:opacity-60 ${isError ? "ca-shake ring-2 ring-red-500/80" : ""} ${className}`,
		children: [
			/* @__PURE__ */ jsx("span", {
				className: `inline-flex items-center justify-center gap-2 transition-opacity duration-150 ${loading || isSuccess ? "opacity-0" : "opacity-100"}`,
				children
			}),
			loading && /* @__PURE__ */ jsx("span", {
				className: "ca-fade-in absolute inset-0 flex items-center justify-center",
				children: /* @__PURE__ */ jsx(CALoader, { size: "sm" })
			}),
			!loading && isSuccess && /* @__PURE__ */ jsx("span", {
				className: "ca-badge-pop absolute inset-0 flex items-center justify-center gap-1.5 text-emerald-500",
				children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" })
			})
		]
	});
}
export { clearAllClientCaches as C, useToast as S, captureAppException as T, signupUserSchema as _, adminManualEntrySchema as a, useAuth as b, checkoutSchema as c, feedbackReplySchema as d, forgotPasswordSchema as f, signupSellerSchema as g, profileUpdateSchema as h, triggerTapRipple as i, extractZodFieldErrors as l, persistedCartItemSchema as m, CALoadingOverlay as n, adminProductSchema as o, loginSchema as p, CAProcessButton as r, adminTermsSchema as s, CALoader as t, feedbackCreateSchema as u, urlSlugSchema as v, queryClient as w, ToastProvider as x, AuthProvider as y };
