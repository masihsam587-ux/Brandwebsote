import { d as getSupabase, n as api } from "./api-CtuVoLbu.js";
import { t as SeoHead } from "../entry-server.js";
import { useEffect, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
// src/pages/StatusPage.tsx
function StatusPage() {
	const hasSupabaseUrl = Boolean("https://wqbdpaxcmrrsxehcvdna.supabase.co".trim());
	const hasSupabaseAnonKey = Boolean("sb_publishable__nqJ-wQOuLakzxthcYSEdw_rkI37k2u".trim());
	const [probe, setProbe] = useState({
		status: "loading",
		message: "Running test query..."
	});
	useEffect(() => {
		let cancelled = false;
		async function runProbe() {
			try {
				const { error } = await getSupabase().from("products").select("id").limit(1);
				if (cancelled) return;
				if (error) setProbe({
					status: "error",
					message: error.message || "Unknown Supabase error"
				});
				else setProbe({
					status: "success",
					message: "success"
				});
			} catch (err) {
				if (cancelled) return;
				setProbe({
					status: "error",
					message: err instanceof Error ? err.message : String(err)
				});
			}
		}
		runProbe();
		return () => {
			cancelled = true;
		};
	}, []);
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(SeoHead, {
		title: "Status — Cinematic Arts (CA)",
		description: "Backend mode and Supabase connectivity diagnostics.",
		canonicalPath: "/status",
		noIndex: true
	}), /* @__PURE__ */ jsx("section", {
		"data-testid": "status-page",
		className: "ca-fade-in mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16",
		children: /* @__PURE__ */ jsxs("div", {
			className: "glass-panel rounded-2xl p-6 sm:p-8",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "font-display text-2xl font-semibold text-[var(--ca-text)] sm:text-3xl",
					children: "System Status"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-1.5 text-sm text-[var(--ca-text-muted)]",
					children: "Runtime backend diagnostics without personal or secret data."
				}),
				/* @__PURE__ */ jsxs("dl", {
					className: "mt-6 space-y-3 text-sm",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center justify-between gap-4 rounded-xl bg-[var(--ca-surface-subtle)] px-4 py-3",
							children: [/* @__PURE__ */ jsx("dt", {
								className: "font-medium text-[var(--ca-text-muted)]",
								children: "Active backend mode"
							}), /* @__PURE__ */ jsx("dd", {
								"data-testid": "status-backend-mode",
								className: "font-mono-nums font-semibold text-[var(--ca-text)]",
								children: api.mode
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center justify-between gap-4 rounded-xl bg-[var(--ca-surface-subtle)] px-4 py-3",
							children: [/* @__PURE__ */ jsx("dt", {
								className: "font-medium text-[var(--ca-text-muted)]",
								children: "VITE_SUPABASE_URL defined"
							}), /* @__PURE__ */ jsx("dd", {
								"data-testid": "status-supabase-url",
								className: "font-mono-nums font-semibold text-[var(--ca-text)]",
								children: String(hasSupabaseUrl)
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center justify-between gap-4 rounded-xl bg-[var(--ca-surface-subtle)] px-4 py-3",
							children: [/* @__PURE__ */ jsx("dt", {
								className: "font-medium text-[var(--ca-text-muted)]",
								children: "VITE_SUPABASE_ANON_KEY defined"
							}), /* @__PURE__ */ jsx("dd", {
								"data-testid": "status-supabase-anon-key",
								className: "font-mono-nums font-semibold text-[var(--ca-text)]",
								children: String(hasSupabaseAnonKey)
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "rounded-xl bg-[var(--ca-surface-subtle)] px-4 py-3",
							children: [/* @__PURE__ */ jsx("dt", {
								className: "font-medium text-[var(--ca-text-muted)]",
								children: "Supabase test request (products, limit 1)"
							}), /* @__PURE__ */ jsx("dd", {
								"data-testid": "status-supabase-test",
								className: `font-mono-nums mt-1.5 break-words text-xs font-semibold sm:text-sm ${probe.status === "success" ? "text-emerald-700 dark:text-emerald-300" : probe.status === "error" ? "text-red-700 dark:text-red-300" : "text-[var(--ca-text)]"}`,
								children: probe.message
							})]
						})
					]
				})
			]
		})
	})] });
}
export { StatusPage };
