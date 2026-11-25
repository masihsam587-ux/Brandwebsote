import { t as SeoHead } from "../entry-server.js";
import { t as AdminConsole } from "./AdminConsole-DsRqiq4V.js";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
// src/pages/AdminPage.tsx
function AdminPage() {
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(SeoHead, {
		title: "Admin Portal — Cinematic Arts (CA)",
		description: "Backend-verified administration console for Cinematic Arts (CA) orders, inventory, analytics, and installment plans.",
		canonicalPath: "/admin",
		noIndex: true
	}), /* @__PURE__ */ jsxs("section", {
		className: "mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "mb-5",
			children: [/* @__PURE__ */ jsx("h1", {
				className: "font-display text-3xl font-semibold text-[var(--ca-text)] sm:text-4xl",
				children: "Admin Portal"
			}), /* @__PURE__ */ jsx("p", {
				className: "mt-1 text-sm text-[var(--ca-text-muted)]",
				children: "Protected by backend password verification and a 15-minute session token."
			})]
		}), /* @__PURE__ */ jsx(AdminConsole, { mode: "page" })]
	})] });
}
export { AdminPage };
