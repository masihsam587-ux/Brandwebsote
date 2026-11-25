import { S as formatPKR, _ as sanitizePlainText, a as notificationService, b as calculateOrderPaidSummary, f as canTriggerAction, i as feedbackService, l as userService } from "./api-CtuVoLbu.js";
import { C as clearAllClientCaches, S as useToast, b as useAuth, d as feedbackReplySchema, h as profileUpdateSchema, l as extractZodFieldErrors, n as CALoadingOverlay, r as CAProcessButton, u as feedbackCreateSchema } from "./CALoader-DYHlE_Xc.js";
import { a as NotificationListSkeleton, i as FriendlyErrorState, m as useTheme, o as ProfilePageSkeleton, p as useCart, s as SellerDashboardSkeleton, t as SeoHead } from "../entry-server.js";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { Award, Bell, Check, Copy, LogOut, Moon, Send, Share2, Sun, Trash2, User } from "lucide-react";
// src/components/RouteGuard.tsx
/**
* UX Route Guard: blocks rendering protected/role-gated UI until session state resolves.
* Note: All authorization MUST also be enforced server-side / via RLS policies.
*/
function RouteGuard({ requireAuth = true, requiredRole, children, fallbackTitle = "Sign In Required", fallbackDescription = "Please sign in with an authorized account to access this view." }) {
	const { user, loading } = useAuth();
	if (loading) return /* @__PURE__ */ jsx(ProfilePageSkeleton, {});
	if (requireAuth && !user) return /* @__PURE__ */ jsx("section", {
		className: "mx-auto max-w-lg px-4 py-16 text-center",
		children: /* @__PURE__ */ jsxs("div", {
			className: "glass-panel rounded-2xl p-8",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "font-display text-3xl font-semibold text-[var(--ca-text)]",
					children: fallbackTitle
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-2 text-sm text-[var(--ca-text-muted)]",
					children: fallbackDescription
				}),
				/* @__PURE__ */ jsx(Link, {
					to: "/auth?redirect=/profile",
					className: "btn-press mt-6 inline-flex rounded-xl bg-[var(--ca-text)] px-6 py-3 text-sm font-semibold text-[var(--ca-bg)]",
					children: "Sign In / Register"
				})
			]
		})
	});
	if (requiredRole && user?.role !== requiredRole) return /* @__PURE__ */ jsx("section", {
		className: "mx-auto max-w-lg px-4 py-16 text-center",
		children: /* @__PURE__ */ jsxs("div", {
			className: "glass-panel rounded-2xl p-8",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "font-display text-3xl font-semibold text-[var(--ca-text)]",
					children: "Seller Access Only"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-2 text-sm text-[var(--ca-text-muted)]",
					children: "This dashboard is reserved for verified CA Seller accounts."
				}),
				/* @__PURE__ */ jsx(Link, {
					to: "/shop",
					className: "btn-press mt-6 inline-flex rounded-xl bg-[var(--ca-text)] px-6 py-3 text-sm font-semibold text-[var(--ca-bg)]",
					children: "Browse Catalog"
				})
			]
		})
	});
	return /* @__PURE__ */ jsx(Fragment, { children });
}
// src/pages/ProfilePage.tsx
function ProfilePage() {
	const { user, unreadNotifications, refreshUnreadCount, setUser, logout } = useAuth();
	const { clearCart } = useCart();
	const { theme, toggleTheme } = useTheme();
	const { showToast } = useToast();
	const navigate = useNavigate();
	const [tab, setTab] = useState("account");
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [whatsapp, setWhatsapp] = useState("");
	const [address, setAddress] = useState("");
	const [city, setCity] = useState("");
	const [postalCode, setPostalCode] = useState("");
	const [profileErrors, setProfileErrors] = useState({});
	const [savingProfile, setSavingProfile] = useState(false);
	const [profileBtnStatus, setProfileBtnStatus] = useState("idle");
	const [notifications, setNotifications] = useState([]);
	const [threads, setThreads] = useState([]);
	const [newSubject, setNewSubject] = useState("");
	const [newMessage, setNewMessage] = useState("");
	const [sendingFeedback, setSendingFeedback] = useState(false);
	const [replyText, setReplyText] = useState({});
	const [replyingThreadId, setReplyingThreadId] = useState(null);
	const [loadingExtras, setLoadingExtras] = useState(false);
	const [extrasError, setExtrasError] = useState(null);
	const [sellerData, setSellerData] = useState(null);
	const [copiedId, setCopiedId] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
	const [deletingAccount, setDeletingAccount] = useState(false);
	useEffect(() => {
		if (!user) return;
		setName(user.name || "");
		setPhone(user.phone || "");
		setWhatsapp(user.whatsapp || "");
		setAddress(user.address || "");
		setCity(user.city || "");
		setPostalCode(user.postalCode || "");
	}, [user]);
	const loadAccountExtras = useCallback(async () => {
		if (!user) return;
		setLoadingExtras(true);
		setExtrasError(null);
		try {
			const [notifs, fbs] = await Promise.all([notificationService.listNotifications(), feedbackService.listMyThreads()]);
			setNotifications(notifs);
			setThreads(fbs);
			if (user.role === "seller") {
				const sd = await userService.getSellerDashboard();
				setSellerData(sd);
			}
		} catch (err) {
			setExtrasError(err instanceof Error ? err.message : "Could not load account data.");
		} finally {
			setLoadingExtras(false);
		}
	}, [user]);
	useEffect(() => {
		loadAccountExtras();
	}, [loadAccountExtras]);
	const handleSaveProfile = async (e) => {
		e.preventDefault();
		if (!user || savingProfile) return;
		if (!canTriggerAction("profile-save", 800)) return;
		setProfileErrors({});
		const parsed = profileUpdateSchema.safeParse({
			name,
			phone,
			whatsapp,
			address,
			city,
			postalCode
		});
		if (!parsed.success) {
			setProfileErrors(extractZodFieldErrors(parsed.error));
			setProfileBtnStatus("error");
			window.setTimeout(() => setProfileBtnStatus("idle"), 500);
			showToast("Please correct the highlighted profile fields.", "error");
			return;
		}
		setSavingProfile(true);
		setProfileBtnStatus("idle");
		try {
			const updated = await userService.updateProfile({
				name: sanitizePlainText(parsed.data.name, 80),
				phone: sanitizePlainText(parsed.data.phone, 24),
				whatsapp: sanitizePlainText(parsed.data.whatsapp, 24),
				address: sanitizePlainText(parsed.data.address, 200),
				city: sanitizePlainText(parsed.data.city, 60),
				postalCode: sanitizePlainText(parsed.data.postalCode, 16)
			});
			setUser(updated);
			setProfileBtnStatus("success");
			showToast("Profile updated.", "success");
			window.setTimeout(() => setProfileBtnStatus("idle"), 900);
		} catch (err) {
			setProfileBtnStatus("error");
			window.setTimeout(() => setProfileBtnStatus("idle"), 500);
			showToast(err instanceof Error ? err.message : "Update failed", "error");
		} finally {
			setSavingProfile(false);
		}
	};
	const handleCreateFeedback = async (e) => {
		e.preventDefault();
		if (sendingFeedback) return;
		if (!canTriggerAction("feedback-create", 1e3)) return;
		const parsed = feedbackCreateSchema.safeParse({
			subject: newSubject,
			message: newMessage
		});
		if (!parsed.success) {
			showToast(parsed.error.issues[0]?.message || "Enter a valid subject and message.", "error");
			return;
		}
		setSendingFeedback(true);
		try {
			const thread = await feedbackService.createThread(sanitizePlainText(parsed.data.subject, 120), sanitizePlainText(parsed.data.message, 800));
			setThreads((prev) => [thread, ...prev]);
			setNewSubject("");
			setNewMessage("");
			showToast("Message sent to CA Support.", "success");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Could not send message", "error");
		} finally {
			setSendingFeedback(false);
		}
	};
	const handleReplyThread = async (threadId) => {
		const rawText = replyText[threadId] || "";
		if (replyingThreadId) return;
		if (!canTriggerAction(`feedback-reply-${threadId}`, 800)) return;
		const parsed = feedbackReplySchema.safeParse({ body: rawText });
		if (!parsed.success) {
			showToast(parsed.error.issues[0]?.message || "Reply cannot be empty.", "error");
			return;
		}
		setReplyingThreadId(threadId);
		try {
			const updated = await feedbackService.replyToThread(threadId, sanitizePlainText(parsed.data.body, 800));
			setThreads((prev) => prev.map((t) => t.id === threadId ? updated : t));
			setReplyText((prev) => ({
				...prev,
				[threadId]: ""
			}));
			showToast("Reply sent.", "success");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Reply failed", "error");
		} finally {
			setReplyingThreadId(null);
		}
	};
	const handleMarkAllRead = async () => {
		await notificationService.markAllRead();
		setNotifications((prev) => prev.map((n) => ({
			...n,
			read: true
		})));
		await refreshUnreadCount();
	};
	const handleDeleteAccount = async () => {
		if (deletingAccount || !user) return;
		setDeletingAccount(true);
		try {
			await userService.deleteAccount(deleteConfirmEmail.trim());
			clearCart();
			clearAllClientCaches();
			setUser(null);
			setDeleteOpen(false);
			showToast("Your account has been deleted.", "info");
			navigate("/");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Email confirmation mismatch", "error");
		} finally {
			setDeletingAccount(false);
		}
	};
	const handleShareSellerId = () => {
		if (!sellerData) return;
		const shareText = `Shop Cinematic Arts (CA) with my verified Seller Referral ID: ${sellerData.sellerCode} — unlock 2, 3, or 4 month PKR installments at ${window.location.origin}/shop`;
		if (navigator.share) navigator.share({
			title: "Cinematic Arts Referral",
			text: shareText
		}).catch(() => {});
		else {
			navigator.clipboard?.writeText(shareText);
			showToast("Referral invitation copied to clipboard.", "success");
		}
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(SeoHead, {
		title: user ? `${user.name} — Profile | Cinematic Arts (CA)` : "Your Account — Cinematic Arts (CA)",
		description: "Manage your Cinematic Arts profile, notifications, support replies, and Seller Referral Dashboard.",
		canonicalPath: "/profile",
		noIndex: true
	}), /* @__PURE__ */ jsx(RouteGuard, {
		requireAuth: true,
		fallbackTitle: "Your CA Account",
		fallbackDescription: "Sign in to edit delivery details, inspect order notifications, message store support, or access your Seller Referral Dashboard.",
		children: user && /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsx(CALoadingOverlay, {
				open: savingProfile || sendingFeedback || deletingAccount,
				label: deletingAccount ? "Deleting account..." : sendingFeedback ? "Sending message to CA Support..." : "Saving profile..."
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "glass-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-4",
							children: [/* @__PURE__ */ jsx("div", {
								className: "flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[var(--ca-surface-subtle)] text-lg font-semibold text-[var(--ca-text)]",
								children: user.avatarUrl ? /* @__PURE__ */ jsx("img", {
									src: user.avatarUrl,
									alt: user.name,
									className: "h-full w-full object-cover"
								}) : user.name.slice(0, 2).toUpperCase()
							}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
								className: "font-display text-2xl font-semibold text-[var(--ca-text)] sm:text-3xl",
								children: user.name
							}), /* @__PURE__ */ jsxs("p", {
								className: "text-xs text-[var(--ca-text-muted)]",
								children: [
									user.email,
									" · ",
									user.role === "seller" ? `Verified Seller (${user.sellerCode})` : "Customer Account"
								]
							})] })]
						}), /* @__PURE__ */ jsxs("div", {
							className: "flex flex-wrap items-center gap-2",
							children: [/* @__PURE__ */ jsxs("button", {
								type: "button",
								onClick: toggleTheme,
								className: "inline-flex items-center gap-1.5 rounded-xl border border-[var(--ca-border)] px-3 py-2 text-xs font-medium text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]",
								children: [theme === "light" ? /* @__PURE__ */ jsx(Moon, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ jsx(Sun, { className: "h-3.5 w-3.5" }), theme === "light" ? "Dark Mode" : "Light Mode"]
							}), /* @__PURE__ */ jsxs("button", {
								type: "button",
								onClick: async () => {
									await logout();
									clearCart();
									showToast("Signed out.", "info");
									navigate("/");
								},
								className: "inline-flex items-center gap-1.5 rounded-xl border border-[var(--ca-border)] px-3.5 py-2 text-xs font-medium text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]",
								children: [/* @__PURE__ */ jsx(LogOut, { className: "h-3.5 w-3.5" }), "Sign Out"]
							})]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						role: "tablist",
						className: "mt-6 flex flex-wrap gap-1.5 rounded-xl bg-[var(--ca-surface-subtle)] p-1.5",
						children: [
							/* @__PURE__ */ jsxs("button", {
								type: "button",
								role: "tab",
								"aria-selected": tab === "account",
								onClick: () => setTab("account"),
								className: `btn-press inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${tab === "account" ? "bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm" : "text-[var(--ca-text-muted)]"}`,
								children: [/* @__PURE__ */ jsx(User, { className: "h-3.5 w-3.5" }), "Account Info"]
							}),
							/* @__PURE__ */ jsxs("button", {
								type: "button",
								role: "tab",
								"aria-selected": tab === "notifications",
								onClick: () => setTab("notifications"),
								className: `btn-press inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${tab === "notifications" ? "bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm" : "text-[var(--ca-text-muted)]"}`,
								children: [
									/* @__PURE__ */ jsx(Bell, { className: "h-3.5 w-3.5" }),
									"Notifications & Support ",
									unreadNotifications > 0 ? `(${unreadNotifications})` : ""
								]
							}),
							user.role === "seller" && /* @__PURE__ */ jsxs("button", {
								type: "button",
								role: "tab",
								"aria-selected": tab === "seller",
								onClick: () => setTab("seller"),
								className: `btn-press inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${tab === "seller" ? "bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm" : "text-[var(--ca-text-muted)]"}`,
								children: [/* @__PURE__ */ jsx(Award, { className: "h-3.5 w-3.5" }), "Seller Dashboard"]
							})
						]
					}),
					tab === "account" && /* @__PURE__ */ jsxs("div", {
						className: "mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3",
						children: [/* @__PURE__ */ jsxs("form", {
							onSubmit: handleSaveProfile,
							noValidate: true,
							className: "glass-panel space-y-4 rounded-2xl p-6 lg:col-span-2",
							children: [
								/* @__PURE__ */ jsx("h2", {
									className: "font-display text-2xl font-semibold",
									children: "Edit Delivery Details"
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-1 gap-4 sm:grid-cols-2",
									children: [
										/* @__PURE__ */ jsxs("div", { children: [
											/* @__PURE__ */ jsx("label", {
												className: "block text-xs font-medium text-[var(--ca-text-muted)]",
												children: "Full Name"
											}),
											/* @__PURE__ */ jsx("input", {
												type: "text",
												maxLength: 80,
												value: name,
												onChange: (e) => setName(e.target.value),
												className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
											}),
											profileErrors.name && /* @__PURE__ */ jsx("p", {
												className: "mt-1 text-xs text-red-600 dark:text-red-400",
												children: profileErrors.name
											})
										] }),
										/* @__PURE__ */ jsxs("div", { children: [
											/* @__PURE__ */ jsx("label", {
												className: "block text-xs font-medium text-[var(--ca-text-muted)]",
												children: "Phone"
											}),
											/* @__PURE__ */ jsx("input", {
												type: "tel",
												maxLength: 24,
												value: phone,
												onChange: (e) => setPhone(e.target.value),
												className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
											}),
											profileErrors.phone && /* @__PURE__ */ jsx("p", {
												className: "mt-1 text-xs text-red-600 dark:text-red-400",
												children: profileErrors.phone
											})
										] }),
										/* @__PURE__ */ jsxs("div", { children: [
											/* @__PURE__ */ jsx("label", {
												className: "block text-xs font-medium text-[var(--ca-text-muted)]",
												children: "WhatsApp"
											}),
											/* @__PURE__ */ jsx("input", {
												type: "tel",
												maxLength: 24,
												value: whatsapp,
												onChange: (e) => setWhatsapp(e.target.value),
												className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
											}),
											profileErrors.whatsapp && /* @__PURE__ */ jsx("p", {
												className: "mt-1 text-xs text-red-600 dark:text-red-400",
												children: profileErrors.whatsapp
											})
										] }),
										/* @__PURE__ */ jsxs("div", { children: [
											/* @__PURE__ */ jsx("label", {
												className: "block text-xs font-medium text-[var(--ca-text-muted)]",
												children: "City"
											}),
											/* @__PURE__ */ jsx("input", {
												type: "text",
												maxLength: 60,
												value: city,
												onChange: (e) => setCity(e.target.value),
												className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
											}),
											profileErrors.city && /* @__PURE__ */ jsx("p", {
												className: "mt-1 text-xs text-red-600 dark:text-red-400",
												children: profileErrors.city
											})
										] }),
										/* @__PURE__ */ jsxs("div", {
											className: "sm:col-span-2",
											children: [
												/* @__PURE__ */ jsx("label", {
													className: "block text-xs font-medium text-[var(--ca-text-muted)]",
													children: "Street Address"
												}),
												/* @__PURE__ */ jsx("input", {
													type: "text",
													maxLength: 200,
													value: address,
													onChange: (e) => setAddress(e.target.value),
													className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
												}),
												profileErrors.address && /* @__PURE__ */ jsx("p", {
													className: "mt-1 text-xs text-red-600 dark:text-red-400",
													children: profileErrors.address
												})
											]
										}),
										/* @__PURE__ */ jsxs("div", { children: [
											/* @__PURE__ */ jsx("label", {
												className: "block text-xs font-medium text-[var(--ca-text-muted)]",
												children: "Postal Code"
											}),
											/* @__PURE__ */ jsx("input", {
												type: "text",
												maxLength: 12,
												value: postalCode,
												onChange: (e) => setPostalCode(e.target.value),
												className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
											}),
											profileErrors.postalCode && /* @__PURE__ */ jsx("p", {
												className: "mt-1 text-xs text-red-600 dark:text-red-400",
												children: profileErrors.postalCode
											})
										] })
									]
								}),
								/* @__PURE__ */ jsx(CAProcessButton, {
									type: "submit",
									loading: savingProfile,
									status: profileBtnStatus,
									className: "rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-bg)]",
									children: "Save Changes"
								})
							]
						}), /* @__PURE__ */ jsxs("div", {
							className: "space-y-4",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "glass-panel rounded-2xl p-6",
								children: [/* @__PURE__ */ jsx("h3", {
									className: "text-sm font-semibold",
									children: "Quick Links"
								}), /* @__PURE__ */ jsxs("div", {
									className: "mt-3 flex flex-col gap-2 text-xs",
									children: [/* @__PURE__ */ jsx(Link, {
										to: "/orders",
										className: "rounded-xl bg-[var(--ca-surface-subtle)] px-3.5 py-2.5 font-medium hover:opacity-85",
										children: "View Bag & My Orders"
									}), /* @__PURE__ */ jsx(Link, {
										to: "/shop",
										className: "rounded-xl bg-[var(--ca-surface-subtle)] px-3.5 py-2.5 font-medium hover:opacity-85",
										children: "Browse Catalog"
									})]
								})]
							}), /* @__PURE__ */ jsxs("div", {
								className: "glass-panel rounded-2xl p-6",
								children: [
									/* @__PURE__ */ jsx("h3", {
										className: "text-sm font-semibold text-red-600 dark:text-red-400",
										children: "Delete Account"
									}),
									/* @__PURE__ */ jsx("p", {
										className: "mt-1 text-xs text-[var(--ca-text-muted)]",
										children: "Permanently remove your profile from Cinematic Arts."
									}),
									/* @__PURE__ */ jsxs("button", {
										type: "button",
										onClick: () => setDeleteOpen(true),
										className: "mt-3 inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400",
										children: [/* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" }), "Delete Account"]
									})
								]
							})]
						})]
					}),
					tab === "notifications" && /* @__PURE__ */ jsx("div", {
						className: "mt-6",
						children: loadingExtras ? /* @__PURE__ */ jsx(NotificationListSkeleton, {}) : extrasError ? /* @__PURE__ */ jsx(FriendlyErrorState, {
							title: "Could not load notifications",
							message: extrasError,
							onRetry: loadAccountExtras
						}) : /* @__PURE__ */ jsxs("div", {
							className: "ca-fade-in grid grid-cols-1 gap-6 lg:grid-cols-2",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "glass-panel rounded-2xl p-6 space-y-4",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ jsx("h2", {
										className: "font-display text-2xl font-semibold",
										children: "Notifications"
									}), unreadNotifications > 0 && /* @__PURE__ */ jsx("button", {
										type: "button",
										onClick: handleMarkAllRead,
										className: "text-xs font-medium text-[var(--ca-accent)] hover:underline",
										children: "Mark all read"
									})]
								}), notifications.length === 0 ? /* @__PURE__ */ jsx("p", {
									className: "text-sm text-[var(--ca-text-muted)]",
									children: "No notifications yet."
								}) : /* @__PURE__ */ jsx("div", {
									className: "space-y-3",
									children: notifications.map((n) => /* @__PURE__ */ jsxs("div", {
										onClick: async () => {
											if (!n.read) {
												await notificationService.markAsRead(n.id);
												setNotifications((prev) => prev.map((x) => x.id === n.id ? {
													...x,
													read: true
												} : x));
												await refreshUnreadCount();
											}
										},
										className: `rounded-xl p-4 transition-colors ${n.read ? "bg-[var(--ca-surface-subtle)]" : "bg-[var(--ca-accent)]/10 ring-1 ring-[var(--ca-accent)]/40"}`,
										children: [/* @__PURE__ */ jsxs("div", {
											className: "flex items-center justify-between text-xs",
											children: [/* @__PURE__ */ jsx("span", {
												className: "font-semibold text-[var(--ca-text)]",
												children: n.title
											}), /* @__PURE__ */ jsx("span", {
												className: "text-[var(--ca-text-muted)]",
												children: n.read ? "Read" : "Unread"
											})]
										}), /* @__PURE__ */ jsx("p", {
											className: "mt-1.5 text-xs leading-relaxed text-[var(--ca-text-muted)]",
											children: n.message
										})]
									}, n.id))
								})]
							}), /* @__PURE__ */ jsxs("div", {
								className: "glass-panel rounded-2xl p-6 space-y-5",
								children: [
									/* @__PURE__ */ jsx("h2", {
										className: "font-display text-2xl font-semibold",
										children: "Feedback & Support Replies"
									}),
									/* @__PURE__ */ jsxs("form", {
										onSubmit: handleCreateFeedback,
										className: "space-y-2.5 pb-2",
										children: [
											/* @__PURE__ */ jsx("input", {
												type: "text",
												required: true,
												maxLength: 120,
												value: newSubject,
												onChange: (e) => setNewSubject(e.target.value),
												placeholder: "Subject (e.g. Sizing or Order Inquiry)",
												className: "w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2 text-xs"
											}),
											/* @__PURE__ */ jsx("textarea", {
												rows: 2,
												required: true,
												maxLength: 800,
												value: newMessage,
												onChange: (e) => setNewMessage(e.target.value),
												placeholder: "Write your question or feedback...",
												className: "w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2 text-xs"
											}),
											/* @__PURE__ */ jsxs(CAProcessButton, {
												type: "submit",
												loading: sendingFeedback,
												className: "rounded-xl bg-[var(--ca-text)] px-4 py-2 text-xs font-semibold text-[var(--ca-bg)]",
												children: [/* @__PURE__ */ jsx(Send, { className: "h-3 w-3" }), "Send to Store Support"]
											})
										]
									}),
									/* @__PURE__ */ jsx("div", {
										className: "space-y-4",
										children: threads.map((thread) => /* @__PURE__ */ jsxs("div", {
											className: "rounded-xl bg-[var(--ca-surface-subtle)] p-4 space-y-3",
											children: [
												/* @__PURE__ */ jsx("p", {
													className: "text-xs font-semibold text-[var(--ca-text)]",
													children: thread.subject
												}),
												/* @__PURE__ */ jsx("div", {
													className: "space-y-2",
													children: thread.messages.map((m) => /* @__PURE__ */ jsxs("div", {
														className: `rounded-xl px-3 py-2 text-xs ${m.senderRole === "admin" ? "bg-[var(--ca-accent)]/12 text-[var(--ca-text)]" : "bg-[var(--ca-surface-subtle)] text-[var(--ca-text)]"}`,
														children: [/* @__PURE__ */ jsxs("strong", { children: [m.senderName, ": "] }), m.body]
													}, m.id))
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "flex gap-2",
													children: [/* @__PURE__ */ jsx("input", {
														type: "text",
														maxLength: 800,
														value: replyText[thread.id] || "",
														onChange: (e) => setReplyText((prev) => ({
															...prev,
															[thread.id]: e.target.value
														})),
														placeholder: "Reply back...",
														className: "flex-1 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-1.5 text-xs"
													}), /* @__PURE__ */ jsx(CAProcessButton, {
														type: "button",
														loading: replyingThreadId === thread.id,
														onClick: () => handleReplyThread(thread.id),
														className: "rounded-xl bg-[var(--ca-text)] px-3.5 py-1.5 text-xs font-semibold text-[var(--ca-bg)]",
														children: "Reply"
													})]
												})
											]
										}, thread.id))
									})
								]
							})]
						})
					}),
					tab === "seller" && /* @__PURE__ */ jsx(RouteGuard, {
						requiredRole: "seller",
						children: /* @__PURE__ */ jsx("div", {
							className: "mt-6",
							children: loadingExtras || !sellerData && !extrasError ? /* @__PURE__ */ jsx(SellerDashboardSkeleton, {}) : extrasError ? /* @__PURE__ */ jsx(FriendlyErrorState, {
								title: "Could not load seller dashboard",
								message: extrasError,
								onRetry: loadAccountExtras
							}) : sellerData ? /* @__PURE__ */ jsxs("div", {
								className: "ca-fade-in space-y-6",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-1 gap-4 md:grid-cols-4",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "glass-panel rounded-2xl p-5 md:col-span-2",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-xs text-[var(--ca-text-muted)]",
												children: "Unique Seller Referral ID"
											}), /* @__PURE__ */ jsxs("div", {
												className: "mt-1 flex flex-wrap items-center justify-between gap-3",
												children: [/* @__PURE__ */ jsx("span", {
													className: "font-mono-nums text-2xl font-bold text-[var(--ca-accent)]",
													children: sellerData.sellerCode
												}), /* @__PURE__ */ jsxs("div", {
													className: "flex gap-2",
													children: [/* @__PURE__ */ jsxs("button", {
														type: "button",
														onClick: () => {
															navigator.clipboard?.writeText(sellerData.sellerCode);
															setCopiedId(true);
															window.setTimeout(() => setCopiedId(false), 2e3);
														},
														className: "inline-flex items-center gap-1 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-1.5 text-xs font-medium",
														children: [copiedId ? /* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5 text-emerald-600" }) : /* @__PURE__ */ jsx(Copy, { className: "h-3.5 w-3.5" }), copiedId ? "Copied" : "Copy"]
													}), /* @__PURE__ */ jsxs("button", {
														type: "button",
														onClick: handleShareSellerId,
														className: "inline-flex items-center gap-1 rounded-xl bg-[var(--ca-text)] px-3 py-1.5 text-xs font-medium text-[var(--ca-bg)]",
														children: [/* @__PURE__ */ jsx(Share2, { className: "h-3.5 w-3.5" }), "Share"]
													})]
												})]
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "glass-panel rounded-2xl p-5",
											children: [
												/* @__PURE__ */ jsx("span", {
													className: "text-xs text-[var(--ca-text-muted)]",
													children: "Commission Earned (10%)"
												}),
												/* @__PURE__ */ jsx("p", {
													className: "font-mono-nums mt-1 text-2xl font-bold text-[var(--ca-text)]",
													children: formatPKR(sellerData.commissionEarned)
												}),
												/* @__PURE__ */ jsxs("p", {
													className: "mt-0.5 text-[11px] text-[var(--ca-text-muted)]",
													children: [
														sellerData.completedReferrals,
														" completed of ",
														sellerData.totalReferrals,
														" referrals"
													]
												})
											]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "glass-panel rounded-2xl p-5",
											children: [
												/* @__PURE__ */ jsx("span", {
													className: "text-xs text-[var(--ca-text-muted)]",
													children: "Pending Commission"
												}),
												/* @__PURE__ */ jsx("p", {
													className: "font-mono-nums mt-1 text-2xl font-bold text-[var(--ca-text)]",
													children: formatPKR(sellerData.pendingCommission)
												}),
												/* @__PURE__ */ jsx("p", {
													className: "mt-0.5 text-[11px] text-[var(--ca-text-muted)]",
													children: "Credited on order completion"
												})
											]
										})
									]
								}), /* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-1 gap-6 lg:grid-cols-2",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "glass-panel rounded-2xl p-6 space-y-4",
										children: [
											/* @__PURE__ */ jsx("h2", {
												className: "font-display text-2xl font-semibold",
												children: "Installment Recovery Tracker"
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "grid grid-cols-3 gap-3 text-xs",
												children: [
													/* @__PURE__ */ jsxs("div", {
														className: "rounded-xl bg-[var(--ca-surface-subtle)] p-3",
														children: [/* @__PURE__ */ jsx("span", {
															className: "text-[var(--ca-text-muted)]",
															children: "Financed"
														}), /* @__PURE__ */ jsx("p", {
															className: "font-mono-nums mt-1 font-bold",
															children: formatPKR(sellerData.recoverySummary.totalFinanced)
														})]
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "rounded-xl bg-[var(--ca-surface-subtle)] p-3",
														children: [/* @__PURE__ */ jsx("span", {
															className: "text-[var(--ca-text-muted)]",
															children: "Recovered"
														}), /* @__PURE__ */ jsx("p", {
															className: "font-mono-nums mt-1 font-bold text-[var(--ca-text)]",
															children: formatPKR(sellerData.recoverySummary.totalRecovered)
														})]
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "rounded-xl bg-[var(--ca-surface-subtle)] p-3",
														children: [/* @__PURE__ */ jsx("span", {
															className: "text-[var(--ca-text-muted)]",
															children: "Remaining"
														}), /* @__PURE__ */ jsx("p", {
															className: "font-mono-nums mt-1 font-bold text-[var(--ca-accent)]",
															children: formatPKR(sellerData.recoverySummary.totalRemaining)
														})]
													})
												]
											}),
											/* @__PURE__ */ jsx("div", {
												className: "space-y-2.5 pt-2",
												children: sellerData.referredOrders.length === 0 ? /* @__PURE__ */ jsx("p", {
													className: "text-xs text-[var(--ca-text-muted)]",
													children: "No referred orders yet."
												}) : sellerData.referredOrders.map((ord) => {
													const sum = calculateOrderPaidSummary(ord);
													return /* @__PURE__ */ jsxs("div", {
														className: "rounded-xl bg-[var(--ca-surface-subtle)] p-3.5 text-xs",
														children: [/* @__PURE__ */ jsxs("div", {
															className: "flex items-center justify-between",
															children: [/* @__PURE__ */ jsxs("span", {
																className: "font-mono-nums font-bold",
																children: [
																	ord.id,
																	" · ",
																	ord.customerName
																]
															}), /* @__PURE__ */ jsx("span", {
																className: "rounded-full bg-[var(--ca-accent)]/12 px-2.5 py-0.5 text-[11px] font-medium capitalize text-[var(--ca-accent)]",
																children: ord.status
															})]
														}), /* @__PURE__ */ jsxs("div", {
															className: "mt-1 flex justify-between text-[var(--ca-text-muted)]",
															children: [/* @__PURE__ */ jsx("span", { children: ord.paymentMethod === "installments" ? `Paid ${formatPKR(sum.paidAmount)} / Remaining ${formatPKR(sum.remainingAmount)}` : `COD ${formatPKR(ord.totalAmount)}` }), /* @__PURE__ */ jsxs("span", {
																className: "font-mono-nums font-semibold text-[var(--ca-text)]",
																children: ["Comm: ", formatPKR(ord.commissionAmount)]
															})]
														})]
													}, ord.id);
												})
											})
										]
									}), /* @__PURE__ */ jsxs("div", {
										className: "space-y-6",
										children: [/* @__PURE__ */ jsxs("div", {
											className: "glass-panel rounded-2xl p-6",
											children: [/* @__PURE__ */ jsx("h2", {
												className: "font-display text-2xl font-semibold",
												children: "Monthly Earnings"
											}), /* @__PURE__ */ jsx("div", {
												className: "mt-4 space-y-3",
												children: sellerData.monthlyEarnings.length === 0 ? /* @__PURE__ */ jsx("p", {
													className: "text-xs text-[var(--ca-text-muted)]",
													children: "Completed referred commissions will chart here by month."
												}) : sellerData.monthlyEarnings.map((m) => {
													const max = Math.max(...sellerData.monthlyEarnings.map((x) => x.commission), 1);
													const pct = Math.max(8, Math.round(m.commission / max * 100));
													return /* @__PURE__ */ jsxs("div", {
														className: "space-y-1 text-xs",
														children: [/* @__PURE__ */ jsxs("div", {
															className: "flex justify-between",
															children: [/* @__PURE__ */ jsx("span", {
																className: "font-mono-nums font-semibold",
																children: m.month
															}), /* @__PURE__ */ jsxs("span", {
																className: "font-mono-nums",
																children: [
																	formatPKR(m.commission),
																	" (",
																	m.orders,
																	" ",
																	m.orders === 1 ? "order" : "orders",
																	")"
																]
															})]
														}), /* @__PURE__ */ jsx("div", {
															className: "h-2.5 w-full overflow-hidden rounded-sm bg-[var(--ca-surface-subtle)]",
															children: /* @__PURE__ */ jsx("div", {
																style: { width: `${pct}%` },
																className: "h-full bg-[var(--ca-accent)]"
															})
														})]
													}, m.month);
												})
											})]
										}), /* @__PURE__ */ jsxs("div", {
											className: "glass-panel rounded-2xl p-6",
											children: [/* @__PURE__ */ jsx("h3", {
												className: "text-sm font-semibold",
												children: "My Personal Installment Purchases"
											}), /* @__PURE__ */ jsx("div", {
												className: "mt-3 space-y-2",
												children: sellerData.ownInstallmentOrders.length === 0 ? /* @__PURE__ */ jsx("p", {
													className: "text-xs text-[var(--ca-text-muted)]",
													children: "You have no personal installment purchases."
												}) : sellerData.ownInstallmentOrders.map((ord) => {
													const sum = calculateOrderPaidSummary(ord);
													return /* @__PURE__ */ jsxs("div", {
														className: "flex items-center justify-between rounded-xl bg-[var(--ca-surface-subtle)] px-3.5 py-2.5 text-xs",
														children: [/* @__PURE__ */ jsx("span", {
															className: "font-mono-nums font-semibold",
															children: ord.id
														}), /* @__PURE__ */ jsxs("span", {
															className: "font-mono-nums text-[var(--ca-text-muted)]",
															children: [
																"Paid ",
																formatPKR(sum.paidAmount),
																" / ",
																formatPKR(ord.totalAmount)
															]
														})]
													}, ord.id);
												})
											})]
										})]
									})]
								})]
							}) : null
						})
					})
				]
			}),
			deleteOpen && /* @__PURE__ */ jsx("div", {
				role: "dialog",
				"aria-modal": "true",
				className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",
				children: /* @__PURE__ */ jsxs("div", {
					className: "glass-panel max-w-md rounded-2xl p-6 shadow-xl",
					children: [
						/* @__PURE__ */ jsx("h3", {
							className: "font-display text-2xl font-semibold text-red-600 dark:text-red-400",
							children: "Confirm Account Deletion"
						}),
						/* @__PURE__ */ jsxs("p", {
							className: "mt-2 text-xs leading-relaxed text-[var(--ca-text-muted)]",
							children: [
								"Type your account email (",
								/* @__PURE__ */ jsx("strong", {
									className: "text-[var(--ca-text)]",
									children: user.email
								}),
								") to permanently delete your profile."
							]
						}),
						/* @__PURE__ */ jsx("input", {
							type: "email",
							value: deleteConfirmEmail,
							onChange: (e) => setDeleteConfirmEmail(e.target.value),
							placeholder: user.email,
							className: "mt-4 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2 text-sm"
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "mt-5 flex justify-end gap-2",
							children: [/* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => setDeleteOpen(false),
								className: "btn-press min-h-[44px] rounded-xl border border-[var(--ca-border)] px-4 py-2 text-xs font-medium",
								children: "Cancel"
							}), /* @__PURE__ */ jsx(CAProcessButton, {
								type: "button",
								loading: deletingAccount,
								onClick: handleDeleteAccount,
								className: "rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white",
								children: "Confirm Delete"
							})]
						})
					]
				})
			})
		] })
	})] });
}
export { ProfilePage };
