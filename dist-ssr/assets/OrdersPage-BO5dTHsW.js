import { O as normalizeAppError, S as formatPKR, _ as sanitizePlainText, b as calculateOrderPaidSummary, f as canTriggerAction, o as orderService, p as createIdempotencyKey } from "./api-CtuVoLbu.js";
import { c as TurnstileField, d as STORE_CONFIG, f as useLocale, i as FriendlyErrorState, l as ResilientImage, p as useCart, r as CardListSkeleton, t as SeoHead, u as saveOrderReceipt } from "../entry-server.js";
import { S as useToast, b as useAuth, c as checkoutSchema, l as extractZodFieldErrors, n as CALoadingOverlay, r as CAProcessButton } from "./CALoader-DYHlE_Xc.js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, ChevronDown, ChevronUp, Clock, MessageCircle, Minus, Plus, RefreshCw, ShieldCheck, Trash2, XCircle } from "lucide-react";
// src/components/OrderIssueForm.tsx
var EXCHANGE_REASONS = [
	"Need a different size",
	"Prefer another item / color",
	"Wrong size delivered"
];
var PROBLEM_REASONS = [
	"Damaged or torn in transit",
	"Missing piece in parcel",
	"Stitching or fabric defect",
	"Wrong item received",
	"Billing or installment query"
];
function OrderIssueForm({ order }) {
	const [open, setOpen] = useState(false);
	const [kind, setKind] = useState("exchange");
	const [selectedItem, setSelectedItem] = useState(order.items[0]?.title || "Order item");
	const [reason, setReason] = useState(EXCHANGE_REASONS[0]);
	const [replacementSize, setReplacementSize] = useState("");
	const [details, setDetails] = useState("");
	const [error, setError] = useState(null);
	const [prepared, setPrepared] = useState(null);
	const reasons = kind === "exchange" ? EXCHANGE_REASONS : PROBLEM_REASONS;
	const handleKindChange = (next) => {
		setKind(next);
		setReason(next === "exchange" ? EXCHANGE_REASONS[0] : PROBLEM_REASONS[0]);
		setError(null);
	};
	const handleSubmit = (e) => {
		e.preventDefault();
		setError(null);
		const cleanDetails = sanitizePlainText(details, 400);
		const cleanSize = sanitizePlainText(replacementSize, 40);
		if (kind === "exchange" && cleanSize.length < 1) {
			setError("Please enter your preferred replacement size or item note.");
			return;
		}
		if (cleanDetails.length < 10) {
			setError("Please share a brief description (at least 10 characters).");
			return;
		}
		const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
		setPrepared({
			reference: `REQ-${suffix}`,
			kind,
			itemTitle: selectedItem,
			reason,
			replacementSize: cleanSize,
			details: cleanDetails
		});
	};
	const whatsappHref = prepared ? `${STORE_CONFIG.whatsappUrl}?text=${encodeURIComponent([
		`Salam Cinematic Arts, ${prepared.kind === "exchange" ? "Exchange Request" : "Order Problem Report"} (${prepared.reference})`,
		`Order ID: ${order.id}`,
		`Item: ${prepared.itemTitle}`,
		`Reason: ${prepared.reason}`,
		prepared.replacementSize ? `Preferred Size: ${prepared.replacementSize}` : null,
		`Details: ${prepared.details}`
	].filter(Boolean).join("\n"))}` : STORE_CONFIG.whatsappUrl;
	return /* @__PURE__ */ jsxs("div", {
		className: "pt-2",
		children: [/* @__PURE__ */ jsxs("button", {
			type: "button",
			"data-testid": `toggle-order-issue-${order.id}`,
			"aria-expanded": open,
			onClick: () => setOpen((v) => !v),
			className: "inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2 text-xs font-medium text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]",
			children: [
				/* @__PURE__ */ jsx(RefreshCw, { className: "h-3.5 w-3.5 text-[var(--ca-accent)]" }),
				"Report a problem / request exchange",
				open ? /* @__PURE__ */ jsx(ChevronUp, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ jsx(ChevronDown, { className: "h-3.5 w-3.5" })
			]
		}), open && /* @__PURE__ */ jsxs("div", {
			"data-testid": `order-issue-panel-${order.id}`,
			className: "ca-fade-in mt-3 rounded-xl bg-[var(--ca-surface-subtle)] p-4 sm:p-5",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "mb-3 flex items-start gap-2 rounded-xl bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-[11px] text-[var(--ca-text-muted)]",
				children: [/* @__PURE__ */ jsx(AlertTriangle, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ca-accent)]" }), /* @__PURE__ */ jsx("span", { children: "Request preview only: database recording will activate once database changes are confirmed. You can prepare your request summary and forward it directly on WhatsApp." })]
			}), prepared ? /* @__PURE__ */ jsxs("div", {
				"data-testid": "order-issue-prepared",
				className: "space-y-3 text-xs",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2 text-emerald-700 dark:text-emerald-300",
						children: [/* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }), /* @__PURE__ */ jsxs("span", {
							className: "font-semibold",
							children: [
								"Request summary prepared (",
								prepared.reference,
								")"
							]
						})]
					}),
					/* @__PURE__ */ jsxs("dl", {
						className: "grid grid-cols-1 gap-2 rounded-xl bg-[var(--ca-surface-solid)] p-3.5 sm:grid-cols-2",
						children: [
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", {
								className: "text-[var(--ca-text-muted)]",
								children: "Request Type"
							}), /* @__PURE__ */ jsx("dd", {
								className: "font-medium capitalize text-[var(--ca-text)]",
								children: prepared.kind
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", {
								className: "text-[var(--ca-text-muted)]",
								children: "Affected Item"
							}), /* @__PURE__ */ jsx("dd", {
								className: "font-medium text-[var(--ca-text)]",
								children: prepared.itemTitle
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", {
								className: "text-[var(--ca-text-muted)]",
								children: "Reason"
							}), /* @__PURE__ */ jsx("dd", {
								className: "font-medium text-[var(--ca-text)]",
								children: prepared.reason
							})] }),
							prepared.replacementSize && /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", {
								className: "text-[var(--ca-text-muted)]",
								children: "Preferred Replacement Size"
							}), /* @__PURE__ */ jsx("dd", {
								className: "font-medium text-[var(--ca-text)]",
								children: prepared.replacementSize
							})] }),
							/* @__PURE__ */ jsxs("div", {
								className: "sm:col-span-2",
								children: [/* @__PURE__ */ jsx("dt", {
									className: "text-[var(--ca-text-muted)]",
									children: "Details"
								}), /* @__PURE__ */ jsx("dd", {
									className: "mt-0.5 text-[var(--ca-text)]",
									children: prepared.details
								})]
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex flex-wrap items-center gap-2.5",
						children: [/* @__PURE__ */ jsxs("a", {
							href: whatsappHref,
							target: "_blank",
							rel: "noopener noreferrer",
							className: "btn-press inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[var(--ca-text)] px-4 py-2 text-xs font-semibold text-[var(--ca-bg)]",
							children: [/* @__PURE__ */ jsx(MessageCircle, { className: "h-3.5 w-3.5" }), "Send via WhatsApp"]
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setPrepared(null),
							className: "min-h-[40px] rounded-xl border border-[var(--ca-border)] px-3.5 py-2 text-xs font-medium text-[var(--ca-text)] hover:bg-[var(--ca-surface-solid)]",
							children: "Edit Request"
						})]
					})
				]
			}) : /* @__PURE__ */ jsxs("form", {
				onSubmit: handleSubmit,
				noValidate: true,
				className: "space-y-3 text-xs",
				children: [
					error && /* @__PURE__ */ jsx("div", {
						role: "alert",
						className: "rounded-xl bg-red-500/10 px-3 py-2 text-red-700 dark:text-red-300",
						children: error
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "grid grid-cols-2 gap-2 rounded-xl bg-[var(--ca-surface-solid)] p-1",
						children: [/* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => handleKindChange("exchange"),
							className: `min-h-[36px] rounded-lg px-3 py-1.5 font-semibold transition-colors ${kind === "exchange" ? "bg-[var(--ca-text)] text-[var(--ca-bg)]" : "text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"}`,
							children: "Request Exchange"
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => handleKindChange("problem"),
							className: `min-h-[36px] rounded-lg px-3 py-1.5 font-semibold transition-colors ${kind === "problem" ? "bg-[var(--ca-text)] text-[var(--ca-bg)]" : "text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"}`,
							children: "Report a Problem"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "grid grid-cols-1 gap-3 sm:grid-cols-2",
						children: [
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("label", {
								className: "block font-medium text-[var(--ca-text-muted)]",
								children: ["Item in Order ", order.id]
							}), /* @__PURE__ */ jsx("select", {
								value: selectedItem,
								onChange: (e) => setSelectedItem(e.target.value),
								className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs text-[var(--ca-text)]",
								children: order.items.map((it, idx) => /* @__PURE__ */ jsxs("option", {
									value: it.title,
									children: [
										it.title,
										" ",
										it.selectedSize ? `(${it.selectedSize})` : ""
									]
								}, `${it.productId}-${idx}`))
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "block font-medium text-[var(--ca-text-muted)]",
								children: "Reason"
							}), /* @__PURE__ */ jsx("select", {
								value: reason,
								onChange: (e) => setReason(e.target.value),
								className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs text-[var(--ca-text)]",
								children: reasons.map((r) => /* @__PURE__ */ jsx("option", {
									value: r,
									children: r
								}, r))
							})] }),
							kind === "exchange" && /* @__PURE__ */ jsxs("div", {
								className: "sm:col-span-2",
								children: [/* @__PURE__ */ jsx("label", {
									className: "block font-medium text-[var(--ca-text-muted)]",
									children: "Preferred Replacement Size / Color *"
								}), /* @__PURE__ */ jsx("input", {
									type: "text",
									maxLength: 40,
									value: replacementSize,
									onChange: (e) => setReplacementSize(e.target.value),
									placeholder: "e.g. Size L or Navy color",
									className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs text-[var(--ca-text)]"
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "sm:col-span-2",
								children: [/* @__PURE__ */ jsx("label", {
									className: "block font-medium text-[var(--ca-text-muted)]",
									children: "Describe what happened *"
								}), /* @__PURE__ */ jsx("textarea", {
									rows: 2,
									maxLength: 400,
									value: details,
									onChange: (e) => setDetails(e.target.value),
									placeholder: "Share condition details, delivery note, or sizing request...",
									className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs text-[var(--ca-text)]"
								})]
							})
						]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "flex justify-end",
						children: /* @__PURE__ */ jsx("button", {
							type: "submit",
							className: "btn-press inline-flex min-h-[40px] items-center rounded-xl bg-[var(--ca-accent)] px-4 py-2 text-xs font-semibold text-[var(--ca-accent-fg)]",
							children: "Prepare Request Summary"
						})
					})
				]
			})]
		})]
	});
}
// src/pages/OrdersPage.tsx
var STATUS_STEPS = [
	"pending",
	"proceeding",
	"complete"
];
function OrdersPage() {
	const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();
	const { user } = useAuth();
	const { showToast } = useToast();
	const { localize } = useLocale();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: orders = [], isLoading: loading, error: queryError, refetch } = useQuery({
		queryKey: [
			"orders",
			"mine",
			user?.id || "guest"
		],
		enabled: Boolean(user),
		queryFn: () => orderService.listMyOrders()
	});
	const fetchError = queryError ? queryError instanceof Error ? queryError.message : "Unable to load orders right now." : null;
	const [bagCheckoutOpen, setBagCheckoutOpen] = useState(false);
	const [fullName, setFullName] = useState(user?.name || "");
	const [phone, setPhone] = useState(user?.phone || "");
	const [whatsapp, setWhatsapp] = useState(user?.whatsapp || "");
	const [address, setAddress] = useState(user?.address || "");
	const [city, setCity] = useState(user?.city || "Peshawar");
	const [postalCode, setPostalCode] = useState(user?.postalCode || "25000");
	const [referralCode, setReferralCode] = useState("");
	const [honeypot, setHoneypot] = useState("");
	const [turnstileToken, setTurnstileToken] = useState("");
	const idempotencyKeyRef = useRef(createIdempotencyKey("bag"));
	const [fieldErrors, setFieldErrors] = useState({});
	const [referralState, setReferralState] = useState({ status: "idle" });
	const [submittingBag, setSubmittingBag] = useState(false);
	const [bagBtnStatus, setBagBtnStatus] = useState("idle");
	useEffect(() => {
		if (user) {
			setFullName(user.name || "");
			setPhone(user.phone || "");
			setWhatsapp(user.whatsapp || user.phone || "");
			setAddress(user.address || "");
			setCity(user.city || "Peshawar");
			setPostalCode(user.postalCode || "25000");
		}
	}, [user]);
	useEffect(() => {
		const clean = referralCode.trim().toUpperCase();
		if (!clean) {
			setReferralState({ status: "idle" });
			return;
		}
		setReferralState({ status: "checking" });
		const timer = window.setTimeout(async () => {
			try {
				const res = await orderService.validateSellerReferral(clean);
				if (res.valid) setReferralState({
					status: "valid",
					sellerName: res.sellerName
				});
				else setReferralState({ status: "invalid" });
			} catch {
				setReferralState({ status: "invalid" });
			}
		}, 300);
		return () => window.clearTimeout(timer);
	}, [referralCode]);
	const handleBagCheckout = async (e) => {
		e.preventDefault();
		if (items.length === 0 || submittingBag) return;
		if (!canTriggerAction("bag-checkout", 1200)) return;
		setFieldErrors({});
		const parsed = checkoutSchema.safeParse({
			fullName,
			phone,
			whatsapp: whatsapp || phone,
			address,
			city,
			postalCode,
			notes: "",
			paymentMethod: "cod",
			referralCode: referralCode.trim()
		});
		if (!parsed.success) {
			setFieldErrors(extractZodFieldErrors(parsed.error));
			setBagBtnStatus("error");
			window.setTimeout(() => setBagBtnStatus("idle"), 500);
			showToast("Please review the highlighted checkout fields.", "error");
			return;
		}
		if (parsed.data.referralCode) {
			if (!(await orderService.validateSellerReferral(parsed.data.referralCode)).valid) {
				setFieldErrors({ referralCode: "Entered Seller Referral ID is invalid or inactive." });
				setBagBtnStatus("error");
				window.setTimeout(() => setBagBtnStatus("idle"), 500);
				showToast("Entered Seller Referral ID is invalid or inactive.", "error");
				return;
			}
		}
		setSubmittingBag(true);
		setBagBtnStatus("idle");
		try {
			const order = await orderService.createOrder({
				items,
				customerName: sanitizePlainText(parsed.data.fullName, 80),
				phone: sanitizePlainText(parsed.data.phone, 24),
				whatsapp: sanitizePlainText(parsed.data.whatsapp, 24),
				address: sanitizePlainText(parsed.data.address, 200),
				city: sanitizePlainText(parsed.data.city, 60),
				postalCode: sanitizePlainText(parsed.data.postalCode, 16),
				paymentMethod: "cod",
				referralCode: parsed.data.referralCode || void 0,
				idempotencyKey: idempotencyKeyRef.current,
				honeypot: honeypot || void 0,
				turnstileToken: turnstileToken || void 0
			});
			clearCart();
			saveOrderReceipt(order);
			idempotencyKeyRef.current = createIdempotencyKey("bag");
			setBagBtnStatus("success");
			setBagCheckoutOpen(false);
			await queryClient.invalidateQueries({ queryKey: ["orders", "mine"] });
			showToast(`Order ${order.id} submitted.`, "success");
			navigate(`${localize("/order-confirmed")}?id=${encodeURIComponent(order.id)}`, { state: { order } });
		} catch (err) {
			setBagBtnStatus("error");
			window.setTimeout(() => setBagBtnStatus("idle"), 500);
			const normalized = normalizeAppError(err, { fallbackMessage: "Checkout failed" });
			showToast(`${normalized.message} (Ref: ${normalized.referenceId})`, "error");
		} finally {
			setSubmittingBag(false);
		}
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx(CALoadingOverlay, {
			open: submittingBag,
			label: "Placing your COD order..."
		}),
		/* @__PURE__ */ jsx(SeoHead, {
			title: "Bag & My Orders — Cinematic Arts (CA)",
			description: "Manage your shopping bag, track live order status, and inspect monthly PKR installment schedules.",
			canonicalPath: "/orders",
			noIndex: true
		}),
		/* @__PURE__ */ jsxs("section", {
			className: "mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 space-y-10",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
				className: "flex items-end justify-between gap-4",
				children: [/* @__PURE__ */ jsx("h1", {
					className: "font-display text-3xl font-semibold text-[var(--ca-text)] sm:text-4xl",
					children: "Bag & Order Tracker"
				}), /* @__PURE__ */ jsx(Link, {
					to: "/shop",
					className: "text-xs font-medium text-[var(--ca-accent)] hover:underline",
					children: "Continue Shopping"
				})]
			}), items.length > 0 && /* @__PURE__ */ jsxs("div", {
				className: "glass-panel mt-5 rounded-2xl p-5 sm:p-6",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "space-y-4",
						children: items.map((item) => /* @__PURE__ */ jsxs("div", {
							className: "flex flex-wrap items-center justify-between gap-4",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-3.5",
								children: [/* @__PURE__ */ jsx("div", {
									className: "h-16 w-20 overflow-hidden rounded-xl bg-[var(--ca-surface-subtle)]",
									children: /* @__PURE__ */ jsx(ResilientImage, {
										src: item.image,
										alt: item.title,
										width: 160,
										height: 120,
										className: "h-full w-full object-cover"
									})
								}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
									className: "text-sm font-semibold text-[var(--ca-text)]",
									children: item.title
								}), /* @__PURE__ */ jsxs("p", {
									className: "text-xs text-[var(--ca-text-muted)]",
									children: [
										item.selectedSize || "Standard",
										" ·",
										" ",
										/* @__PURE__ */ jsx("span", {
											className: "font-mono-nums",
											children: formatPKR(item.unitPrice)
										})
									]
								})] })]
							}), /* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "inline-flex items-center rounded-xl border border-[var(--ca-border)]",
									children: [
										/* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: () => updateQuantity(item.productId, item.selectedSize, item.quantity - 1),
											"aria-label": `Decrease ${item.title} quantity`,
											className: "p-1.5",
											children: /* @__PURE__ */ jsx(Minus, { className: "h-3.5 w-3.5" })
										}),
										/* @__PURE__ */ jsx("span", {
											className: "font-mono-nums min-w-[1.75rem] text-center text-xs font-semibold",
											children: item.quantity
										}),
										/* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: () => updateQuantity(item.productId, item.selectedSize, item.quantity + 1),
											"aria-label": `Increase ${item.title} quantity`,
											className: "p-1.5",
											children: /* @__PURE__ */ jsx(Plus, { className: "h-3.5 w-3.5" })
										})
									]
								}), /* @__PURE__ */ jsx("button", {
									type: "button",
									onClick: () => removeItem(item.productId, item.selectedSize),
									"aria-label": `Remove ${item.title}`,
									className: "rounded-lg p-1.5 text-[var(--ca-text-muted)] hover:text-red-600",
									children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" })
								})]
							})]
						}, `${item.productId}-${item.selectedSize}`))
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-6 flex flex-wrap items-center justify-between gap-4 pt-2",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
							className: "text-xs text-[var(--ca-text-muted)]",
							children: "Bag Subtotal"
						}), /* @__PURE__ */ jsx("p", {
							className: "font-mono-nums text-xl font-bold text-[var(--ca-text)]",
							children: formatPKR(subtotal)
						})] }), /* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => setBagCheckoutOpen((v) => !v),
							className: "btn-press inline-flex items-center gap-2 rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-bg)]",
							children: [bagCheckoutOpen ? "Hide Checkout Form" : "Checkout Bag (COD)", /* @__PURE__ */ jsx(ArrowRight, { className: "h-3.5 w-3.5" })]
						})]
					}),
					bagCheckoutOpen && /* @__PURE__ */ jsxs("form", {
						onSubmit: handleBagCheckout,
						noValidate: true,
						className: "mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2",
						children: [
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("input", {
								required: true,
								maxLength: 80,
								value: fullName,
								onChange: (e) => setFullName(e.target.value),
								placeholder: "Full Name",
								className: "w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
							}), fieldErrors.fullName && /* @__PURE__ */ jsx("p", {
								className: "mt-1 text-xs text-red-600 dark:text-red-400",
								children: fieldErrors.fullName
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("input", {
								required: true,
								maxLength: 24,
								value: phone,
								onChange: (e) => setPhone(e.target.value),
								placeholder: "Mobile Number (0335...)",
								className: "w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
							}), fieldErrors.phone && /* @__PURE__ */ jsx("p", {
								className: "mt-1 text-xs text-red-600 dark:text-red-400",
								children: fieldErrors.phone
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("input", {
								maxLength: 24,
								value: whatsapp,
								onChange: (e) => setWhatsapp(e.target.value),
								placeholder: "WhatsApp Number",
								className: "w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
							}), fieldErrors.whatsapp && /* @__PURE__ */ jsx("p", {
								className: "mt-1 text-xs text-red-600 dark:text-red-400",
								children: fieldErrors.whatsapp
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("input", {
								required: true,
								maxLength: 12,
								value: postalCode,
								onChange: (e) => setPostalCode(e.target.value),
								placeholder: "Postal Code",
								className: "w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
							}), fieldErrors.postalCode && /* @__PURE__ */ jsx("p", {
								className: "mt-1 text-xs text-red-600 dark:text-red-400",
								children: fieldErrors.postalCode
							})] }),
							/* @__PURE__ */ jsxs("div", {
								className: "sm:col-span-2",
								children: [/* @__PURE__ */ jsx("input", {
									required: true,
									maxLength: 200,
									value: address,
									onChange: (e) => setAddress(e.target.value),
									placeholder: "Full Address",
									className: "w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
								}), fieldErrors.address && /* @__PURE__ */ jsx("p", {
									className: "mt-1 text-xs text-red-600 dark:text-red-400",
									children: fieldErrors.address
								})]
							}),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("input", {
								required: true,
								maxLength: 60,
								value: city,
								onChange: (e) => setCity(e.target.value),
								placeholder: "City",
								className: "w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
							}), fieldErrors.city && /* @__PURE__ */ jsx("p", {
								className: "mt-1 text-xs text-red-600 dark:text-red-400",
								children: fieldErrors.city
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [
								/* @__PURE__ */ jsx("input", {
									maxLength: 20,
									value: referralCode,
									onChange: (e) => setReferralCode(e.target.value.toUpperCase()),
									placeholder: "Seller Referral ID (optional)",
									className: "font-mono-nums w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm uppercase"
								}),
								referralState.status === "valid" && /* @__PURE__ */ jsxs("p", {
									className: "mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400",
									children: [
										/* @__PURE__ */ jsx(ShieldCheck, { className: "h-3.5 w-3.5" }),
										"Verified Seller: ",
										referralState.sellerName
									]
								}),
								referralState.status === "invalid" && referralCode.trim() && /* @__PURE__ */ jsx("p", {
									className: "mt-1 text-xs text-red-600 dark:text-red-400",
									children: "Seller ID not recognized or inactive."
								}),
								fieldErrors.referralCode && /* @__PURE__ */ jsx("p", {
									className: "mt-1 text-xs text-red-600 dark:text-red-400",
									children: fieldErrors.referralCode
								})
							] }),
							/* @__PURE__ */ jsx("div", {
								className: "sm:col-span-2",
								children: /* @__PURE__ */ jsx(TurnstileField, {
									action: "bag_checkout",
									onToken: setTurnstileToken,
									honeypot,
									onHoneypotChange: setHoneypot
								})
							}),
							/* @__PURE__ */ jsx("div", {
								className: "sm:col-span-2 flex justify-end",
								children: /* @__PURE__ */ jsx(CAProcessButton, {
									type: "submit",
									loading: submittingBag,
									status: bagBtnStatus,
									className: "rounded-xl bg-[var(--ca-accent)] px-6 py-2.5 text-xs font-semibold text-[var(--ca-accent-fg)]",
									children: "Place COD Order"
								})
							})
						]
					})
				]
			})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
				className: "font-display text-2xl font-semibold text-[var(--ca-text)]",
				children: "My Orders & Installments"
			}), !user ? /* @__PURE__ */ jsxs("div", {
				className: "glass-panel mt-4 rounded-2xl p-8 text-center",
				children: [/* @__PURE__ */ jsx("p", {
					className: "text-sm text-[var(--ca-text-muted)]",
					children: "Sign in to view your saved orders, live tracking status, and installment repayment schedule."
				}), /* @__PURE__ */ jsx(Link, {
					to: "/auth?redirect=/orders",
					className: "btn-press mt-4 inline-flex items-center rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-bg)]",
					children: "Sign In to Account"
				})]
			}) : loading ? /* @__PURE__ */ jsx("div", {
				className: "mt-4",
				children: /* @__PURE__ */ jsx(CardListSkeleton, { rows: 3 })
			}) : fetchError ? /* @__PURE__ */ jsx("div", {
				className: "mt-4",
				children: /* @__PURE__ */ jsx(FriendlyErrorState, {
					title: "Could not load your orders",
					message: fetchError,
					error: queryError,
					onRetry: () => refetch()
				})
			}) : orders.length === 0 ? /* @__PURE__ */ jsxs("div", {
				className: "ca-fade-in glass-panel mt-4 rounded-2xl p-8 text-center",
				children: [/* @__PURE__ */ jsx("p", {
					className: "text-sm text-[var(--ca-text-muted)]",
					children: "No orders placed yet."
				}), /* @__PURE__ */ jsx(Link, {
					to: "/shop",
					className: "btn-press mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-surface-subtle)] px-4 py-2 text-xs font-semibold text-[var(--ca-text)]",
					children: "Browse Storefront"
				})]
			}) : /* @__PURE__ */ jsx("div", {
				className: "ca-fade-in mt-4 space-y-5",
				children: orders.map((order) => {
					const paidSummary = calculateOrderPaidSummary(order);
					const currentStepIndex = STATUS_STEPS.indexOf(order.status);
					return /* @__PURE__ */ jsxs("article", {
						className: "glass-panel rounded-2xl p-5 sm:p-6 space-y-5",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex flex-wrap items-start justify-between gap-3",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-2",
									children: [
										/* @__PURE__ */ jsx("span", {
											className: "font-mono-nums text-sm font-bold text-[var(--ca-text)]",
											children: order.id
										}),
										/* @__PURE__ */ jsx("span", {
											className: "text-xs text-[var(--ca-text-muted)]",
											children: "·"
										}),
										/* @__PURE__ */ jsx("span", {
											className: "text-xs text-[var(--ca-text-muted)]",
											children: new Date(order.createdAt).toLocaleDateString()
										})
									]
								}), /* @__PURE__ */ jsx("p", {
									className: "mt-1 text-xs text-[var(--ca-text-muted)]",
									children: order.paymentMethod === "installments" ? `Installments (${order.planLabel}) · Ref ${order.referralCode}` : "Cash on Delivery"
								})] }), /* @__PURE__ */ jsxs("div", {
									className: "text-right",
									children: [/* @__PURE__ */ jsx("p", {
										className: "font-mono-nums text-base font-bold text-[var(--ca-text)]",
										children: formatPKR(order.totalAmount)
									}), /* @__PURE__ */ jsxs("span", {
										className: `mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${order.status === "complete" ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" : order.status === "rejected" ? "bg-red-500/12 text-red-600 dark:text-red-400" : "bg-[var(--ca-accent)]/12 text-[var(--ca-accent)]"}`,
										children: [order.status === "complete" ? /* @__PURE__ */ jsx(CheckCircle2, { className: "h-3 w-3" }) : order.status === "rejected" ? /* @__PURE__ */ jsx(XCircle, { className: "h-3 w-3" }) : /* @__PURE__ */ jsx(Clock, { className: "h-3 w-3" }), order.status]
									})]
								})]
							}),
							order.status !== "rejected" && /* @__PURE__ */ jsx("div", {
								className: "grid grid-cols-3 gap-2",
								children: STATUS_STEPS.map((st, idx) => {
									const reached = currentStepIndex >= idx;
									return /* @__PURE__ */ jsxs("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ jsx("div", { className: `h-1.5 rounded-sm transition-colors ${reached ? "bg-[var(--ca-accent)]" : "bg-[var(--ca-surface-subtle)]"}` }), /* @__PURE__ */ jsx("p", {
											className: `text-[11px] font-medium capitalize ${reached ? "text-[var(--ca-text)]" : "text-[var(--ca-text-muted)]"}`,
											children: st
										})]
									}, st);
								})
							}),
							/* @__PURE__ */ jsx("div", {
								className: "space-y-2",
								children: order.items.map((it, idx) => /* @__PURE__ */ jsxs("div", {
									className: "flex items-center justify-between text-xs",
									children: [/* @__PURE__ */ jsxs("span", {
										className: "text-[var(--ca-text)]",
										children: [
											it.title,
											" × ",
											it.quantity,
											" ",
											it.selectedSize ? `(${it.selectedSize})` : ""
										]
									}), /* @__PURE__ */ jsx("span", {
										className: "font-mono-nums text-[var(--ca-text-muted)]",
										children: formatPKR(it.unitPrice * it.quantity)
									})]
								}, idx))
							}),
							order.paymentMethod === "installments" && /* @__PURE__ */ jsxs("div", {
								className: "rounded-xl bg-[var(--ca-surface-subtle)] p-4 space-y-3",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "flex flex-wrap items-center justify-between gap-2 text-xs",
										children: [/* @__PURE__ */ jsx("span", {
											className: "font-semibold text-[var(--ca-text)]",
											children: "Installment Repayment Schedule"
										}), /* @__PURE__ */ jsxs("span", {
											className: "font-mono-nums text-[var(--ca-text-muted)]",
											children: [
												"Paid ",
												/* @__PURE__ */ jsx("strong", {
													className: "text-[var(--ca-text)]",
													children: formatPKR(paidSummary.paidAmount)
												}),
												" · Remaining",
												" ",
												/* @__PURE__ */ jsx("strong", {
													className: "text-[var(--ca-text)]",
													children: formatPKR(paidSummary.remainingAmount)
												})
											]
										})]
									}),
									/* @__PURE__ */ jsx("div", {
										className: "h-2 w-full overflow-hidden rounded-sm bg-[var(--ca-surface-solid)]",
										children: /* @__PURE__ */ jsx("div", {
											style: { width: `${paidSummary.progressPercent}%` },
											className: "h-full bg-[var(--ca-accent)] transition-all"
										})
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs",
										children: [order.advanceAmount > 0 && /* @__PURE__ */ jsxs("div", {
											className: "flex items-center justify-between rounded-xl bg-[var(--ca-surface-solid)] px-3 py-2",
											children: [/* @__PURE__ */ jsx("span", { children: "Advance" }), /* @__PURE__ */ jsxs("span", {
												className: "font-mono-nums font-semibold",
												children: [
													formatPKR(order.advanceAmount),
													" · ",
													order.advancePaid ? "Paid" : "Due"
												]
											})]
										}), order.installmentSchedule.map((row) => /* @__PURE__ */ jsxs("div", {
											className: "flex items-center justify-between rounded-xl bg-[var(--ca-surface-solid)] px-3 py-2",
											children: [/* @__PURE__ */ jsxs("span", { children: [
												"#",
												row.installmentNumber,
												" (",
												row.dueDate,
												")"
											] }), /* @__PURE__ */ jsxs("span", {
												className: `font-mono-nums font-semibold ${row.paid ? "text-emerald-600 dark:text-emerald-400" : ""}`,
												children: [
													formatPKR(row.amount),
													" · ",
													row.paid ? "Paid" : "Due"
												]
											})]
										}, row.installmentNumber))]
									})
								]
							}),
							/* @__PURE__ */ jsx(OrderIssueForm, { order })
						]
					}, order.id);
				})
			})] })]
		})
	] });
}
export { OrdersPage };
