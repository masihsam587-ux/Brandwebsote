import { C as DEFAULT_TERMS_POLICY, S as formatPKR, b as calculateOrderPaidSummary, c as storageService, g as maskPhone, n as api, s as productService, t as adminService } from "./api-CtuVoLbu.js";
import { S as useToast, a as adminManualEntrySchema, b as useAuth, n as CALoadingOverlay, o as adminProductSchema, r as CAProcessButton, s as adminTermsSchema, t as CALoader, w as queryClient } from "./CALoader-DYHlE_Xc.js";
import { i as FriendlyErrorState, n as AdminWorkspaceSkeleton } from "../entry-server.js";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { ArrowLeft, BarChart3, Bell, Check, Eye, EyeOff, FileText, Lock, MapPin, MessageSquare, Package, Phone, Plus, Search, ShoppingCart, Trash2, UserCheck, X } from "lucide-react";
import { createPortal } from "react-dom";
// src/components/AdminConsole.tsx
var ADMIN_INACTIVITY_MS = 9e5;
var MAX_FAILED_ATTEMPTS = 5;
var LOCKOUT_SECONDS = 60;
function decodeTokenExpMs(token) {
	try {
		const part = token.split(".")[0];
		if (!part) return null;
		const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
		const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
		const parsed = JSON.parse(atob(padded));
		if (typeof parsed.exp === "number") return parsed.exp < 0xe8d4a51000 ? parsed.exp * 1e3 : parsed.exp;
		return null;
	} catch {
		return null;
	}
}
function AdminConsole({ mode, active = true, onClose }) {
	const { user: authUser } = useAuth();
	const { showToast } = useToast();
	const isSupabaseMode = api.mode === "supabase";
	const [adminToken, setAdminToken] = useState(null);
	const [configured, setConfigured] = useState(null);
	const [adminEmail, setAdminEmail] = useState(authUser?.email || "");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPwd, setShowPwd] = useState(false);
	const [authError, setAuthError] = useState(null);
	const [authLoading, setAuthLoading] = useState(false);
	const [authBtnStatus, setAuthBtnStatus] = useState("idle");
	const [failedAttempts, setFailedAttempts] = useState(0);
	const [lockoutUntil, setLockoutUntil] = useState(null);
	const [remainingLockoutSec, setRemainingLockoutSec] = useState(0);
	const [tab, setTab] = useState("dashboard");
	const [loadingData, setLoadingData] = useState(false);
	const [dataError, setDataError] = useState(null);
	const [overview, setOverview] = useState(null);
	const [orders, setOrders] = useState([]);
	const [selectedOrder, setSelectedOrder] = useState(null);
	const [users, setUsers] = useState([]);
	const [feedback, setFeedback] = useState([]);
	const [products, setProducts] = useState([]);
	const [categories, setCategories] = useState([]);
	const [plans, setPlans] = useState([]);
	const [manualEntries, setManualEntries] = useState([]);
	const [termsDoc, setTermsDoc] = useState(DEFAULT_TERMS_POLICY);
	const [savingTerms, setSavingTerms] = useState(false);
	const [savingManual, setSavingManual] = useState(false);
	const [sendingNotif, setSendingNotif] = useState(false);
	const [replyingFeedbackId, setReplyingFeedbackId] = useState(null);
	const [savingProduct, setSavingProduct] = useState(false);
	const [deletingProductId, setDeletingProductId] = useState(null);
	const [confirmDeleteProductId, setConfirmDeleteProductId] = useState(null);
	const [uploadingCover, setUploadingCover] = useState(false);
	const [savingCategory, setSavingCategory] = useState(false);
	const [deletingCategoryId, setDeletingCategoryId] = useState(null);
	const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState(null);
	const [savingPlans, setSavingPlans] = useState(false);
	const [manualFormOpen, setManualFormOpen] = useState(false);
	const [manualDate, setManualDate] = useState(() => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
	const [manualLabel, setManualLabel] = useState("");
	const [manualRevenue, setManualRevenue] = useState("");
	const [manualCogs, setManualCogs] = useState("");
	const [manualOrdersCount, setManualOrdersCount] = useState("1");
	const [manualCommission, setManualCommission] = useState("0");
	const [manualNotes, setManualNotes] = useState("");
	const [notifMode, setNotifMode] = useState("user");
	const [userSearch, setUserSearch] = useState("");
	const [targetUserId, setTargetUserId] = useState("");
	const [notifTitle, setNotifTitle] = useState("");
	const [notifMsg, setNotifMsg] = useState("");
	const [replyMap, setReplyMap] = useState({});
	const [feedbackSearch, setFeedbackSearch] = useState("");
	const [feedbackUserFilter, setFeedbackUserFilter] = useState("all");
	const [feedbackStatusFilter, setFeedbackStatusFilter] = useState("all");
	const [editingId, setEditingId] = useState(null);
	const [prodTitle, setProdTitle] = useState("");
	const [prodPrice, setProdPrice] = useState("");
	const [prodCost, setProdCost] = useState("");
	const [prodCat, setProdCat] = useState("");
	const [prodDesc, setProdDesc] = useState("");
	const [prodCover, setProdCover] = useState("");
	const [prodExtra, setProdExtra] = useState("");
	const [newCatName, setNewCatName] = useState("");
	const [visibleOrdersCount, setVisibleOrdersCount] = useState(12);
	const [visibleProductsCount, setVisibleProductsCount] = useState(24);
	const lockAdminSession = useCallback((reason) => {
		setAdminToken(null);
		setAuthBtnStatus("idle");
		setSelectedOrder(null);
		setOverview(null);
		setOrders([]);
		setUsers([]);
		setFeedback([]);
		setManualEntries([]);
		setDataError(null);
		setPassword("");
		setConfirmPassword("");
		queryClient.removeQueries({ queryKey: ["admin"] });
		if (reason) showToast(reason, "info");
	}, [showToast]);
	useEffect(() => {
		if (!active || typeof document === "undefined") return;
		let robots = document.head.querySelector("meta[name=\"robots\"]");
		const existed = Boolean(robots);
		const prevContent = robots?.getAttribute("content") || "index,follow";
		if (!robots) {
			robots = document.createElement("meta");
			robots.setAttribute("name", "robots");
			document.head.appendChild(robots);
		}
		robots.setAttribute("content", "noindex,nofollow");
		return () => {
			if (!robots) return;
			if (existed) robots.setAttribute("content", prevContent);
			else robots.remove();
		};
	}, [active]);
	useEffect(() => {
		if (!lockoutUntil) {
			setRemainingLockoutSec(0);
			return;
		}
		const tick = () => {
			const diff = Math.ceil((lockoutUntil - Date.now()) / 1e3);
			if (diff <= 0) {
				setLockoutUntil(null);
				setRemainingLockoutSec(0);
				setFailedAttempts(0);
			} else setRemainingLockoutSec(diff);
		};
		tick();
		const id = window.setInterval(tick, 1e3);
		return () => window.clearInterval(id);
	}, [lockoutUntil]);
	useEffect(() => {
		if (!active || !adminToken) return;
		let inactivityTimer;
		const resetInactivity = () => {
			window.clearTimeout(inactivityTimer);
			inactivityTimer = window.setTimeout(() => {
				lockAdminSession("Admin auto-locked after 15 minutes of inactivity.");
			}, ADMIN_INACTIVITY_MS);
		};
		const events = [
			"mousemove",
			"keydown",
			"pointerdown",
			"scroll"
		];
		events.forEach((ev) => window.addEventListener(ev, resetInactivity, { passive: true }));
		resetInactivity();
		const expMs = decodeTokenExpMs(adminToken);
		const expChecker = window.setInterval(() => {
			if (expMs && Date.now() >= expMs) lockAdminSession("Admin session token expired. Locked for security.");
		}, 15e3);
		return () => {
			window.clearTimeout(inactivityTimer);
			window.clearInterval(expChecker);
			events.forEach((ev) => window.removeEventListener(ev, resetInactivity));
		};
	}, [
		active,
		adminToken,
		lockAdminSession
	]);
	useEffect(() => {
		if (!active) return;
		setAuthError(null);
		if (authUser?.email && !adminEmail) setAdminEmail(authUser.email);
		if (!adminToken) adminService.getAuthStatus().then((s) => setConfigured(s.configured)).catch(() => setConfigured(true));
	}, [
		active,
		adminToken,
		authUser?.email,
		adminEmail
	]);
	const loadAllAdminData = useCallback(async (token) => {
		setLoadingData(true);
		setDataError(null);
		try {
			const [ov, ords, usrs, fbs, prods, cats, pls, mans, terms] = await Promise.all([
				adminService.getOverview(token),
				adminService.listAllOrders(token),
				adminService.listAllUsers(token),
				adminService.listFeedbackThreads(token),
				adminService.listAdminProducts(token),
				productService.listCategories(),
				productService.listInstallmentPlans(),
				adminService.listManualEntries(token),
				productService.getTermsPolicy()
			]);
			setOverview(ov);
			setOrders(ords);
			setUsers(usrs);
			setFeedback(fbs);
			setProducts(prods);
			setCategories(cats);
			setPlans(pls);
			setManualEntries(mans);
			setTermsDoc(terms);
			setProdCat((prev) => prev && cats.some((c) => c.id === prev) ? prev : cats[0]?.id || "");
			setTargetUserId((prev) => prev && usrs.some((u) => u.id === prev) ? prev : usrs[0]?.id || "");
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Failed to load admin workspace";
			if (/401|403|unauthori|expired|token|password/i.test(msg)) {
				showToast(msg, "error");
				lockAdminSession();
			} else {
				setDataError(msg);
				showToast(msg, "error");
			}
		} finally {
			setLoadingData(false);
		}
	}, [lockAdminSession, showToast]);
	useEffect(() => {
		if (active && adminToken) loadAllAdminData(adminToken);
	}, [
		active,
		adminToken,
		loadAllAdminData
	]);
	useEffect(() => {
		if (!selectedOrder) return;
		const onKey = (e) => {
			if (e.key === "Escape") setSelectedOrder(null);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [selectedOrder]);
	const triggerAuthError = (msg) => {
		setAuthError(msg);
		setAuthBtnStatus("error");
		window.setTimeout(() => setAuthBtnStatus("idle"), 500);
	};
	const handleAuthSubmit = async (e) => {
		e.preventDefault();
		if (authLoading || remainingLockoutSec > 0) return;
		setAuthError(null);
		setAuthBtnStatus("idle");
		if (isSupabaseMode && !adminEmail.trim() && !authUser?.email) {
			triggerAuthError("Admin email is required.");
			return;
		}
		if (!password) {
			triggerAuthError("Password is required.");
			return;
		}
		if (configured === false) {
			if (password.length < 8) {
				triggerAuthError("Initial admin password must be at least 8 characters.");
				return;
			}
			if (password !== confirmPassword) {
				triggerAuthError("Passwords do not match.");
				return;
			}
		}
		setAuthLoading(true);
		try {
			const res = configured === false ? await adminService.setupInitialPassword(password) : await adminService.verifyAdminPassword(password, (adminEmail || authUser?.email || "").trim() || void 0);
			setAdminToken(res.token);
			setFailedAttempts(0);
			setLockoutUntil(null);
			setPassword("");
			setConfirmPassword("");
			setAuthBtnStatus("success");
			showToast("Admin session verified (15m auto-lock active).", "success");
		} catch (err) {
			const nextFails = failedAttempts + 1;
			setFailedAttempts(nextFails);
			if (nextFails >= MAX_FAILED_ATTEMPTS) {
				const until = Date.now() + LOCKOUT_SECONDS * 1e3;
				setLockoutUntil(until);
				setRemainingLockoutSec(LOCKOUT_SECONDS);
				triggerAuthError(`Too many incorrect attempts. Locked for ${LOCKOUT_SECONDS}s (server rate limits also apply).`);
			} else {
				const base = err instanceof Error ? err.message : "Verification failed.";
				triggerAuthError(`${base} (${MAX_FAILED_ATTEMPTS - nextFails} attempts remaining)`);
			}
		} finally {
			setAuthLoading(false);
		}
	};
	const handleOrderStatus = async (orderId, status) => {
		if (!adminToken) return;
		try {
			const updated = await adminService.updateOrderStatus(adminToken, orderId, status);
			setOrders((prev) => prev.map((o) => o.id === orderId ? updated : o));
			if (selectedOrder?.id === orderId) setSelectedOrder(updated);
			const ov = await adminService.getOverview(adminToken);
			setOverview(ov);
			showToast(status === "complete" && updated.referralSellerId ? `Order ${orderId} completed · 10% commission credited.` : `Order ${orderId} updated to ${status}.`, "success");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Update failed", "error");
		}
	};
	const handleToggleInstallment = async (orderId, installmentNumber, paid, isAdvance = false) => {
		if (!adminToken) return;
		try {
			const updated = await adminService.toggleInstallmentPayment(adminToken, orderId, installmentNumber, paid, isAdvance);
			setOrders((prev) => prev.map((o) => o.id === orderId ? updated : o));
			setSelectedOrder(updated);
			showToast("Installment ledger updated.", "success");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Failed to update ledger", "error");
		}
	};
	const handleSendNotification = async (e) => {
		e.preventDefault();
		if (!adminToken || sendingNotif) return;
		if (notifMode === "user" && !targetUserId) {
			showToast("Please select a specific user to notify.", "error");
			return;
		}
		if (!notifTitle.trim() || !notifMsg.trim()) {
			showToast("Title and message are required.", "error");
			return;
		}
		setSendingNotif(true);
		try {
			await adminService.sendNotification(adminToken, {
				targetUserId: notifMode === "all" ? null : targetUserId,
				title: notifTitle,
				message: notifMsg
			});
			setNotifTitle("");
			setNotifMsg("");
			const recipient = users.find((u) => u.id === targetUserId);
			showToast(notifMode === "all" ? "Broadcast sent to all users." : `Private notification sent to ${recipient?.name || "selected user"}.`, "success");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Dispatch failed", "error");
		} finally {
			setSendingNotif(false);
		}
	};
	const handleFeedbackReply = async (threadId) => {
		if (!adminToken || replyingFeedbackId) return;
		const text = (replyMap[threadId] || "").trim();
		if (!text) return;
		const targetThread = feedback.find((t) => t.id === threadId);
		setReplyingFeedbackId(threadId);
		try {
			const updated = await adminService.replyFeedbackThread(adminToken, threadId, text);
			setFeedback((prev) => prev.map((t) => t.id === threadId ? updated : t));
			setReplyMap((prev) => ({
				...prev,
				[threadId]: ""
			}));
			showToast(`Private reply sent to ${targetThread?.userName || "customer"} only.`, "success");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Failed to reply", "error");
		} finally {
			setReplyingFeedbackId(null);
		}
	};
	const handleSaveProduct = async (e) => {
		e.preventDefault();
		if (!adminToken || savingProduct) return;
		const parsedProd = adminProductSchema.safeParse({
			title: prodTitle,
			price: prodPrice,
			costPrice: prodCost,
			categoryId: prodCat || categories[0]?.id,
			description: prodDesc
		});
		if (!parsedProd.success) {
			showToast(parsedProd.error.issues[0]?.message || "Check product details.", "error");
			return;
		}
		setSavingProduct(true);
		try {
			const extraImages = prodExtra.split(",").map((s) => s.trim()).filter(Boolean);
			const saved = await adminService.saveProduct(adminToken, {
				id: editingId || void 0,
				title: parsedProd.data.title,
				price: parsedProd.data.price,
				costPrice: parsedProd.data.costPrice,
				categoryId: parsedProd.data.categoryId,
				description: parsedProd.data.description,
				coverImage: prodCover || void 0,
				extraImages
			});
			setProducts((prev) => editingId ? prev.map((p) => p.id === saved.id ? saved : p) : [saved, ...prev]);
			setEditingId(null);
			setProdTitle("");
			setProdPrice("");
			setProdCost("");
			setProdDesc("");
			setProdCover("");
			setProdExtra("");
			const ov = await adminService.getOverview(adminToken);
			setOverview(ov);
			queryClient.invalidateQueries({ queryKey: ["home"] });
			queryClient.invalidateQueries({ queryKey: ["products"] });
			showToast("Product saved.", "success");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Failed to save product", "error");
		} finally {
			setSavingProduct(false);
		}
	};
	const handleUploadCover = async (file) => {
		if (!file || uploadingCover) return;
		setUploadingCover(true);
		try {
			const url = await storageService.uploadImage(file, "products");
			setProdCover(url);
			showToast("Cover image ready.", "success");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Upload failed", "error");
		} finally {
			setUploadingCover(false);
		}
	};
	const handleCreateCategory = async () => {
		if (!adminToken || !newCatName.trim() || savingCategory) return;
		setSavingCategory(true);
		try {
			const created = await adminService.saveCategory(adminToken, { name: newCatName });
			setCategories((prev) => [...prev, created]);
			setProdCat(created.id);
			setNewCatName("");
			queryClient.invalidateQueries({ queryKey: ["home"] });
			queryClient.invalidateQueries({ queryKey: ["categories"] });
			queryClient.invalidateQueries({ queryKey: ["category"] });
			showToast(`Category "${created.name}" created.`, "success");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Failed to create category", "error");
		} finally {
			setSavingCategory(false);
		}
	};
	const handleDeleteProduct = async (product) => {
		if (!adminToken || deletingProductId) return;
		setDeletingProductId(product.id);
		try {
			const result = await adminService.deleteProduct(adminToken, product.id);
			if ((result && typeof result === "object" ? result.outcome : "deleted") === "archived") {
				setProducts((prev) => prev.map((x) => x.id === product.id ? {
					...x,
					inStock: false
				} : x));
				showToast(`"${product.title}" is linked to past orders, so it was archived and hidden from your shop.`, "info");
			} else {
				setProducts((prev) => prev.filter((x) => x.id !== product.id));
				if (editingId === product.id) {
					setEditingId(null);
					setProdTitle("");
					setProdPrice("");
					setProdCost("");
					setProdDesc("");
					setProdCover("");
					setProdExtra("");
				}
				showToast(`Product "${product.title}" deleted from backend.`, "success");
			}
			setConfirmDeleteProductId(null);
			const ov = await adminService.getOverview(adminToken);
			setOverview(ov);
			queryClient.invalidateQueries({ queryKey: ["home"] });
			queryClient.invalidateQueries({ queryKey: ["products"] });
			queryClient.invalidateQueries({ queryKey: ["product"] });
			queryClient.invalidateQueries({ queryKey: ["category"] });
			queryClient.invalidateQueries({ queryKey: ["categories"] });
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Could not delete product.", "error");
		} finally {
			setDeletingProductId(null);
		}
	};
	const handleDeleteCategory = async (category, cascadeProducts) => {
		if (!adminToken || deletingCategoryId) return;
		setDeletingCategoryId(category.id);
		try {
			const result = await adminService.deleteCategory(adminToken, category.id, { cascadeProducts });
			const removedProdIds = new Set(result && typeof result === "object" && Array.isArray(result.deletedProductIds) ? result.deletedProductIds : []);
			const remainingCategories = categories.filter((c) => c.id !== category.id);
			setCategories((prev) => prev.filter((c) => c.id !== category.id));
			if (removedProdIds.size > 0 || cascadeProducts) {
				setProducts((prev) => prev.filter((p) => !removedProdIds.has(p.id) && !(cascadeProducts && p.categoryId === category.id)));
				if (editingId && removedProdIds.has(editingId)) {
					setEditingId(null);
					setProdTitle("");
					setProdPrice("");
					setProdCost("");
					setProdDesc("");
					setProdCover("");
					setProdExtra("");
				}
			}
			setProdCat((prev) => prev === category.id ? remainingCategories[0]?.id || "" : prev);
			setConfirmDeleteCategoryId(null);
			const ov = await adminService.getOverview(adminToken);
			setOverview(ov);
			queryClient.invalidateQueries({ queryKey: ["home"] });
			queryClient.invalidateQueries({ queryKey: ["categories"] });
			queryClient.invalidateQueries({ queryKey: ["category"] });
			queryClient.invalidateQueries({ queryKey: ["products"] });
			queryClient.invalidateQueries({ queryKey: ["product"] });
			showToast(removedProdIds.size > 0 ? `Category "${category.name}" and ${removedProdIds.size} product(s) deleted.` : `Category "${category.name}" deleted.`, "success");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Could not delete category.", "error");
		} finally {
			setDeletingCategoryId(null);
		}
	};
	const handleSavePlans = async () => {
		if (!adminToken || savingPlans) return;
		setSavingPlans(true);
		try {
			const updated = await adminService.saveInstallmentPlans(adminToken, plans);
			setPlans(updated);
			showToast("Installment plans updated.", "success");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Failed to update plans", "error");
		} finally {
			setSavingPlans(false);
		}
	};
	const handleAddManualEntry = async (e) => {
		e.preventDefault();
		if (!adminToken || savingManual) return;
		const parsedEntry = adminManualEntrySchema.safeParse({
			date: manualDate,
			label: manualLabel,
			revenue: manualRevenue || 0,
			costOfGoods: manualCogs || 0,
			commissionAmount: manualCommission || 0,
			ordersCount: manualOrdersCount || 1,
			notes: manualNotes.trim() || void 0
		});
		if (!parsedEntry.success) {
			showToast(parsedEntry.error.issues[0]?.message || "Check manual entry fields.", "error");
			return;
		}
		setSavingManual(true);
		try {
			const created = await adminService.addManualEntry(adminToken, {
				date: parsedEntry.data.date,
				label: parsedEntry.data.label,
				revenue: parsedEntry.data.revenue,
				costOfGoods: parsedEntry.data.costOfGoods,
				commissionAmount: parsedEntry.data.commissionAmount,
				ordersCount: parsedEntry.data.ordersCount,
				notes: parsedEntry.data.notes
			});
			setManualEntries((prev) => [created, ...prev]);
			const ov = await adminService.getOverview(adminToken);
			setOverview(ov);
			setManualLabel("");
			setManualRevenue("");
			setManualCogs("");
			setManualOrdersCount("1");
			setManualCommission("0");
			setManualNotes("");
			setManualFormOpen(false);
			showToast("Manual dashboard entry added & charts updated.", "success");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Could not add manual entry", "error");
		} finally {
			setSavingManual(false);
		}
	};
	const handleDeleteManualEntry = async (entryId) => {
		if (!adminToken) return;
		try {
			await adminService.deleteManualEntry(adminToken, entryId);
			setManualEntries((prev) => prev.filter((m) => m.id !== entryId));
			const ov = await adminService.getOverview(adminToken);
			setOverview(ov);
			showToast("Manual entry removed.", "info");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Could not delete entry", "error");
		}
	};
	const handleSaveTermsPolicy = async (e) => {
		e.preventDefault();
		if (!adminToken) return;
		const parsedTerms = adminTermsSchema.safeParse({
			effectiveLabel: termsDoc.effectiveLabel,
			title: termsDoc.title,
			sections: termsDoc.sections,
			footerNote: termsDoc.footerNote
		});
		if (!parsedTerms.success) {
			showToast(parsedTerms.error.issues[0]?.message || "Check policy fields.", "error");
			return;
		}
		setSavingTerms(true);
		try {
			const saved = await adminService.saveTermsPolicy(adminToken, {
				effectiveLabel: parsedTerms.data.effectiveLabel,
				title: parsedTerms.data.title,
				sections: parsedTerms.data.sections,
				footerNote: parsedTerms.data.footerNote
			});
			setTermsDoc(saved);
			queryClient.invalidateQueries({ queryKey: ["terms"] });
			showToast("Terms & Policy updated live on /terms.", "success");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Failed to update Terms & Policy", "error");
		} finally {
			setSavingTerms(false);
		}
	};
	const filteredUsers = users.filter((u) => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.id.toLowerCase().includes(userSearch.toLowerCase()) || (u.sellerCode || "").toLowerCase().includes(userSearch.toLowerCase()));
	const isModal = mode === "modal";
	const adminBusy = savingTerms || savingManual || sendingNotif || savingProduct || Boolean(deletingProductId) || uploadingCover || savingCategory || Boolean(deletingCategoryId) || savingPlans;
	if (!adminToken) return /* @__PURE__ */ jsxs("div", {
		className: isModal ? "glass-panel ca-fade-in relative w-full max-w-md overflow-hidden rounded-2xl p-6 shadow-xl sm:p-8" : "glass-panel ca-fade-in relative mx-auto my-8 w-full max-w-md overflow-hidden rounded-2xl p-6 sm:p-8",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "mb-5 flex items-center justify-between gap-3",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ jsx("div", {
						className: "flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ca-accent)]/12 font-display text-sm font-semibold text-[var(--ca-accent)]",
						children: "CA"
					}), /* @__PURE__ */ jsx("h2", {
						className: "font-display text-2xl font-semibold text-[var(--ca-text)]",
						children: configured === false ? "Set Admin Password" : "Admin Lock Screen"
					})]
				}), isModal && onClose && /* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: onClose,
					"aria-label": "Close admin lock screen",
					className: "btn-press inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--ca-text-muted)] hover:bg-[var(--ca-surface-subtle)] hover:text-[var(--ca-text)]",
					children: /* @__PURE__ */ jsx(X, { className: "h-5 w-5" })
				})]
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-xs leading-relaxed text-[var(--ca-text-muted)]",
				children: configured === false ? "No ADMIN_PASSWORD env secret is set yet. Claim your initial admin password (hashed server-side)." : "Enter your server-verified administrator password to unlock. Sessions auto-lock after 15 minutes of inactivity."
			}),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: handleAuthSubmit,
				className: "mt-5 space-y-4",
				children: [
					authError && remainingLockoutSec === 0 && /* @__PURE__ */ jsx("div", {
						role: "alert",
						className: "ca-shake rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-600 dark:text-red-400",
						children: authError
					}),
					remainingLockoutSec > 0 && /* @__PURE__ */ jsxs("div", {
						role: "alert",
						"aria-live": "polite",
						className: "ca-shake rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-300",
						children: [
							"Too many incorrect attempts. Locked for",
							" ",
							/* @__PURE__ */ jsxs("span", {
								className: "font-mono-nums font-bold",
								children: [remainingLockoutSec, "s"]
							}),
							" (backend rate limits also apply)."
						]
					}),
					isSupabaseMode && configured !== false && /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
						htmlFor: "admin-email-input",
						className: "block text-xs font-medium text-[var(--ca-text-muted)]",
						children: "Admin Email"
					}), /* @__PURE__ */ jsx("input", {
						id: "admin-email-input",
						type: "email",
						required: true,
						value: adminEmail,
						disabled: remainingLockoutSec > 0,
						onChange: (e) => setAdminEmail(e.target.value),
						placeholder: "admin@example.com",
						className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none disabled:opacity-50"
					})] }),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
						htmlFor: "admin-password-input",
						className: "block text-xs font-medium text-[var(--ca-text-muted)]",
						children: "Admin Password"
					}), /* @__PURE__ */ jsxs("div", {
						className: "relative mt-1",
						children: [/* @__PURE__ */ jsx("input", {
							id: "admin-password-input",
							type: showPwd ? "text" : "password",
							value: password,
							disabled: remainingLockoutSec > 0,
							onChange: (e) => setPassword(e.target.value),
							autoFocus: isModal,
							placeholder: "Enter administrator password",
							className: `w-full rounded-xl border bg-[var(--ca-surface-solid)] px-3.5 py-2.5 pr-12 text-sm text-[var(--ca-text)] focus:outline-none disabled:opacity-50 ${authError ? "border-red-500/70 focus:border-red-500" : "border-[var(--ca-border)] focus:border-[var(--ca-accent)]"}`
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setShowPwd((v) => !v),
							"aria-label": "Toggle password visibility",
							className: "inline-flex min-h-[44px] min-w-[44px] items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]",
							children: showPwd ? /* @__PURE__ */ jsx(EyeOff, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx(Eye, { className: "h-4 w-4" })
						})]
					})] }),
					configured === false && /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
						htmlFor: "admin-password-confirm",
						className: "block text-xs font-medium text-[var(--ca-text-muted)]",
						children: "Confirm Admin Password"
					}), /* @__PURE__ */ jsx("input", {
						id: "admin-password-confirm",
						type: showPwd ? "text" : "password",
						value: confirmPassword,
						disabled: remainingLockoutSec > 0,
						onChange: (e) => setConfirmPassword(e.target.value),
						className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none disabled:opacity-50"
					})] }),
					/* @__PURE__ */ jsxs(CAProcessButton, {
						type: "submit",
						loading: authLoading,
						status: authBtnStatus,
						disabled: remainingLockoutSec > 0,
						className: "w-full rounded-xl bg-[var(--ca-text)] py-3 text-sm font-semibold text-[var(--ca-bg)] hover:opacity-90",
						children: [/* @__PURE__ */ jsx(Lock, { className: "h-4 w-4" }), configured === false ? "Claim Password & Unlock" : remainingLockoutSec > 0 ? `Locked (${remainingLockoutSec}s)` : "Unlock"]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between pt-1 text-xs",
						children: [isModal && onClose ? /* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: onClose,
							className: "btn-press inline-flex min-h-[44px] items-center gap-1.5 font-medium text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]",
							children: [/* @__PURE__ */ jsx(ArrowLeft, { className: "h-3.5 w-3.5" }), "Back to site"]
						}) : /* @__PURE__ */ jsxs(Link, {
							to: "/",
							className: "btn-press inline-flex min-h-[44px] items-center gap-1.5 font-medium text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]",
							children: [/* @__PURE__ */ jsx(ArrowLeft, { className: "h-3.5 w-3.5" }), "Back to site"]
						}), /* @__PURE__ */ jsx("span", {
							className: "text-[11px] text-[var(--ca-text-muted)]",
							children: "Backend rate-limited"
						})]
					})
				]
			})
		]
	});
	return /* @__PURE__ */ jsxs("div", {
		className: isModal ? "glass-panel ca-fade-in flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl shadow-xl" : "glass-panel ca-fade-in flex w-full flex-col overflow-hidden rounded-2xl",
		children: [
			/* @__PURE__ */ jsx(CALoadingOverlay, {
				open: adminBusy,
				label: uploadingCover ? "Uploading image..." : savingTerms ? "Saving Terms & Policy..." : "Saving changes..."
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center justify-between gap-2 border-b border-[var(--ca-border)] px-4 py-3.5 sm:px-7 sm:py-4",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex min-w-0 items-center gap-2",
					children: [/* @__PURE__ */ jsx(Lock, { className: "h-4 w-4 shrink-0 text-[var(--ca-accent)]" }), /* @__PURE__ */ jsx("span", {
						className: "font-display truncate text-base font-semibold text-[var(--ca-text)] sm:text-xl",
						children: "CA Admin Console"
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "flex shrink-0 items-center gap-2",
					children: [/* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: () => lockAdminSession("Admin console locked."),
						className: "btn-press inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[var(--ca-border)] px-3 py-1.5 text-xs font-medium text-[var(--ca-text-muted)] hover:bg-[var(--ca-surface-subtle)] hover:text-[var(--ca-text)]",
						children: [/* @__PURE__ */ jsx(Lock, { className: "h-3.5 w-3.5" }), "Lock"]
					}), isModal && onClose ? /* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: onClose,
						"aria-label": "Close admin panel",
						className: "btn-press inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--ca-text-muted)] hover:bg-[var(--ca-surface-subtle)] hover:text-[var(--ca-text)]",
						children: /* @__PURE__ */ jsx(X, { className: "h-5 w-5" })
					}) : /* @__PURE__ */ jsxs(Link, {
						to: "/",
						className: "btn-press inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-[var(--ca-border)] px-3 py-1.5 text-xs font-medium text-[var(--ca-text-muted)] hover:bg-[var(--ca-surface-subtle)] hover:text-[var(--ca-text)]",
						children: [/* @__PURE__ */ jsx(ArrowLeft, { className: "h-3.5 w-3.5" }), "Back to site"]
					})]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: isModal ? "flex flex-1 flex-col overflow-hidden" : "flex flex-col",
				children: [/* @__PURE__ */ jsx("div", {
					className: "flex gap-1 overflow-x-auto border-b border-[var(--ca-border)] px-5 py-2.5 sm:px-7",
					children: [
						{
							id: "dashboard",
							label: "Dashboard",
							icon: BarChart3
						},
						{
							id: "orders",
							label: `Orders (${orders.length})`,
							icon: ShoppingCart
						},
						{
							id: "notifications",
							label: "Notifications",
							icon: Bell
						},
						{
							id: "feedback",
							label: `Feedback (${feedback.length})`,
							icon: MessageSquare
						},
						{
							id: "products",
							label: "Products & Plans",
							icon: Package
						},
						{
							id: "terms",
							label: "Terms & Policy",
							icon: FileText
						}
					].map((item) => {
						const Icon = item.icon;
						return /* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => setTab(item.id),
							className: `btn-press inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-medium transition-colors ${tab === item.id ? "bg-[var(--ca-text)] text-[var(--ca-bg)]" : "text-[var(--ca-text-muted)] hover:bg-[var(--ca-surface-subtle)] hover:text-[var(--ca-text)]"}`,
							children: [/* @__PURE__ */ jsx(Icon, { className: "h-3.5 w-3.5" }), item.label]
						}, item.id);
					})
				}), /* @__PURE__ */ jsx("div", {
					className: isModal ? "flex-1 overflow-y-auto p-5 sm:p-7" : "p-5 sm:p-7",
					children: loadingData && !overview ? /* @__PURE__ */ jsx(AdminWorkspaceSkeleton, {}) : dataError && !overview ? /* @__PURE__ */ jsx(FriendlyErrorState, {
						title: "Could not load admin workspace",
						message: dataError,
						onRetry: () => adminToken && loadAllAdminData(adminToken)
					}) : /* @__PURE__ */ jsxs("div", {
						className: "ca-fade-in",
						children: [
							tab === "dashboard" && overview && /* @__PURE__ */ jsxs("div", {
								className: "space-y-6",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
										children: [
											/* @__PURE__ */ jsxs("div", {
												className: "rounded-xl bg-[var(--ca-surface-subtle)] p-4",
												children: [/* @__PURE__ */ jsx("span", {
													className: "text-xs text-[var(--ca-text-muted)]",
													children: "Completed Revenue"
												}), /* @__PURE__ */ jsx("p", {
													className: "font-mono-nums mt-1 text-xl font-bold text-[var(--ca-text)]",
													children: formatPKR(overview.revenue)
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "rounded-xl bg-[var(--ca-surface-subtle)] p-4",
												children: [/* @__PURE__ */ jsx("span", {
													className: "text-xs text-[var(--ca-text-muted)]",
													children: "Gross Profit"
												}), /* @__PURE__ */ jsx("p", {
													className: "font-mono-nums mt-1 text-xl font-bold text-[var(--ca-text)]",
													children: formatPKR(overview.grossProfit)
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "rounded-xl bg-[var(--ca-surface-subtle)] p-4",
												children: [/* @__PURE__ */ jsxs("span", {
													className: "text-xs text-[var(--ca-text-muted)]",
													children: [
														"Net Profit (",
														overview.profitMarginPct,
														"% Margin)"
													]
												}), /* @__PURE__ */ jsx("p", {
													className: "font-mono-nums mt-1 text-xl font-bold text-[var(--ca-text)]",
													children: formatPKR(overview.netProfit)
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "rounded-xl bg-[var(--ca-surface-subtle)] p-4",
												children: [/* @__PURE__ */ jsx("span", {
													className: "text-xs text-[var(--ca-text-muted)]",
													children: "Total Orders"
												}), /* @__PURE__ */ jsxs("p", {
													className: "font-mono-nums mt-1 text-xl font-bold text-[var(--ca-text)]",
													children: [
														overview.ordersCount,
														" (",
														overview.pendingOrdersCount,
														" pending)"
													]
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "rounded-xl bg-[var(--ca-surface-subtle)] p-4",
												children: [/* @__PURE__ */ jsx("span", {
													className: "text-xs text-[var(--ca-text-muted)]",
													children: "Seller Commissions Payable (10%)"
												}), /* @__PURE__ */ jsx("p", {
													className: "font-mono-nums mt-1 text-xl font-bold text-[var(--ca-accent)]",
													children: formatPKR(overview.commissionsPayable)
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "rounded-xl bg-[var(--ca-surface-subtle)] p-4",
												children: [/* @__PURE__ */ jsx("span", {
													className: "text-xs text-[var(--ca-text-muted)]",
													children: "Cost of Goods Sold"
												}), /* @__PURE__ */ jsx("p", {
													className: "font-mono-nums mt-1 text-xl font-bold text-[var(--ca-text)]",
													children: formatPKR(overview.costOfGoods)
												})]
											})
										]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "grid grid-cols-1 gap-6 md:grid-cols-2",
										children: [/* @__PURE__ */ jsxs("div", {
											className: "rounded-xl bg-[var(--ca-surface-subtle)] p-5",
											children: [/* @__PURE__ */ jsx("h3", {
												className: "text-sm font-semibold text-[var(--ca-text)]",
												children: "Orders & Volume by Day"
											}), /* @__PURE__ */ jsx("div", {
												className: "mt-4 flex h-40 items-end gap-3 overflow-x-auto",
												children: overview.dailySeries.length === 0 ? /* @__PURE__ */ jsx("p", {
													className: "text-xs text-[var(--ca-text-muted)]",
													children: "No daily activity yet."
												}) : overview.dailySeries.map((d) => {
													const max = Math.max(...overview.dailySeries.map((x) => x.revenue), 1);
													const pct = Math.max(12, Math.round(d.revenue / max * 100));
													return /* @__PURE__ */ jsxs("div", {
														className: "flex min-w-[2.5rem] max-w-12 flex-1 flex-col items-center gap-1.5",
														children: [
															/* @__PURE__ */ jsx("span", {
																className: "font-mono-nums text-[10px] text-[var(--ca-text-muted)]",
																children: d.orders
															}),
															/* @__PURE__ */ jsx("div", {
																className: "flex h-24 w-full items-end rounded-lg bg-[var(--ca-surface-subtle)] p-1",
																children: /* @__PURE__ */ jsx("div", {
																	style: { height: `${pct}%` },
																	className: "w-full rounded bg-[var(--ca-text)]",
																	title: `${d.label}: ${formatPKR(d.revenue)}`
																})
															}),
															/* @__PURE__ */ jsx("span", {
																className: "font-mono-nums text-[10px] text-[var(--ca-text-muted)]",
																children: d.label
															})
														]
													}, d.label);
												})
											})]
										}), /* @__PURE__ */ jsxs("div", {
											className: "rounded-xl bg-[var(--ca-surface-subtle)] p-5",
											children: [/* @__PURE__ */ jsx("h3", {
												className: "text-sm font-semibold text-[var(--ca-text)]",
												children: "Monthly Completed Revenue vs Net Profit"
											}), /* @__PURE__ */ jsx("div", {
												className: "mt-4 space-y-3",
												children: overview.monthlySeries.length === 0 ? /* @__PURE__ */ jsx("p", {
													className: "text-xs text-[var(--ca-text-muted)]",
													children: "No completed months yet."
												}) : overview.monthlySeries.map((m) => {
													const max = Math.max(...overview.monthlySeries.map((x) => x.revenue), 1);
													const revPct = m.revenue > 0 ? Math.max(4, Math.round(m.revenue / max * 100)) : 0;
													const profPct = m.profit > 0 ? Math.max(4, Math.round(m.profit / max * 100)) : 0;
													return /* @__PURE__ */ jsxs("div", {
														className: "space-y-1",
														children: [
															/* @__PURE__ */ jsxs("div", {
																className: "flex flex-wrap justify-between gap-2 text-xs",
																children: [/* @__PURE__ */ jsx("span", {
																	className: "font-mono-nums font-medium",
																	children: m.label
																}), /* @__PURE__ */ jsxs("span", {
																	className: "font-mono-nums text-[var(--ca-text-muted)]",
																	children: [
																		formatPKR(m.revenue),
																		" · Profit ",
																		formatPKR(m.profit)
																	]
																})]
															}),
															/* @__PURE__ */ jsx("div", {
																className: "h-2.5 w-full overflow-hidden rounded-sm bg-[var(--ca-surface-solid)]",
																children: /* @__PURE__ */ jsx("div", {
																	style: { width: `${revPct}%` },
																	className: "h-full bg-[var(--ca-text)]"
																})
															}),
															/* @__PURE__ */ jsx("div", {
																className: "h-1.5 w-full overflow-hidden rounded-sm bg-[var(--ca-surface-solid)]",
																children: /* @__PURE__ */ jsx("div", {
																	style: { width: `${profPct}%` },
																	className: "h-full bg-[var(--ca-accent)]"
																})
															})
														]
													}, m.label);
												})
											})]
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "rounded-xl bg-[var(--ca-surface-subtle)] p-5 space-y-4",
										children: [
											/* @__PURE__ */ jsxs("div", {
												className: "flex flex-wrap items-center justify-between gap-3",
												children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", {
													className: "text-sm font-semibold text-[var(--ca-text)]",
													children: "Manual Dashboard Data Entries"
												}), /* @__PURE__ */ jsx("p", {
													className: "text-xs text-[var(--ca-text-muted)]",
													children: "Record offline store sales, COGS, and commissions so KPIs and charts reflect all business figures."
												})] }), /* @__PURE__ */ jsxs("button", {
													type: "button",
													onClick: () => setManualFormOpen((v) => !v),
													className: "btn-press inline-flex items-center gap-1.5 rounded-xl bg-[var(--ca-text)] px-3.5 py-2 text-xs font-semibold text-[var(--ca-bg)]",
													children: [/* @__PURE__ */ jsx(Plus, { className: "h-3.5 w-3.5" }), manualFormOpen ? "Close Entry Form" : "Add Manual Entry"]
												})]
											}),
											manualFormOpen && /* @__PURE__ */ jsxs("form", {
												onSubmit: handleAddManualEntry,
												className: "grid grid-cols-1 gap-3 rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-bg)] p-4 sm:grid-cols-3",
												children: [
													/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
														className: "block text-[11px] text-[var(--ca-text-muted)]",
														children: "Entry Date *"
													}), /* @__PURE__ */ jsx("input", {
														type: "date",
														required: true,
														value: manualDate,
														onChange: (e) => setManualDate(e.target.value),
														className: "font-mono-nums mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs"
													})] }),
													/* @__PURE__ */ jsxs("div", {
														className: "sm:col-span-2",
														children: [/* @__PURE__ */ jsx("label", {
															className: "block text-[11px] text-[var(--ca-text-muted)]",
															children: "Batch / Sale Description *"
														}), /* @__PURE__ */ jsx("input", {
															type: "text",
															required: true,
															value: manualLabel,
															onChange: (e) => setManualLabel(e.target.value),
															placeholder: "e.g. Store Walk-In Batch",
															className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs"
														})]
													}),
													/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
														className: "block text-[11px] text-[var(--ca-text-muted)]",
														children: "Revenue (PKR) *"
													}), /* @__PURE__ */ jsx("input", {
														type: "number",
														min: 0,
														required: true,
														value: manualRevenue,
														onChange: (e) => setManualRevenue(e.target.value),
														placeholder: "25000",
														className: "font-mono-nums mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs"
													})] }),
													/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
														className: "block text-[11px] text-[var(--ca-text-muted)]",
														children: "Cost of Goods (PKR) *"
													}), /* @__PURE__ */ jsx("input", {
														type: "number",
														min: 0,
														required: true,
														value: manualCogs,
														onChange: (e) => setManualCogs(e.target.value),
														placeholder: "14000",
														className: "font-mono-nums mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs"
													})] }),
													/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
														className: "block text-[11px] text-[var(--ca-text-muted)]",
														children: "Orders Count"
													}), /* @__PURE__ */ jsx("input", {
														type: "number",
														min: 1,
														value: manualOrdersCount,
														onChange: (e) => setManualOrdersCount(e.target.value),
														className: "font-mono-nums mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs"
													})] }),
													/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
														className: "block text-[11px] text-[var(--ca-text-muted)]",
														children: "Commission Paid/Payable (PKR)"
													}), /* @__PURE__ */ jsx("input", {
														type: "number",
														min: 0,
														value: manualCommission,
														onChange: (e) => setManualCommission(e.target.value),
														className: "font-mono-nums mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs"
													})] }),
													/* @__PURE__ */ jsxs("div", {
														className: "sm:col-span-2",
														children: [/* @__PURE__ */ jsx("label", {
															className: "block text-[11px] text-[var(--ca-text-muted)]",
															children: "Notes (optional)"
														}), /* @__PURE__ */ jsx("input", {
															type: "text",
															value: manualNotes,
															onChange: (e) => setManualNotes(e.target.value),
															placeholder: "Optional batch details",
															className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2 text-xs"
														})]
													}),
													/* @__PURE__ */ jsx("div", {
														className: "sm:col-span-3 flex justify-end",
														children: /* @__PURE__ */ jsx(CAProcessButton, {
															type: "submit",
															loading: savingManual,
															className: "rounded-xl bg-[var(--ca-accent)] px-4 py-2 text-xs font-semibold text-[var(--ca-accent-fg)]",
															children: "Save & Update Dashboard"
														})
													})
												]
											}),
											manualEntries.length === 0 ? /* @__PURE__ */ jsx("p", {
												className: "text-xs text-[var(--ca-text-muted)]",
												children: "No manual dashboard entries recorded."
											}) : /* @__PURE__ */ jsx("div", {
												className: "space-y-2",
												children: manualEntries.map((entry) => /* @__PURE__ */ jsxs("div", {
													className: "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3.5 py-2.5 text-xs",
													children: [/* @__PURE__ */ jsxs("div", {
														className: "min-w-0",
														children: [/* @__PURE__ */ jsxs("p", {
															className: "font-semibold text-[var(--ca-text)]",
															children: [
																entry.label,
																" ",
																/* @__PURE__ */ jsxs("span", {
																	className: "font-mono-nums font-normal text-[var(--ca-text-muted)]",
																	children: [
																		"· ",
																		entry.date,
																		" (",
																		entry.ordersCount,
																		" ",
																		entry.ordersCount === 1 ? "order" : "orders",
																		")"
																	]
																})
															]
														}), /* @__PURE__ */ jsxs("p", {
															className: "font-mono-nums mt-0.5 text-[11px] text-[var(--ca-text-muted)]",
															children: [
																"Revenue ",
																formatPKR(entry.revenue),
																" · COGS ",
																formatPKR(entry.costOfGoods),
																entry.commissionAmount > 0 ? ` · Commission ${formatPKR(entry.commissionAmount)}` : "",
																entry.notes ? ` · ${entry.notes}` : ""
															]
														})]
													}), /* @__PURE__ */ jsx("button", {
														type: "button",
														onClick: () => handleDeleteManualEntry(entry.id),
														"aria-label": `Delete ${entry.label}`,
														className: "rounded-lg border border-red-500/20 p-1.5 text-red-600 hover:bg-red-500/10",
														children: /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" })
													})]
												}, entry.id))
											})
										]
									})
								]
							}),
							tab === "orders" && /* @__PURE__ */ jsxs("div", {
								className: "space-y-4",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ca-text-muted)]",
									children: [/* @__PURE__ */ jsx("span", { children: "Tap any order card to open full customer & installment details." }), /* @__PURE__ */ jsxs("span", {
										className: "font-mono-nums font-medium text-[var(--ca-text)]",
										children: [
											orders.length,
											" ",
											orders.length === 1 ? "order" : "orders"
										]
									})]
								}), orders.length === 0 ? /* @__PURE__ */ jsx("div", {
									className: "rounded-2xl border border-dashed border-[var(--ca-border)] p-8 text-center text-xs text-[var(--ca-text-muted)]",
									children: "No orders placed yet."
								}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("div", {
									className: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3",
									children: orders.slice(0, visibleOrdersCount).map((ord) => /* @__PURE__ */ jsxs("button", {
										type: "button",
										onClick: () => setSelectedOrder(ord),
										className: `btn-press flex w-full flex-col justify-between rounded-xl p-4 text-left transition-all ${selectedOrder?.id === ord.id ? "bg-[var(--ca-surface-subtle)] ring-1 ring-[var(--ca-accent)]" : "bg-[var(--ca-surface-subtle)]/75 hover:bg-[var(--ca-surface-subtle)]"}`,
										children: [/* @__PURE__ */ jsxs("div", { children: [
											/* @__PURE__ */ jsxs("div", {
												className: "flex items-center justify-between gap-2",
												children: [/* @__PURE__ */ jsx("span", {
													className: "font-mono-nums text-xs font-bold text-[var(--ca-text)]",
													children: ord.id
												}), /* @__PURE__ */ jsx("span", {
													className: "rounded-full bg-[var(--ca-accent)]/12 px-2.5 py-0.5 text-[11px] font-medium capitalize text-[var(--ca-accent)]",
													children: ord.status
												})]
											}),
											/* @__PURE__ */ jsx("p", {
												className: "mt-2 text-sm font-semibold text-[var(--ca-text)]",
												children: ord.customerName
											}),
											/* @__PURE__ */ jsxs("p", {
												className: "font-mono-nums text-xs text-[var(--ca-text-muted)]",
												children: [
													ord.city,
													" · ",
													maskPhone(ord.phone)
												]
											})
										] }), /* @__PURE__ */ jsxs("div", {
											className: "mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 text-xs",
											children: [/* @__PURE__ */ jsxs("span", {
												className: "text-[var(--ca-text-muted)]",
												children: [ord.paymentMethod === "installments" ? `Installments (${ord.planLabel})` : "Cash on Delivery", ord.referralCode ? ` · Ref ${ord.referralCode}` : ""]
											}), /* @__PURE__ */ jsx("span", {
												className: "font-mono-nums font-semibold text-[var(--ca-text)]",
												children: formatPKR(ord.totalAmount)
											})]
										})]
									}, ord.id))
								}), orders.length > visibleOrdersCount && /* @__PURE__ */ jsx("div", {
									className: "flex justify-center pt-2",
									children: /* @__PURE__ */ jsxs("button", {
										type: "button",
										onClick: () => setVisibleOrdersCount((c) => c + 12),
										className: "btn-press rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-4 py-2 text-xs font-semibold text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]",
										children: [
											"Load More Orders (",
											orders.length - visibleOrdersCount,
											" remaining)"
										]
									})
								})] })]
							}),
							tab === "notifications" && /* @__PURE__ */ jsxs("form", {
								onSubmit: handleSendNotification,
								className: "max-w-xl space-y-4",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "flex gap-2 rounded-xl bg-[var(--ca-surface-subtle)] p-1",
										children: [/* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: () => setNotifMode("user"),
											className: `flex-1 rounded-lg py-2 text-xs font-semibold ${notifMode === "user" ? "bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm" : "text-[var(--ca-text-muted)]"}`,
											children: "Specific User (Private)"
										}), /* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: () => setNotifMode("all"),
											className: `flex-1 rounded-lg py-2 text-xs font-semibold ${notifMode === "all" ? "bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm" : "text-[var(--ca-text-muted)]"}`,
											children: "Broadcast to All Users"
										})]
									}),
									notifMode === "user" && /* @__PURE__ */ jsxs("div", {
										className: "space-y-2 rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] p-4",
										children: [
											/* @__PURE__ */ jsx("label", {
												className: "block text-xs font-medium text-[var(--ca-text-muted)]",
												children: "Select Customer or Seller (only this account receives the message)"
											}),
											/* @__PURE__ */ jsx("input", {
												type: "text",
												value: userSearch,
												onChange: (e) => setUserSearch(e.target.value),
												placeholder: "Search name, email, user ID, or CA-...",
												className: "w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-xs"
											}),
											/* @__PURE__ */ jsx("div", {
												className: "max-h-44 space-y-1 overflow-y-auto",
												children: filteredUsers.map((u) => /* @__PURE__ */ jsxs("button", {
													type: "button",
													onClick: () => setTargetUserId(u.id),
													className: `flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs ${targetUserId === u.id ? "bg-[var(--ca-text)] text-[var(--ca-bg)]" : "hover:bg-[var(--ca-surface-subtle)]"}`,
													children: [/* @__PURE__ */ jsxs("span", {
														className: "truncate font-medium",
														children: [
															u.name,
															" ",
															/* @__PURE__ */ jsxs("span", {
																className: "opacity-70",
																children: [
																	"(",
																	u.email,
																	")"
																]
															})
														]
													}), /* @__PURE__ */ jsxs("span", {
														className: "font-mono-nums shrink-0 opacity-75",
														children: [u.sellerCode ? `${u.sellerCode} · ` : "", u.id]
													})]
												}, u.id))
											})
										]
									}),
									/* @__PURE__ */ jsx("div", {
										className: `rounded-xl border px-3.5 py-2.5 text-xs ${notifMode === "all" ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"}`,
										children: notifMode === "all" ? /* @__PURE__ */ jsx("span", { children: "Notice: This will broadcast to every registered user." }) : /* @__PURE__ */ jsxs("span", { children: [
											"Private Recipient:",
											" ",
											/* @__PURE__ */ jsx("strong", { children: users.find((u) => u.id === targetUserId)?.name || "None selected" }),
											users.find((u) => u.id === targetUserId)?.email ? ` (${users.find((u) => u.id === targetUserId)?.email})` : ""
										] })
									}),
									/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "block text-xs font-medium text-[var(--ca-text-muted)]",
										children: "Notification Title"
									}), /* @__PURE__ */ jsx("input", {
										type: "text",
										value: notifTitle,
										onChange: (e) => setNotifTitle(e.target.value),
										placeholder: "Eid Collection Dispatch Schedule",
										className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
									})] }),
									/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "block text-xs font-medium text-[var(--ca-text-muted)]",
										children: "Message"
									}), /* @__PURE__ */ jsx("textarea", {
										rows: 3,
										value: notifMsg,
										onChange: (e) => setNotifMsg(e.target.value),
										placeholder: "Write your announcement or direct update...",
										className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2 text-sm"
									})] }),
									/* @__PURE__ */ jsx(CAProcessButton, {
										type: "submit",
										loading: sendingNotif,
										className: "rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-sm font-semibold text-[var(--ca-bg)]",
										children: notifMode === "all" ? "Send Broadcast to All" : "Send Private Notification"
									})
								]
							}),
							tab === "feedback" && (() => {
								const uniqueSenders = Array.from(new Map(feedback.map((t) => [t.userId, {
									id: t.userId,
									name: t.userName,
									email: t.userEmail
								}])).values());
								const filteredThreads = feedback.filter((t) => {
									if (feedbackUserFilter !== "all" && t.userId !== feedbackUserFilter) return false;
									if (feedbackStatusFilter !== "all" && t.status !== feedbackStatusFilter) return false;
									const q = feedbackSearch.trim().toLowerCase();
									if (!q) return true;
									return t.userName.toLowerCase().includes(q) || t.userEmail.toLowerCase().includes(q) || t.userId.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q);
								});
								return /* @__PURE__ */ jsxs("div", {
									className: "space-y-4",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "grid grid-cols-1 gap-3 rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] p-4 sm:grid-cols-3",
										children: [
											/* @__PURE__ */ jsxs("div", {
												className: "relative",
												children: [/* @__PURE__ */ jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ca-text-muted)]" }), /* @__PURE__ */ jsx("input", {
													type: "text",
													value: feedbackSearch,
													onChange: (e) => setFeedbackSearch(e.target.value),
													placeholder: "Search user name, email, or subject...",
													"aria-label": "Search feedback by user or subject",
													className: "w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] py-2 pl-8 pr-3 text-xs"
												})]
											}),
											/* @__PURE__ */ jsxs("select", {
												"aria-label": "Filter feedback by specific user",
												value: feedbackUserFilter,
												onChange: (e) => setFeedbackUserFilter(e.target.value),
												className: "w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-xs",
												children: [/* @__PURE__ */ jsxs("option", {
													value: "all",
													children: [
														"All Users Who Sent Feedback (",
														uniqueSenders.length,
														")"
													]
												}), uniqueSenders.map((s) => /* @__PURE__ */ jsxs("option", {
													value: s.id,
													children: [
														s.name,
														" (",
														s.email,
														")"
													]
												}, s.id))]
											}),
											/* @__PURE__ */ jsx("div", {
												className: "flex gap-1 rounded-xl bg-[var(--ca-surface-subtle)] p-1 text-xs",
												children: [
													{
														id: "all",
														label: "All"
													},
													{
														id: "open",
														label: "Needs Reply"
													},
													{
														id: "replied",
														label: "Replied"
													}
												].map((st) => /* @__PURE__ */ jsx("button", {
													type: "button",
													onClick: () => setFeedbackStatusFilter(st.id),
													className: `flex-1 rounded-lg py-1.5 font-medium ${feedbackStatusFilter === st.id ? "bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm" : "text-[var(--ca-text-muted)]"}`,
													children: st.label
												}, st.id))
											})
										]
									}), filteredThreads.length === 0 ? /* @__PURE__ */ jsx("p", {
										className: "rounded-2xl border border-dashed border-[var(--ca-border)] p-8 text-center text-sm text-[var(--ca-text-muted)]",
										children: "No customer feedback threads match this filter."
									}) : filteredThreads.map((thread) => /* @__PURE__ */ jsxs("div", {
										className: "space-y-3 rounded-xl bg-[var(--ca-surface-subtle)] p-4",
										children: [
											/* @__PURE__ */ jsxs("div", {
												className: "flex flex-wrap items-center justify-between gap-2 pb-1",
												children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
													className: "text-sm font-semibold text-[var(--ca-text)]",
													children: thread.subject
												}), /* @__PURE__ */ jsxs("p", {
													className: "mt-0.5 text-xs text-[var(--ca-text-muted)]",
													children: [
														"From: ",
														/* @__PURE__ */ jsx("strong", {
															className: "text-[var(--ca-text)]",
															children: thread.userName
														}),
														" ",
														"(",
														thread.userEmail,
														") · ",
														/* @__PURE__ */ jsx("span", {
															className: "font-mono-nums",
															children: thread.userId
														})
													]
												})] }), /* @__PURE__ */ jsxs("div", {
													className: "flex items-center gap-2",
													children: [/* @__PURE__ */ jsx("span", {
														className: `rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${thread.status === "open" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"}`,
														children: thread.status === "open" ? "Needs reply" : thread.status
													}), feedbackUserFilter !== thread.userId && /* @__PURE__ */ jsx("button", {
														type: "button",
														onClick: () => setFeedbackUserFilter(thread.userId),
														className: "rounded-lg border border-[var(--ca-border)] px-2 py-1 text-[11px] font-medium text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]",
														children: "Focus User"
													})]
												})]
											}),
											/* @__PURE__ */ jsx("div", {
												className: "space-y-2",
												children: thread.messages.map((m) => /* @__PURE__ */ jsxs("div", {
													className: `rounded-xl px-3.5 py-2.5 text-xs ${m.senderRole === "admin" ? "bg-[var(--ca-accent)]/12 text-[var(--ca-text)]" : "bg-[var(--ca-surface-subtle)] text-[var(--ca-text)]"}`,
													children: [/* @__PURE__ */ jsxs("span", {
														className: "font-semibold",
														children: [m.senderName, ": "]
													}), /* @__PURE__ */ jsx("span", { children: m.body })]
												}, m.id))
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "space-y-1.5 rounded-xl bg-[var(--ca-surface-subtle)]/70 p-2.5",
												children: [/* @__PURE__ */ jsxs("p", {
													className: "flex items-start gap-1.5 text-[11px] leading-relaxed font-medium text-[var(--ca-text-muted)]",
													children: [/* @__PURE__ */ jsx(UserCheck, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" }), /* @__PURE__ */ jsxs("span", { children: [
														"Replying privately to",
														" ",
														/* @__PURE__ */ jsx("strong", {
															className: "text-[var(--ca-text)]",
															children: thread.userName
														}),
														" ",
														"(",
														thread.userEmail,
														") only"
													] })]
												}), /* @__PURE__ */ jsxs("div", {
													className: "flex flex-col gap-2 sm:flex-row",
													children: [/* @__PURE__ */ jsx("input", {
														type: "text",
														value: replyMap[thread.id] || "",
														onChange: (e) => setReplyMap((prev) => ({
															...prev,
															[thread.id]: e.target.value
														})),
														placeholder: `Write private reply to ${thread.userName}...`,
														className: "flex-1 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-xs"
													}), /* @__PURE__ */ jsxs(CAProcessButton, {
														type: "button",
														loading: replyingFeedbackId === thread.id,
														onClick: () => handleFeedbackReply(thread.id),
														className: "rounded-xl bg-[var(--ca-text)] px-4 py-2 text-xs font-semibold text-[var(--ca-bg)]",
														children: ["Reply to ", thread.userName.split(" ")[0]]
													})]
												})]
											})
										]
									}, thread.id))]
								});
							})(),
							tab === "products" && /* @__PURE__ */ jsxs("div", {
								className: "space-y-8",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-1 gap-6 lg:grid-cols-2",
									children: [/* @__PURE__ */ jsxs("form", {
										onSubmit: handleSaveProduct,
										className: "space-y-3 rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] p-5",
										children: [
											/* @__PURE__ */ jsx("h3", {
												className: "text-sm font-semibold",
												children: editingId ? "Edit Product" : "Add New Product"
											}),
											/* @__PURE__ */ jsx("input", {
												type: "text",
												required: true,
												value: prodTitle,
												onChange: (e) => setProdTitle(e.target.value),
												placeholder: "Product Title",
												className: "w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-sm"
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "grid grid-cols-2 gap-3",
												children: [/* @__PURE__ */ jsx("input", {
													type: "number",
													required: true,
													value: prodPrice,
													onChange: (e) => setProdPrice(e.target.value),
													placeholder: "Selling Price (PKR)",
													className: "font-mono-nums w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-sm"
												}), /* @__PURE__ */ jsx("input", {
													type: "number",
													required: true,
													value: prodCost,
													onChange: (e) => setProdCost(e.target.value),
													placeholder: "Cost Price (PKR)",
													className: "font-mono-nums w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-sm"
												})]
											}),
											/* @__PURE__ */ jsx("select", {
												value: prodCat,
												onChange: (e) => setProdCat(e.target.value),
												className: "w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-sm",
												children: categories.map((c) => /* @__PURE__ */ jsx("option", {
													value: c.id,
													children: c.name
												}, c.id))
											}),
											/* @__PURE__ */ jsx("textarea", {
												rows: 2,
												value: prodDesc,
												onChange: (e) => setProdDesc(e.target.value),
												placeholder: "Product description...",
												className: "w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-sm"
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "space-y-1.5",
												children: [/* @__PURE__ */ jsx("label", {
													className: "block text-xs text-[var(--ca-text-muted)]",
													children: "Cover Image (upload or URL)"
												}), /* @__PURE__ */ jsxs("div", {
													className: "flex gap-2",
													children: [/* @__PURE__ */ jsx("input", {
														type: "text",
														value: prodCover,
														onChange: (e) => setProdCover(e.target.value),
														placeholder: "/src/assets/images/...",
														className: "min-w-0 flex-1 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-xs"
													}), /* @__PURE__ */ jsxs("label", {
														className: "inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--ca-border)] px-3 py-2 text-xs font-medium hover:bg-[var(--ca-surface-subtle)]",
														children: [
															uploadingCover ? /* @__PURE__ */ jsx(CALoader, { size: "sm" }) : null,
															/* @__PURE__ */ jsx("span", { children: uploadingCover ? "Uploading..." : "Upload" }),
															/* @__PURE__ */ jsx("input", {
																type: "file",
																accept: "image/*",
																disabled: uploadingCover,
																className: "hidden",
																onChange: (e) => handleUploadCover(e.target.files?.[0])
															})
														]
													})]
												})]
											}),
											/* @__PURE__ */ jsx("input", {
												type: "text",
												value: prodExtra,
												onChange: (e) => setProdExtra(e.target.value),
												placeholder: "Extra gallery image URLs (comma-separated)",
												className: "w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-xs"
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "flex gap-2 pt-1",
												children: [/* @__PURE__ */ jsxs(CAProcessButton, {
													type: "submit",
													loading: savingProduct,
													className: "rounded-xl bg-[var(--ca-text)] px-4 py-2 text-xs font-semibold text-[var(--ca-bg)]",
													children: [/* @__PURE__ */ jsx(Plus, { className: "h-3.5 w-3.5" }), editingId ? "Save Changes" : "Create Product"]
												}), editingId && /* @__PURE__ */ jsx("button", {
													type: "button",
													onClick: () => {
														setEditingId(null);
														setProdTitle("");
														setProdPrice("");
														setProdCost("");
														setProdDesc("");
														setProdCover("");
														setProdExtra("");
													},
													className: "rounded-xl border border-[var(--ca-border)] px-3 py-2 text-xs",
													children: "Cancel"
												})]
											})
										]
									}), /* @__PURE__ */ jsxs("div", {
										className: "space-y-4",
										children: [/* @__PURE__ */ jsxs("div", {
											className: "space-y-3 rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] p-4",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "flex gap-2",
												children: [/* @__PURE__ */ jsx("input", {
													type: "text",
													value: newCatName,
													onChange: (e) => setNewCatName(e.target.value),
													placeholder: "New category name...",
													className: "min-w-0 flex-1 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-xs"
												}), /* @__PURE__ */ jsx(CAProcessButton, {
													type: "button",
													loading: savingCategory,
													onClick: handleCreateCategory,
													className: "shrink-0 rounded-xl bg-[var(--ca-text)] px-3.5 py-2 text-xs font-semibold text-[var(--ca-bg)]",
													children: "Add Category"
												})]
											}), /* @__PURE__ */ jsxs("div", {
												className: "space-y-1.5",
												children: [/* @__PURE__ */ jsxs("p", {
													className: "text-[11px] font-medium text-[var(--ca-text-muted)]",
													children: [
														"Categories (",
														categories.length,
														")"
													]
												}), categories.length === 0 ? /* @__PURE__ */ jsx("p", {
													className: "rounded-xl bg-[var(--ca-surface-subtle)] px-3 py-2 text-xs text-[var(--ca-text-muted)]",
													children: "No categories yet. Add one above to list products."
												}) : /* @__PURE__ */ jsx("div", {
													"data-testid": "admin-categories-list",
													className: "max-h-72 space-y-1.5 overflow-y-auto pr-1",
													children: categories.map((cat) => {
														const prodCount = products.filter((pr) => pr.categoryId === cat.id).length;
														const isConfirming = confirmDeleteCategoryId === cat.id;
														const isDeleting = deletingCategoryId === cat.id;
														return /* @__PURE__ */ jsxs("div", {
															"data-testid": `admin-category-row-${cat.id}`,
															className: "rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-xs",
															children: [/* @__PURE__ */ jsxs("div", {
																className: "flex items-center justify-between gap-2",
																children: [/* @__PURE__ */ jsxs("div", {
																	className: "min-w-0",
																	children: [/* @__PURE__ */ jsx("span", {
																		className: "font-semibold text-[var(--ca-text)]",
																		children: cat.name
																	}), /* @__PURE__ */ jsxs("span", {
																		className: "ml-2 text-[11px] text-[var(--ca-text-muted)]",
																		children: [
																			"(",
																			prodCount,
																			" ",
																			prodCount === 1 ? "product" : "products",
																			")"
																		]
																	})]
																}), !isConfirming && /* @__PURE__ */ jsxs("button", {
																	type: "button",
																	disabled: Boolean(deletingCategoryId),
																	onClick: (e) => {
																		const row = e.currentTarget.closest("[data-testid^=\"admin-category-row-\"]");
																		setConfirmDeleteCategoryId(cat.id);
																		window.requestAnimationFrame(() => {
																			row?.scrollIntoView({
																				block: "nearest",
																				behavior: "smooth"
																			});
																		});
																	},
																	"data-testid": `delete-category-${cat.id}`,
																	"aria-label": `Delete category ${cat.name}`,
																	className: "inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-lg border border-red-500/20 px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-50",
																	children: [/* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" }), "Delete"]
																})]
															}), isConfirming && /* @__PURE__ */ jsxs("div", {
																className: "mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-500/8 px-2.5 py-2",
																children: [/* @__PURE__ */ jsx("span", {
																	className: "text-[11px] text-red-700 dark:text-red-300",
																	children: prodCount > 0 ? `Delete "${cat.name}" and its ${prodCount} product(s)?` : `Permanently delete "${cat.name}"?`
																}), /* @__PURE__ */ jsxs("div", {
																	className: "flex items-center gap-1.5",
																	children: [/* @__PURE__ */ jsxs("button", {
																		type: "button",
																		disabled: isDeleting,
																		onClick: () => handleDeleteCategory(cat, prodCount > 0),
																		"data-testid": `confirm-delete-category-${cat.id}`,
																		className: "inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-60",
																		children: [isDeleting ? /* @__PURE__ */ jsx(CALoader, { size: "sm" }) : null, prodCount > 0 ? `Delete Category & ${prodCount} Product(s)` : "Confirm Delete"]
																	}), /* @__PURE__ */ jsx("button", {
																		type: "button",
																		disabled: isDeleting,
																		onClick: () => setConfirmDeleteCategoryId(null),
																		className: "inline-flex min-h-[34px] items-center rounded-lg border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-2.5 py-1 text-[11px] font-medium text-[var(--ca-text)]",
																		children: "Cancel"
																	})]
																})]
															})]
														}, cat.id);
													})
												})]
											})]
										}), /* @__PURE__ */ jsxs("div", {
											"data-testid": "admin-products-list",
											className: "max-h-80 space-y-2 overflow-y-auto pr-1",
											children: [products.length === 0 ? /* @__PURE__ */ jsx("p", {
												className: "rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] p-4 text-center text-xs text-[var(--ca-text-muted)]",
												children: "No products in catalog."
											}) : products.slice(0, visibleProductsCount).map((p) => {
												const isConfirmingProd = confirmDeleteProductId === p.id;
												const isDeletingProd = deletingProductId === p.id;
												return /* @__PURE__ */ jsxs("div", {
													"data-testid": `admin-product-row-${p.id}`,
													className: "rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] p-3",
													children: [/* @__PURE__ */ jsxs("div", {
														className: "flex items-center justify-between gap-3",
														children: [/* @__PURE__ */ jsxs("div", {
															className: "min-w-0",
															children: [/* @__PURE__ */ jsxs("div", {
																className: "flex items-center gap-2",
																children: [/* @__PURE__ */ jsx("p", {
																	className: "truncate text-xs font-semibold text-[var(--ca-text)]",
																	children: p.title
																}), !p.inStock && /* @__PURE__ */ jsx("span", {
																	className: "shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300",
																	children: "Archived"
																})]
															}), /* @__PURE__ */ jsxs("p", {
																className: "font-mono-nums text-[11px] text-[var(--ca-text-muted)]",
																children: [
																	"Sell ",
																	formatPKR(p.price),
																	" · Cost ",
																	formatPKR(p.costPrice || 0),
																	" ·",
																	" ",
																	p.categoryName
																]
															})]
														}), /* @__PURE__ */ jsxs("div", {
															className: "flex shrink-0 gap-1.5",
															children: [/* @__PURE__ */ jsx("button", {
																type: "button",
																onClick: () => {
																	setEditingId(p.id);
																	setProdTitle(p.title);
																	setProdPrice(String(p.price));
																	setProdCost(String(p.costPrice || 0));
																	setProdCat(p.categoryId);
																	setProdDesc(p.description);
																	setProdCover(p.coverImage);
																	setProdExtra((p.extraImages || []).join(", "));
																},
																className: "min-h-[36px] rounded-lg border border-[var(--ca-border)] px-2.5 py-1 text-xs",
																children: "Edit"
															}), !isConfirmingProd && /* @__PURE__ */ jsx("button", {
																type: "button",
																disabled: Boolean(deletingProductId),
																onClick: (e) => {
																	const row = e.currentTarget.closest("[data-testid^=\"admin-product-row-\"]");
																	setConfirmDeleteProductId(p.id);
																	window.requestAnimationFrame(() => {
																		row?.scrollIntoView({
																			block: "nearest",
																			behavior: "smooth"
																		});
																	});
																},
																"data-testid": `delete-product-${p.id}`,
																"aria-label": `Delete ${p.title}`,
																className: "inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-red-500/20 p-1.5 text-red-600 hover:bg-red-500/10 disabled:opacity-50",
																children: /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" })
															})]
														})]
													}), isConfirmingProd && /* @__PURE__ */ jsxs("div", {
														className: "mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-red-500/8 px-3 py-2",
														children: [/* @__PURE__ */ jsxs("span", {
															className: "text-[11px] text-red-700 dark:text-red-300",
															children: [
																"Delete \"",
																p.title,
																"\" from store and backend?"
															]
														}), /* @__PURE__ */ jsxs("div", {
															className: "flex items-center gap-1.5",
															children: [/* @__PURE__ */ jsxs("button", {
																type: "button",
																disabled: isDeletingProd,
																onClick: () => handleDeleteProduct(p),
																"data-testid": `confirm-delete-product-${p.id}`,
																className: "inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-red-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-60",
																children: [isDeletingProd ? /* @__PURE__ */ jsx(CALoader, { size: "sm" }) : null, "Confirm Delete"]
															}), /* @__PURE__ */ jsx("button", {
																type: "button",
																disabled: isDeletingProd,
																onClick: () => setConfirmDeleteProductId(null),
																className: "inline-flex min-h-[34px] items-center rounded-lg border border-[var(--ca-border)] bg-[var(--ca-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--ca-text)]",
																children: "Cancel"
															})]
														})]
													})]
												}, p.id);
											}), products.length > visibleProductsCount && /* @__PURE__ */ jsxs("button", {
												type: "button",
												onClick: () => setVisibleProductsCount((c) => c + 24),
												className: "w-full rounded-xl border border-[var(--ca-border)] py-2 text-xs font-medium text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]",
												children: [
													"Show More Products (",
													products.length - visibleProductsCount,
													" remaining)"
												]
											})]
										})]
									})]
								}), /* @__PURE__ */ jsxs("div", {
									className: "rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] p-5",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "flex flex-wrap items-center justify-between gap-3",
										children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", {
											className: "text-sm font-semibold",
											children: "Global Installment Plan Settings"
										}), /* @__PURE__ */ jsx("p", {
											className: "text-xs text-[var(--ca-text-muted)]",
											children: "Changes apply immediately across the Calculator and all product Buy screens."
										})] }), /* @__PURE__ */ jsxs("div", {
											className: "flex flex-wrap gap-2",
											children: [/* @__PURE__ */ jsxs("button", {
												type: "button",
												onClick: () => {
													const nextMonths = plans.length > 0 ? Math.max(...plans.map((p) => p.months)) + 1 : 2;
													setPlans((prev) => [...prev, {
														id: `plan-${nextMonths}m-${Date.now().toString(36)}`,
														label: `${nextMonths} Months`,
														months: nextMonths,
														advancePercent: 0,
														markupPercent: 15,
														active: true
													}]);
												},
												className: "inline-flex items-center gap-1 rounded-xl border border-[var(--ca-border)] px-3 py-2 text-xs font-medium hover:bg-[var(--ca-surface-subtle)]",
												children: [/* @__PURE__ */ jsx(Plus, { className: "h-3.5 w-3.5" }), "Add Plan"]
											}), /* @__PURE__ */ jsxs(CAProcessButton, {
												type: "button",
												loading: savingPlans,
												onClick: handleSavePlans,
												className: "rounded-xl bg-[var(--ca-text)] px-4 py-2 text-xs font-semibold text-[var(--ca-bg)]",
												children: [/* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5" }), "Save Plans"]
											})]
										})]
									}), /* @__PURE__ */ jsx("div", {
										className: "mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3",
										children: plans.map((pl, idx) => /* @__PURE__ */ jsxs("div", {
											className: "space-y-2 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] p-3 text-xs",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "flex items-center justify-between gap-2",
												children: [/* @__PURE__ */ jsx("input", {
													type: "text",
													value: pl.label,
													onChange: (e) => {
														const next = [...plans];
														next[idx] = {
															...pl,
															label: e.target.value
														};
														setPlans(next);
													},
													"aria-label": "Plan label",
													className: "min-w-0 flex-1 rounded-lg border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-2 py-1 font-semibold"
												}), /* @__PURE__ */ jsx("input", {
													type: "checkbox",
													checked: pl.active,
													onChange: (e) => {
														const next = [...plans];
														next[idx] = {
															...pl,
															active: e.target.checked
														};
														setPlans(next);
													},
													"aria-label": `Enable ${pl.label}`
												})]
											}), /* @__PURE__ */ jsxs("div", {
												className: "grid grid-cols-3 gap-2",
												children: [
													/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
														className: "text-[11px] text-[var(--ca-text-muted)]",
														children: "Months"
													}), /* @__PURE__ */ jsx("input", {
														type: "number",
														min: 1,
														max: 36,
														value: pl.months,
														onChange: (e) => {
															const next = [...plans];
															next[idx] = {
																...pl,
																months: Number(e.target.value)
															};
															setPlans(next);
														},
														className: "font-mono-nums mt-0.5 w-full rounded-lg border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-2 py-1"
													})] }),
													/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
														className: "text-[11px] text-[var(--ca-text-muted)]",
														children: "Interest Rate %"
													}), /* @__PURE__ */ jsx("input", {
														type: "number",
														min: 0,
														max: 200,
														value: pl.markupPercent,
														onChange: (e) => {
															const next = [...plans];
															next[idx] = {
																...pl,
																markupPercent: Number(e.target.value)
															};
															setPlans(next);
														},
														className: "font-mono-nums mt-0.5 w-full rounded-lg border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-2 py-1"
													})] }),
													/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
														className: "text-[11px] text-[var(--ca-text-muted)]",
														children: "Advance %"
													}), /* @__PURE__ */ jsx("input", {
														type: "number",
														min: 0,
														max: 90,
														value: pl.advancePercent,
														onChange: (e) => {
															const next = [...plans];
															next[idx] = {
																...pl,
																advancePercent: Number(e.target.value)
															};
															setPlans(next);
														},
														className: "font-mono-nums mt-0.5 w-full rounded-lg border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-2 py-1"
													})] })
												]
											})]
										}, pl.id))
									})]
								})]
							}),
							tab === "terms" && /* @__PURE__ */ jsxs("form", {
								onSubmit: handleSaveTermsPolicy,
								className: "space-y-5",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "flex flex-wrap items-center justify-between gap-3",
										children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", {
											className: "text-base font-semibold text-[var(--ca-text)]",
											children: "Store Terms & Installment Policy"
										}), /* @__PURE__ */ jsx("p", {
											className: "text-xs text-[var(--ca-text-muted)]",
											children: "Updates publish immediately to the public /terms page."
										})] }), /* @__PURE__ */ jsxs(CAProcessButton, {
											type: "submit",
											loading: savingTerms,
											className: "rounded-xl bg-[var(--ca-text)] px-4 py-2 text-xs font-semibold text-[var(--ca-bg)]",
											children: [/* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5" }), "Save Terms & Policy"]
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "grid grid-cols-1 gap-4 rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] p-5 sm:grid-cols-2",
										children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
											className: "block text-xs font-medium text-[var(--ca-text-muted)]",
											children: "Header Eyebrow / Effective Label"
										}), /* @__PURE__ */ jsx("input", {
											type: "text",
											required: true,
											value: termsDoc.effectiveLabel,
											onChange: (e) => setTermsDoc((prev) => ({
												...prev,
												effectiveLabel: e.target.value
											})),
											className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3.5 py-2 text-sm"
										})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
											className: "block text-xs font-medium text-[var(--ca-text-muted)]",
											children: "Page Title"
										}), /* @__PURE__ */ jsx("input", {
											type: "text",
											required: true,
											value: termsDoc.title,
											onChange: (e) => setTermsDoc((prev) => ({
												...prev,
												title: e.target.value
											})),
											className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3.5 py-2 text-sm"
										})] })]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "space-y-3",
										children: [termsDoc.sections.map((sec, idx) => /* @__PURE__ */ jsxs("div", {
											className: "space-y-2.5 rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] p-4",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "flex items-center justify-between gap-2",
												children: [/* @__PURE__ */ jsx("input", {
													type: "text",
													required: true,
													value: sec.heading,
													onChange: (e) => {
														const next = [...termsDoc.sections];
														next[idx] = {
															...sec,
															heading: e.target.value
														};
														setTermsDoc((prev) => ({
															...prev,
															sections: next
														}));
													},
													placeholder: "Section Heading",
													className: "min-w-0 flex-1 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-sm font-semibold"
												}), termsDoc.sections.length > 1 && /* @__PURE__ */ jsx("button", {
													type: "button",
													onClick: () => setTermsDoc((prev) => ({
														...prev,
														sections: prev.sections.filter((s) => s.id !== sec.id)
													})),
													"aria-label": `Remove ${sec.heading}`,
													className: "rounded-xl border border-red-500/20 p-2 text-red-600 hover:bg-red-500/10",
													children: /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" })
												})]
											}), /* @__PURE__ */ jsx("textarea", {
												rows: 3,
												required: true,
												value: sec.body,
												onChange: (e) => {
													const next = [...termsDoc.sections];
													next[idx] = {
														...sec,
														body: e.target.value
													};
													setTermsDoc((prev) => ({
														...prev,
														sections: next
													}));
												},
												placeholder: "Policy paragraph text...",
												className: "w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-xs leading-relaxed"
											})]
										}, sec.id)), /* @__PURE__ */ jsxs("button", {
											type: "button",
											onClick: () => setTermsDoc((prev) => ({
												...prev,
												sections: [...prev.sections, {
													id: `sec-${Date.now().toString(36)}`,
													heading: `${prev.sections.length + 1}. New Policy Section`,
													body: ""
												}]
											})),
											className: "inline-flex items-center gap-1.5 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2 text-xs font-medium hover:bg-[var(--ca-surface-subtle)]",
											children: [/* @__PURE__ */ jsx(Plus, { className: "h-3.5 w-3.5" }), "Add Policy Section"]
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] p-4",
										children: [/* @__PURE__ */ jsx("label", {
											className: "block text-xs font-medium text-[var(--ca-text-muted)]",
											children: "Footer Contact Note"
										}), /* @__PURE__ */ jsx("input", {
											type: "text",
											value: termsDoc.footerNote,
											onChange: (e) => setTermsDoc((prev) => ({
												...prev,
												footerNote: e.target.value
											})),
											className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-bg)] px-3 py-2 text-xs"
										})]
									})
								]
							})
						]
					})
				})]
			}),
			selectedOrder && typeof document !== "undefined" && createPortal(/* @__PURE__ */ jsx("div", {
				role: "dialog",
				"aria-modal": "true",
				"aria-label": `Order details for ${selectedOrder.customerName}`,
				onClick: () => setSelectedOrder(null),
				className: "fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-3 sm:p-6",
				children: /* @__PURE__ */ jsxs("div", {
					onClick: (e) => e.stopPropagation(),
					className: "glass-panel flex max-h-[84dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl shadow-xl sm:max-h-[90dvh]",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between gap-3 px-5 pt-5 pb-2 sm:px-6",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "flex flex-wrap items-center gap-2",
								children: [/* @__PURE__ */ jsx("h3", {
									className: "font-display truncate text-xl font-semibold text-[var(--ca-text)]",
									children: selectedOrder.customerName
								}), /* @__PURE__ */ jsx("span", {
									className: "rounded-full bg-[var(--ca-accent)]/15 px-2.5 py-0.5 text-[11px] font-medium capitalize text-[var(--ca-accent)]",
									children: selectedOrder.status
								})]
							}), /* @__PURE__ */ jsxs("p", {
								className: "font-mono-nums mt-0.5 text-xs text-[var(--ca-text-muted)]",
								children: [
									selectedOrder.id,
									" · ",
									new Date(selectedOrder.createdAt).toLocaleString()
								]
							})]
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setSelectedOrder(null),
							"aria-label": "Close order details popup",
							className: "shrink-0 rounded-xl border border-[var(--ca-border)] p-2 text-[var(--ca-text-muted)] hover:bg-[var(--ca-surface-subtle)] hover:text-[var(--ca-text)]",
							children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
						})]
					}), /* @__PURE__ */ jsxs("div", {
						className: "flex-1 space-y-4 overflow-y-auto p-5 text-xs sm:p-6",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "grid grid-cols-1 gap-3 rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)]/80 p-4 sm:grid-cols-2",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "space-y-1.5",
										children: [
											/* @__PURE__ */ jsxs("p", {
												className: "flex items-center gap-1.5 font-semibold text-[var(--ca-text)]",
												children: [/* @__PURE__ */ jsx(Phone, { className: "h-3.5 w-3.5 text-[var(--ca-accent)]" }), "Contact Details"]
											}),
											/* @__PURE__ */ jsxs("p", {
												className: "text-[var(--ca-text-muted)]",
												children: [
													"Phone:",
													" ",
													/* @__PURE__ */ jsx("a", {
														href: `tel:${selectedOrder.phone}`,
														className: "font-medium text-[var(--ca-text)] underline-offset-2 hover:underline",
														children: selectedOrder.phone
													})
												]
											}),
											/* @__PURE__ */ jsxs("p", {
												className: "text-[var(--ca-text-muted)]",
												children: [
													"WhatsApp:",
													" ",
													/* @__PURE__ */ jsx("a", {
														href: `https://wa.me/${selectedOrder.whatsapp.replace(/[^0-9]/g, "")}`,
														target: "_blank",
														rel: "noopener noreferrer",
														className: "font-medium text-[var(--ca-text)] underline-offset-2 hover:underline",
														children: selectedOrder.whatsapp
													})
												]
											})
										]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "space-y-1.5",
										children: [
											/* @__PURE__ */ jsxs("p", {
												className: "flex items-center gap-1.5 font-semibold text-[var(--ca-text)]",
												children: [/* @__PURE__ */ jsx(MapPin, { className: "h-3.5 w-3.5 text-[var(--ca-accent)]" }), "Delivery Destination"]
											}),
											/* @__PURE__ */ jsx("p", {
												className: "text-[var(--ca-text)]",
												children: selectedOrder.address
											}),
											/* @__PURE__ */ jsxs("p", {
												className: "text-[var(--ca-text-muted)]",
												children: [
													selectedOrder.city,
													" · Postal ",
													selectedOrder.postalCode
												]
											})
										]
									}),
									selectedOrder.notes && /* @__PURE__ */ jsxs("p", {
										className: "border-t border-[var(--ca-border)] pt-2 text-[var(--ca-text-muted)] sm:col-span-2",
										children: [
											/* @__PURE__ */ jsx("strong", {
												className: "text-[var(--ca-text)]",
												children: "Customer Notes:"
											}),
											" ",
											selectedOrder.notes
										]
									})
								]
							}),
							selectedOrder.referralCode && /* @__PURE__ */ jsxs("div", {
								className: "flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--ca-accent)]/30 bg-[var(--ca-accent)]/10 px-4 py-3",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("p", {
									className: "font-semibold text-[var(--ca-text)]",
									children: [
										"Referred by Seller",
										" ",
										/* @__PURE__ */ jsx("span", {
											className: "font-mono-nums",
											children: selectedOrder.referralCode
										})
									]
								}), /* @__PURE__ */ jsxs("p", {
									className: "text-[11px] text-[var(--ca-text-muted)]",
									children: [
										"10% referral commission (",
										selectedOrder.commissionCredited ? "Credited to seller" : "Pending completion",
										")"
									]
								})] }), /* @__PURE__ */ jsx("span", {
									className: "font-mono-nums text-sm font-bold text-[var(--ca-accent)]",
									children: formatPKR(selectedOrder.commissionAmount)
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)]/80 p-4",
								children: [
									/* @__PURE__ */ jsx("p", {
										className: "font-semibold text-[var(--ca-text)]",
										children: "Ordered Pieces"
									}),
									/* @__PURE__ */ jsx("ul", {
										className: "mt-2 space-y-2",
										children: selectedOrder.items.map((it, i) => /* @__PURE__ */ jsxs("li", {
											className: "flex items-center justify-between gap-3",
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
												className: "font-mono-nums shrink-0 font-medium text-[var(--ca-text)]",
												children: formatPKR(it.unitPrice * it.quantity)
											})]
										}, i))
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "mt-3 flex items-center justify-between border-t border-[var(--ca-border)] pt-2.5 text-sm font-bold text-[var(--ca-text)]",
										children: [/* @__PURE__ */ jsxs("span", { children: [
											"Total (",
											selectedOrder.paymentMethod === "installments" ? selectedOrder.planLabel : "COD",
											")"
										] }), /* @__PURE__ */ jsx("span", {
											className: "font-mono-nums",
											children: formatPKR(selectedOrder.totalAmount)
										})]
									})
								]
							}),
							selectedOrder.paymentMethod === "installments" && /* @__PURE__ */ jsxs("div", {
								className: "rounded-2xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)]/80 p-4",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex flex-wrap items-center justify-between gap-2",
									children: [/* @__PURE__ */ jsx("strong", {
										className: "text-[var(--ca-text)]",
										children: "Installments Received"
									}), /* @__PURE__ */ jsxs("span", {
										className: "font-mono-nums font-semibold text-[var(--ca-text)]",
										children: [
											"Paid ",
											formatPKR(calculateOrderPaidSummary(selectedOrder).paidAmount),
											" /",
											" ",
											formatPKR(selectedOrder.totalAmount)
										]
									})]
								}), /* @__PURE__ */ jsxs("div", {
									className: "mt-2.5 space-y-1.5",
									children: [selectedOrder.advanceAmount > 0 && /* @__PURE__ */ jsxs("label", {
										className: "flex items-center justify-between rounded-xl bg-[var(--ca-surface-subtle)] px-3 py-2",
										children: [/* @__PURE__ */ jsxs("span", { children: [
											"Advance (",
											formatPKR(selectedOrder.advanceAmount),
											")"
										] }), /* @__PURE__ */ jsx("input", {
											type: "checkbox",
											checked: selectedOrder.advancePaid,
											onChange: (e) => handleToggleInstallment(selectedOrder.id, 0, e.target.checked, true)
										})]
									}), selectedOrder.installmentSchedule.map((row) => /* @__PURE__ */ jsxs("label", {
										className: "flex items-center justify-between rounded-xl bg-[var(--ca-surface-subtle)] px-3 py-2",
										children: [/* @__PURE__ */ jsxs("span", { children: [
											"Month ",
											row.installmentNumber,
											" · ",
											row.dueDate,
											" ·",
											" ",
											/* @__PURE__ */ jsx("span", {
												className: "font-mono-nums",
												children: formatPKR(row.amount)
											})
										] }), /* @__PURE__ */ jsx("input", {
											type: "checkbox",
											checked: row.paid,
											onChange: (e) => handleToggleInstallment(selectedOrder.id, row.installmentNumber, e.target.checked, false)
										})]
									}, row.installmentNumber))]
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ca-border)] pt-3",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex flex-wrap gap-2",
									children: [
										/* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: () => handleOrderStatus(selectedOrder.id, "rejected"),
											className: "rounded-xl border border-red-500/30 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400",
											children: "Reject"
										}),
										/* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: () => handleOrderStatus(selectedOrder.id, "proceeding"),
											className: "rounded-xl border border-[var(--ca-border)] px-3 py-2 text-xs font-medium text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]",
											children: "Proceed"
										}),
										/* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: () => handleOrderStatus(selectedOrder.id, "complete"),
											className: "rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700",
											children: "Complete & Credit 10%"
										})
									]
								}), selectedOrder.userId && selectedOrder.userId !== "guest" && /* @__PURE__ */ jsxs("button", {
									type: "button",
									onClick: () => {
										setNotifMode("user");
										setTargetUserId(selectedOrder.userId);
										setSelectedOrder(null);
										setTab("notifications");
									},
									className: "inline-flex items-center gap-1.5 rounded-xl border border-[var(--ca-border)] px-3 py-2 text-xs font-medium text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]",
									children: [/* @__PURE__ */ jsx(Bell, { className: "h-3.5 w-3.5" }), "Message User"]
								})]
							})
						]
					})]
				})
			}), document.body)
		]
	});
}
export { AdminConsole as t };
