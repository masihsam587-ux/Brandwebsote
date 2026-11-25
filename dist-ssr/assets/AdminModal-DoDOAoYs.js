import { t as AdminConsole } from "./AdminConsole-DsRqiq4V.js";
import { jsx } from "react/jsx-runtime";
// src/components/AdminModal.tsx
function AdminModal({ open, onClose }) {
	if (!open) return null;
	return /* @__PURE__ */ jsx("div", {
		role: "dialog",
		"aria-modal": "true",
		"aria-label": "Cinematic Arts Admin Lock & Console",
		className: "ca-fade-in fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-3 sm:p-6",
		children: /* @__PURE__ */ jsx(AdminConsole, {
			mode: "modal",
			active: open,
			onClose
		})
	});
}
export { AdminModal };
