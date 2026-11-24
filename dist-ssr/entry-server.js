import { A as canTriggerAction, B as DEFAULT_TERMS_POLICY, D as productService, E as orderService, F as sanitizePlainText, H as useToast, L as calculateInstallmentPlan, N as isValidAdminHash, V as ToastProvider, W as queryClient, b as useAuth, c as checkoutSchema, i as triggerTapRipple, j as createIdempotencyKey, l as extractZodFieldErrors, m as persistedCartItemSchema, n as CALoadingOverlay, r as CAProcessButton, t as CALoader, v as urlSlugSchema, y as AuthProvider, z as formatPKR } from "./assets/CALoader-DTLq4Do2.js";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { QueryClient, QueryClientProvider, dehydrate, useQuery } from "@tanstack/react-query";
import { Component, Suspense, createContext, lazy, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
import { AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, Calculator, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, CreditCard, Globe, Heart, Home, Mail, MapPin, MessageCircle, Minus, Moon, Package, PackageCheck, Phone, Plus, RefreshCw, Ruler, Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Sun, Truck, User, WifiOff, X } from "lucide-react";
import { z } from "zod";
import { AnimatePresence, motion } from "motion/react";
// src/context/ThemeContext.tsx
var _jsxFileName$23 = "/app/applet/src/context/ThemeContext.tsx";
var ThemeContext = createContext(null);
function ThemeProvider({ children }) {
	const [theme, setThemeState] = useState("light");
	useEffect(() => {
		try {
			const saved = localStorage.getItem("ca_theme");
			if (saved === "dark" || saved === "light") setThemeState(saved);
		} catch {}
	}, []);
	useEffect(() => {
		const root = document.documentElement;
		if (theme === "dark") root.classList.add("dark");
		else root.classList.remove("dark");
		try {
			localStorage.setItem("ca_theme", theme);
		} catch {}
	}, [theme]);
	const setTheme = (next) => setThemeState(next);
	const toggleTheme = () => setThemeState((prev) => prev === "light" ? "dark" : "light");
	return /* @__PURE__ */ jsxDEV(ThemeContext.Provider, {
		value: {
			theme,
			toggleTheme,
			setTheme
		},
		children
	}, void 0, false, {
		fileName: _jsxFileName$23,
		lineNumber: 45,
		columnNumber: 5
	}, this);
}
function useTheme() {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
	return ctx;
}
// src/context/CartContext.tsx
var _jsxFileName$22 = "/app/applet/src/context/CartContext.tsx";
var CART_KEY = "ca_cart_v1";
var WISHLIST_KEY = "ca_wishlist_v1";
var CartContext = createContext(null);
var cartArraySchema = z.array(persistedCartItemSchema).max(50);
var wishlistSchema = z.array(z.string().min(1).max(80)).max(200);
function CartProvider({ children }) {
	const [items, setItems] = useState([]);
	const [wishlistIds, setWishlistIds] = useState([]);
	const [hydrated, setHydrated] = useState(false);
	const [checkoutModalProduct, setCheckoutModalProduct] = useState(null);
	useEffect(() => {
		try {
			const rawCart = localStorage.getItem(CART_KEY);
			if (rawCart) {
				const parsedCart = cartArraySchema.safeParse(JSON.parse(rawCart));
				if (parsedCart.success) setItems(parsedCart.data);
			}
			const rawWish = localStorage.getItem(WISHLIST_KEY);
			if (rawWish) {
				const parsedWish = wishlistSchema.safeParse(JSON.parse(rawWish));
				if (parsedWish.success) setWishlistIds(parsedWish.data);
			}
		} catch {}
		setHydrated(true);
	}, []);
	useEffect(() => {
		if (!hydrated) return;
		try {
			localStorage.setItem(CART_KEY, JSON.stringify(items));
		} catch {}
	}, [items, hydrated]);
	useEffect(() => {
		if (!hydrated) return;
		try {
			localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlistIds));
		} catch {}
	}, [wishlistIds, hydrated]);
	const isWishlisted = (productId) => wishlistIds.includes(productId);
	const toggleWishlist = (productId) => {
		setWishlistIds((prev) => prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]);
	};
	const addItem = (product, quantity = 1, selectedSize) => {
		setItems((prev) => {
			const idx = prev.findIndex((i) => i.productId === product.id && (i.selectedSize || "") === (selectedSize || ""));
			if (idx >= 0) {
				const next = [...prev];
				next[idx] = {
					...next[idx],
					quantity: next[idx].quantity + quantity
				};
				return next;
			}
			return [...prev, {
				productId: product.id,
				title: product.title,
				unitPrice: product.price,
				quantity,
				selectedSize,
				image: product.coverImage
			}];
		});
	};
	const updateQuantity = (productId, selectedSize, quantity) => {
		if (quantity <= 0) {
			removeItem(productId, selectedSize);
			return;
		}
		setItems((prev) => prev.map((i) => i.productId === productId && (i.selectedSize || "") === (selectedSize || "") ? {
			...i,
			quantity
		} : i));
	};
	const removeItem = (productId, selectedSize) => {
		setItems((prev) => prev.filter((i) => !(i.productId === productId && (i.selectedSize || "") === (selectedSize || ""))));
	};
	const clearCart = () => setItems([]);
	const openBuySheet = (product, quantity = 1, size, options) => {
		setCheckoutModalProduct({
			product,
			quantity,
			size,
			paymentMethod: options?.paymentMethod,
			planId: options?.planId
		});
	};
	const closeBuySheet = () => setCheckoutModalProduct(null);
	const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
	const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
	return /* @__PURE__ */ jsxDEV(CartContext.Provider, {
		value: {
			items,
			totalItems,
			subtotal,
			wishlistIds,
			isWishlisted,
			toggleWishlist,
			addItem,
			updateQuantity,
			removeItem,
			clearCart,
			checkoutModalProduct,
			openBuySheet,
			closeBuySheet
		},
		children
	}, void 0, false, {
		fileName: _jsxFileName$22,
		lineNumber: 170,
		columnNumber: 5
	}, this);
}
function useCart() {
	const ctx = useContext(CartContext);
	if (!ctx) throw new Error("useCart must be used inside CartProvider");
	return ctx;
}
// src/components/ErrorBoundary.tsx
var _jsxFileName$21 = "/app/applet/src/components/ErrorBoundary.tsx";
var ErrorBoundary = class extends Component {
	constructor(..._args) {
		super(..._args);
		this.state = { hasError: false };
		this.handleReload = () => {
			this.setState({ hasError: false });
			window.location.assign("/");
		};
	}
	static getDerivedStateFromError() {
		return { hasError: true };
	}
	componentDidCatch() {}
	render() {
		if (this.state.hasError) return /* @__PURE__ */ jsxDEV("div", {
			className: "flex min-h-screen items-center justify-center bg-[var(--ca-bg)] px-6 py-16",
			children: /* @__PURE__ */ jsxDEV("div", {
				className: "glass-panel max-w-md rounded-2xl p-8 text-center",
				children: [
					/* @__PURE__ */ jsxDEV("p", {
						className: "text-xs font-medium text-[var(--ca-text-muted)]",
						children: "Cinematic Arts"
					}, void 0, false, {
						fileName: _jsxFileName$21,
						lineNumber: 29,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ jsxDEV("h1", {
						className: "font-display mt-3 text-3xl font-semibold text-[var(--ca-text)]",
						children: "Something went wrong"
					}, void 0, false, {
						fileName: _jsxFileName$21,
						lineNumber: 32,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ jsxDEV("p", {
						className: "mt-3 text-sm leading-relaxed text-[var(--ca-text-muted)]",
						children: "An unexpected interruption occurred while rendering this view. Please return to the storefront and try again."
					}, void 0, false, {
						fileName: _jsxFileName$21,
						lineNumber: 35,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ jsxDEV("button", {
						type: "button",
						onClick: this.handleReload,
						className: "btn-press mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-sm font-medium text-[var(--ca-bg)]",
						children: [/* @__PURE__ */ jsxDEV(RefreshCw, { className: "h-4 w-4" }, void 0, false, {
							fileName: _jsxFileName$21,
							lineNumber: 43,
							columnNumber: 15
						}, this), "Return to Storefront"]
					}, void 0, true, {
						fileName: _jsxFileName$21,
						lineNumber: 38,
						columnNumber: 13
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName$21,
				lineNumber: 28,
				columnNumber: 11
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName$21,
			lineNumber: 27,
			columnNumber: 9
		}, this);
		return this.props.children;
	}
};
// src/components/IntroSplash.tsx
var _jsxFileName$20 = "/app/applet/src/components/IntroSplash.tsx";
var BRAND_TITLE = "Cinematic Arts";
function IntroSplash() {
	const [reducedMotion, setReducedMotion] = useState(false);
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		const prefersReduced = typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
		setReducedMotion(prefersReduced);
		if (new URLSearchParams(window.location.search).get("autostart") === "1") return;
		setVisible(true);
		const duration = prefersReduced ? 850 : 2900;
		const timer = window.setTimeout(() => setVisible(false), duration);
		return () => window.clearTimeout(timer);
	}, []);
	return /* @__PURE__ */ jsxDEV(AnimatePresence, { children: visible && /* @__PURE__ */ jsxDEV(motion.div, {
		initial: {
			opacity: 1,
			y: 0
		},
		exit: reducedMotion ? {
			opacity: 0,
			transition: { duration: .25 }
		} : {
			y: "-100%",
			opacity: .92,
			transition: {
				duration: .65,
				ease: [
					.22,
					1,
					.36,
					1
				]
			}
		},
		className: "fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#0c0d0f] px-6 text-[#f4f4f5]",
		"aria-label": "Cinematic Arts intro",
		children: [
			!reducedMotion && /* @__PURE__ */ jsxDEV("div", {
				"aria-hidden": "true",
				className: "ca-intro-sweep pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-amber-200/10 to-transparent"
			}, void 0, false, {
				fileName: _jsxFileName$20,
				lineNumber: 44,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ jsxDEV("div", {
				className: "relative text-center",
				children: [
					/* @__PURE__ */ jsxDEV(motion.div, {
						initial: reducedMotion ? { opacity: 0 } : {
							opacity: 0,
							scale: .9
						},
						animate: {
							opacity: 1,
							scale: 1
						},
						transition: {
							duration: reducedMotion ? .25 : .65,
							ease: [
								.16,
								1,
								.3,
								1
							]
						},
						className: "mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-400/25 bg-white/[0.04] backdrop-blur-xl shadow-2xl",
						children: /* @__PURE__ */ jsxDEV("span", {
							className: "font-display text-4xl font-semibold tracking-wider text-[#d98a2b]",
							children: "CA"
						}, void 0, false, {
							fileName: _jsxFileName$20,
							lineNumber: 57,
							columnNumber: 15
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName$20,
						lineNumber: 51,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ jsxDEV("h2", {
						className: "font-display text-3xl font-medium tracking-wide sm:text-5xl",
						"aria-label": BRAND_TITLE,
						children: reducedMotion ? /* @__PURE__ */ jsxDEV("span", { children: BRAND_TITLE }, void 0, false, {
							fileName: _jsxFileName$20,
							lineNumber: 67,
							columnNumber: 17
						}, this) : BRAND_TITLE.split("").map((ch, idx) => /* @__PURE__ */ jsxDEV("span", {
							style: { animationDelay: `${220 + idx * 42}ms` },
							className: "ca-intro-letter",
							children: ch === " " ? "\xA0" : ch
						}, idx, false, {
							fileName: _jsxFileName$20,
							lineNumber: 70,
							columnNumber: 19
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName$20,
						lineNumber: 62,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ jsxDEV("div", {
						"aria-hidden": "true",
						className: `${reducedMotion ? "opacity-70" : "ca-intro-gold-line"} mx-auto mt-3.5 h-[1.5px] w-36 bg-gradient-to-r from-transparent via-[#d98a2b] to-transparent`
					}, void 0, false, {
						fileName: _jsxFileName$20,
						lineNumber: 82,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ jsxDEV(motion.p, {
						initial: { opacity: 0 },
						animate: { opacity: 1 },
						transition: {
							delay: reducedMotion ? .1 : 1.15,
							duration: .5
						},
						className: "mt-3 text-xs text-zinc-400",
						children: "Peshawar, Pakistan"
					}, void 0, false, {
						fileName: _jsxFileName$20,
						lineNumber: 89,
						columnNumber: 13
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName$20,
				lineNumber: 50,
				columnNumber: 11
			}, this),
			/* @__PURE__ */ jsxDEV("button", {
				type: "button",
				onClick: () => setVisible(false),
				className: "btn-press mt-10 min-h-[44px] rounded-xl border border-white/15 px-5 py-2 text-xs font-medium text-zinc-300 hover:border-white/35 hover:text-white",
				children: "Skip"
			}, void 0, false, {
				fileName: _jsxFileName$20,
				lineNumber: 99,
				columnNumber: 11
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$20,
		lineNumber: 28,
		columnNumber: 9
	}, this) }, void 0, false, {
		fileName: _jsxFileName$20,
		lineNumber: 26,
		columnNumber: 5
	}, this);
}
// src/i18n/en.ts
var enDictionary = {
	lang: "en",
	dir: "ltr",
	brand: "Cinematic Arts",
	brandFull: "Cinematic Arts (CA)",
	locationShort: "Peshawar, Pakistan",
	nav: {
		home: "Home",
		shop: "Shop",
		orders: "Orders",
		profile: "Profile",
		about: "About Us",
		faq: "Installment FAQ",
		sizeGuide: "Size Guide",
		shipping: "Shipping & Returns",
		contact: "Contact",
		terms: "Terms & Installment Policy",
		privacy: "Privacy & Data Usage",
		signIn: "Sign In",
		browseShop: "Browse Shop",
		bag: "Bag",
		switchLangLabel: "اردو"
	},
	hero: {
		title: "Clothing & Accessories for Everyday Wear",
		subtitle: "Women's unstitched suits, boys' trousers, jackets, hoodies, shirts, t-shirts, and daily essentials priced in PKR. Pay on delivery or split your order into monthly installments.",
		shopCollection: "Shop Collection",
		installmentPlans: "Installment Plans",
		codTitle: "Cash on delivery",
		codDesc: "Delivered to your door anywhere in Pakistan with payment on arrival.",
		plansTitle: "Monthly PKR plans",
		plansDesc: "Spread payments across 2, 3, or 4 months using an active Seller Referral ID.",
		exchangeTitle: "7-day size exchange",
		exchangeDesc: "Easy exchanges on unworn items within seven days of delivery."
	},
	home: {
		featuredProducts: "Featured Products",
		viewAllProducts: "View All Products",
		shopByCategory: "Shop by Category",
		aboutTitle: "About Cinematic Arts",
		aboutBody: "Based in Peshawar, we put together practical everyday garments for families across Pakistan—from embroidered women's unstitched fabrics to boys' trousers, jackets, hoodies, and shirts. Every piece is priced openly in Pakistani Rupees with straightforward delivery and exchange support.",
		readStory: "Read Our Story",
		howInstallmentsTitle: "How Installments Work",
		readFaq: "Read Installment FAQ",
		needHelpTitle: "Need sizing help or seller details?",
		needHelpSubtitle: "Reach our Peshawar store team directly by email, phone, or WhatsApp.",
		emailUs: "Email Us",
		whatsapp: "WhatsApp",
		noProductsTitle: "No products listed yet",
		noProductsDesc: "Products added to your shop catalog will appear here automatically."
	},
	shop: {
		heading: "Shop the Collection",
		subtitle: "All prices in Pakistani Rupees (PKR)",
		searchPlaceholder: "Search pieces...",
		sortLatest: "Latest Drops",
		sortPriceAsc: "Price: Low to High",
		sortPriceDesc: "Price: High to Low",
		installmentCalc: "Installment Calculator",
		hideCalc: "Hide Calculator",
		allItems: "All Items",
		noMatchTitle: "No pieces match your filter",
		noMatchDesc: "Try clearing your search term or selecting All Items.",
		resetFilters: "Reset Filters",
		previous: "Previous",
		next: "Next"
	},
	category: {
		breadcrumbShop: "Shop",
		allCategories: "All Categories",
		itemsCountLabel: (count) => `${count} ${count === 1 ? "item" : "items"} available in PKR`,
		sizeGuideCta: "View Size Guide",
		emptyTitle: "No active listings in this category yet",
		emptyDesc: "Browse the full storefront catalog or check back soon for newly listed stock.",
		browseAllCta: "Browse Full Shop",
		intros: {
			"womens-unstitched": "Breathable cotton, lawn, and embroidered 3-piece women's unstitched fabrics ready for custom tailoring across every season in Pakistan.",
			"boys-trousers": "Durable cotton twill chinos and everyday trousers tailored for active boys with comfortable waistbands and reinforced seams.",
			jackets: "Clean-cut outerwear, casual bombers, and lined seasonal jackets built for cool Peshawar evenings and winter travel.",
			hoodies: "Brushed-fleece pullovers and heavyweight hoodies made for comfortable everyday warmth without stiff layering.",
			shirts: "Yarn-dyed Oxford and crisp cotton button-down shirts suited for workdays, university wear, and family gatherings.",
			"t-shirts": "Combed cotton crew-neck t-shirts cut for breathable daily comfort and lasting neckline shape after repeated washes.",
			accessories: "Classic wristwatches, woven winter scarves, and practical everyday accents priced clearly in PKR."
		},
		fallbackIntro: (name) => `Browse curated ${name} items from Cinematic Arts (CA) in Peshawar, available with Cash on Delivery or monthly PKR installments.`
	},
	product: {
		backToCollection: "Back to Collection",
		skuLabel: "SKU",
		sizeLabel: "Size",
		sizeGuideLink: "Size Guide",
		quantityLabel: "Quantity",
		outOfStock: "Out of stock",
		inStock: "In stock",
		addToBag: "Add to Bag",
		buyNow: "Buy Now",
		relatedTitle: "Related Items",
		notFoundTitle: "Piece Not Found",
		notFoundDesc: "This product link is invalid or the item has been archived."
	},
	about: {
		heading: "About Cinematic Arts (CA)",
		lead: "Cinematic Arts (CA) is a Peshawar-based clothing and accessories store serving families across Pakistan with transparent PKR pricing, Cash on Delivery, and verified monthly installment plans.",
		sections: [
			{
				heading: "Built Around Everyday Pakistani Wardrobes",
				body: "We focus on dependable staples rather than fleeting hype: embroidered women's 3-piece unstitched suits, boys' stretch cotton trousers, casual jackets, fleece hoodies, crisp Oxford shirts, combed cotton t-shirts, and functional accessories."
			},
			{
				heading: "Transparent PKR Pricing & Installments",
				body: "Every item displays its full Cash on Delivery price alongside live 2-month, 3-month, and 4-month installment totals in PKR. Installment orders are verified through registered CA Seller Referral IDs so customers and local sellers have clear payment records."
			},
			{
				heading: "Nationwide Dispatch From Peshawar",
				body: "Orders are packed and dispatched from Peshawar with tracked delivery across Khyber Pakhtunkhwa, Punjab, Sindh, Balochistan, Islamabad, and Azad Kashmir. Unworn garments and uncut fabrics qualify for easy 7-day exchanges."
			}
		],
		ctaShop: "Browse the Shop",
		ctaContact: "Contact Our Store"
	},
	faq: {
		heading: "Installment & Order FAQ",
		intro: "Clear answers about Cinematic Arts PKR installment plans, Cash on Delivery, Seller Referral IDs, and nationwide exchanges.",
		items: [
			{
				id: "faq-installments-how",
				question: "How do monthly PKR installment plans work at Cinematic Arts?",
				answer: "You split your PKR order total across 2 months (15% markup), 3 months (25% markup), or 4 months (40% markup) with zero advance payment required by default when ordering with an active Seller Referral ID. Once you select a plan at checkout and submit a valid referral code (CA-XXXXXX), your order is verified by our team and each due date appears inside My Orders."
			},
			{
				id: "faq-cod-referral",
				question: "Do I need a Seller Referral ID for Cash on Delivery orders?",
				answer: "No, Cash on Delivery (COD) orders never require a Seller Referral ID. Any customer anywhere in Pakistan can place a COD order directly and pay the rider in PKR upon delivery, though you may still enter a seller code optionally."
			},
			{
				id: "faq-seller-code",
				question: "Where do I get an active CA Seller Referral ID?",
				answer: "You obtain a Seller Referral ID directly from a verified Cinematic Arts seller or by registering for a seller account yourself. Every approved seller receives a unique code in the format CA-XXXXXX on their Profile & Seller Dashboard."
			},
			{
				id: "faq-commission",
				question: "How much commission does a Cinematic Arts seller earn?",
				answer: "Verified Cinematic Arts sellers earn a 10% commission on the total PKR value of every referred order once it is marked Complete. Pending or rejected orders do not credit commission until fulfillment is finalized."
			},
			{
				id: "faq-delivery-time",
				question: "How long does nationwide delivery take across Pakistan?",
				answer: "Orders within Peshawar arrive within 1 to 2 working days, while deliveries to major cities across Pakistan typically take 2 to 5 working days. Tracking updates are coordinated directly via phone and WhatsApp."
			},
			{
				id: "faq-returns",
				question: "Can I exchange a size or return an unstitched suit?",
				answer: "Yes, unworn stitched garments and uncut unstitched fabric suits with original tags may be exchanged within 7 calendar days of delivery. Contact our Peshawar support team on WhatsApp or email with your order ID to arrange a size swap."
			}
		],
		ctaTitle: "Still have a question before ordering?",
		ctaDesc: "Message our Peshawar team on WhatsApp or check your exact PKR monthly estimate.",
		ctaButton: "Contact Store Team"
	},
	sizeGuide: {
		heading: "Clothing Size Guide",
		intro: "Use these standard garment measurements in inches (unless stated in meters) to pick the right fit before placing your order.",
		unstitchedTitle: "Women's 3-Piece Unstitched Suits",
		unstitchedDesc: "Cut lengths provide generous fabric allowance for standard and long tailoring.",
		unstitchedRows: [
			{
				piece: "Shirt Front & Back (Embroidered / Printed)",
				measurement: "2.5 – 3.0 meters",
				note: "Suitable for all standard kurtas and kameez styles"
			},
			{
				piece: "Trouser / Shalwar Fabric",
				measurement: "2.5 meters (dyed)",
				note: "Supports straight trousers, shalwar, or culottes"
			},
			{
				piece: "Dupatta / Shawl",
				measurement: "2.5 meters",
				note: "Organza, lawn, chiffon, or woven seasonal finish"
			}
		],
		apparelTitle: "Jackets, Hoodies, Shirts & T-Shirts",
		apparelDesc: "Garment flat measurements (inches). Size up if you prefer a looser winter layer.",
		apparelRows: [
			{
				size: "S",
				chest: "38 – 40\"",
				length: "27\"",
				waist: "30 – 31\""
			},
			{
				size: "M",
				chest: "41 – 42\"",
				length: "28\"",
				waist: "32 – 33\""
			},
			{
				size: "L",
				chest: "43 – 45\"",
				length: "29\"",
				waist: "34 – 36\""
			},
			{
				size: "XL",
				chest: "46 – 48\"",
				length: "30\"",
				waist: "37 – 38\""
			}
		],
		boysTitle: "Boys' Trousers & Chinos",
		boysRows: [
			{
				size: "26",
				waist: "26\"",
				length: "34\"",
				ageApprox: "8 – 10 years"
			},
			{
				size: "28",
				waist: "28\"",
				length: "36\"",
				ageApprox: "11 – 12 years"
			},
			{
				size: "30",
				waist: "30\"",
				length: "38\"",
				ageApprox: "13 – 14 years"
			},
			{
				size: "32",
				waist: "32\"",
				length: "39\"",
				ageApprox: "15 – 16 years"
			}
		],
		careNote: "Need exact measurements for a specific piece? Message us on WhatsApp at 03355329722 with the product title or SKU before checkout."
	},
	shipping: {
		heading: "Shipping, Cash on Delivery & 7-Day Returns",
		intro: "Every Cinematic Arts order ships from Peshawar with clear delivery timelines and a straightforward 7-day size exchange guarantee.",
		zonesTitle: "Estimated Delivery Times in Pakistan",
		zones: [
			{
				region: "Peshawar & Surrounding Areas",
				eta: "1 – 2 working days",
				payment: "Cash on Delivery & Verified Installments"
			},
			{
				region: "Islamabad, Rawalpindi & Lahore",
				eta: "2 – 4 working days",
				payment: "Cash on Delivery & Verified Installments"
			},
			{
				region: "Karachi, Multan, Faisalabad & Nationwide",
				eta: "3 – 5 working days",
				payment: "Cash on Delivery & Verified Installments"
			}
		],
		returnsTitle: "7-Day Exchange & Return Rules",
		returnsPoints: [
			"Unworn garments with original tags attached and uncut unstitched fabrics qualify for a size or item exchange within 7 calendar days of delivery.",
			"Wrong or damaged items delivered in transit are replaced free of any extra delivery fee once reported within 48 hours of arrival.",
			"Installment orders remain subject to the verified repayment schedule; exchanges swap equal-value items or adjust the balance transparently."
		]
	},
	contact: {
		heading: "Contact Cinematic Arts (CA)",
		intro: "Reach our Peshawar storefront team for order updates, sizing advice, wholesale or seller onboarding, and installment verification.",
		addressLabel: "Store Location",
		phoneLabel: "Phone & Direct Call",
		emailLabel: "Support Email",
		hoursLabel: "Store Hours",
		whatsappCta: "Chat on WhatsApp",
		mapCta: "Open Store Map",
		faqLinkLabel: "Read Installment & Delivery FAQ"
	},
	footer: {
		summary: "Women's unstitched clothes, boys' trousers, jackets, hoodies, shirts, t-shirts, and accessories shipped nationwide across Pakistan in PKR.",
		pagesHeading: "Store",
		guidesHeading: "Guides & Support",
		accountHeading: "Account & Policies",
		darkMode: "Dark Appearance",
		lightMode: "Light Appearance",
		privacyNote: "Zero third-party advertising trackers. Essential session & delivery storage only.",
		rights: "Cinematic Arts (CA). Peshawar, Pakistan.",
		currencyNote: "All prices in Pakistani Rupees (PKR)."
	},
	notFound: {
		code: "Error 404",
		heading: "Page not found",
		body: "This page could not be found. Browse our latest clothing and accessories or return to the main storefront.",
		backHome: "Back to Home"
	}
};
// src/i18n/ur.ts
/**
* Urdu (ur-PK, RTL) translations for Cinematic Arts (CA).
* Note: Recommended for final review by a native Urdu speaker (listed in SEO.md).
*/
var urDictionary = {
	lang: "ur",
	dir: "rtl",
	brand: "سنیماٹک آرٹس",
	brandFull: "سنیماٹک آرٹس (CA)",
	locationShort: "پشاور، پاکستان",
	nav: {
		home: "ہوم",
		shop: "دکان",
		orders: "آرڈرز",
		profile: "پروفائل",
		about: "ہمارے بارے میں",
		faq: "اقساط سوالات",
		sizeGuide: "سائز گائیڈ",
		shipping: "ڈیلیوری اور واپسی",
		contact: "رابطہ",
		terms: "شرائط و اقساط پالیسی",
		privacy: "پرائیویسی پالیسی",
		signIn: "لاگ ان",
		browseShop: "دکان دیکھیں",
		bag: "بیگ",
		switchLangLabel: "English"
	},
	hero: {
		title: "روزمرہ پہننے کے لیے ملبوسات اور لوازمات",
		subtitle: "خواتین کے ان سٹچڈ سوٹ، لڑکوں کی ٹراؤزر، جیکٹس، ہڈیز، شرٹس، ٹی شرٹس اور روزمرہ لوازمات پاکستانی روپے (PKR) میں۔ کیش آن ڈیلیوری یا ماہانہ اقساط میں خریداری کریں۔",
		shopCollection: "کلیکشن دیکھیں",
		installmentPlans: "اقساط کے منصوبے",
		codTitle: "کیش آن ڈیلیوری",
		codDesc: "پاکستان بھر میں گھر کی دہلیز پر پارسل وصول کرتے وقت ادائیگی کریں۔",
		plansTitle: "ماہانہ اقساط (PKR)",
		plansDesc: "مصدقہ سیلر ریفرل آئی ڈی کے ساتھ 2، 3 یا 4 ماہ کی آسان اقساط میں ادائیگی کریں۔",
		exchangeTitle: "7 دن میں سائز تبدیلی",
		exchangeDesc: "ڈیلیوری کے سات دن کے اندر غیر استعمال شدہ کپڑوں کی آسان تبدیلی۔"
	},
	home: {
		featuredProducts: "منتخب مصنوعات",
		viewAllProducts: "تمام مصنوعات دیکھیں",
		shopByCategory: "کیٹیگری کے مطابق خریداری",
		aboutTitle: "سنیماٹک آرٹس کے بارے میں",
		aboutBody: "پشاور میں قائم سنیماٹک آرٹس پاکستان بھر کے خاندانوں کے لیے معیاری روزمرہ ملبوسات فراہم کرتا ہے — خواتین کے کڑھائی والے ان سٹچڈ سوٹ سے لے کر لڑکوں کی ٹراؤزر، جیکٹس، ہڈیز اور شرٹس تک، تمام قیمتیں پاکستانی روپے میں شفاف انداز میں درج ہیں۔",
		readStory: "مزید جانیں",
		howInstallmentsTitle: "اقساط کا طریقہ کار",
		readFaq: "اقساط کے سوالات پڑھیں",
		needHelpTitle: "سائز یا سیلر معلومات میں مدد چاہیے؟",
		needHelpSubtitle: "پشاور اسٹور ٹیم سے ای میل، فون یا واٹس ایپ پر براہِ راست رابطہ کریں۔",
		emailUs: "ای میل کریں",
		whatsapp: "واٹس ایپ",
		noProductsTitle: "ابھی کوئی پروڈکٹ شامل نہیں کی گئی",
		noProductsDesc: "آپ کی دکان میں شامل کردہ مصنوعات خودکار طور پر یہاں نظر آئیں گی۔"
	},
	shop: {
		heading: "مکمل کلیکشن",
		subtitle: "تمام قیمتیں پاکستانی روپے (PKR) میں ہیں",
		searchPlaceholder: "ملبوسات تلاش کریں...",
		sortLatest: "تازہ ترین",
		sortPriceAsc: "قیمت: کم سے زیادہ",
		sortPriceDesc: "قیمت: زیادہ سے کم",
		installmentCalc: "اقساط کیلکولیٹر",
		hideCalc: "کیلکولیٹر چھپائیں",
		allItems: "تمام اشیاء",
		noMatchTitle: "تلاش سے کوئی چیز نہیں ملی",
		noMatchDesc: "تلاش کا لفظ صاف کریں یا تمام اشیاء منتخب کریں۔",
		resetFilters: "فلٹرز صاف کریں",
		previous: "پچھلا",
		next: "اگلا"
	},
	category: {
		breadcrumbShop: "دکان",
		allCategories: "تمام کیٹیگریز",
		itemsCountLabel: (count) => `${count} اشیاء پاکستانی روپے میں دستیاب`,
		sizeGuideCta: "سائز گائیڈ دیکھیں",
		emptyTitle: "اس کیٹیگری میں ابھی کوئی پروڈکٹ دستیاب نہیں",
		emptyDesc: "دیگر کلیکشن دیکھنے کے لیے مکمل دکان کا وزٹ کریں۔",
		browseAllCta: "مکمل دکان دیکھیں",
		intros: {
			"womens-unstitched": "پاکستان کے ہر موسم کے لیے آرام دہ لان، کاٹن اور کڑھائی والے خواتین کے 3 پیس ان سٹچڈ سوٹ۔",
			"boys-trousers": "لڑکوں کے لیے مضبوط سلائی اور آرام دہ کمر بینڈ کے ساتھ کاٹن چائینوز اور روزمرہ ٹراؤزر۔",
			jackets: "پشاور کی سرد شاموں اور سفر کے لیے آرام دہ استر والی جیکٹس اور بمبر کوٹ۔",
			hoodies: "سردیوں کے روزمرہ استعمال کے لیے نرم فلیس ہڈیز اور گرم پل اوور۔",
			shirts: "دفتر، یونیورسٹی اور خاندانی تقاریب کے لیے عمدہ کاٹن اور آکسفورڈ بٹن شرٹس۔",
			"t-shirts": "گرمی اور روزمرہ آرام کے لیے خالص کاٹن کی پائیدار ٹی شرٹس۔",
			accessories: "روزمرہ استعمال کے لیے کلاسک گھڑیاں، اونی شال اور دیگر معیاری لوازمات۔"
		},
		fallbackIntro: (name) => `سنیماٹک آرٹس (پشاور) سے ${name} کی معیاری کلیکشن کیش آن ڈیلیوری اور ماہانہ اقساط میں دستیاب ہے۔`
	},
	product: {
		backToCollection: "کلیکشن پر واپس جائیں",
		skuLabel: "پروڈکٹ کوڈ (SKU)",
		sizeLabel: "سائز",
		sizeGuideLink: "سائز گائیڈ",
		quantityLabel: "تعداد",
		outOfStock: "اسٹاک ختم",
		inStock: "دستیاب ہے",
		addToBag: "بیگ میں شامل کریں",
		buyNow: "ابھی خریدیں",
		relatedTitle: "ملتی جلتی مصنوعات",
		notFoundTitle: "پروڈکٹ دستیاب نہیں",
		notFoundDesc: "یہ پروڈکٹ لنک غلط ہے یا آئٹم اب دستیاب نہیں رہا۔"
	},
	about: {
		heading: "سنیماٹک آرٹس (CA) کا تعارف",
		lead: "سنیماٹک آرٹس پشاور میں قائم ایک قابلِ اعتماد ملبوسات اور لوازمات کا اسٹور ہے جو پاکستان بھر میں شفاف PKR قیمتوں، کیش آن ڈیلیوری اور مصدقہ ماہانہ اقساط کی سہولت فراہم کرتا ہے۔",
		sections: [
			{
				heading: "پاکستانی خاندانوں کے روزمرہ ملبوسات",
				body: "ہم روزمرہ استعمال کی پائیدار اشیاء پیش کرتے ہیں جن میں خواتین کے 3 پیس ان سٹچڈ سوٹ، لڑکوں کی کاٹن ٹراؤزر، جیکٹس، فلیس ہڈیز، آکسفورڈ شرٹس، ٹی شرٹس اور لوازمات شامل ہیں۔"
			},
			{
				heading: "شفاف قیمتیں اور آسان ماہانہ اقساط",
				body: "ہر پروڈکٹ کے ساتھ اس کی نقد قیمت اور 2، 3 یا 4 ماہ کی اقساط کا مکمل حساب PKR میں دکھایا جاتا ہے۔ اقساط کے آرڈرز مصدقہ سیلر ریفرل آئی ڈی کے ذریعے تصدیق کیے جاتے ہیں۔"
			},
			{
				heading: "پشاور سے پورے پاکستان میں ترسیل",
				body: "تمام آرڈرز پشاور سے پیک کر کے خیبر پختونخوا، پنجاب، سندھ، بلوچستان، اسلام آباد اور آزاد کشمیر میں بھیجے جاتے ہیں۔ غیر استعمال شدہ کپڑوں پر 7 دن کی تبدیلی کی سہولت موجود ہے۔"
			}
		],
		ctaShop: "دکان دیکھیں",
		ctaContact: "اسٹور سے رابطہ کریں"
	},
	faq: {
		heading: "اقساط اور آرڈرز کے عمومی سوالات",
		intro: "سنیماٹک آرٹس کی PKR اقساط، کیش آن ڈیلیوری، سیلر ریفرل آئی ڈی اور تبدیلی کی پالیسی سے متعلق واضح جوابات۔",
		items: [
			{
				id: "faq-installments-how",
				question: "سنیماٹک آرٹس پر ماہانہ اقساط کا نظام کیسے کام کرتا ہے؟",
				answer: "آپ مصدقہ سیلر ریفرل آئی ڈی کے ساتھ اپنی خریداری کی رقم کو 2 ماہ (15% مارک اپ)، 3 ماہ (25% مارک اپ) یا 4 ماہ (40% مارک اپ) کی مساوی ماہانہ اقساط میں تقسیم کر سکتے ہیں۔ چیک آؤٹ پر درست ریفرل کوڈ (CA-XXXXXX) درج کرنے کے بعد آپ کا شیڈول آرڈرز سیکشن میں ظاہر ہوتا ہے۔"
			},
			{
				id: "faq-cod-referral",
				question: "کیا کیش آن ڈیلیوری آرڈر کے لیے سیلر ریفرل آئی ڈی ضروری ہے؟",
				answer: "نہیں، کیش آن ڈیلیوری (COD) آرڈر کے لیے کسی ریفرل آئی ڈی کی ضرورت نہیں ہوتی۔ پاکستان بھر سے کوئی بھی صارف بغیر کوڈ کے نقد ادائیگی پر آرڈر کر سکتا ہے۔"
			},
			{
				id: "faq-seller-code",
				question: "مصدقہ سیلر ریفرل آئی ڈی کہاں سے حاصل کی جا سکتی ہے؟",
				answer: "آپ کسی منظور شدہ سنیماٹک آرٹس سیلر سے ریفرل آئی ڈی لے سکتے ہیں یا خود سیلر اکاؤنٹ بنا کر اپنا کوڈ حاصل کر سکتے ہیں۔ ہر سیلر کو پروفائل ڈیش بورڈ پر CA-XXXXXX کی صورت میں منفرد کوڈ ملتا ہے۔"
			},
			{
				id: "faq-commission",
				question: "سیلر کو ہر ریفر کردہ آرڈر پر کتنا کمیشن ملتا ہے؟",
				answer: "منظور شدہ سنیماٹک آرٹس سیلر کو ہر مکمل ہونے والے ریفر کردہ آرڈر کی کل قیمت پر 10% کمیشن ملتا ہے۔ زیرِ التواء یا منسوخ شدہ آرڈرز پر کمیشن شامل نہیں ہوتا۔"
			},
			{
				id: "faq-delivery-time",
				question: "پاکستان میں پارسل پہنچنے میں کتنا وقت لگتا ہے؟",
				answer: "پشاور میں آرڈر 1 سے 2 کاروباری دنوں میں جبکہ پاکستان کے دیگر بڑے شہروں میں عام طور پر 2 سے 5 کاروباری دنوں میں پہنچایا جاتا ہے۔ ترسیل کی اطلاع فون اور واٹس ایپ پر دی جاتی ہے۔"
			},
			{
				id: "faq-returns",
				question: "کیا سائز کی تبدیلی یا ان سٹچڈ سوٹ کی واپسی ممکن ہے؟",
				answer: "جی ہاں، ڈیلیوری کے 7 دن کے اندر غیر استعمال شدہ کپڑے اور بغیر کٹے ان سٹچڈ سوٹ اصل ٹیگز کے ساتھ تبدیل کیے جا سکتے ہیں۔ تبدیلی کے لیے آرڈر نمبر کے ساتھ ہمارے واٹس ایپ پر رابطہ کریں۔"
			}
		],
		ctaTitle: "آرڈر سے پہلے کوئی سوال پوچھنا چاہتے ہیں؟",
		ctaDesc: "ہمارے پشاور اسٹور سے واٹس ایپ پر رابطہ کریں یا کیلکولیٹر استعمال کریں۔",
		ctaButton: "اسٹور ٹیم سے رابطہ"
	},
	sizeGuide: {
		heading: "سائز گائیڈ اور ناپ کا چارٹ",
		intro: "درست سائز منتخب کرنے کے لیے نیچے دیے گئے معیاری انچز اور میٹرز کے ناپ ملاحظہ کریں۔",
		unstitchedTitle: "خواتین کے 3 پیس ان سٹچڈ سوٹ",
		unstitchedDesc: "ہر سوٹ میں معیاری سلائی کے لیے وافر کپڑا فراہم کیا جاتا ہے۔",
		unstitchedRows: [
			{
				piece: "قمیض (فرنٹ اور بیک)",
				measurement: "2.5 تا 3.0 میٹر",
				note: "ہر قسم کے سادہ اور لمبے کرتہ اسٹائل کے لیے موزوں"
			},
			{
				piece: "ٹراؤزر / شلوار کا کپڑا",
				measurement: "2.5 میٹر",
				note: "شلوار یا ٹراؤزر کی مکمل سلائی کے لیے کافی"
			},
			{
				piece: "دوپٹہ / شال",
				measurement: "2.5 میٹر",
				note: "لان، شفون، آرگنزا یا موسمی شال"
			}
		],
		apparelTitle: "جیکٹس، ہڈیز، شرٹس اور ٹی شرٹس",
		apparelDesc: "تمام ناپ انچز میں ہیں؛ سردیوں کی تہہ دار پوشاک کے لیے ایک سائز بڑا منتخب کریں۔",
		apparelRows: [
			{
				size: "S",
				chest: "38 – 40 انچ",
				length: "27 انچ",
				waist: "30 – 31 انچ"
			},
			{
				size: "M",
				chest: "41 – 42 انچ",
				length: "28 انچ",
				waist: "32 – 33 انچ"
			},
			{
				size: "L",
				chest: "43 – 45 انچ",
				length: "29 انچ",
				waist: "34 – 36 انچ"
			},
			{
				size: "XL",
				chest: "46 – 48 انچ",
				length: "30 انچ",
				waist: "37 – 38 انچ"
			}
		],
		boysTitle: "لڑکوں کی ٹراؤزر اور چائینوز",
		boysRows: [
			{
				size: "26",
				waist: "26 انچ",
				length: "34 انچ",
				ageApprox: "8 – 10 سال"
			},
			{
				size: "28",
				waist: "28 انچ",
				length: "36 انچ",
				ageApprox: "11 – 12 سال"
			},
			{
				size: "30",
				waist: "30 انچ",
				length: "38 انچ",
				ageApprox: "13 – 14 سال"
			},
			{
				size: "32",
				waist: "32 انچ",
				length: "39 انچ",
				ageApprox: "15 – 16 سال"
			}
		],
		careNote: "کسی خاص پروڈکٹ کے ناپ جاننے کے لیے چیک آؤٹ سے پہلے واٹس ایپ نمبر 03355329722 پر پیغام بھیجیں۔"
	},
	shipping: {
		heading: "ڈیلیوری، کیش آن ڈیلیوری اور 7 دن کی تبدیلی",
		intro: "ہر آرڈر پشاور سے محفوظ پیکنگ کے ساتھ روانہ کیا جاتا ہے۔",
		zonesTitle: "پاکستان میں متوقع ترسیل کا وقت",
		zones: [
			{
				region: "پشاور اور قریبی علاقے",
				eta: "1 – 2 کاروباری دن",
				payment: "کیش آن ڈیلیوری اور مصدقہ اقساط"
			},
			{
				region: "اسلام آباد، راولپنڈی اور لاہور",
				eta: "2 – 4 کاروباری دن",
				payment: "کیش آن ڈیلیوری اور مصدقہ اقساط"
			},
			{
				region: "کراچی، ملتان، فیصل آباد اور دیگر شہر",
				eta: "3 – 5 کاروباری دن",
				payment: "کیش آن ڈیلیوری اور مصدقہ اقساط"
			}
		],
		returnsTitle: "7 دن میں سائز تبدیلی اور واپسی کے اصول",
		returnsPoints: [
			"ڈیلیوری کے 7 دن کے اندر غیر استعمال شدہ کپڑے (اصل ٹیگ سمیت) اور بغیر کٹے ان سٹچڈ سوٹ تبدیل کیے جا سکتے ہیں۔",
			"اگر کوئی چیز غلط یا خراب حالت میں موصول ہو تو 48 گھنٹوں میں اطلاع دینے پر بلا معاوضہ تبدیل کی جاتی ہے۔",
			"اقساط پر لیے گئے آرڈر کی تبدیلی کی صورت میں برابر قیمت کی پروڈکٹ یا شفاف بیلنس ایڈجسٹمنٹ کی جاتی ہے۔"
		]
	},
	contact: {
		heading: "سنیماٹک آرٹس سے رابطہ کریں",
		intro: "آرڈر کی صورتحال، سائزنگ مشورے، سیلر اکاؤنٹ یا اقساط کی تصدیق کے لیے پشاور ٹیم سے رابطہ کریں۔",
		addressLabel: "اسٹور کا پتہ",
		phoneLabel: "فون نمبر",
		emailLabel: "ای میل",
		hoursLabel: "اوقاتِ کار",
		whatsappCta: "واٹس ایپ پر بات کریں",
		mapCta: "نقشے پر مقام دیکھیں",
		faqLinkLabel: "اقساط اور ڈیلیوری سوالات دیکھیں"
	},
	footer: {
		summary: "خواتین کے ان سٹچڈ ملبوسات، لڑکوں کی ٹراؤزر، جیکٹس، ہڈیز، شرٹس، ٹی شرٹس اور لوازمات پاکستان بھر میں PKR میں دستیاب ہیں۔",
		pagesHeading: "اسٹور",
		guidesHeading: "رہنمائی اور مدد",
		accountHeading: "اکاؤنٹ اور پالیسیاں",
		darkMode: "ڈارک موڈ",
		lightMode: "لائٹ موڈ",
		privacyNote: "کوئی تھرڈ پارٹی اشتہاری ٹریکنگ نہیں۔ صرف ضروری سیشن اور ڈیلیوری ڈیٹا محفوظ کیا جاتا ہے۔",
		rights: "سنیماٹک آرٹس (CA)۔ پشاور، پاکستان۔",
		currencyNote: "تمام قیمتیں پاکستانی روپے (PKR) میں ہیں۔"
	},
	notFound: {
		code: "خرابی 404",
		heading: "صفحہ دستیاب نہیں",
		body: "آپ کا مطلوبہ صفحہ موجود نہیں ہے۔ برائے مہربانی دکان دیکھیں یا ہوم پیج پر واپس جائیں۔",
		backHome: "ہوم پیج پر واپس جائیں"
	}
};
// src/i18n/index.ts
function getLocaleFromPath(pathname) {
	const normalized = (pathname || "/").trim();
	if (normalized === "/ur" || normalized.startsWith("/ur/")) return "ur";
	return "en";
}
function stripLocalePrefix(pathname) {
	const clean = (pathname || "/").split("?")[0].split("#")[0];
	if (clean === "/ur" || clean === "/ur/") return "/";
	if (clean.startsWith("/ur/")) {
		const rest = clean.slice(3);
		return rest.startsWith("/") ? rest : `/${rest}`;
	}
	return clean || "/";
}
function localizePath(path, locale) {
	const raw = (path || "/").trim();
	if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("#")) return raw;
	const hashIdx = raw.indexOf("#");
	const hashPart = hashIdx >= 0 ? raw.slice(hashIdx) : "";
	const beforeHash = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw;
	const qIdx = beforeHash.indexOf("?");
	const pathOnly = qIdx >= 0 ? beforeHash.slice(0, qIdx) : beforeHash;
	const queryPart = qIdx >= 0 ? beforeHash.slice(qIdx) : "";
	const basePath = stripLocalePrefix(pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`);
	if (locale === "ur") return `${basePath === "/" ? "/ur" : `/ur${basePath}`}${queryPart}${hashPart}`;
	return `${basePath}${queryPart}${hashPart}`;
}
function getAlternateLocalePaths(pathname, search = "") {
	const basePath = stripLocalePrefix(pathname);
	const query = search && search !== "?" ? search.startsWith("?") ? search : `?${search}` : "";
	const en = `${basePath}${query}`;
	return {
		en,
		ur: `${basePath === "/" ? "/ur" : `/ur${basePath}`}${query}`,
		xDefault: en
	};
}
function getDictionary(locale) {
	return locale === "ur" ? urDictionary : enDictionary;
}
function useLocale() {
	const { pathname, search } = useLocation();
	return useMemo(() => {
		const locale = getLocaleFromPath(pathname);
		const t = getDictionary(locale);
		const otherLocale = locale === "ur" ? "en" : "ur";
		return {
			locale,
			isRtl: locale === "ur",
			dir: t.dir,
			t,
			basePath: stripLocalePrefix(pathname),
			localize: (path, targetLocale = locale) => localizePath(path, targetLocale),
			alternateHref: localizePath(`${stripLocalePrefix(pathname)}${search}`, otherLocale)
		};
	}, [pathname, search]);
}
// src/services/siteConfig.ts
function readEnv(key) {
	const metaEnv = typeof import.meta !== "undefined" && {
		"BASE_URL": "/",
		"DEV": true,
		"MODE": "production",
		"PROD": false,
		"SSR": true,
		"VITE_API_BASE_URL": "",
		"VITE_BACKEND": "supabase",
		"VITE_SUPABASE_ANON_KEY": "sb_publishable__nqJ-wQOuLakzxthcYSEdw_rkI37k2u",
		"VITE_SUPABASE_URL": "https://wqbdpaxcmrrsxehcvdna.supabase.co",
		"VITE_TURNSTILE_SITE_KEY": ""
	} ? {
		"BASE_URL": "/",
		"DEV": true,
		"MODE": "production",
		"PROD": false,
		"SSR": true,
		"VITE_API_BASE_URL": "",
		"VITE_BACKEND": "supabase",
		"VITE_SUPABASE_ANON_KEY": "sb_publishable__nqJ-wQOuLakzxthcYSEdw_rkI37k2u",
		"VITE_SUPABASE_URL": "https://wqbdpaxcmrrsxehcvdna.supabase.co",
		"VITE_TURNSTILE_SITE_KEY": ""
	} : {};
	const procEnv = typeof process !== "undefined" && process.env ? process.env : {};
	const val = metaEnv[key] || procEnv[key] || "";
	return String(val).trim();
}
var STORE_CONFIG = {
	brandName: "Cinematic Arts (CA)",
	shortName: "Cinematic Arts",
	alternateName: "CA Store Peshawar",
	siteUrl: (readEnv("VITE_SITE_URL") || readEnv("SITE_URL") || readEnv("APP_URL") || "https://cinematicarts.pk").replace(/\/+$/, ""),
	email: "masihsam587@gmail.com",
	phoneDisplay: "03355329722",
	phoneE164: "+92-335-5329722",
	whatsappUrl: "https://wa.me/923355329722",
	address: {
		streetAddress: "Shop #14, University Road Market (Update Street Address)",
		locality: "Peshawar",
		region: "Khyber Pakhtunkhwa",
		postalCode: "25000",
		countryCode: "PK",
		countryName: "Pakistan"
	},
	openingHours: {
		days: [
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday"
		],
		opens: "11:00",
		closes: "21:00",
		displayEn: "Mon – Sat, 11:00 AM – 9:00 PM PKT (Placeholder)",
		displayUr: "پیر تا ہفتہ، صبح 11:00 تا رات 9:00 بجے"
	},
	mapUrl: "https://maps.google.com/?q=University+Road+Peshawar+Pakistan",
	priceRange: "PKR 1,500 - PKR 25,000",
	currency: "PKR",
	verification: {
		google: readEnv("VITE_GSC_VERIFICATION"),
		bing: readEnv("VITE_BING_VERIFICATION")
	},
	analytics: {
		plausibleDomain: readEnv("VITE_PLAUSIBLE_DOMAIN"),
		umamiWebsiteId: readEnv("VITE_UMAMI_WEBSITE_ID"),
		umamiScriptUrl: readEnv("VITE_UMAMI_SCRIPT_URL")
	}
};
// src/components/Layout.tsx
var _jsxFileName$19 = "/app/applet/src/components/Layout.tsx";
function Layout({ children, networkError, onRetry }) {
	const { theme, toggleTheme } = useTheme();
	const { totalItems } = useCart();
	const { user, unreadNotifications } = useAuth();
	const { locale, t, localize, alternateHref, basePath } = useLocale();
	const location = useLocation();
	const [isOffline, setIsOffline] = useState(false);
	useEffect(() => {
		setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);
		const goOffline = () => setIsOffline(true);
		const goOnline = () => setIsOffline(false);
		window.addEventListener("offline", goOffline);
		window.addEventListener("online", goOnline);
		return () => {
			window.removeEventListener("offline", goOffline);
			window.removeEventListener("online", goOnline);
		};
	}, []);
	useEffect(() => {
		const onPointerDown = (e) => {
			const btn = e.target?.closest("button, .btn-press");
			if (!btn || btn.disabled) return;
			if (!btn.classList.contains("btn-press")) return;
			triggerTapRipple({
				currentTarget: btn,
				clientX: e.clientX,
				clientY: e.clientY
			});
		};
		document.addEventListener("pointerdown", onPointerDown, { passive: true });
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, []);
	const navLinkClass = ({ isActive }) => `whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-2 min-h-[44px] inline-flex items-center border-b ${isActive ? "border-[var(--ca-accent)] text-[var(--ca-text)]" : "border-transparent text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"}`;
	return /* @__PURE__ */ jsxDEV("div", {
		className: "flex min-h-screen flex-col bg-[var(--ca-bg)] text-[var(--ca-text)]",
		children: [
			/* @__PURE__ */ jsxDEV("header", {
				className: "glass-bar pt-safe sticky top-0 z-40 border-b",
				children: /* @__PURE__ */ jsxDEV("div", {
					className: "mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6",
					children: [
						/* @__PURE__ */ jsxDEV(Link, {
							to: localize("/"),
							className: "font-display inline-flex min-h-[44px] items-center text-xl font-semibold text-[var(--ca-text)] whitespace-nowrap shrink-0 sm:text-2xl",
							children: t.brand
						}, void 0, false, {
							fileName: _jsxFileName$19,
							lineNumber: 77,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ jsxDEV("nav", {
							"aria-label": "Primary Navigation",
							className: "hidden md:flex items-center gap-7",
							children: [
								/* @__PURE__ */ jsxDEV(NavLink, {
									to: localize("/"),
									end: true,
									className: navLinkClass,
									children: t.nav.home
								}, void 0, false, {
									fileName: _jsxFileName$19,
									lineNumber: 85,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ jsxDEV(NavLink, {
									to: localize("/shop"),
									className: navLinkClass,
									children: t.nav.shop
								}, void 0, false, {
									fileName: _jsxFileName$19,
									lineNumber: 88,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ jsxDEV(NavLink, {
									to: "/orders",
									className: navLinkClass,
									children: t.nav.orders
								}, void 0, false, {
									fileName: _jsxFileName$19,
									lineNumber: 91,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ jsxDEV(NavLink, {
									to: "/profile",
									className: navLinkClass,
									children: [t.nav.profile, unreadNotifications > 0 ? ` (${unreadNotifications})` : ""]
								}, void 0, true, {
									fileName: _jsxFileName$19,
									lineNumber: 94,
									columnNumber: 13
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName$19,
							lineNumber: 84,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "flex items-center gap-2 shrink-0",
							children: [/* @__PURE__ */ jsxDEV(Link, {
								to: alternateHref,
								lang: locale === "ur" ? "en" : "ur",
								hrefLang: locale === "ur" ? "en" : "ur",
								className: "btn-press inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[var(--ca-surface-subtle)] px-3 py-2 text-xs font-medium text-[var(--ca-text)] hover:opacity-85 whitespace-nowrap",
								children: [/* @__PURE__ */ jsxDEV(Globe, { className: "h-3.5 w-3.5 text-[var(--ca-accent)]" }, void 0, false, {
									fileName: _jsxFileName$19,
									lineNumber: 106,
									columnNumber: 15
								}, this), /* @__PURE__ */ jsxDEV("span", { children: t.nav.switchLangLabel }, void 0, false, {
									fileName: _jsxFileName$19,
									lineNumber: 107,
									columnNumber: 15
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$19,
								lineNumber: 100,
								columnNumber: 13
							}, this), /* @__PURE__ */ jsxDEV(Link, {
								to: totalItems > 0 ? "/orders" : user ? localize("/shop") : "/auth",
								className: "btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-text)] px-4 py-2 text-xs font-medium text-[var(--ca-bg)] hover:opacity-90 whitespace-nowrap shrink-0",
								children: [/* @__PURE__ */ jsxDEV(ShoppingBag, { className: "h-3.5 w-3.5" }, void 0, false, {
									fileName: _jsxFileName$19,
									lineNumber: 114,
									columnNumber: 15
								}, this), totalItems > 0 ? /* @__PURE__ */ jsxDEV("span", {
									className: "inline-flex items-center gap-1.5",
									children: [/* @__PURE__ */ jsxDEV("span", { children: t.nav.bag }, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 117,
										columnNumber: 19
									}, this), /* @__PURE__ */ jsxDEV("span", {
										className: "ca-badge-pop font-mono-nums inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-[var(--ca-accent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ca-accent-fg)]",
										children: totalItems
									}, totalItems, false, {
										fileName: _jsxFileName$19,
										lineNumber: 118,
										columnNumber: 19
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName$19,
									lineNumber: 116,
									columnNumber: 17
								}, this) : user ? t.nav.browseShop : t.nav.signIn]
							}, void 0, true, {
								fileName: _jsxFileName$19,
								lineNumber: 110,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$19,
							lineNumber: 99,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName$19,
					lineNumber: 76,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$19,
				lineNumber: 75,
				columnNumber: 7
			}, this),
			isOffline && /* @__PURE__ */ jsxDEV("div", {
				role: "status",
				className: "ca-fade-in border-b border-amber-500/30 bg-amber-500/12 px-4 py-2 text-xs text-amber-800 dark:text-amber-200",
				children: /* @__PURE__ */ jsxDEV("div", {
					className: "mx-auto flex max-w-6xl items-center gap-2",
					children: [/* @__PURE__ */ jsxDEV(WifiOff, { className: "h-4 w-4 shrink-0" }, void 0, false, {
						fileName: _jsxFileName$19,
						lineNumber: 142,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("span", { children: "You appear to be offline. Cached catalog items remain visible; live orders require a connection." }, void 0, false, {
						fileName: _jsxFileName$19,
						lineNumber: 143,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$19,
					lineNumber: 141,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$19,
				lineNumber: 137,
				columnNumber: 9
			}, this),
			networkError && !isOffline && /* @__PURE__ */ jsxDEV("div", {
				role: "alert",
				className: "ca-fade-in border-b border-red-500/25 bg-red-500/10 px-4 py-2.5 text-xs text-red-700 dark:text-red-300",
				children: /* @__PURE__ */ jsxDEV("div", {
					className: "mx-auto flex max-w-6xl items-center justify-between gap-4",
					children: [/* @__PURE__ */ jsxDEV("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ jsxDEV(AlertTriangle, { className: "h-4 w-4 shrink-0" }, void 0, false, {
							fileName: _jsxFileName$19,
							lineNumber: 156,
							columnNumber: 15
						}, this), /* @__PURE__ */ jsxDEV("span", { children: networkError }, void 0, false, {
							fileName: _jsxFileName$19,
							lineNumber: 157,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$19,
						lineNumber: 155,
						columnNumber: 13
					}, this), onRetry && /* @__PURE__ */ jsxDEV("button", {
						type: "button",
						onClick: onRetry,
						className: "btn-press inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-current px-3 py-1 font-medium hover:opacity-80",
						children: [/* @__PURE__ */ jsxDEV(RefreshCw, { className: "h-3 w-3" }, void 0, false, {
							fileName: _jsxFileName$19,
							lineNumber: 165,
							columnNumber: 17
						}, this), "Retry"]
					}, void 0, true, {
						fileName: _jsxFileName$19,
						lineNumber: 160,
						columnNumber: 15
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$19,
					lineNumber: 154,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$19,
				lineNumber: 150,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV("main", {
				className: "ca-page-enter flex-1 pb-20 md:pb-8",
				children
			}, location.pathname, false, {
				fileName: _jsxFileName$19,
				lineNumber: 174,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ jsxDEV("footer", {
				className: "bg-[var(--ca-surface-subtle)] pb-20 md:pb-10",
				children: /* @__PURE__ */ jsxDEV("div", {
					className: "mx-auto max-w-6xl px-4 py-12 sm:px-6",
					children: [/* @__PURE__ */ jsxDEV("div", {
						className: "grid grid-cols-1 gap-8 md:grid-cols-5",
						children: [
							/* @__PURE__ */ jsxDEV("div", {
								className: "md:col-span-2",
								children: [
									/* @__PURE__ */ jsxDEV("p", {
										className: "font-display text-2xl font-semibold text-[var(--ca-text)]",
										children: t.brandFull
									}, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 183,
										columnNumber: 15
									}, this),
									/* @__PURE__ */ jsxDEV("p", {
										className: "mt-2 max-w-md text-sm leading-relaxed text-[var(--ca-text-muted)]",
										children: t.footer.summary
									}, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 186,
										columnNumber: 15
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[var(--ca-text-muted)]",
										children: [
											/* @__PURE__ */ jsxDEV("a", {
												href: `mailto:${STORE_CONFIG.email}`,
												className: "inline-flex min-h-[44px] items-center hover:text-[var(--ca-text)]",
												children: STORE_CONFIG.email
											}, void 0, false, {
												fileName: _jsxFileName$19,
												lineNumber: 190,
												columnNumber: 17
											}, this),
											/* @__PURE__ */ jsxDEV("a", {
												href: `tel:${STORE_CONFIG.phoneDisplay}`,
												className: "inline-flex min-h-[44px] items-center hover:text-[var(--ca-text)]",
												children: STORE_CONFIG.phoneDisplay
											}, void 0, false, {
												fileName: _jsxFileName$19,
												lineNumber: 193,
												columnNumber: 17
											}, this),
											/* @__PURE__ */ jsxDEV("a", {
												href: STORE_CONFIG.whatsappUrl,
												target: "_blank",
												rel: "noopener noreferrer",
												className: "inline-flex min-h-[44px] items-center hover:text-[var(--ca-text)]",
												children: t.home.whatsapp
											}, void 0, false, {
												fileName: _jsxFileName$19,
												lineNumber: 196,
												columnNumber: 17
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName$19,
										lineNumber: 189,
										columnNumber: 15
									}, this),
									/* @__PURE__ */ jsxDEV("p", {
										className: "mt-3 text-[11px] text-[var(--ca-text-muted)]",
										children: t.footer.privacyNote
									}, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 205,
										columnNumber: 15
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName$19,
								lineNumber: 182,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("p", {
								className: "text-xs font-semibold text-[var(--ca-text)]",
								children: t.footer.pagesHeading
							}, void 0, false, {
								fileName: _jsxFileName$19,
								lineNumber: 211,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("ul", {
								className: "mt-3 space-y-1 text-sm",
								children: [
									/* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV(Link, {
										to: localize("/"),
										className: "inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]",
										children: t.nav.home
									}, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 216,
										columnNumber: 19
									}, this) }, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 215,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV(Link, {
										to: localize("/shop"),
										className: "inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]",
										children: t.nav.shop
									}, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 224,
										columnNumber: 19
									}, this) }, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 223,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV(Link, {
										to: localize("/about"),
										className: "inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]",
										children: t.nav.about
									}, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 232,
										columnNumber: 19
									}, this) }, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 231,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV(Link, {
										to: localize("/contact"),
										className: "inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]",
										children: t.nav.contact
									}, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 240,
										columnNumber: 19
									}, this) }, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 239,
										columnNumber: 17
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName$19,
								lineNumber: 214,
								columnNumber: 15
							}, this)] }, void 0, true, {
								fileName: _jsxFileName$19,
								lineNumber: 210,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("p", {
								className: "text-xs font-semibold text-[var(--ca-text)]",
								children: t.footer.guidesHeading
							}, void 0, false, {
								fileName: _jsxFileName$19,
								lineNumber: 251,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("ul", {
								className: "mt-3 space-y-1 text-sm",
								children: [
									/* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV(Link, {
										to: localize("/faq"),
										className: "inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]",
										children: t.nav.faq
									}, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 256,
										columnNumber: 19
									}, this) }, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 255,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV(Link, {
										to: localize("/size-guide"),
										className: "inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]",
										children: t.nav.sizeGuide
									}, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 264,
										columnNumber: 19
									}, this) }, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 263,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV(Link, {
										to: localize("/shipping"),
										className: "inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]",
										children: t.nav.shipping
									}, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 272,
										columnNumber: 19
									}, this) }, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 271,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV(Link, {
										to: "/orders",
										className: "inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]",
										children: t.nav.orders
									}, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 280,
										columnNumber: 19
									}, this) }, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 279,
										columnNumber: 17
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName$19,
								lineNumber: 254,
								columnNumber: 15
							}, this)] }, void 0, true, {
								fileName: _jsxFileName$19,
								lineNumber: 250,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("p", {
								className: "text-xs font-semibold text-[var(--ca-text)]",
								children: t.footer.accountHeading
							}, void 0, false, {
								fileName: _jsxFileName$19,
								lineNumber: 291,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("ul", {
								className: "mt-3 space-y-1 text-sm",
								children: [
									/* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV(Link, {
										to: "/profile",
										className: "inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]",
										children: t.nav.profile
									}, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 296,
										columnNumber: 19
									}, this) }, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 295,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV(Link, {
										to: "/auth",
										className: "inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]",
										children: t.nav.signIn
									}, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 304,
										columnNumber: 19
									}, this) }, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 303,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV(Link, {
										to: localize("/terms"),
										className: "inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]",
										children: t.nav.terms
									}, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 312,
										columnNumber: 19
									}, this) }, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 311,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV(Link, {
										to: localize("/privacy"),
										className: "inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]",
										children: t.nav.privacy
									}, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 320,
										columnNumber: 19
									}, this) }, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 319,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("button", {
										type: "button",
										onClick: toggleTheme,
										className: "btn-press inline-flex min-h-[44px] items-center gap-2 text-sm text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]",
										children: theme === "light" ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
											/* @__PURE__ */ jsxDEV(Moon, { className: "h-3.5 w-3.5" }, void 0, false, {
												fileName: _jsxFileName$19,
												lineNumber: 335,
												columnNumber: 25
											}, this),
											" ",
											t.footer.darkMode
										] }, void 0, true, {
											fileName: _jsxFileName$19,
											lineNumber: 334,
											columnNumber: 23
										}, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
											/* @__PURE__ */ jsxDEV(Sun, { className: "h-3.5 w-3.5" }, void 0, false, {
												fileName: _jsxFileName$19,
												lineNumber: 339,
												columnNumber: 25
											}, this),
											" ",
											t.footer.lightMode
										] }, void 0, true, {
											fileName: _jsxFileName$19,
											lineNumber: 338,
											columnNumber: 23
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 328,
										columnNumber: 19
									}, this) }, void 0, false, {
										fileName: _jsxFileName$19,
										lineNumber: 327,
										columnNumber: 17
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName$19,
								lineNumber: 294,
								columnNumber: 15
							}, this)] }, void 0, true, {
								fileName: _jsxFileName$19,
								lineNumber: 290,
								columnNumber: 13
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName$19,
						lineNumber: 181,
						columnNumber: 11
					}, this), /* @__PURE__ */ jsxDEV("div", {
						className: "mt-10 flex flex-col items-start justify-between gap-2 text-xs text-[var(--ca-text-muted)] sm:flex-row sm:items-center",
						children: [/* @__PURE__ */ jsxDEV("span", { children: [
							"© ",
							(/* @__PURE__ */ new Date()).getFullYear(),
							" ",
							t.footer.rights
						] }, void 0, true, {
							fileName: _jsxFileName$19,
							lineNumber: 349,
							columnNumber: 13
						}, this), /* @__PURE__ */ jsxDEV("span", { children: t.footer.currencyNote }, void 0, false, {
							fileName: _jsxFileName$19,
							lineNumber: 350,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$19,
						lineNumber: 348,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$19,
					lineNumber: 180,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$19,
				lineNumber: 179,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ jsxDEV("nav", {
				"aria-label": "Mobile Navigation",
				className: "glass-bar pb-safe fixed inset-x-0 bottom-0 z-40 border-t md:hidden",
				children: /* @__PURE__ */ jsxDEV("div", {
					className: "grid h-14 grid-cols-4 items-center",
					children: [
						/* @__PURE__ */ jsxDEV(Link, {
							to: localize("/"),
							className: `flex min-h-[44px] flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium ${basePath === "/" ? "text-[var(--ca-accent)]" : "text-[var(--ca-text-muted)]"}`,
							children: [/* @__PURE__ */ jsxDEV(Home, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName$19,
								lineNumber: 367,
								columnNumber: 13
							}, this), /* @__PURE__ */ jsxDEV("span", { children: t.nav.home }, void 0, false, {
								fileName: _jsxFileName$19,
								lineNumber: 368,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$19,
							lineNumber: 361,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ jsxDEV(Link, {
							to: localize("/shop"),
							className: `flex min-h-[44px] flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium ${basePath.startsWith("/shop") || basePath.startsWith("/product") || basePath.startsWith("/category") ? "text-[var(--ca-accent)]" : "text-[var(--ca-text-muted)]"}`,
							children: [/* @__PURE__ */ jsxDEV(ShoppingBag, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName$19,
								lineNumber: 378,
								columnNumber: 13
							}, this), /* @__PURE__ */ jsxDEV("span", { children: t.nav.shop }, void 0, false, {
								fileName: _jsxFileName$19,
								lineNumber: 379,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$19,
							lineNumber: 370,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ jsxDEV(Link, {
							to: "/orders",
							className: `relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium ${basePath.startsWith("/orders") ? "text-[var(--ca-accent)]" : "text-[var(--ca-text-muted)]"}`,
							children: [/* @__PURE__ */ jsxDEV(PackageCheck, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName$19,
								lineNumber: 389,
								columnNumber: 13
							}, this), /* @__PURE__ */ jsxDEV("span", {
								className: "inline-flex items-center gap-1",
								children: [t.nav.orders, totalItems > 0 && /* @__PURE__ */ jsxDEV("span", {
									className: "ca-badge-pop font-mono-nums rounded bg-[var(--ca-accent)] px-1 text-[10px] font-bold text-[var(--ca-accent-fg)]",
									children: totalItems
								}, totalItems, false, {
									fileName: _jsxFileName$19,
									lineNumber: 393,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$19,
								lineNumber: 390,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$19,
							lineNumber: 381,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ jsxDEV(Link, {
							to: "/profile",
							className: `relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium ${basePath.startsWith("/profile") || basePath.startsWith("/auth") ? "text-[var(--ca-accent)]" : "text-[var(--ca-text-muted)]"}`,
							children: [/* @__PURE__ */ jsxDEV(User, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName$19,
								lineNumber: 410,
								columnNumber: 13
							}, this), /* @__PURE__ */ jsxDEV("span", { children: [t.nav.profile, unreadNotifications > 0 ? ` (${unreadNotifications})` : ""] }, void 0, true, {
								fileName: _jsxFileName$19,
								lineNumber: 411,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$19,
							lineNumber: 402,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName$19,
					lineNumber: 360,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$19,
				lineNumber: 356,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$19,
		lineNumber: 73,
		columnNumber: 5
	}, this);
}
// src/components/ProductCard.tsx
var _jsxFileName$18 = "/app/applet/src/components/ProductCard.tsx";
function getModernImageSources(src) {
	if (!src) return {};
	const match = /^(\/src\/assets\/images\/[^?#]+)\.(jpe?g|png)$/i.exec(src.trim());
	if (!match) return {};
	return {
		avif: `${match[1]}.avif`,
		webp: `${match[1]}.webp`
	};
}
function ResilientImage({ src, alt, className = "", width = 400, height = 300, priority = false }) {
	const [failed, setFailed] = useState(false);
	const [loaded, setLoaded] = useState(priority);
	if (failed || !src) return /* @__PURE__ */ jsxDEV("div", {
		className: `flex flex-col items-center justify-center bg-[var(--ca-surface-subtle)] text-[var(--ca-text-muted)] ${className}`,
		children: [/* @__PURE__ */ jsxDEV(Package, { className: "h-7 w-7 opacity-50" }, void 0, false, {
			fileName: _jsxFileName$18,
			lineNumber: 47,
			columnNumber: 9
		}, this), /* @__PURE__ */ jsxDEV("span", {
			className: "mt-2 px-3 text-center text-xs font-medium opacity-75",
			children: alt
		}, void 0, false, {
			fileName: _jsxFileName$18,
			lineNumber: 48,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$18,
		lineNumber: 44,
		columnNumber: 7
	}, this);
	const modern = getModernImageSources(src);
	const imgElement = /* @__PURE__ */ jsxDEV("img", {
		src,
		alt,
		width,
		height,
		loading: priority ? "eager" : "lazy",
		decoding: "async",
		fetchPriority: priority ? "high" : "auto",
		referrerPolicy: "no-referrer",
		onLoad: () => setLoaded(true),
		onError: () => setFailed(true),
		className: `${className} transition-opacity duration-200 ${loaded || priority ? "opacity-100" : "opacity-85"}`
	}, void 0, false, {
		fileName: _jsxFileName$18,
		lineNumber: 55,
		columnNumber: 5
	}, this);
	if (modern.avif || modern.webp) return /* @__PURE__ */ jsxDEV("picture", {
		className: "block h-full w-full",
		children: [
			modern.avif && /* @__PURE__ */ jsxDEV("source", {
				srcSet: modern.avif,
				type: "image/avif"
			}, void 0, false, {
				fileName: _jsxFileName$18,
				lineNumber: 75,
				columnNumber: 25
			}, this),
			modern.webp && /* @__PURE__ */ jsxDEV("source", {
				srcSet: modern.webp,
				type: "image/webp"
			}, void 0, false, {
				fileName: _jsxFileName$18,
				lineNumber: 76,
				columnNumber: 25
			}, this),
			imgElement
		]
	}, void 0, true, {
		fileName: _jsxFileName$18,
		lineNumber: 74,
		columnNumber: 7
	}, this);
	return imgElement;
}
function ProductCard({ product, onQuickBuy }) {
	const { openBuySheet, isWishlisted, toggleWishlist } = useCart();
	const { localize, t } = useLocale();
	const liked = isWishlisted(product.id);
	const handleBuy = () => {
		if (onQuickBuy) onQuickBuy(product);
		else openBuySheet(product, 1, product.sizes?.[0]);
	};
	return /* @__PURE__ */ jsxDEV("article", {
		className: "ca-fade-in glass-panel group flex flex-col overflow-hidden rounded-2xl p-2 transition-transform duration-200 hover:-translate-y-0.5 sm:p-3",
		children: [/* @__PURE__ */ jsxDEV("div", {
			className: "relative",
			children: [/* @__PURE__ */ jsxDEV(Link, {
				to: localize(`/product/${product.slug}`),
				className: "relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-[var(--ca-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ca-accent)]",
				children: /* @__PURE__ */ jsxDEV(ResilientImage, {
					src: product.coverImage,
					alt: `${product.title} — ${product.categoryName}`,
					className: "h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
				}, void 0, false, {
					fileName: _jsxFileName$18,
					lineNumber: 102,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$18,
				lineNumber: 98,
				columnNumber: 9
			}, this), /* @__PURE__ */ jsxDEV("button", {
				type: "button",
				onClick: () => toggleWishlist(product.id),
				"aria-label": liked ? `Remove ${product.title} from wishlist` : `Save ${product.title} to wishlist`,
				"aria-pressed": liked,
				className: "btn-press absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--ca-surface-solid)]/90 shadow-sm transition-colors hover:bg-[var(--ca-surface-solid)]",
				children: /* @__PURE__ */ jsxDEV(Heart, { className: `h-4 w-4 transition-colors ${liked ? "ca-heart-pop fill-red-500 text-red-500" : "text-[var(--ca-text)]"}` }, liked ? "liked" : "idle", false, {
					fileName: _jsxFileName$18,
					lineNumber: 116,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$18,
				lineNumber: 109,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$18,
			lineNumber: 97,
			columnNumber: 7
		}, this), /* @__PURE__ */ jsxDEV("div", {
			className: "flex flex-1 flex-col justify-between px-1 pt-3 pb-1 sm:px-1.5 sm:pt-3.5 sm:pb-1.5",
			children: [/* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("div", {
				className: "flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--ca-text-muted)] sm:text-xs",
				children: [/* @__PURE__ */ jsxDEV("span", {
					className: "truncate",
					children: product.categoryName
				}, void 0, false, {
					fileName: _jsxFileName$18,
					lineNumber: 130,
					columnNumber: 13
				}, this), !product.inStock && /* @__PURE__ */ jsxDEV("span", {
					className: "rounded-full bg-[var(--ca-surface-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--ca-text-muted)]",
					children: t.product.outOfStock
				}, void 0, false, {
					fileName: _jsxFileName$18,
					lineNumber: 132,
					columnNumber: 15
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$18,
				lineNumber: 129,
				columnNumber: 11
			}, this), /* @__PURE__ */ jsxDEV(Link, {
				to: localize(`/product/${product.slug}`),
				className: "mt-1 line-clamp-2 block text-sm font-semibold leading-snug text-[var(--ca-text)] hover:text-[var(--ca-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ca-accent)] sm:mt-1.5 sm:text-base",
				children: product.title
			}, void 0, false, {
				fileName: _jsxFileName$18,
				lineNumber: 137,
				columnNumber: 11
			}, this)] }, void 0, true, {
				fileName: _jsxFileName$18,
				lineNumber: 128,
				columnNumber: 9
			}, this), /* @__PURE__ */ jsxDEV("div", {
				className: "mt-3 flex flex-wrap items-center justify-between gap-2 pt-1 sm:mt-4",
				children: [/* @__PURE__ */ jsxDEV("span", {
					className: "font-mono-nums text-xs font-semibold text-[var(--ca-text)] sm:text-sm",
					children: formatPKR(product.price)
				}, void 0, false, {
					fileName: _jsxFileName$18,
					lineNumber: 146,
					columnNumber: 11
				}, this), /* @__PURE__ */ jsxDEV("button", {
					type: "button",
					onClick: handleBuy,
					"aria-label": `${t.product.buyNow} ${product.title}`,
					className: "btn-press inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-[var(--ca-text)] px-3.5 py-2 text-xs font-medium text-[var(--ca-bg)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ca-accent)] sm:px-4",
					children: [/* @__PURE__ */ jsxDEV(ShoppingBag, { className: "h-3.5 w-3.5" }, void 0, false, {
						fileName: _jsxFileName$18,
						lineNumber: 155,
						columnNumber: 13
					}, this), t.product.buyNow.split(" ")[0]]
				}, void 0, true, {
					fileName: _jsxFileName$18,
					lineNumber: 149,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$18,
				lineNumber: 145,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$18,
			lineNumber: 127,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$18,
		lineNumber: 96,
		columnNumber: 5
	}, this);
}
// src/components/TurnstileField.tsx
var _jsxFileName$17 = "/app/applet/src/components/TurnstileField.tsx";
var TURNSTILE_SITE_KEY = "".trim();
/**
* Renders an offscreen honeypot input for automated bot traps and,
* when VITE_TURNSTILE_SITE_KEY is configured, renders Cloudflare Turnstile.
*/
function TurnstileField({ onToken, honeypot, onHoneypotChange, action = "submit" }) {
	useRef(null);
	useRef(null);
	useEffect(() => {}, [action, onToken]);
	return /* @__PURE__ */ jsxDEV(Fragment, { children: [/* @__PURE__ */ jsxDEV("div", {
		"aria-hidden": "true",
		className: "pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0",
		children: [/* @__PURE__ */ jsxDEV("label", {
			htmlFor: `ca-hp-${action}`,
			children: "Leave this field empty"
		}, void 0, false, {
			fileName: _jsxFileName$17,
			lineNumber: 106,
			columnNumber: 9
		}, this), /* @__PURE__ */ jsxDEV("input", {
			id: `ca-hp-${action}`,
			name: "company_website",
			type: "text",
			tabIndex: -1,
			autoComplete: "off",
			value: honeypot,
			onChange: (e) => onHoneypotChange(e.target.value)
		}, void 0, false, {
			fileName: _jsxFileName$17,
			lineNumber: 107,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$17,
		lineNumber: 102,
		columnNumber: 7
	}, this), TURNSTILE_SITE_KEY] }, void 0, true, {
		fileName: _jsxFileName$17,
		lineNumber: 100,
		columnNumber: 5
	}, this);
}
// src/components/PurchaseSheet.tsx
var _jsxFileName$16 = "/app/applet/src/components/PurchaseSheet.tsx";
function PurchaseSheet() {
	const { checkoutModalProduct, closeBuySheet, addItem } = useCart();
	const { user } = useAuth();
	const { showToast } = useToast();
	const navigate = useNavigate();
	const [step, setStep] = useState("configure");
	const [selectedImage, setSelectedImage] = useState("");
	const [selectedSize, setSelectedSize] = useState("");
	const [quantity, setQuantity] = useState(1);
	const [plans, setPlans] = useState([]);
	const [paymentMethod, setPaymentMethod] = useState("cod");
	const [selectedPlanId, setSelectedPlanId] = useState("");
	const [fullName, setFullName] = useState("");
	const [phone, setPhone] = useState("");
	const [whatsapp, setWhatsapp] = useState("");
	const [address, setAddress] = useState("");
	const [city, setCity] = useState("Peshawar");
	const [postalCode, setPostalCode] = useState("25000");
	const [notes, setNotes] = useState("");
	const [referralCode, setReferralCode] = useState("");
	const [honeypot, setHoneypot] = useState("");
	const [turnstileToken, setTurnstileToken] = useState("");
	const idempotencyKeyRef = useRef(createIdempotencyKey("ord"));
	const [referralState, setReferralState] = useState({ status: "idle" });
	const [formErrors, setFormErrors] = useState({});
	const [submitting, setSubmitting] = useState(false);
	const [submitStatus, setSubmitStatus] = useState("idle");
	const [submitError, setSubmitError] = useState(null);
	const [createdOrder, setCreatedOrder] = useState(null);
	useEffect(() => {
		if (!checkoutModalProduct) return;
		const prod = checkoutModalProduct.product;
		setStep("configure");
		setSelectedImage(prod.coverImage);
		setSelectedSize(checkoutModalProduct.size || prod.sizes?.[0] || "One Size");
		setQuantity(checkoutModalProduct.quantity || 1);
		setPaymentMethod(checkoutModalProduct.paymentMethod || "cod");
		setFormErrors({});
		setSubmitError(null);
		setSubmitStatus("idle");
		setCreatedOrder(null);
		setReferralCode("");
		setHoneypot("");
		setTurnstileToken("");
		idempotencyKeyRef.current = createIdempotencyKey("ord");
		setReferralState({ status: "idle" });
		if (user) {
			setFullName(user.name || "");
			setPhone(user.phone || "");
			setWhatsapp(user.whatsapp || user.phone || "");
			setAddress(user.address || "");
			setCity(user.city || "Peshawar");
			setPostalCode(user.postalCode || "25000");
		}
		productService.listInstallmentPlans().then((loaded) => {
			setPlans(loaded);
			if (checkoutModalProduct.planId && loaded.some((p) => p.id === checkoutModalProduct.planId)) setSelectedPlanId(checkoutModalProduct.planId);
			else if (loaded.length > 0) setSelectedPlanId(loaded[0].id);
		});
	}, [checkoutModalProduct, user]);
	useEffect(() => {
		const clean = referralCode.trim();
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
		}, 240);
		return () => window.clearTimeout(timer);
	}, [referralCode]);
	const activePlan = useMemo(() => plans.find((p) => p.id === selectedPlanId) || plans[0], [plans, selectedPlanId]);
	const calc = useMemo(() => {
		if (!checkoutModalProduct || !activePlan) return null;
		return calculateInstallmentPlan(checkoutModalProduct.product.price, quantity, activePlan);
	}, [
		checkoutModalProduct,
		activePlan,
		quantity
	]);
	if (!checkoutModalProduct) return null;
	const { product } = checkoutModalProduct;
	const allImages = [product.coverImage, ...product.extraImages || []];
	const handleProceedToCheckout = () => {
		setStep("checkout");
	};
	const handleAddToBag = () => {
		addItem(product, quantity, selectedSize);
		showToast(`Added ${product.title} to your bag.`, "success");
		closeBuySheet();
	};
	const handleSubmitOrder = async (e) => {
		e.preventDefault();
		if (submitting || !canTriggerAction("purchase-sheet-submit", 1200)) return;
		setSubmitError(null);
		const parsed = checkoutSchema.safeParse({
			fullName,
			phone,
			whatsapp,
			address,
			city,
			postalCode,
			notes,
			paymentMethod,
			referralCode
		});
		if (!parsed.success) {
			setFormErrors(extractZodFieldErrors(parsed.error));
			setSubmitStatus("error");
			window.setTimeout(() => setSubmitStatus("idle"), 500);
			return;
		}
		if (paymentMethod === "installments") {
			if (!(await orderService.validateSellerReferral(parsed.data.referralCode)).valid) {
				setFormErrors({ referralCode: "Seller Referral ID not found or inactive. Installment orders require a verified CA Seller ID (format CA-XXXXXX)." });
				setSubmitStatus("error");
				window.setTimeout(() => setSubmitStatus("idle"), 500);
				return;
			}
		}
		setFormErrors({});
		setSubmitStatus("idle");
		setSubmitting(true);
		try {
			const order = await orderService.createOrder({
				items: [{
					productId: product.id,
					title: product.title,
					unitPrice: product.price,
					quantity,
					selectedSize,
					image: product.coverImage
				}],
				customerName: sanitizePlainText(parsed.data.fullName, 80),
				phone: parsed.data.phone,
				whatsapp: parsed.data.whatsapp,
				address: sanitizePlainText(parsed.data.address, 200),
				city: sanitizePlainText(parsed.data.city, 60),
				postalCode: parsed.data.postalCode,
				notes: sanitizePlainText(parsed.data.notes || "", 300),
				paymentMethod,
				planId: paymentMethod === "installments" ? activePlan?.id : void 0,
				referralCode: parsed.data.referralCode || void 0,
				idempotencyKey: idempotencyKeyRef.current,
				turnstileToken: turnstileToken || void 0,
				honeypot
			});
			idempotencyKeyRef.current = createIdempotencyKey("ord");
			setCreatedOrder(order);
			setSubmitStatus("success");
			setStep("success");
			showToast(`Order ${order.id} submitted as Pending.`, "success");
		} catch (err) {
			setSubmitError(err instanceof Error ? err.message : "Unable to submit order.");
			setSubmitStatus("error");
			window.setTimeout(() => setSubmitStatus("idle"), 500);
		} finally {
			setSubmitting(false);
		}
	};
	return /* @__PURE__ */ jsxDEV(Fragment, { children: [/* @__PURE__ */ jsxDEV(CALoadingOverlay, {
		open: submitting,
		label: "Placing your order..."
	}, void 0, false, {
		fileName: _jsxFileName$16,
		lineNumber: 221,
		columnNumber: 7
	}, this), /* @__PURE__ */ jsxDEV("div", {
		role: "dialog",
		"aria-modal": "true",
		"aria-label": `Purchase ${product.title}`,
		className: "ca-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4",
		children: /* @__PURE__ */ jsxDEV("div", {
			className: "ca-sheet-up glass-sheet relative max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl p-5 sm:rounded-2xl sm:p-7",
			children: [
				/* @__PURE__ */ jsxDEV("div", {
					className: "flex items-center justify-between gap-4 pb-2",
					children: [/* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("p", {
						className: "text-xs text-[var(--ca-text-muted)]",
						children: [
							product.categoryName,
							" · ",
							step === "configure" ? "Select option" : step === "checkout" ? "Delivery & verification" : "Order received"
						]
					}, void 0, true, {
						fileName: _jsxFileName$16,
						lineNumber: 231,
						columnNumber: 15
					}, this), /* @__PURE__ */ jsxDEV("h2", {
						className: "font-display mt-0.5 text-2xl font-semibold text-[var(--ca-text)]",
						children: product.title
					}, void 0, false, {
						fileName: _jsxFileName$16,
						lineNumber: 234,
						columnNumber: 15
					}, this)] }, void 0, true, {
						fileName: _jsxFileName$16,
						lineNumber: 230,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("button", {
						type: "button",
						onClick: closeBuySheet,
						"aria-label": "Close purchase sheet",
						className: "btn-press inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--ca-text-muted)] hover:bg-[var(--ca-surface-subtle)] hover:text-[var(--ca-text)]",
						children: /* @__PURE__ */ jsxDEV(X, { className: "h-5 w-5" }, void 0, false, {
							fileName: _jsxFileName$16,
							lineNumber: 244,
							columnNumber: 15
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName$16,
						lineNumber: 238,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$16,
					lineNumber: 229,
					columnNumber: 11
				}, this),
				step === "configure" && /* @__PURE__ */ jsxDEV("div", {
					className: "mt-6 grid grid-cols-1 gap-6 md:grid-cols-2",
					children: [/* @__PURE__ */ jsxDEV("div", { children: [
						/* @__PURE__ */ jsxDEV("div", {
							className: "aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--ca-surface-subtle)]",
							children: /* @__PURE__ */ jsxDEV(ResilientImage, {
								src: selectedImage,
								alt: product.title,
								className: "h-full w-full object-cover"
							}, void 0, false, {
								fileName: _jsxFileName$16,
								lineNumber: 253,
								columnNumber: 17
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName$16,
							lineNumber: 252,
							columnNumber: 15
						}, this),
						allImages.length > 1 && /* @__PURE__ */ jsxDEV("div", {
							className: "mt-3 flex gap-2.5 overflow-x-auto pb-1",
							children: allImages.map((img, i) => /* @__PURE__ */ jsxDEV("button", {
								type: "button",
								onClick: () => setSelectedImage(img),
								"aria-label": `View image ${i + 1}`,
								className: `h-14 w-18 shrink-0 overflow-hidden rounded-xl border transition-all ${selectedImage === img ? "border-[var(--ca-accent)] ring-1 ring-[var(--ca-accent)]" : "border-[var(--ca-border)] opacity-75 hover:opacity-100"}`,
								children: /* @__PURE__ */ jsxDEV(ResilientImage, {
									src: img,
									alt: `${product.title} angle ${i + 1}`,
									className: "h-full w-full object-cover"
								}, void 0, false, {
									fileName: _jsxFileName$16,
									lineNumber: 273,
									columnNumber: 23
								}, this)
							}, i, false, {
								fileName: _jsxFileName$16,
								lineNumber: 262,
								columnNumber: 21
							}, this))
						}, void 0, false, {
							fileName: _jsxFileName$16,
							lineNumber: 260,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ jsxDEV("p", {
							className: "mt-4 text-sm leading-relaxed text-[var(--ca-text-muted)]",
							children: product.description
						}, void 0, false, {
							fileName: _jsxFileName$16,
							lineNumber: 278,
							columnNumber: 15
						}, this)
					] }, void 0, true, {
						fileName: _jsxFileName$16,
						lineNumber: 251,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("div", {
						className: "flex flex-col justify-between space-y-5",
						children: [/* @__PURE__ */ jsxDEV("div", {
							className: "space-y-4",
							children: [
								/* @__PURE__ */ jsxDEV("div", {
									className: "flex items-baseline justify-between",
									children: [/* @__PURE__ */ jsxDEV("span", {
										className: "font-mono-nums text-2xl font-semibold text-[var(--ca-text)]",
										children: formatPKR(product.price)
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 287,
										columnNumber: 19
									}, this), /* @__PURE__ */ jsxDEV("span", {
										className: "text-xs text-[var(--ca-text-muted)]",
										children: ["Total: ", /* @__PURE__ */ jsxDEV("strong", {
											className: "font-mono-nums text-[var(--ca-text)]",
											children: formatPKR(product.price * quantity)
										}, void 0, false, {
											fileName: _jsxFileName$16,
											lineNumber: 291,
											columnNumber: 28
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName$16,
										lineNumber: 290,
										columnNumber: 19
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName$16,
									lineNumber: 286,
									columnNumber: 17
								}, this),
								/* @__PURE__ */ jsxDEV("div", {
									className: "flex flex-wrap items-center justify-between gap-4",
									children: [product.sizes && product.sizes.length > 0 && /* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("span", {
										className: "block text-xs font-medium text-[var(--ca-text-muted)]",
										children: "Size / Fit"
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 299,
										columnNumber: 23
									}, this), /* @__PURE__ */ jsxDEV("div", {
										className: "mt-1.5 flex flex-wrap gap-1.5",
										children: product.sizes.map((sz) => /* @__PURE__ */ jsxDEV("button", {
											type: "button",
											onClick: () => setSelectedSize(sz),
											className: `rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${selectedSize === sz ? "border-[var(--ca-text)] bg-[var(--ca-text)] text-[var(--ca-bg)]" : "border-[var(--ca-border)] text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]"}`,
											children: sz
										}, sz, false, {
											fileName: _jsxFileName$16,
											lineNumber: 302,
											columnNumber: 27
										}, this))
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 300,
										columnNumber: 23
									}, this)] }, void 0, true, {
										fileName: _jsxFileName$16,
										lineNumber: 298,
										columnNumber: 21
									}, this), /* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("span", {
										className: "block text-xs font-medium text-[var(--ca-text-muted)]",
										children: "Quantity"
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 320,
										columnNumber: 21
									}, this), /* @__PURE__ */ jsxDEV("div", {
										className: "mt-1.5 inline-flex items-center rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-subtle)]/60",
										children: [
											/* @__PURE__ */ jsxDEV("button", {
												type: "button",
												onClick: () => setQuantity((q) => Math.max(1, q - 1)),
												"aria-label": "Decrease quantity",
												className: "p-2 text-[var(--ca-text)] hover:opacity-70",
												children: /* @__PURE__ */ jsxDEV(Minus, { className: "h-3.5 w-3.5" }, void 0, false, {
													fileName: _jsxFileName$16,
													lineNumber: 328,
													columnNumber: 25
												}, this)
											}, void 0, false, {
												fileName: _jsxFileName$16,
												lineNumber: 322,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ jsxDEV("span", {
												className: "font-mono-nums min-w-[2rem] text-center text-sm font-medium",
												children: quantity
											}, void 0, false, {
												fileName: _jsxFileName$16,
												lineNumber: 330,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ jsxDEV("button", {
												type: "button",
												onClick: () => setQuantity((q) => Math.min(20, q + 1)),
												"aria-label": "Increase quantity",
												className: "p-2 text-[var(--ca-text)] hover:opacity-70",
												children: /* @__PURE__ */ jsxDEV(Plus, { className: "h-3.5 w-3.5" }, void 0, false, {
													fileName: _jsxFileName$16,
													lineNumber: 339,
													columnNumber: 25
												}, this)
											}, void 0, false, {
												fileName: _jsxFileName$16,
												lineNumber: 333,
												columnNumber: 23
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName$16,
										lineNumber: 321,
										columnNumber: 21
									}, this)] }, void 0, true, {
										fileName: _jsxFileName$16,
										lineNumber: 319,
										columnNumber: 19
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName$16,
									lineNumber: 296,
									columnNumber: 17
								}, this),
								/* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("span", {
									className: "block text-xs font-medium text-[var(--ca-text-muted)]",
									children: "Payment Method"
								}, void 0, false, {
									fileName: _jsxFileName$16,
									lineNumber: 347,
									columnNumber: 19
								}, this), /* @__PURE__ */ jsxDEV("div", {
									className: "mt-2 grid grid-cols-2 gap-2 rounded-xl bg-[var(--ca-surface-subtle)] p-1",
									children: [/* @__PURE__ */ jsxDEV("button", {
										type: "button",
										onClick: () => setPaymentMethod("cod"),
										className: `rounded-lg px-3 py-2 text-xs font-semibold transition-all ${paymentMethod === "cod" ? "bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm" : "text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"}`,
										children: "Cash on Delivery"
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 351,
										columnNumber: 21
									}, this), /* @__PURE__ */ jsxDEV("button", {
										type: "button",
										onClick: () => setPaymentMethod("installments"),
										className: `rounded-lg px-3 py-2 text-xs font-semibold transition-all ${paymentMethod === "installments" ? "bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm" : "text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"}`,
										children: "PKR Installments"
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 362,
										columnNumber: 21
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName$16,
									lineNumber: 350,
									columnNumber: 19
								}, this)] }, void 0, true, {
									fileName: _jsxFileName$16,
									lineNumber: 346,
									columnNumber: 17
								}, this),
								paymentMethod === "installments" && /* @__PURE__ */ jsxDEV("div", {
									className: "rounded-xl bg-[var(--ca-surface-subtle)] p-4",
									children: [
										/* @__PURE__ */ jsxDEV("div", {
											className: "flex flex-wrap gap-1.5",
											children: plans.map((p) => /* @__PURE__ */ jsxDEV("button", {
												type: "button",
												onClick: () => setSelectedPlanId(p.id),
												className: `rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${selectedPlanId === p.id ? "bg-[var(--ca-accent)] text-[var(--ca-accent-fg)]" : "bg-[var(--ca-surface-solid)] text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"}`,
												children: [
													p.label,
													" (",
													p.markupPercent,
													"%)"
												]
											}, p.id, true, {
												fileName: _jsxFileName$16,
												lineNumber: 380,
												columnNumber: 25
											}, this))
										}, void 0, false, {
											fileName: _jsxFileName$16,
											lineNumber: 378,
											columnNumber: 21
										}, this),
										calc && /* @__PURE__ */ jsxDEV("dl", {
											className: "mt-4 space-y-1.5 text-xs",
											children: [
												/* @__PURE__ */ jsxDEV("div", {
													className: "flex justify-between",
													children: [/* @__PURE__ */ jsxDEV("dt", {
														className: "text-[var(--ca-text-muted)]",
														children: "Product Subtotal"
													}, void 0, false, {
														fileName: _jsxFileName$16,
														lineNumber: 398,
														columnNumber: 27
													}, this), /* @__PURE__ */ jsxDEV("dd", {
														className: "font-mono-nums font-medium text-[var(--ca-text)]",
														children: formatPKR(calc.subtotal)
													}, void 0, false, {
														fileName: _jsxFileName$16,
														lineNumber: 399,
														columnNumber: 27
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName$16,
													lineNumber: 397,
													columnNumber: 25
												}, this),
												/* @__PURE__ */ jsxDEV("div", {
													className: "flex justify-between",
													children: [/* @__PURE__ */ jsxDEV("dt", {
														className: "text-[var(--ca-text-muted)]",
														children: [
															"Interest (",
															calc.markupPercent,
															"%)"
														]
													}, void 0, true, {
														fileName: _jsxFileName$16,
														lineNumber: 404,
														columnNumber: 27
													}, this), /* @__PURE__ */ jsxDEV("dd", {
														className: "font-mono-nums font-semibold text-[var(--ca-accent)]",
														children: ["+ ", formatPKR(calc.markupAmount)]
													}, void 0, true, {
														fileName: _jsxFileName$16,
														lineNumber: 407,
														columnNumber: 27
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName$16,
													lineNumber: 403,
													columnNumber: 25
												}, this),
												calc.advancePercent > 0 && /* @__PURE__ */ jsxDEV("div", {
													className: "flex justify-between",
													children: [/* @__PURE__ */ jsxDEV("dt", {
														className: "text-[var(--ca-text-muted)]",
														children: [
															"Advance (",
															calc.advancePercent,
															"%)"
														]
													}, void 0, true, {
														fileName: _jsxFileName$16,
														lineNumber: 413,
														columnNumber: 29
													}, this), /* @__PURE__ */ jsxDEV("dd", {
														className: "font-mono-nums font-semibold text-[var(--ca-text)]",
														children: formatPKR(calc.advanceAmount)
													}, void 0, false, {
														fileName: _jsxFileName$16,
														lineNumber: 416,
														columnNumber: 29
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName$16,
													lineNumber: 412,
													columnNumber: 27
												}, this),
												/* @__PURE__ */ jsxDEV("div", {
													className: "flex justify-between",
													children: [/* @__PURE__ */ jsxDEV("dt", {
														className: "text-[var(--ca-text-muted)]",
														children: [
															"Monthly (",
															calc.months,
															" months)"
														]
													}, void 0, true, {
														fileName: _jsxFileName$16,
														lineNumber: 422,
														columnNumber: 27
													}, this), /* @__PURE__ */ jsxDEV("dd", {
														className: "font-mono-nums font-semibold text-[var(--ca-text)]",
														children: [formatPKR(calc.monthlyAmount), " / mo"]
													}, void 0, true, {
														fileName: _jsxFileName$16,
														lineNumber: 425,
														columnNumber: 27
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName$16,
													lineNumber: 421,
													columnNumber: 25
												}, this),
												/* @__PURE__ */ jsxDEV("div", {
													className: "flex justify-between pt-2",
													children: [/* @__PURE__ */ jsxDEV("dt", {
														className: "font-medium text-[var(--ca-text)]",
														children: "Total Payable"
													}, void 0, false, {
														fileName: _jsxFileName$16,
														lineNumber: 430,
														columnNumber: 27
													}, this), /* @__PURE__ */ jsxDEV("dd", {
														className: "font-mono-nums font-bold text-[var(--ca-text)]",
														children: formatPKR(calc.totalPayable)
													}, void 0, false, {
														fileName: _jsxFileName$16,
														lineNumber: 431,
														columnNumber: 27
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName$16,
													lineNumber: 429,
													columnNumber: 25
												}, this)
											]
										}, void 0, true, {
											fileName: _jsxFileName$16,
											lineNumber: 396,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ jsxDEV("p", {
											className: "mt-2.5 text-[11px] text-[var(--ca-text-muted)]",
											children: "Requires an active Seller Referral ID at checkout."
										}, void 0, false, {
											fileName: _jsxFileName$16,
											lineNumber: 437,
											columnNumber: 21
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName$16,
									lineNumber: 377,
									columnNumber: 19
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName$16,
							lineNumber: 285,
							columnNumber: 15
						}, this), /* @__PURE__ */ jsxDEV("div", {
							className: "flex flex-col gap-2.5 pt-2 sm:flex-row",
							children: [/* @__PURE__ */ jsxDEV("button", {
								type: "button",
								onClick: handleAddToBag,
								className: "btn-press flex-1 rounded-xl border border-[var(--ca-border)] px-4 py-3 text-sm font-medium text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]",
								children: "Add to Bag"
							}, void 0, false, {
								fileName: _jsxFileName$16,
								lineNumber: 445,
								columnNumber: 17
							}, this), /* @__PURE__ */ jsxDEV("button", {
								type: "button",
								onClick: handleProceedToCheckout,
								className: "btn-press inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--ca-text)] px-4 py-3 text-sm font-semibold text-[var(--ca-bg)] hover:opacity-90",
								children: ["Proceed to Checkout", /* @__PURE__ */ jsxDEV(ArrowRight, { className: "h-4 w-4" }, void 0, false, {
									fileName: _jsxFileName$16,
									lineNumber: 458,
									columnNumber: 19
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$16,
								lineNumber: 452,
								columnNumber: 17
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$16,
							lineNumber: 444,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$16,
						lineNumber: 284,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$16,
					lineNumber: 249,
					columnNumber: 11
				}, this),
				step === "checkout" && /* @__PURE__ */ jsxDEV("form", {
					onSubmit: handleSubmitOrder,
					className: "mt-5 space-y-4",
					children: [
						/* @__PURE__ */ jsxDEV("div", {
							className: "rounded-xl bg-[var(--ca-surface-subtle)] p-4 text-xs",
							children: [/* @__PURE__ */ jsxDEV("div", {
								className: "flex flex-wrap items-center justify-between gap-2",
								children: [/* @__PURE__ */ jsxDEV("span", {
									className: "font-semibold text-[var(--ca-text)]",
									children: [
										product.title,
										" × ",
										quantity,
										" (",
										selectedSize,
										")"
									]
								}, void 0, true, {
									fileName: _jsxFileName$16,
									lineNumber: 469,
									columnNumber: 17
								}, this), /* @__PURE__ */ jsxDEV("span", {
									className: "font-mono-nums font-bold text-[var(--ca-text)]",
									children: paymentMethod === "installments" && calc ? `Total ${formatPKR(calc.totalPayable)} (${activePlan?.label})` : `COD Total ${formatPKR(product.price * quantity)}`
								}, void 0, false, {
									fileName: _jsxFileName$16,
									lineNumber: 472,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$16,
								lineNumber: 468,
								columnNumber: 15
							}, this), paymentMethod === "installments" && calc && /* @__PURE__ */ jsxDEV("p", {
								className: "mt-1 text-[var(--ca-text-muted)]",
								children: [
									"Interest ",
									calc.markupPercent,
									"% (+",
									formatPKR(calc.markupAmount),
									")",
									calc.advanceAmount > 0 ? ` · Advance ${formatPKR(calc.advanceAmount)}` : "",
									" ·",
									" ",
									calc.months,
									" × ",
									formatPKR(calc.monthlyAmount),
									"/mo"
								]
							}, void 0, true, {
								fileName: _jsxFileName$16,
								lineNumber: 479,
								columnNumber: 17
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$16,
							lineNumber: 467,
							columnNumber: 13
						}, this),
						submitError && /* @__PURE__ */ jsxDEV("div", {
							role: "alert",
							className: "ca-shake rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-600 dark:text-red-400",
							children: submitError
						}, void 0, false, {
							fileName: _jsxFileName$16,
							lineNumber: 488,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "grid grid-cols-1 gap-4 sm:grid-cols-2",
							children: [
								/* @__PURE__ */ jsxDEV("div", { children: [
									/* @__PURE__ */ jsxDEV("label", {
										className: "block text-xs font-medium text-[var(--ca-text-muted)]",
										children: "Full Name *"
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 495,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("input", {
										type: "text",
										value: fullName,
										onChange: (e) => setFullName(e.target.value),
										placeholder: "Your full name",
										className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 498,
										columnNumber: 17
									}, this),
									formErrors.fullName && /* @__PURE__ */ jsxDEV("p", {
										className: "mt-1 text-xs text-red-600 dark:text-red-400",
										children: formErrors.fullName
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 506,
										columnNumber: 19
									}, this)
								] }, void 0, true, {
									fileName: _jsxFileName$16,
									lineNumber: 494,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ jsxDEV("div", { children: [
									/* @__PURE__ */ jsxDEV("label", {
										className: "block text-xs font-medium text-[var(--ca-text-muted)]",
										children: "Mobile Number *"
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 511,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("input", {
										type: "tel",
										value: phone,
										onChange: (e) => setPhone(e.target.value),
										placeholder: "03355329722",
										className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 514,
										columnNumber: 17
									}, this),
									formErrors.phone && /* @__PURE__ */ jsxDEV("p", {
										className: "mt-1 text-xs text-red-600 dark:text-red-400",
										children: formErrors.phone
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 522,
										columnNumber: 19
									}, this)
								] }, void 0, true, {
									fileName: _jsxFileName$16,
									lineNumber: 510,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ jsxDEV("div", { children: [
									/* @__PURE__ */ jsxDEV("label", {
										className: "block text-xs font-medium text-[var(--ca-text-muted)]",
										children: "WhatsApp Number *"
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 527,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("input", {
										type: "tel",
										value: whatsapp,
										onChange: (e) => setWhatsapp(e.target.value),
										placeholder: "03355329722",
										className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 530,
										columnNumber: 17
									}, this),
									formErrors.whatsapp && /* @__PURE__ */ jsxDEV("p", {
										className: "mt-1 text-xs text-red-600 dark:text-red-400",
										children: formErrors.whatsapp
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 538,
										columnNumber: 19
									}, this)
								] }, void 0, true, {
									fileName: _jsxFileName$16,
									lineNumber: 526,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ jsxDEV("div", { children: [
									/* @__PURE__ */ jsxDEV("label", {
										className: "block text-xs font-medium text-[var(--ca-text-muted)]",
										children: "City *"
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 543,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("input", {
										type: "text",
										value: city,
										onChange: (e) => setCity(e.target.value),
										placeholder: "Peshawar",
										className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 546,
										columnNumber: 17
									}, this),
									formErrors.city && /* @__PURE__ */ jsxDEV("p", {
										className: "mt-1 text-xs text-red-600 dark:text-red-400",
										children: formErrors.city
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 554,
										columnNumber: 19
									}, this)
								] }, void 0, true, {
									fileName: _jsxFileName$16,
									lineNumber: 542,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ jsxDEV("div", {
									className: "sm:col-span-2",
									children: [
										/* @__PURE__ */ jsxDEV("label", {
											className: "block text-xs font-medium text-[var(--ca-text-muted)]",
											children: "Complete Delivery Address *"
										}, void 0, false, {
											fileName: _jsxFileName$16,
											lineNumber: 559,
											columnNumber: 17
										}, this),
										/* @__PURE__ */ jsxDEV("input", {
											type: "text",
											value: address,
											onChange: (e) => setAddress(e.target.value),
											placeholder: "House / Street / Sector",
											className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
										}, void 0, false, {
											fileName: _jsxFileName$16,
											lineNumber: 562,
											columnNumber: 17
										}, this),
										formErrors.address && /* @__PURE__ */ jsxDEV("p", {
											className: "mt-1 text-xs text-red-600 dark:text-red-400",
											children: formErrors.address
										}, void 0, false, {
											fileName: _jsxFileName$16,
											lineNumber: 570,
											columnNumber: 19
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName$16,
									lineNumber: 558,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ jsxDEV("div", { children: [
									/* @__PURE__ */ jsxDEV("label", {
										className: "block text-xs font-medium text-[var(--ca-text-muted)]",
										children: "Postal Code *"
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 575,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("input", {
										type: "text",
										value: postalCode,
										onChange: (e) => setPostalCode(e.target.value),
										placeholder: "25000",
										className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 578,
										columnNumber: 17
									}, this),
									formErrors.postalCode && /* @__PURE__ */ jsxDEV("p", {
										className: "mt-1 text-xs text-red-600 dark:text-red-400",
										children: formErrors.postalCode
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 586,
										columnNumber: 19
									}, this)
								] }, void 0, true, {
									fileName: _jsxFileName$16,
									lineNumber: 574,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ jsxDEV("div", { children: [
									/* @__PURE__ */ jsxDEV("label", {
										className: "block text-xs font-medium text-[var(--ca-text-muted)]",
										children: ["Seller Referral ID ", paymentMethod === "installments" ? "(Required *)" : "(Optional)"]
									}, void 0, true, {
										fileName: _jsxFileName$16,
										lineNumber: 591,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("input", {
										type: "text",
										value: referralCode,
										onChange: (e) => setReferralCode(e.target.value.toUpperCase()),
										placeholder: "CA-XXXXXX",
										className: "font-mono-nums mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm uppercase text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 594,
										columnNumber: 17
									}, this),
									referralState.status === "valid" && /* @__PURE__ */ jsxDEV("p", {
										className: "mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400",
										children: [
											/* @__PURE__ */ jsxDEV(ShieldCheck, { className: "h-3.5 w-3.5" }, void 0, false, {
												fileName: _jsxFileName$16,
												lineNumber: 603,
												columnNumber: 21
											}, this),
											"Verified Seller: ",
											referralState.sellerName
										]
									}, void 0, true, {
										fileName: _jsxFileName$16,
										lineNumber: 602,
										columnNumber: 19
									}, this),
									referralState.status === "invalid" && referralCode.trim() && /* @__PURE__ */ jsxDEV("p", {
										className: "mt-1 text-xs text-red-600 dark:text-red-400",
										children: "Seller ID not recognized or inactive."
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 608,
										columnNumber: 19
									}, this),
									formErrors.referralCode && /* @__PURE__ */ jsxDEV("p", {
										className: "mt-1 text-xs text-red-600 dark:text-red-400",
										children: formErrors.referralCode
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 613,
										columnNumber: 19
									}, this)
								] }, void 0, true, {
									fileName: _jsxFileName$16,
									lineNumber: 590,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ jsxDEV("div", {
									className: "sm:col-span-2",
									children: [/* @__PURE__ */ jsxDEV("label", {
										className: "block text-xs font-medium text-[var(--ca-text-muted)]",
										children: "Order Notes"
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 620,
										columnNumber: 17
									}, this), /* @__PURE__ */ jsxDEV("textarea", {
										rows: 2,
										value: notes,
										onChange: (e) => setNotes(e.target.value),
										placeholder: "Tailoring or delivery timing notes...",
										className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 623,
										columnNumber: 17
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName$16,
									lineNumber: 619,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ jsxDEV("div", {
									className: "sm:col-span-2",
									children: /* @__PURE__ */ jsxDEV(TurnstileField, {
										action: "checkout",
										onToken: setTurnstileToken,
										honeypot,
										onHoneypotChange: setHoneypot
									}, void 0, false, {
										fileName: _jsxFileName$16,
										lineNumber: 633,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName$16,
									lineNumber: 632,
									columnNumber: 15
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName$16,
							lineNumber: 493,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "flex items-center justify-between gap-3 pt-2",
							children: [/* @__PURE__ */ jsxDEV("button", {
								type: "button",
								onClick: () => setStep("configure"),
								className: "btn-press min-h-[44px] rounded-xl border border-[var(--ca-border)] px-4 py-2.5 text-sm font-medium text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]",
								children: "Back"
							}, void 0, false, {
								fileName: _jsxFileName$16,
								lineNumber: 643,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV(CAProcessButton, {
								type: "submit",
								loading: submitting,
								status: submitStatus,
								className: "rounded-xl bg-[var(--ca-text)] px-6 py-2.5 text-sm font-semibold text-[var(--ca-bg)] hover:opacity-90",
								children: "Confirm & Place Order"
							}, void 0, false, {
								fileName: _jsxFileName$16,
								lineNumber: 650,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$16,
							lineNumber: 642,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName$16,
					lineNumber: 466,
					columnNumber: 11
				}, this),
				step === "success" && createdOrder && /* @__PURE__ */ jsxDEV("div", {
					className: "py-8 text-center",
					children: [
						/* @__PURE__ */ jsxDEV("div", {
							className: "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
							children: /* @__PURE__ */ jsxDEV(Check, { className: "h-7 w-7" }, void 0, false, {
								fileName: _jsxFileName$16,
								lineNumber: 665,
								columnNumber: 15
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName$16,
							lineNumber: 664,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("h3", {
							className: "font-display mt-4 text-3xl font-semibold text-[var(--ca-text)]",
							children: [
								"Order ",
								createdOrder.id,
								" Placed"
							]
						}, void 0, true, {
							fileName: _jsxFileName$16,
							lineNumber: 667,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("p", {
							className: "mx-auto mt-2 max-w-md text-sm text-[var(--ca-text-muted)]",
							children: [
								"Your order is currently ",
								/* @__PURE__ */ jsxDEV("strong", { children: "Pending" }, void 0, false, {
									fileName: _jsxFileName$16,
									lineNumber: 671,
									columnNumber: 39
								}, this),
								" verification by our Peshawar store.",
								createdOrder.paymentMethod === "installments" ? ` Installment schedule (${createdOrder.planLabel}) is attached to your order tracker.` : " Cash on Delivery will be collected upon dispatch."
							]
						}, void 0, true, {
							fileName: _jsxFileName$16,
							lineNumber: 670,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "mt-6 flex flex-wrap justify-center gap-3",
							children: [/* @__PURE__ */ jsxDEV("button", {
								type: "button",
								onClick: () => {
									closeBuySheet();
									navigate("/orders");
								},
								className: "btn-press rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-sm font-semibold text-[var(--ca-bg)]",
								children: "View My Orders"
							}, void 0, false, {
								fileName: _jsxFileName$16,
								lineNumber: 677,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								type: "button",
								onClick: closeBuySheet,
								className: "rounded-xl border border-[var(--ca-border)] px-5 py-2.5 text-sm font-medium text-[var(--ca-text)]",
								children: "Continue Browsing"
							}, void 0, false, {
								fileName: _jsxFileName$16,
								lineNumber: 687,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$16,
							lineNumber: 676,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName$16,
					lineNumber: 663,
					columnNumber: 11
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName$16,
			lineNumber: 228,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName$16,
		lineNumber: 222,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName$16,
		lineNumber: 220,
		columnNumber: 5
	}, this);
}
// src/services/seoService.ts
var SITE_NAME = STORE_CONFIG.brandName;
var DEFAULT_OG_IMAGE_PATH = "/src/assets/images/womens_unstitched_suit_1795333234539.jpg";
var DEFAULT_HOME_DESCRIPTION_EN = "Shop women's unstitched suits, boys' trousers, jackets, hoodies, shirts, t-shirts & accessories in PKR. Cash on Delivery & monthly plans.";
var DEFAULT_HOME_DESCRIPTION_UR = "سنیماٹک آرٹس پشاور سے خواتین کے ان سٹچڈ سوٹ، لڑکوں کی ٹراؤزر، جیکٹس، ہڈیز اور شرٹس PKR میں خریدیں۔ کیش آن ڈیلیوری اور اقساط دستیاب ہیں۔";
function normalizeMetaTitle(rawTitle, maxLength = 60) {
	const cleaned = sanitizePlainText(rawTitle || "", 160);
	if (!cleaned) return SITE_NAME;
	if (cleaned.length <= maxLength) return cleaned;
	const sliced = cleaned.slice(0, maxLength - 1);
	const lastSpace = sliced.lastIndexOf(" ");
	return `${(lastSpace > Math.floor(maxLength * .55) ? sliced.slice(0, lastSpace) : sliced).replace(/[-–—·:,.\s]+$/, "")}…`;
}
function normalizeMetaDescription(rawDescription, fallback = DEFAULT_HOME_DESCRIPTION_EN, maxLength = 155) {
	const source = sanitizePlainText(rawDescription || "", 400) || sanitizePlainText(fallback, 400);
	if (source.length <= maxLength) return source;
	const sliced = source.slice(0, maxLength - 1);
	const lastSpace = sliced.lastIndexOf(" ");
	return `${(lastSpace > Math.floor(maxLength * .6) ? sliced.slice(0, lastSpace) : sliced).replace(/[-–—·:,.\s]+$/, "")}…`;
}
function normalizePathAndQuery(rawPath) {
	const withoutHash = rawPath.split("#")[0].trim();
	if (!withoutHash) return "/";
	const qIndex = withoutHash.indexOf("?");
	const pathPart = qIndex === -1 ? withoutHash : withoutHash.slice(0, qIndex);
	const queryPart = qIndex === -1 ? "" : withoutHash.slice(qIndex + 1);
	const collapsed = (pathPart.startsWith("/") ? pathPart : `/${pathPart}`).replace(/\/{2,}/g, "/");
	const cleanPath = collapsed.length > 1 ? collapsed.replace(/\/+$/, "") : collapsed;
	if (!queryPart) return cleanPath;
	return `${cleanPath}?${queryPart}`;
}
function resolveCanonicalUrl(canonicalPath, runtimeOrigin, runtimeHref) {
	const origin = (runtimeOrigin ?? (typeof window !== "undefined" ? window.location.origin : STORE_CONFIG.siteUrl)).replace(/\/+$/, "");
	const raw = (canonicalPath || "").trim();
	if (raw.startsWith("http://") || raw.startsWith("https://")) try {
		const parsed = new globalThis.URL(raw);
		const clean = normalizePathAndQuery(`${parsed.pathname}${parsed.search}`);
		return `${parsed.origin}${clean}`;
	} catch {
		return origin ? `${origin}/` : raw;
	}
	if (raw) {
		const clean = normalizePathAndQuery(raw);
		return origin ? `${origin}${clean}` : clean;
	}
	const href = runtimeHref ?? (typeof window !== "undefined" ? window.location.href : "");
	if (href) try {
		const parsed = new globalThis.URL(href);
		const clean = normalizePathAndQuery(parsed.pathname);
		return `${parsed.origin}${clean}`;
	} catch {
		return origin ? `${origin}/` : "/";
	}
	return origin ? `${origin}/` : "/";
}
function resolveAbsoluteImageUrl(image, runtimeOrigin) {
	const origin = (runtimeOrigin ?? (typeof window !== "undefined" ? window.location.origin : STORE_CONFIG.siteUrl)).replace(/\/+$/, "");
	const candidate = (image || "").trim() || "/src/assets/images/womens_unstitched_suit_1795333234539.jpg";
	if (candidate.startsWith("http://") || candidate.startsWith("https://")) return candidate;
	const normalizedPath = candidate.startsWith("/") ? candidate : `/${candidate}`;
	return origin ? `${origin}${normalizedPath}` : normalizedPath;
}
function formatSlugAsTitle(slug) {
	const cleaned = sanitizePlainText(slug || "", 120).replace(/[^a-zA-Z0-9-]+/g, " ").trim();
	if (!cleaned) return "Product";
	return cleaned.split(/[-\s]+/).filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}
function deriveProductSku(product) {
	const raw = (product.id || product.slug || "ITEM").replace(/[^a-zA-Z0-9-]+/g, "").toUpperCase();
	return raw.startsWith("CA-") ? raw : `CA-${raw}`;
}
function buildOrganizationJsonLd(origin) {
	const cleanOrigin = origin.replace(/\/+$/, "") || STORE_CONFIG.siteUrl;
	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: STORE_CONFIG.brandName,
		alternateName: STORE_CONFIG.alternateName,
		url: cleanOrigin,
		logo: resolveAbsoluteImageUrl(DEFAULT_OG_IMAGE_PATH, cleanOrigin),
		email: STORE_CONFIG.email,
		telephone: STORE_CONFIG.phoneE164,
		address: {
			"@type": "PostalAddress",
			streetAddress: STORE_CONFIG.address.streetAddress,
			addressLocality: STORE_CONFIG.address.locality,
			addressRegion: STORE_CONFIG.address.region,
			postalCode: STORE_CONFIG.address.postalCode,
			addressCountry: STORE_CONFIG.address.countryCode
		},
		contactPoint: [{
			"@type": "ContactPoint",
			contactType: "customer support",
			telephone: STORE_CONFIG.phoneE164,
			email: STORE_CONFIG.email,
			availableLanguage: ["English", "Urdu"],
			areaServed: "PK"
		}],
		sameAs: [STORE_CONFIG.whatsappUrl]
	};
}
function buildWebSiteJsonLd(origin, locale = "en") {
	const cleanOrigin = origin.replace(/\/+$/, "") || STORE_CONFIG.siteUrl;
	const shopTarget = localizePath("/shop", locale);
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: STORE_CONFIG.brandName,
		url: cleanOrigin,
		inLanguage: locale === "ur" ? "ur-PK" : "en-PK",
		potentialAction: {
			"@type": "SearchAction",
			target: `${cleanOrigin}${shopTarget}?q={search_term_string}`,
			"query-input": "required name=search_term_string"
		}
	};
}
function buildLocalBusinessJsonLd(origin) {
	const cleanOrigin = origin.replace(/\/+$/, "") || STORE_CONFIG.siteUrl;
	return {
		"@context": "https://schema.org",
		"@type": ["ClothingStore", "LocalBusiness"],
		name: STORE_CONFIG.brandName,
		url: `${cleanOrigin}/contact`,
		image: resolveAbsoluteImageUrl(DEFAULT_OG_IMAGE_PATH, cleanOrigin),
		telephone: STORE_CONFIG.phoneE164,
		email: STORE_CONFIG.email,
		priceRange: STORE_CONFIG.priceRange,
		currenciesAccepted: STORE_CONFIG.currency,
		paymentAccepted: "Cash on Delivery, PKR Monthly Installments",
		hasMap: STORE_CONFIG.mapUrl,
		address: {
			"@type": "PostalAddress",
			streetAddress: STORE_CONFIG.address.streetAddress,
			addressLocality: STORE_CONFIG.address.locality,
			addressRegion: STORE_CONFIG.address.region,
			postalCode: STORE_CONFIG.address.postalCode,
			addressCountry: STORE_CONFIG.address.countryCode
		},
		openingHoursSpecification: [{
			"@type": "OpeningHoursSpecification",
			dayOfWeek: STORE_CONFIG.openingHours.days,
			opens: STORE_CONFIG.openingHours.opens,
			closes: STORE_CONFIG.openingHours.closes
		}]
	};
}
function buildBreadcrumbJsonLd(items, origin) {
	const cleanOrigin = origin.replace(/\/+$/, "") || STORE_CONFIG.siteUrl;
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, idx) => ({
			"@type": "ListItem",
			position: idx + 1,
			name: item.name,
			item: resolveCanonicalUrl(item.path, cleanOrigin)
		}))
	};
}
function buildFaqPageJsonLd(locale = "en") {
	const dict = getDictionary(locale);
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		inLanguage: locale === "ur" ? "ur-PK" : "en-PK",
		mainEntity: dict.faq.items.map((item) => ({
			"@type": "Question",
			name: item.question,
			acceptedAnswer: {
				"@type": "Answer",
				text: item.answer
			}
		}))
	};
}
function buildProductSeoConfig(product, runtimeOrigin, locale = "en") {
	const origin = (runtimeOrigin ?? (typeof window !== "undefined" ? window.location.origin : STORE_CONFIG.siteUrl)).replace(/\/+$/, "");
	const canonicalPath = localizePath(`/product/${product.slug}`, locale);
	const canonicalUrl = resolveCanonicalUrl(canonicalPath, origin);
	const allImages = [product.coverImage, ...product.extraImages || []].filter(Boolean).map((img) => resolveAbsoluteImageUrl(img, origin));
	const sku = deriveProductSku(product);
	const fallbackDesc = locale === "ur" ? `${product.title} (${formatPKR(product.price)}) سنیماٹک آرٹس پشاور سے آرڈر کریں۔ کیش آن ڈیلیوری اور اقساط دستیاب۔` : `Buy ${product.title} (${formatPKR(product.price)}) at Cinematic Arts. Nationwide COD & PKR installments.`;
	const description = normalizeMetaDescription(product.description, fallbackDesc, 155);
	const title = normalizeMetaTitle(`${product.title} — CA`, 60);
	const categorySlug = product.categoryId.replace(/^cat-/i, "");
	const breadcrumbs = [
		{
			name: locale === "ur" ? "ہوم" : "Home",
			path: localizePath("/", locale)
		},
		{
			name: locale === "ur" ? "دکان" : "Shop",
			path: localizePath("/shop", locale)
		},
		{
			name: product.categoryName,
			path: localizePath(`/category/${categorySlug}`, locale)
		},
		{
			name: product.title,
			path: canonicalPath
		}
	];
	const jsonLd = [{
		"@context": "https://schema.org",
		"@type": "Product",
		name: product.title,
		description,
		sku,
		category: product.categoryName,
		image: allImages,
		brand: {
			"@type": "Brand",
			name: SITE_NAME
		},
		offers: {
			"@type": "Offer",
			priceCurrency: "PKR",
			price: product.price,
			availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
			itemCondition: "https://schema.org/NewCondition",
			url: canonicalUrl,
			seller: {
				"@type": "Organization",
				name: SITE_NAME
			}
		}
	}, buildBreadcrumbJsonLd(breadcrumbs, origin)];
	return {
		title,
		description,
		canonicalPath,
		image: product.coverImage,
		type: "product",
		noIndex: false,
		locale,
		productMeta: {
			priceAmount: product.price,
			priceCurrency: "PKR",
			availability: product.inStock ? "in stock" : "out of stock",
			brand: SITE_NAME,
			category: product.categoryName,
			sku
		},
		jsonLd
	};
}
function buildCategorySeoConfig(category, runtimeOrigin, locale = "en") {
	const origin = (runtimeOrigin ?? (typeof window !== "undefined" ? window.location.origin : STORE_CONFIG.siteUrl)).replace(/\/+$/, "");
	const dict = getDictionary(locale);
	const canonicalPath = localizePath(`/category/${category.slug}`, locale);
	const title = locale === "ur" ? normalizeMetaTitle(`${category.name} — ${dict.brand}`) : normalizeMetaTitle(`${category.name} in Pakistan — ${STORE_CONFIG.shortName}`);
	const description = normalizeMetaDescription(dict.category.intros[category.slug] || category.description || dict.category.fallbackIntro(category.name));
	const breadcrumbs = [
		{
			name: dict.nav.home,
			path: localizePath("/", locale)
		},
		{
			name: dict.nav.shop,
			path: localizePath("/shop", locale)
		},
		{
			name: category.name,
			path: canonicalPath
		}
	];
	return {
		title,
		description,
		canonicalPath,
		image: category.image,
		type: "website",
		noIndex: false,
		locale,
		jsonLd: [buildOrganizationJsonLd(origin), buildBreadcrumbJsonLd(breadcrumbs, origin)]
	};
}
function getRouteSeoConfig(pathname, search = "", runtimeOrigin) {
	const locale = getLocaleFromPath(pathname);
	const basePath = normalizePathAndQuery(stripLocalePrefix(pathname)).split("?")[0];
	const params = new globalThis.URLSearchParams(search.startsWith("?") ? search : `?${search}`);
	const origin = (runtimeOrigin || STORE_CONFIG.siteUrl).replace(/\/+$/, "");
	const dict = getDictionary(locale);
	if (basePath === "/") return {
		title: locale === "ur" ? normalizeMetaTitle("سنیماٹک آرٹس — ملبوسات، ان سٹچڈ سوٹ اور اقساط") : normalizeMetaTitle("Cinematic Arts (CA) — Clothing & PKR Installments"),
		description: locale === "ur" ? normalizeMetaDescription(DEFAULT_HOME_DESCRIPTION_UR, DEFAULT_HOME_DESCRIPTION_UR) : normalizeMetaDescription(DEFAULT_HOME_DESCRIPTION_EN),
		canonicalPath: localizePath("/", locale),
		type: "website",
		noIndex: false,
		locale,
		jsonLd: [
			buildOrganizationJsonLd(origin),
			buildWebSiteJsonLd(origin, locale),
			buildLocalBusinessJsonLd(origin),
			buildFaqPageJsonLd(locale)
		]
	};
	if (basePath === "/shop") {
		const rawCat = sanitizePlainText(params.get("category") || "", 60);
		const hasCategory = Boolean(rawCat && rawCat.toLowerCase() !== "all");
		const catLabel = hasCategory ? formatSlugAsTitle(rawCat.replace(/^cat-/i, "")) : "";
		return {
			title: hasCategory ? normalizeMetaTitle(`${catLabel} — ${STORE_CONFIG.shortName}`) : locale === "ur" ? normalizeMetaTitle(`مکمل کلیکشن — ${dict.brand}`) : normalizeMetaTitle("Shop Clothing & Accessories in PKR — Cinematic Arts"),
			description: hasCategory ? normalizeMetaDescription(`Browse ${catLabel} from ${SITE_NAME} in Peshawar. Available in PKR with Cash on Delivery and monthly installments.`) : locale === "ur" ? normalizeMetaDescription("خواتین کے ان سٹچڈ سوٹ، لڑکوں کی ٹراؤزر، جیکٹس، ہڈیز، شرٹس اور لوازمات PKR میں خریدیں۔") : normalizeMetaDescription("Browse women's unstitched clothes, boys' trousers, jackets, hoodies, shirts, t-shirts & accessories in PKR."),
			canonicalPath: localizePath(hasCategory ? `/shop?category=${encodeURIComponent(rawCat)}` : "/shop", locale),
			type: "website",
			noIndex: false,
			locale,
			jsonLd: [buildOrganizationJsonLd(origin), buildBreadcrumbJsonLd([{
				name: dict.nav.home,
				path: localizePath("/", locale)
			}, {
				name: dict.nav.shop,
				path: localizePath("/shop", locale)
			}], origin)]
		};
	}
	if (basePath.startsWith("/category/")) {
		const slug = basePath.slice(10).split("/")[0] || "";
		const readableName = formatSlugAsTitle(slug);
		const canonicalPath = localizePath(slug ? `/category/${slug}` : "/shop", locale);
		return {
			title: normalizeMetaTitle(`${readableName} — ${STORE_CONFIG.shortName}`),
			description: normalizeMetaDescription(dict.category.intros[slug] || dict.category.fallbackIntro(readableName)),
			canonicalPath,
			type: "website",
			noIndex: !slug,
			locale,
			jsonLd: [buildBreadcrumbJsonLd([
				{
					name: dict.nav.home,
					path: localizePath("/", locale)
				},
				{
					name: dict.nav.shop,
					path: localizePath("/shop", locale)
				},
				{
					name: readableName,
					path: canonicalPath
				}
			], origin)]
		};
	}
	if (basePath.startsWith("/product/")) {
		const slug = basePath.slice(9).split("/")[0] || "";
		const readableName = formatSlugAsTitle(slug);
		return {
			title: normalizeMetaTitle(`${readableName} — CA`),
			description: normalizeMetaDescription(`View ${readableName} from ${SITE_NAME} in Peshawar, Pakistan. Order in PKR via Cash on Delivery or monthly installments.`),
			canonicalPath: localizePath(slug ? `/product/${slug}` : "/shop", locale),
			type: "product",
			noIndex: !slug,
			locale
		};
	}
	if (basePath === "/about") return {
		title: locale === "ur" ? normalizeMetaTitle(`ہمارے بارے میں — ${dict.brand}`) : normalizeMetaTitle("About Cinematic Arts (CA) — Peshawar Clothing Store"),
		description: normalizeMetaDescription(dict.about.lead),
		canonicalPath: localizePath("/about", locale),
		type: "website",
		noIndex: false,
		locale,
		jsonLd: [buildOrganizationJsonLd(origin), buildBreadcrumbJsonLd([{
			name: dict.nav.home,
			path: localizePath("/", locale)
		}, {
			name: dict.nav.about,
			path: localizePath("/about", locale)
		}], origin)]
	};
	if (basePath === "/faq") return {
		title: locale === "ur" ? normalizeMetaTitle(`اقساط اور آرڈرز سوالات — ${dict.brand}`) : normalizeMetaTitle("Installment & COD FAQ — Cinematic Arts (CA)"),
		description: normalizeMetaDescription(dict.faq.intro),
		canonicalPath: localizePath("/faq", locale),
		type: "website",
		noIndex: false,
		locale,
		jsonLd: [buildFaqPageJsonLd(locale), buildBreadcrumbJsonLd([{
			name: dict.nav.home,
			path: localizePath("/", locale)
		}, {
			name: dict.nav.faq,
			path: localizePath("/faq", locale)
		}], origin)]
	};
	if (basePath === "/size-guide") return {
		title: locale === "ur" ? normalizeMetaTitle(`سائز گائیڈ — ${dict.brand}`) : normalizeMetaTitle("Clothing Size Guide — Cinematic Arts (CA)"),
		description: normalizeMetaDescription(dict.sizeGuide.intro),
		canonicalPath: localizePath("/size-guide", locale),
		type: "website",
		noIndex: false,
		locale,
		jsonLd: [buildBreadcrumbJsonLd([{
			name: dict.nav.home,
			path: localizePath("/", locale)
		}, {
			name: dict.nav.sizeGuide,
			path: localizePath("/size-guide", locale)
		}], origin)]
	};
	if (basePath === "/shipping") return {
		title: locale === "ur" ? normalizeMetaTitle(`ڈیلیوری اور واپسی — ${dict.brand}`) : normalizeMetaTitle("Shipping, COD & 7-Day Returns — Cinematic Arts"),
		description: normalizeMetaDescription(dict.shipping.intro),
		canonicalPath: localizePath("/shipping", locale),
		type: "website",
		noIndex: false,
		locale,
		jsonLd: [buildBreadcrumbJsonLd([{
			name: dict.nav.home,
			path: localizePath("/", locale)
		}, {
			name: dict.nav.shipping,
			path: localizePath("/shipping", locale)
		}], origin)]
	};
	if (basePath === "/contact") return {
		title: locale === "ur" ? normalizeMetaTitle(`رابطہ اور پتہ — ${dict.brand}`) : normalizeMetaTitle("Contact Store & WhatsApp — Cinematic Arts Peshawar"),
		description: normalizeMetaDescription(dict.contact.intro),
		canonicalPath: localizePath("/contact", locale),
		type: "website",
		noIndex: false,
		locale,
		jsonLd: [buildLocalBusinessJsonLd(origin), buildBreadcrumbJsonLd([{
			name: dict.nav.home,
			path: localizePath("/", locale)
		}, {
			name: dict.nav.contact,
			path: localizePath("/contact", locale)
		}], origin)]
	};
	if (basePath === "/terms") return {
		title: locale === "ur" ? normalizeMetaTitle(`شرائط و اقساط پالیسی — ${dict.brand}`) : normalizeMetaTitle("Terms & Installment Policy — Cinematic Arts (CA)"),
		description: normalizeMetaDescription("Read Cinematic Arts terms of service, 7-day exchanges, PKR installment financing rules, and 10% seller referral commission."),
		canonicalPath: localizePath("/terms", locale),
		type: "website",
		noIndex: false,
		locale
	};
	if (basePath === "/privacy") return {
		title: locale === "ur" ? normalizeMetaTitle(`پرائیویسی پالیسی — ${dict.brand}`) : normalizeMetaTitle("Privacy Policy & Data Usage — Cinematic Arts (CA)"),
		description: normalizeMetaDescription("How Cinematic Arts handles customer delivery details, seller verification records, and account deletion rights."),
		canonicalPath: localizePath("/privacy", locale),
		type: "website",
		noIndex: false,
		locale
	};
	if (basePath === "/orders" || basePath === "/cart" || basePath === "/checkout") return {
		title: normalizeMetaTitle(`Bag & My Orders — ${STORE_CONFIG.shortName}`),
		description: normalizeMetaDescription("Manage your shopping bag, track live order status, and inspect monthly PKR installment schedules."),
		canonicalPath: basePath,
		type: "website",
		noIndex: true,
		locale
	};
	if (basePath === "/profile") return {
		title: normalizeMetaTitle(`Profile & Seller Dashboard — ${STORE_CONFIG.shortName}`),
		description: normalizeMetaDescription("Manage your Cinematic Arts profile, notifications, referral seller earnings, and support messages."),
		canonicalPath: "/profile",
		type: "website",
		noIndex: true,
		locale
	};
	if (basePath === "/auth") return {
		title: normalizeMetaTitle(`Sign In or Join — ${STORE_CONFIG.shortName}`),
		description: normalizeMetaDescription("Sign in to track orders or register as a Cinematic Arts Customer or Verified Seller."),
		canonicalPath: "/auth",
		type: "website",
		noIndex: true,
		locale
	};
	if (basePath === "/admin") return {
		title: normalizeMetaTitle(`Admin Portal — ${STORE_CONFIG.shortName}`),
		description: normalizeMetaDescription("Administration console for Cinematic Arts orders, catalog, analytics, and installment plans."),
		canonicalPath: "/admin",
		type: "website",
		noIndex: true,
		locale
	};
	return {
		title: normalizeMetaTitle(`404 Page Not Found — ${STORE_CONFIG.shortName}`),
		description: normalizeMetaDescription(`The requested page could not be found on ${SITE_NAME}.`),
		canonicalPath: pathname || "/404",
		type: "website",
		noIndex: true,
		locale
	};
}
function upsertMetaTag(doc, attr, key, content) {
	let el = doc.head.querySelector(`meta[${attr}="${key}"]`);
	if (!el) {
		el = doc.createElement("meta");
		el.setAttribute(attr, key);
		doc.head.appendChild(el);
	}
	el.setAttribute("content", content);
}
function removeMetaTag(doc, attr, key) {
	Array.from(doc.head.querySelectorAll(`meta[${attr}="${key}"]`)).forEach((node) => node.remove());
}
function upsertCanonicalLink(doc, canonicalUrl) {
	const existing = Array.from(doc.head.querySelectorAll("link[rel=\"canonical\"]"));
	if (existing.length === 0) {
		const link = doc.createElement("link");
		link.setAttribute("rel", "canonical");
		link.setAttribute("href", canonicalUrl);
		doc.head.appendChild(link);
		return;
	}
	const [primary, ...duplicates] = existing;
	primary.setAttribute("href", canonicalUrl);
	duplicates.forEach((dup) => dup.remove());
}
function syncHreflangLinks(doc, canonicalPath, noIndex, runtimeOrigin) {
	Array.from(doc.head.querySelectorAll("link[rel=\"alternate\"][hreflang]")).forEach((n) => n.remove());
	if (noIndex) return;
	const qIdx = canonicalPath.indexOf("?");
	const alternates = getAlternateLocalePaths(qIdx === -1 ? canonicalPath : canonicalPath.slice(0, qIdx), qIdx === -1 ? "" : canonicalPath.slice(qIdx));
	const pairs = [
		{
			hreflang: "en",
			path: alternates.en
		},
		{
			hreflang: "ur",
			path: alternates.ur
		},
		{
			hreflang: "x-default",
			path: alternates.xDefault
		}
	];
	for (const pair of pairs) {
		const link = doc.createElement("link");
		link.setAttribute("rel", "alternate");
		link.setAttribute("hreflang", pair.hreflang);
		link.setAttribute("href", resolveCanonicalUrl(pair.path, runtimeOrigin));
		doc.head.appendChild(link);
	}
}
var PRODUCT_OG_META_KEYS = [
	"product:price:amount",
	"product:price:currency",
	"product:availability",
	"product:brand",
	"product:category"
];
function updateDocumentHead(config, doc = typeof document !== "undefined" ? document : void 0, runtimeOrigin, runtimeHref) {
	const locale = config.locale || getLocaleFromPath(config.canonicalPath || "/");
	const normalizedTitle = normalizeMetaTitle(config.title, 60);
	const normalizedDescription = normalizeMetaDescription(config.description, locale === "ur" ? DEFAULT_HOME_DESCRIPTION_UR : DEFAULT_HOME_DESCRIPTION_EN, 155);
	const canonicalUrl = resolveCanonicalUrl(config.canonicalPath, runtimeOrigin, runtimeHref);
	const imageUrl = resolveAbsoluteImageUrl(config.image, runtimeOrigin);
	const ogType = config.type ?? "website";
	const robotsValue = config.noIndex ? "noindex,nofollow" : "index,follow";
	const normalizedConfig = {
		...config,
		locale,
		title: normalizedTitle,
		description: normalizedDescription,
		type: ogType
	};
	if (!doc || !doc.head) return normalizedConfig;
	if (doc.documentElement) {
		const dir = locale === "ur" ? "rtl" : "ltr";
		doc.documentElement.lang = locale;
		doc.documentElement.dir = dir;
		doc.documentElement.setAttribute?.("lang", locale);
		doc.documentElement.setAttribute?.("dir", dir);
	}
	doc.title = normalizedTitle;
	upsertMetaTag(doc, "name", "robots", robotsValue);
	upsertMetaTag(doc, "name", "description", normalizedDescription);
	if (STORE_CONFIG.verification.google) upsertMetaTag(doc, "name", "google-site-verification", STORE_CONFIG.verification.google);
	if (STORE_CONFIG.verification.bing) upsertMetaTag(doc, "name", "msvalidate.01", STORE_CONFIG.verification.bing);
	upsertMetaTag(doc, "property", "og:site_name", SITE_NAME);
	upsertMetaTag(doc, "property", "og:locale", locale === "ur" ? "ur_PK" : "en_PK");
	upsertMetaTag(doc, "property", "og:locale:alternate", locale === "ur" ? "en_PK" : "ur_PK");
	upsertMetaTag(doc, "property", "og:title", normalizedTitle);
	upsertMetaTag(doc, "property", "og:description", normalizedDescription);
	upsertMetaTag(doc, "property", "og:type", ogType);
	upsertMetaTag(doc, "property", "og:url", canonicalUrl);
	upsertMetaTag(doc, "property", "og:image", imageUrl);
	upsertMetaTag(doc, "name", "twitter:card", "summary_large_image");
	upsertMetaTag(doc, "name", "twitter:title", normalizedTitle);
	upsertMetaTag(doc, "name", "twitter:description", normalizedDescription);
	upsertMetaTag(doc, "name", "twitter:image", imageUrl);
	if (ogType === "product" && config.productMeta) {
		upsertMetaTag(doc, "property", "product:price:amount", String(config.productMeta.priceAmount));
		upsertMetaTag(doc, "property", "product:price:currency", config.productMeta.priceCurrency || "PKR");
		if (config.productMeta.availability) upsertMetaTag(doc, "property", "product:availability", config.productMeta.availability);
		else removeMetaTag(doc, "property", "product:availability");
		if (config.productMeta.brand) upsertMetaTag(doc, "property", "product:brand", config.productMeta.brand);
		else removeMetaTag(doc, "property", "product:brand");
		if (config.productMeta.category) upsertMetaTag(doc, "property", "product:category", config.productMeta.category);
		else removeMetaTag(doc, "property", "product:category");
	} else PRODUCT_OG_META_KEYS.forEach((key) => removeMetaTag(doc, "property", key));
	upsertCanonicalLink(doc, canonicalUrl);
	syncHreflangLinks(doc, config.canonicalPath || "/", Boolean(config.noIndex), runtimeOrigin);
	Array.from(doc.head.querySelectorAll("script[data-ca-seo=\"true\"]")).forEach((node) => node.remove());
	if (config.jsonLd) (Array.isArray(config.jsonLd) ? config.jsonLd : [config.jsonLd]).forEach((schema) => {
		const script = doc.createElement("script");
		script.setAttribute("type", "application/ld+json");
		script.setAttribute("data-ca-seo", "true");
		script.textContent = JSON.stringify(schema);
		doc.head.appendChild(script);
	});
	return normalizedConfig;
}
function applyRouteSeoTransition(pathname, search = "", doc, runtimeOrigin, runtimeHref) {
	return updateDocumentHead(getRouteSeoConfig(pathname, search, runtimeOrigin), doc, runtimeOrigin, runtimeHref);
}
function escapeHtmlAttr(val) {
	return String(val).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeHtmlText(val) {
	return String(val).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function renderHeadTagsHtml(config, runtimeOrigin) {
	const origin = (runtimeOrigin || STORE_CONFIG.siteUrl).replace(/\/+$/, "");
	const locale = config.locale || getLocaleFromPath(config.canonicalPath || "/");
	const title = normalizeMetaTitle(config.title, 60);
	const description = normalizeMetaDescription(config.description, locale === "ur" ? DEFAULT_HOME_DESCRIPTION_UR : DEFAULT_HOME_DESCRIPTION_EN, 155);
	const canonicalUrl = resolveCanonicalUrl(config.canonicalPath, origin);
	const imageUrl = resolveAbsoluteImageUrl(config.image, origin);
	const ogType = config.type ?? "website";
	const robotsValue = config.noIndex ? "noindex,nofollow" : "index,follow";
	const lines = [
		`<title>${escapeHtmlText(title)}</title>`,
		`<meta name="robots" content="${robotsValue}" />`,
		`<meta name="description" content="${escapeHtmlAttr(description)}" />`,
		`<link rel="canonical" href="${escapeHtmlAttr(canonicalUrl)}" />`
	];
	if (STORE_CONFIG.verification.google) lines.push(`<meta name="google-site-verification" content="${escapeHtmlAttr(STORE_CONFIG.verification.google)}" />`);
	if (STORE_CONFIG.verification.bing) lines.push(`<meta name="msvalidate.01" content="${escapeHtmlAttr(STORE_CONFIG.verification.bing)}" />`);
	if (!config.noIndex) {
		const rawPath = config.canonicalPath || "/";
		const qIdx = rawPath.indexOf("?");
		const alternates = getAlternateLocalePaths(qIdx === -1 ? rawPath : rawPath.slice(0, qIdx), qIdx === -1 ? "" : rawPath.slice(qIdx));
		lines.push(`<link rel="alternate" hreflang="en" href="${escapeHtmlAttr(resolveCanonicalUrl(alternates.en, origin))}" />`, `<link rel="alternate" hreflang="ur" href="${escapeHtmlAttr(resolveCanonicalUrl(alternates.ur, origin))}" />`, `<link rel="alternate" hreflang="x-default" href="${escapeHtmlAttr(resolveCanonicalUrl(alternates.xDefault, origin))}" />`);
	}
	lines.push(`<meta property="og:site_name" content="${escapeHtmlAttr(SITE_NAME)}" />`, `<meta property="og:locale" content="${locale === "ur" ? "ur_PK" : "en_PK"}" />`, `<meta property="og:locale:alternate" content="${locale === "ur" ? "en_PK" : "ur_PK"}" />`, `<meta property="og:title" content="${escapeHtmlAttr(title)}" />`, `<meta property="og:description" content="${escapeHtmlAttr(description)}" />`, `<meta property="og:type" content="${ogType}" />`, `<meta property="og:url" content="${escapeHtmlAttr(canonicalUrl)}" />`, `<meta property="og:image" content="${escapeHtmlAttr(imageUrl)}" />`, `<meta name="twitter:card" content="summary_large_image" />`, `<meta name="twitter:title" content="${escapeHtmlAttr(title)}" />`, `<meta name="twitter:description" content="${escapeHtmlAttr(description)}" />`, `<meta name="twitter:image" content="${escapeHtmlAttr(imageUrl)}" />`);
	if (ogType === "product" && config.productMeta) {
		lines.push(`<meta property="product:price:amount" content="${escapeHtmlAttr(String(config.productMeta.priceAmount))}" />`, `<meta property="product:price:currency" content="${escapeHtmlAttr(config.productMeta.priceCurrency || "PKR")}" />`);
		if (config.productMeta.availability) lines.push(`<meta property="product:availability" content="${escapeHtmlAttr(config.productMeta.availability)}" />`);
		if (config.productMeta.brand) lines.push(`<meta property="product:brand" content="${escapeHtmlAttr(config.productMeta.brand)}" />`);
		if (config.productMeta.category) lines.push(`<meta property="product:category" content="${escapeHtmlAttr(config.productMeta.category)}" />`);
	}
	if (config.canonicalPath === "/" || config.canonicalPath === "/ur") lines.push("<link rel=\"preload\" as=\"image\" type=\"image/avif\" href=\"/src/assets/images/womens_unstitched_suit_1795333234539.avif\" />");
	if (locale === "ur") lines.push("<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap\" />");
	if (STORE_CONFIG.analytics.plausibleDomain) lines.push(`<script defer data-domain="${escapeHtmlAttr(STORE_CONFIG.analytics.plausibleDomain)}" src="https://plausible.io/js/script.js"><\/script>`);
	else if (STORE_CONFIG.analytics.umamiWebsiteId && STORE_CONFIG.analytics.umamiScriptUrl) lines.push(`<script defer data-website-id="${escapeHtmlAttr(STORE_CONFIG.analytics.umamiWebsiteId)}" src="${escapeHtmlAttr(STORE_CONFIG.analytics.umamiScriptUrl)}"><\/script>`);
	if (config.jsonLd) (Array.isArray(config.jsonLd) ? config.jsonLd : [config.jsonLd]).forEach((schema) => {
		const safeJson = JSON.stringify(schema).replace(/</g, "\\u003c");
		lines.push(`<script type="application/ld+json" data-ca-seo="true">${safeJson}<\/script>`);
	});
	return lines.join("\n    ");
}
// src/components/RouteSeoManager.tsx
var URDU_FONT_URL = "https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap";
/**
* Keeps <title>, <meta>, <link rel="canonical">, hreflang alternates, <html lang dir>,
* and Urdu Noto Nastaliq font stylesheet synchronized on every router transition.
*/
function RouteSeoManager() {
	const { pathname, search } = useLocation();
	useEffect(() => {
		const locale = getLocaleFromPath(pathname);
		document.documentElement.lang = locale;
		document.documentElement.dir = locale === "ur" ? "rtl" : "ltr";
		if (locale === "ur" && !document.querySelector("link[data-ca-urdu-font=\"true\"]")) {
			const link = document.createElement("link");
			link.rel = "stylesheet";
			link.href = URDU_FONT_URL;
			link.setAttribute("data-ca-urdu-font", "true");
			document.head.appendChild(link);
		}
		applyRouteSeoTransition(pathname, search);
	}, [pathname, search]);
	return null;
}
// src/components/Skeletons.tsx
var _jsxFileName$15 = "/app/applet/src/components/Skeletons.tsx";
function ProductGridSkeleton({ count = 6 }) {
	return /* @__PURE__ */ jsxDEV("div", {
		"aria-busy": "true",
		"aria-label": "Loading products",
		className: "grid grid-cols-2 gap-3 sm:gap-6",
		children: Array.from({ length: count }).map((_, idx) => /* @__PURE__ */ jsxDEV("div", {
			className: "glass-panel overflow-hidden rounded-2xl p-2 sm:p-3",
			children: [/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer aspect-[4/3] w-full rounded-xl bg-[var(--ca-surface-subtle)]" }, void 0, false, {
				fileName: _jsxFileName$15,
				lineNumber: 15,
				columnNumber: 11
			}, this), /* @__PURE__ */ jsxDEV("div", {
				className: "mt-3 space-y-2 px-1 pb-1 sm:mt-4 sm:space-y-2.5 sm:pb-1.5",
				children: [
					/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-3 w-24 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
						fileName: _jsxFileName$15,
						lineNumber: 17,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-5 w-4/5 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
						fileName: _jsxFileName$15,
						lineNumber: 18,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ jsxDEV("div", {
						className: "flex items-center justify-between pt-2",
						children: [/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-4 w-20 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
							fileName: _jsxFileName$15,
							lineNumber: 20,
							columnNumber: 15
						}, this), /* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-9 w-16 rounded-[10px] bg-[var(--ca-surface-subtle)]" }, void 0, false, {
							fileName: _jsxFileName$15,
							lineNumber: 21,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$15,
						lineNumber: 19,
						columnNumber: 13
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName$15,
				lineNumber: 16,
				columnNumber: 11
			}, this)]
		}, idx, true, {
			fileName: _jsxFileName$15,
			lineNumber: 11,
			columnNumber: 9
		}, this))
	}, void 0, false, {
		fileName: _jsxFileName$15,
		lineNumber: 5,
		columnNumber: 5
	}, this);
}
function ProductDetailSkeleton() {
	return /* @__PURE__ */ jsxDEV("div", {
		"aria-busy": "true",
		"aria-label": "Loading product details",
		className: "mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12",
		children: [/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-4 w-32 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
			fileName: _jsxFileName$15,
			lineNumber: 33,
			columnNumber: 7
		}, this), /* @__PURE__ */ jsxDEV("div", {
			className: "mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12",
			children: [/* @__PURE__ */ jsxDEV("div", {
				className: "space-y-3 lg:col-span-7",
				children: [/* @__PURE__ */ jsxDEV("div", {
					className: "glass-panel rounded-3xl p-3",
					children: /* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer aspect-[4/3] w-full rounded-2xl bg-[var(--ca-surface-subtle)]" }, void 0, false, {
						fileName: _jsxFileName$15,
						lineNumber: 37,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName$15,
					lineNumber: 36,
					columnNumber: 11
				}, this), /* @__PURE__ */ jsxDEV("div", {
					className: "flex gap-3",
					children: Array.from({ length: 3 }).map((_, i) => /* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-20 w-24 rounded-2xl bg-[var(--ca-surface-subtle)]" }, i, false, {
						fileName: _jsxFileName$15,
						lineNumber: 41,
						columnNumber: 15
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName$15,
					lineNumber: 39,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$15,
				lineNumber: 35,
				columnNumber: 9
			}, this), /* @__PURE__ */ jsxDEV("div", {
				className: "lg:col-span-5",
				children: /* @__PURE__ */ jsxDEV("div", {
					className: "glass-panel space-y-4 rounded-3xl p-6 sm:p-7",
					children: [
						/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-3 w-36 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
							fileName: _jsxFileName$15,
							lineNumber: 50,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-8 w-4/5 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
							fileName: _jsxFileName$15,
							lineNumber: 51,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-7 w-32 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
							fileName: _jsxFileName$15,
							lineNumber: 52,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "space-y-2 pt-2",
							children: [/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-3.5 w-full rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
								fileName: _jsxFileName$15,
								lineNumber: 54,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-3.5 w-5/6 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
								fileName: _jsxFileName$15,
								lineNumber: 55,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$15,
							lineNumber: 53,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-36 w-full rounded-2xl bg-[var(--ca-surface-subtle)]" }, void 0, false, {
							fileName: _jsxFileName$15,
							lineNumber: 57,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "grid grid-cols-2 gap-3 pt-2",
							children: [/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-12 rounded-xl bg-[var(--ca-surface-subtle)]" }, void 0, false, {
								fileName: _jsxFileName$15,
								lineNumber: 59,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-12 rounded-xl bg-[var(--ca-surface-subtle)]" }, void 0, false, {
								fileName: _jsxFileName$15,
								lineNumber: 60,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$15,
							lineNumber: 58,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName$15,
					lineNumber: 49,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$15,
				lineNumber: 48,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$15,
			lineNumber: 34,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$15,
		lineNumber: 32,
		columnNumber: 5
	}, this);
}
function CardListSkeleton({ rows = 3 }) {
	return /* @__PURE__ */ jsxDEV("div", {
		"aria-busy": "true",
		"aria-label": "Loading items",
		className: "space-y-4",
		children: Array.from({ length: rows }).map((_, idx) => /* @__PURE__ */ jsxDEV("div", {
			className: "glass-panel rounded-3xl p-5 sm:p-6",
			children: [
				/* @__PURE__ */ jsxDEV("div", {
					className: "flex items-center justify-between gap-4",
					children: [/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-4 w-36 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
						fileName: _jsxFileName$15,
						lineNumber: 75,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-4 w-24 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
						fileName: _jsxFileName$15,
						lineNumber: 76,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$15,
					lineNumber: 74,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer mt-4 h-3 w-2/3 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
					fileName: _jsxFileName$15,
					lineNumber: 78,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer mt-2 h-3 w-1/2 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
					fileName: _jsxFileName$15,
					lineNumber: 79,
					columnNumber: 11
				}, this)
			]
		}, idx, true, {
			fileName: _jsxFileName$15,
			lineNumber: 73,
			columnNumber: 9
		}, this))
	}, void 0, false, {
		fileName: _jsxFileName$15,
		lineNumber: 71,
		columnNumber: 5
	}, this);
}
function ProfilePageSkeleton() {
	return /* @__PURE__ */ jsxDEV("div", {
		"aria-busy": "true",
		"aria-label": "Loading profile",
		className: "mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-12",
		children: [
			/* @__PURE__ */ jsxDEV("div", {
				className: "glass-panel flex items-center justify-between rounded-3xl p-6",
				children: [/* @__PURE__ */ jsxDEV("div", {
					className: "flex items-center gap-4",
					children: [/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-14 w-14 rounded-2xl bg-[var(--ca-surface-subtle)]" }, void 0, false, {
						fileName: _jsxFileName$15,
						lineNumber: 91,
						columnNumber: 11
					}, this), /* @__PURE__ */ jsxDEV("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-6 w-48 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
							fileName: _jsxFileName$15,
							lineNumber: 93,
							columnNumber: 13
						}, this), /* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-3 w-56 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
							fileName: _jsxFileName$15,
							lineNumber: 94,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$15,
						lineNumber: 92,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$15,
					lineNumber: 90,
					columnNumber: 9
				}, this), /* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-10 w-28 rounded-xl bg-[var(--ca-surface-subtle)]" }, void 0, false, {
					fileName: _jsxFileName$15,
					lineNumber: 97,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$15,
				lineNumber: 89,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-12 w-full max-w-md rounded-2xl bg-[var(--ca-surface-subtle)]" }, void 0, false, {
				fileName: _jsxFileName$15,
				lineNumber: 99,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ jsxDEV("div", {
				className: "grid grid-cols-1 gap-6 lg:grid-cols-3",
				children: [/* @__PURE__ */ jsxDEV("div", {
					className: "glass-panel h-72 rounded-3xl p-6 lg:col-span-2",
					children: [/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-6 w-44 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
						fileName: _jsxFileName$15,
						lineNumber: 102,
						columnNumber: 11
					}, this), /* @__PURE__ */ jsxDEV("div", {
						className: "mt-6 grid grid-cols-2 gap-4",
						children: Array.from({ length: 4 }).map((_, i) => /* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-12 rounded-xl bg-[var(--ca-surface-subtle)]" }, i, false, {
							fileName: _jsxFileName$15,
							lineNumber: 105,
							columnNumber: 15
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName$15,
						lineNumber: 103,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$15,
					lineNumber: 101,
					columnNumber: 9
				}, this), /* @__PURE__ */ jsxDEV("div", {
					className: "glass-panel h-72 rounded-3xl p-6",
					children: [/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-5 w-32 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
						fileName: _jsxFileName$15,
						lineNumber: 110,
						columnNumber: 11
					}, this), /* @__PURE__ */ jsxDEV("div", {
						className: "mt-4 space-y-3",
						children: [/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-11 rounded-xl bg-[var(--ca-surface-subtle)]" }, void 0, false, {
							fileName: _jsxFileName$15,
							lineNumber: 112,
							columnNumber: 13
						}, this), /* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-11 rounded-xl bg-[var(--ca-surface-subtle)]" }, void 0, false, {
							fileName: _jsxFileName$15,
							lineNumber: 113,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$15,
						lineNumber: 111,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$15,
					lineNumber: 109,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$15,
				lineNumber: 100,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$15,
		lineNumber: 88,
		columnNumber: 5
	}, this);
}
function NotificationListSkeleton() {
	return /* @__PURE__ */ jsxDEV("div", {
		"aria-busy": "true",
		"aria-label": "Loading notifications and support threads",
		className: "grid grid-cols-1 gap-6 lg:grid-cols-2",
		children: Array.from({ length: 2 }).map((_, col) => /* @__PURE__ */ jsxDEV("div", {
			className: "glass-panel space-y-4 rounded-3xl p-6",
			children: [/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-6 w-44 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
				fileName: _jsxFileName$15,
				lineNumber: 126,
				columnNumber: 11
			}, this), Array.from({ length: 3 }).map((__, i) => /* @__PURE__ */ jsxDEV("div", {
				className: "rounded-xl bg-[var(--ca-surface-subtle)] p-4",
				children: [/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-4 w-1/2 rounded bg-[var(--ca-surface-solid)]" }, void 0, false, {
					fileName: _jsxFileName$15,
					lineNumber: 129,
					columnNumber: 15
				}, this), /* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer mt-2 h-3 w-full rounded bg-[var(--ca-surface-solid)]" }, void 0, false, {
					fileName: _jsxFileName$15,
					lineNumber: 130,
					columnNumber: 15
				}, this)]
			}, i, true, {
				fileName: _jsxFileName$15,
				lineNumber: 128,
				columnNumber: 13
			}, this))]
		}, col, true, {
			fileName: _jsxFileName$15,
			lineNumber: 125,
			columnNumber: 9
		}, this))
	}, void 0, false, {
		fileName: _jsxFileName$15,
		lineNumber: 123,
		columnNumber: 5
	}, this);
}
function SellerDashboardSkeleton() {
	return /* @__PURE__ */ jsxDEV("div", {
		"aria-busy": "true",
		"aria-label": "Loading seller dashboard",
		className: "space-y-6",
		children: [/* @__PURE__ */ jsxDEV("div", {
			className: "grid grid-cols-1 gap-4 md:grid-cols-4",
			children: [
				/* @__PURE__ */ jsxDEV("div", {
					className: "glass-panel h-28 rounded-3xl p-5 md:col-span-2",
					children: [/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-3 w-40 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
						fileName: _jsxFileName$15,
						lineNumber: 144,
						columnNumber: 11
					}, this), /* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer mt-3 h-7 w-44 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
						fileName: _jsxFileName$15,
						lineNumber: 145,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$15,
					lineNumber: 143,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ jsxDEV("div", {
					className: "glass-panel h-28 rounded-3xl p-5",
					children: [/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-3 w-32 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
						fileName: _jsxFileName$15,
						lineNumber: 148,
						columnNumber: 11
					}, this), /* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer mt-3 h-7 w-28 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
						fileName: _jsxFileName$15,
						lineNumber: 149,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$15,
					lineNumber: 147,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ jsxDEV("div", {
					className: "glass-panel h-28 rounded-3xl p-5",
					children: [/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-3 w-32 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
						fileName: _jsxFileName$15,
						lineNumber: 152,
						columnNumber: 11
					}, this), /* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer mt-3 h-7 w-28 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
						fileName: _jsxFileName$15,
						lineNumber: 153,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$15,
					lineNumber: 151,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName$15,
			lineNumber: 142,
			columnNumber: 7
		}, this), /* @__PURE__ */ jsxDEV("div", {
			className: "grid grid-cols-1 gap-6 lg:grid-cols-2",
			children: [/* @__PURE__ */ jsxDEV("div", {
				className: "glass-panel h-64 rounded-3xl p-6",
				children: [/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-6 w-52 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
					fileName: _jsxFileName$15,
					lineNumber: 158,
					columnNumber: 11
				}, this), /* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer mt-5 h-32 w-full rounded-2xl bg-[var(--ca-surface-subtle)]" }, void 0, false, {
					fileName: _jsxFileName$15,
					lineNumber: 159,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$15,
				lineNumber: 157,
				columnNumber: 9
			}, this), /* @__PURE__ */ jsxDEV("div", {
				className: "glass-panel h-64 rounded-3xl p-6",
				children: [/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-6 w-40 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
					fileName: _jsxFileName$15,
					lineNumber: 162,
					columnNumber: 11
				}, this), /* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer mt-5 h-32 w-full rounded-2xl bg-[var(--ca-surface-subtle)]" }, void 0, false, {
					fileName: _jsxFileName$15,
					lineNumber: 163,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$15,
				lineNumber: 161,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$15,
			lineNumber: 156,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$15,
		lineNumber: 141,
		columnNumber: 5
	}, this);
}
function AdminWorkspaceSkeleton() {
	return /* @__PURE__ */ jsxDEV("div", {
		"aria-busy": "true",
		"aria-label": "Loading admin workspace",
		className: "space-y-6",
		children: [/* @__PURE__ */ jsxDEV("div", {
			className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
			children: Array.from({ length: 6 }).map((_, i) => /* @__PURE__ */ jsxDEV("div", {
				className: "rounded-2xl bg-[var(--ca-surface-solid)] p-4",
				children: [/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-3 w-28 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
					fileName: _jsxFileName$15,
					lineNumber: 176,
					columnNumber: 13
				}, this), /* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer mt-2.5 h-6 w-36 rounded bg-[var(--ca-surface-subtle)]" }, void 0, false, {
					fileName: _jsxFileName$15,
					lineNumber: 177,
					columnNumber: 13
				}, this)]
			}, i, true, {
				fileName: _jsxFileName$15,
				lineNumber: 175,
				columnNumber: 11
			}, this))
		}, void 0, false, {
			fileName: _jsxFileName$15,
			lineNumber: 173,
			columnNumber: 7
		}, this), /* @__PURE__ */ jsxDEV("div", {
			className: "grid grid-cols-1 gap-6 md:grid-cols-2",
			children: [/* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-48 rounded-2xl bg-[var(--ca-surface-subtle)]" }, void 0, false, {
				fileName: _jsxFileName$15,
				lineNumber: 182,
				columnNumber: 9
			}, this), /* @__PURE__ */ jsxDEV("div", { className: "ca-shimmer h-48 rounded-2xl bg-[var(--ca-surface-subtle)]" }, void 0, false, {
				fileName: _jsxFileName$15,
				lineNumber: 183,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$15,
			lineNumber: 181,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$15,
		lineNumber: 172,
		columnNumber: 5
	}, this);
}
function FriendlyErrorState({ title = "Unable to load content", message, onRetry }) {
	return /* @__PURE__ */ jsxDEV("div", {
		role: "alert",
		className: "ca-fade-in glass-panel rounded-3xl p-8 text-center",
		children: [
			/* @__PURE__ */ jsxDEV("div", {
				className: "mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/12 text-red-600 dark:text-red-400",
				children: /* @__PURE__ */ jsxDEV(AlertCircle, { className: "h-5 w-5" }, void 0, false, {
					fileName: _jsxFileName$15,
					lineNumber: 201,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$15,
				lineNumber: 200,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ jsxDEV("h3", {
				className: "font-display mt-3 text-2xl font-semibold text-[var(--ca-text)]",
				children: title
			}, void 0, false, {
				fileName: _jsxFileName$15,
				lineNumber: 203,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ jsxDEV("p", {
				className: "mt-1.5 text-sm text-[var(--ca-text-muted)]",
				children: message
			}, void 0, false, {
				fileName: _jsxFileName$15,
				lineNumber: 204,
				columnNumber: 7
			}, this),
			onRetry && /* @__PURE__ */ jsxDEV("button", {
				type: "button",
				onClick: onRetry,
				className: "btn-press mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-bg)]",
				children: [/* @__PURE__ */ jsxDEV(RefreshCw, { className: "h-3.5 w-3.5" }, void 0, false, {
					fileName: _jsxFileName$15,
					lineNumber: 211,
					columnNumber: 11
				}, this), "Retry"]
			}, void 0, true, {
				fileName: _jsxFileName$15,
				lineNumber: 206,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$15,
		lineNumber: 199,
		columnNumber: 5
	}, this);
}
// src/components/InstallmentCalculator.tsx
var _jsxFileName$14 = "/app/applet/src/components/InstallmentCalculator.tsx";
function InstallmentCalculator({ products: propProducts, plans: propPlans, initialProductId }) {
	const { openBuySheet } = useCart();
	const [products, setProducts] = useState(propProducts || []);
	const [plans, setPlans] = useState(propPlans || []);
	const [inputMode, setInputMode] = useState("product");
	const [selectedProductId, setSelectedProductId] = useState(initialProductId || "");
	const [quantity, setQuantity] = useState(1);
	const [customAmount, setCustomAmount] = useState("10000");
	const [selectedPlanId, setSelectedPlanId] = useState("");
	useEffect(() => {
		if (propProducts && propProducts.length > 0) {
			setProducts(propProducts);
			if (!selectedProductId) setSelectedProductId(initialProductId || propProducts[0].id);
		} else productService.listProducts({ sort: "latest" }).then((list) => {
			setProducts(list);
			if (list.length > 0) setSelectedProductId((prev) => prev || initialProductId || list[0].id);
		}).catch(() => {});
	}, [
		propProducts,
		initialProductId,
		selectedProductId
	]);
	useEffect(() => {
		if (propPlans && propPlans.length > 0) {
			setPlans(propPlans);
			if (!selectedPlanId) setSelectedPlanId(propPlans[0].id);
		} else productService.listInstallmentPlans().then((list) => {
			setPlans(list);
			if (list.length > 0) setSelectedPlanId((prev) => prev || list[0].id);
		}).catch(() => {});
	}, [propPlans, selectedPlanId]);
	const selectedProduct = useMemo(() => products.find((p) => p.id === selectedProductId) || products[0] || null, [products, selectedProductId]);
	const activePlan = useMemo(() => plans.find((p) => p.id === selectedPlanId) || plans[0] || null, [plans, selectedPlanId]);
	const unitPrice = useMemo(() => {
		if (inputMode === "custom" || !selectedProduct) return Math.max(0, Math.round(Number(customAmount) || 0));
		return selectedProduct.price;
	}, [
		inputMode,
		selectedProduct,
		customAmount
	]);
	const effectiveQty = inputMode === "custom" ? 1 : quantity;
	const activeCalc = useMemo(() => {
		if (!activePlan) return null;
		return calculateInstallmentPlan(unitPrice, effectiveQty, activePlan);
	}, [
		unitPrice,
		effectiveQty,
		activePlan
	]);
	const comparisons = useMemo(() => plans.map((plan) => ({
		plan,
		calc: calculateInstallmentPlan(unitPrice, effectiveQty, plan)
	})), [
		plans,
		unitPrice,
		effectiveQty
	]);
	return /* @__PURE__ */ jsxDEV("div", {
		"data-testid": "installment-calculator",
		className: "glass-panel rounded-2xl p-6 sm:p-8 space-y-6",
		children: [/* @__PURE__ */ jsxDEV("div", {
			className: "flex flex-wrap items-center justify-between gap-4",
			children: [/* @__PURE__ */ jsxDEV("div", {
				className: "flex items-center gap-2.5",
				children: [/* @__PURE__ */ jsxDEV(Calculator, { className: "h-5 w-5 text-[var(--ca-accent)]" }, void 0, false, {
					fileName: _jsxFileName$14,
					lineNumber: 104,
					columnNumber: 11
				}, this), /* @__PURE__ */ jsxDEV("h3", {
					className: "font-display text-2xl font-semibold text-[var(--ca-text)] sm:text-3xl",
					children: "Installment Calculator"
				}, void 0, false, {
					fileName: _jsxFileName$14,
					lineNumber: 105,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$14,
				lineNumber: 103,
				columnNumber: 9
			}, this), /* @__PURE__ */ jsxDEV("div", {
				className: "inline-flex rounded-xl bg-[var(--ca-surface-subtle)] p-1 text-xs font-semibold",
				children: [/* @__PURE__ */ jsxDEV("button", {
					type: "button",
					onClick: () => setInputMode("product"),
					className: `rounded-lg px-3 py-1.5 transition-colors ${inputMode === "product" ? "bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm" : "text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"}`,
					children: "Select Product"
				}, void 0, false, {
					fileName: _jsxFileName$14,
					lineNumber: 111,
					columnNumber: 11
				}, this), /* @__PURE__ */ jsxDEV("button", {
					type: "button",
					onClick: () => setInputMode("custom"),
					className: `rounded-lg px-3 py-1.5 transition-colors ${inputMode === "custom" ? "bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm" : "text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"}`,
					children: "Custom PKR Amount"
				}, void 0, false, {
					fileName: _jsxFileName$14,
					lineNumber: 122,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$14,
				lineNumber: 110,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$14,
			lineNumber: 102,
			columnNumber: 7
		}, this), /* @__PURE__ */ jsxDEV("div", {
			className: "grid grid-cols-1 gap-6 lg:grid-cols-12",
			children: [/* @__PURE__ */ jsxDEV("div", {
				className: "space-y-4 lg:col-span-5",
				children: [
					inputMode === "product" && products.length > 0 ? /* @__PURE__ */ jsxDEV(Fragment, { children: [/* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("label", {
						htmlFor: "calc-product-select",
						className: "block text-xs font-medium text-[var(--ca-text-muted)]",
						children: "Choose Product"
					}, void 0, false, {
						fileName: _jsxFileName$14,
						lineNumber: 142,
						columnNumber: 17
					}, this), /* @__PURE__ */ jsxDEV("select", {
						id: "calc-product-select",
						value: selectedProduct?.id || "",
						onChange: (e) => setSelectedProductId(e.target.value),
						className: "mt-1.5 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none",
						children: products.map((p) => /* @__PURE__ */ jsxDEV("option", {
							value: p.id,
							children: [
								p.title,
								" — ",
								formatPKR(p.price)
							]
						}, p.id, true, {
							fileName: _jsxFileName$14,
							lineNumber: 155,
							columnNumber: 21
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName$14,
						lineNumber: 148,
						columnNumber: 17
					}, this)] }, void 0, true, {
						fileName: _jsxFileName$14,
						lineNumber: 141,
						columnNumber: 15
					}, this), /* @__PURE__ */ jsxDEV("div", {
						className: "flex items-center justify-between gap-4 rounded-xl bg-[var(--ca-surface-subtle)] px-4 py-3",
						children: [/* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("span", {
							className: "block text-xs text-[var(--ca-text-muted)]",
							children: "Quantity"
						}, void 0, false, {
							fileName: _jsxFileName$14,
							lineNumber: 164,
							columnNumber: 19
						}, this), /* @__PURE__ */ jsxDEV("span", {
							className: "font-mono-nums text-sm font-semibold text-[var(--ca-text)]",
							children: ["Cash price: ", formatPKR(unitPrice * effectiveQty)]
						}, void 0, true, {
							fileName: _jsxFileName$14,
							lineNumber: 165,
							columnNumber: 19
						}, this)] }, void 0, true, {
							fileName: _jsxFileName$14,
							lineNumber: 163,
							columnNumber: 17
						}, this), /* @__PURE__ */ jsxDEV("div", {
							className: "inline-flex items-center rounded-xl bg-[var(--ca-surface-solid)]",
							children: [
								/* @__PURE__ */ jsxDEV("button", {
									type: "button",
									onClick: () => setQuantity((q) => Math.max(1, q - 1)),
									"aria-label": "Calculator decrease quantity",
									className: "p-2 text-[var(--ca-text)] hover:opacity-70",
									children: /* @__PURE__ */ jsxDEV(Minus, { className: "h-3.5 w-3.5" }, void 0, false, {
										fileName: _jsxFileName$14,
										lineNumber: 176,
										columnNumber: 21
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName$14,
									lineNumber: 170,
									columnNumber: 19
								}, this),
								/* @__PURE__ */ jsxDEV("span", {
									className: "font-mono-nums min-w-[2rem] text-center text-sm font-semibold",
									children: quantity
								}, void 0, false, {
									fileName: _jsxFileName$14,
									lineNumber: 178,
									columnNumber: 19
								}, this),
								/* @__PURE__ */ jsxDEV("button", {
									type: "button",
									onClick: () => setQuantity((q) => Math.min(20, q + 1)),
									"aria-label": "Calculator increase quantity",
									className: "p-2 text-[var(--ca-text)] hover:opacity-70",
									children: /* @__PURE__ */ jsxDEV(Plus, { className: "h-3.5 w-3.5" }, void 0, false, {
										fileName: _jsxFileName$14,
										lineNumber: 187,
										columnNumber: 21
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName$14,
									lineNumber: 181,
									columnNumber: 19
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName$14,
							lineNumber: 169,
							columnNumber: 17
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$14,
						lineNumber: 162,
						columnNumber: 15
					}, this)] }, void 0, true, {
						fileName: _jsxFileName$14,
						lineNumber: 140,
						columnNumber: 13
					}, this) : /* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("label", {
						htmlFor: "calc-custom-amount",
						className: "block text-xs font-medium text-[var(--ca-text-muted)]",
						children: "Enter Product Price (PKR)"
					}, void 0, false, {
						fileName: _jsxFileName$14,
						lineNumber: 194,
						columnNumber: 15
					}, this), /* @__PURE__ */ jsxDEV("input", {
						id: "calc-custom-amount",
						type: "number",
						min: 0,
						step: 100,
						value: customAmount,
						onChange: (e) => setCustomAmount(e.target.value),
						placeholder: "10000",
						className: "font-mono-nums mt-1.5 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-base font-semibold text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
					}, void 0, false, {
						fileName: _jsxFileName$14,
						lineNumber: 200,
						columnNumber: 15
					}, this)] }, void 0, true, {
						fileName: _jsxFileName$14,
						lineNumber: 193,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("span", {
						className: "block text-xs font-medium text-[var(--ca-text-muted)]",
						children: "Installment Duration & Interest Rate"
					}, void 0, false, {
						fileName: _jsxFileName$14,
						lineNumber: 215,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("div", {
						className: "mt-2 grid grid-cols-3 gap-2",
						children: plans.map((p) => {
							const selected = activePlan?.id === p.id;
							return /* @__PURE__ */ jsxDEV("button", {
								type: "button",
								onClick: () => setSelectedPlanId(p.id),
								className: `rounded-xl border px-3 py-2.5 text-left transition-all ${selected ? "border-[var(--ca-accent)] bg-[var(--ca-accent)] text-[var(--ca-accent-fg)] shadow-sm" : "border-[var(--ca-border)] bg-[var(--ca-surface-solid)] text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]"}`,
								children: [/* @__PURE__ */ jsxDEV("span", {
									className: "block text-xs font-bold",
									children: p.label
								}, void 0, false, {
									fileName: _jsxFileName$14,
									lineNumber: 232,
									columnNumber: 21
								}, this), /* @__PURE__ */ jsxDEV("span", {
									className: `font-mono-nums text-[11px] ${selected ? "opacity-90" : "text-[var(--ca-text-muted)]"}`,
									children: [p.markupPercent, "% interest"]
								}, void 0, true, {
									fileName: _jsxFileName$14,
									lineNumber: 233,
									columnNumber: 21
								}, this)]
							}, p.id, true, {
								fileName: _jsxFileName$14,
								lineNumber: 222,
								columnNumber: 19
							}, this);
						})
					}, void 0, false, {
						fileName: _jsxFileName$14,
						lineNumber: 218,
						columnNumber: 13
					}, this)] }, void 0, true, {
						fileName: _jsxFileName$14,
						lineNumber: 214,
						columnNumber: 11
					}, this),
					inputMode === "product" && selectedProduct && activePlan && /* @__PURE__ */ jsxDEV("button", {
						type: "button",
						onClick: () => openBuySheet(selectedProduct, quantity, selectedProduct.sizes?.[0] || "One Size", {
							paymentMethod: "installments",
							planId: activePlan.id
						}),
						className: "btn-press inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ca-text)] px-4 py-3 text-xs font-semibold text-[var(--ca-bg)] hover:opacity-90",
						children: [
							/* @__PURE__ */ jsxDEV(ShoppingBag, { className: "h-3.5 w-3.5" }, void 0, false, {
								fileName: _jsxFileName$14,
								lineNumber: 259,
								columnNumber: 15
							}, this),
							"Buy ",
							selectedProduct.title,
							" on ",
							activePlan.label
						]
					}, void 0, true, {
						fileName: _jsxFileName$14,
						lineNumber: 247,
						columnNumber: 13
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName$14,
				lineNumber: 138,
				columnNumber: 9
			}, this), /* @__PURE__ */ jsxDEV("div", {
				className: "space-y-4 lg:col-span-7",
				children: [activeCalc && activePlan && /* @__PURE__ */ jsxDEV("div", {
					className: "rounded-xl bg-[var(--ca-surface-subtle)] p-5",
					children: [/* @__PURE__ */ jsxDEV("div", {
						className: "flex flex-wrap items-baseline justify-between gap-2 pb-3",
						children: [/* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("span", {
							className: "text-xs font-medium text-[var(--ca-text-muted)]",
							children: [
								"Selected Plan (",
								activePlan.label,
								")"
							]
						}, void 0, true, {
							fileName: _jsxFileName$14,
							lineNumber: 271,
							columnNumber: 19
						}, this), /* @__PURE__ */ jsxDEV("p", {
							className: "font-mono-nums mt-0.5 text-2xl font-bold text-[var(--ca-text)]",
							children: formatPKR(activeCalc.totalPayable)
						}, void 0, false, {
							fileName: _jsxFileName$14,
							lineNumber: 274,
							columnNumber: 19
						}, this)] }, void 0, true, {
							fileName: _jsxFileName$14,
							lineNumber: 270,
							columnNumber: 17
						}, this), /* @__PURE__ */ jsxDEV("div", {
							className: "text-right",
							children: [/* @__PURE__ */ jsxDEV("span", {
								className: "text-xs text-[var(--ca-text-muted)]",
								children: "Monthly Installment"
							}, void 0, false, {
								fileName: _jsxFileName$14,
								lineNumber: 279,
								columnNumber: 19
							}, this), /* @__PURE__ */ jsxDEV("p", {
								className: "font-mono-nums text-lg font-bold text-[var(--ca-accent)]",
								children: [
									formatPKR(activeCalc.monthlyAmount),
									" / mo × ",
									activeCalc.months
								]
							}, void 0, true, {
								fileName: _jsxFileName$14,
								lineNumber: 280,
								columnNumber: 19
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$14,
							lineNumber: 278,
							columnNumber: 17
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$14,
						lineNumber: 269,
						columnNumber: 15
					}, this), /* @__PURE__ */ jsxDEV("dl", {
						className: "mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3",
						children: [
							/* @__PURE__ */ jsxDEV("div", {
								className: "rounded-xl bg-[var(--ca-surface-solid)] p-3",
								children: [/* @__PURE__ */ jsxDEV("dt", {
									className: "text-[var(--ca-text-muted)]",
									children: "Base Product Price"
								}, void 0, false, {
									fileName: _jsxFileName$14,
									lineNumber: 288,
									columnNumber: 19
								}, this), /* @__PURE__ */ jsxDEV("dd", {
									className: "font-mono-nums mt-1 font-semibold text-[var(--ca-text)]",
									children: formatPKR(activeCalc.subtotal)
								}, void 0, false, {
									fileName: _jsxFileName$14,
									lineNumber: 289,
									columnNumber: 19
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$14,
								lineNumber: 287,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ jsxDEV("div", {
								className: "rounded-xl bg-[var(--ca-surface-solid)] p-3",
								children: [/* @__PURE__ */ jsxDEV("dt", {
									className: "text-[var(--ca-text-muted)]",
									children: [
										"Interest (",
										activeCalc.markupPercent,
										"%)"
									]
								}, void 0, true, {
									fileName: _jsxFileName$14,
									lineNumber: 294,
									columnNumber: 19
								}, this), /* @__PURE__ */ jsxDEV("dd", {
									className: "font-mono-nums mt-1 font-semibold text-[var(--ca-accent)]",
									children: ["+ ", formatPKR(activeCalc.markupAmount)]
								}, void 0, true, {
									fileName: _jsxFileName$14,
									lineNumber: 297,
									columnNumber: 19
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$14,
								lineNumber: 293,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ jsxDEV("div", {
								className: "rounded-xl bg-[var(--ca-surface-solid)] p-3 col-span-2 sm:col-span-1",
								children: [/* @__PURE__ */ jsxDEV("dt", {
									className: "text-[var(--ca-text-muted)]",
									children: activeCalc.advancePercent > 0 ? `Advance (${activeCalc.advancePercent}%)` : "Advance Required"
								}, void 0, false, {
									fileName: _jsxFileName$14,
									lineNumber: 302,
									columnNumber: 19
								}, this), /* @__PURE__ */ jsxDEV("dd", {
									className: "font-mono-nums mt-1 font-semibold text-[var(--ca-text)]",
									children: activeCalc.advancePercent > 0 ? formatPKR(activeCalc.advanceAmount) : "PKR 0 (0%)"
								}, void 0, false, {
									fileName: _jsxFileName$14,
									lineNumber: 307,
									columnNumber: 19
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$14,
								lineNumber: 301,
								columnNumber: 17
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName$14,
						lineNumber: 286,
						columnNumber: 15
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$14,
					lineNumber: 268,
					columnNumber: 13
				}, this), comparisons.length > 0 && /* @__PURE__ */ jsxDEV("div", {
					className: "grid grid-cols-1 gap-2.5 sm:grid-cols-3",
					children: comparisons.map(({ plan, calc }) => {
						const isSelected = activePlan?.id === plan.id;
						return /* @__PURE__ */ jsxDEV("button", {
							type: "button",
							onClick: () => setSelectedPlanId(plan.id),
							className: `rounded-xl p-3.5 text-left transition-all ${isSelected ? "bg-[var(--ca-accent)]/12 ring-1 ring-[var(--ca-accent)]" : "bg-[var(--ca-surface-subtle)] hover:bg-[var(--ca-surface-subtle)]/80"}`,
							children: [
								/* @__PURE__ */ jsxDEV("div", {
									className: "flex items-center justify-between text-xs",
									children: [/* @__PURE__ */ jsxDEV("span", {
										className: "font-semibold text-[var(--ca-text)]",
										children: plan.label
									}, void 0, false, {
										fileName: _jsxFileName$14,
										lineNumber: 332,
										columnNumber: 23
									}, this), /* @__PURE__ */ jsxDEV("span", {
										className: "font-mono-nums font-semibold text-[var(--ca-accent)]",
										children: [plan.markupPercent, "%"]
									}, void 0, true, {
										fileName: _jsxFileName$14,
										lineNumber: 333,
										columnNumber: 23
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName$14,
									lineNumber: 331,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ jsxDEV("p", {
									className: "font-mono-nums mt-1.5 text-sm font-bold text-[var(--ca-text)]",
									children: formatPKR(calc.totalPayable)
								}, void 0, false, {
									fileName: _jsxFileName$14,
									lineNumber: 337,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ jsxDEV("p", {
									className: "font-mono-nums mt-0.5 text-[11px] text-[var(--ca-text-muted)]",
									children: [
										formatPKR(calc.monthlyAmount),
										" / mo · +",
										formatPKR(calc.markupAmount)
									]
								}, void 0, true, {
									fileName: _jsxFileName$14,
									lineNumber: 340,
									columnNumber: 21
								}, this)
							]
						}, plan.id, true, {
							fileName: _jsxFileName$14,
							lineNumber: 321,
							columnNumber: 19
						}, this);
					})
				}, void 0, false, {
					fileName: _jsxFileName$14,
					lineNumber: 317,
					columnNumber: 13
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$14,
				lineNumber: 266,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$14,
			lineNumber: 136,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$14,
		lineNumber: 98,
		columnNumber: 5
	}, this);
}
// src/components/SeoHead.tsx
function SeoHead({ title, description, canonicalPath, image, type = "website", noIndex = false, locale, productMeta, jsonLd }) {
	useEffect(() => {
		updateDocumentHead({
			title,
			description,
			canonicalPath,
			image,
			type,
			noIndex,
			locale,
			productMeta,
			jsonLd
		});
	}, [
		title,
		description,
		canonicalPath,
		image,
		type,
		noIndex,
		locale,
		productMeta,
		jsonLd
	]);
	return null;
}
// src/hooks/useScrollReveal.ts
function useScrollReveal() {
	const ref = useRef(null);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") {
			el.classList.add("ca-revealed");
			return;
		}
		const observer = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add("ca-revealed");
					observer.unobserve(entry.target);
				}
			});
		}, {
			threshold: .08,
			rootMargin: "0px 0px -24px 0px"
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, []);
	return ref;
}
// src/utils/catalogCategories.ts
/**
* Derives "Shop by Category" cards exclusively from real listed products.
* Categories with zero listed products are excluded, and each card uses the
* cover image of an actual listed product rather than static/seed stock art.
*/
function deriveActiveCategoryCards(categories, products) {
	if (!Array.isArray(products) || products.length === 0) return [];
	const byId = /* @__PURE__ */ new Map();
	const byName = /* @__PURE__ */ new Map();
	for (const cat of categories) {
		byId.set(cat.id, cat);
		byName.set(cat.name.trim().toLowerCase(), cat);
	}
	const buckets = /* @__PURE__ */ new Map();
	for (const product of products) {
		const matched = byId.get(product.categoryId) || byName.get((product.categoryName || "").trim().toLowerCase());
		const key = matched ? matched.id : product.categoryId || product.categoryName || "other";
		const name = matched?.name || product.categoryName || "Collection";
		const slug = matched?.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "collection";
		const existing = buckets.get(key);
		if (existing) existing.products.push(product);
		else buckets.set(key, {
			id: matched?.id || product.categoryId || key,
			name,
			slug,
			products: [product]
		});
	}
	const orderedCards = [];
	const seenKeys = /* @__PURE__ */ new Set();
	for (const cat of categories) {
		const bucket = buckets.get(cat.id);
		if (!bucket || bucket.products.length === 0) continue;
		seenKeys.add(cat.id);
		orderedCards.push({
			id: bucket.id,
			name: bucket.name,
			slug: bucket.slug,
			image: bucket.products[0].coverImage,
			productCount: bucket.products.length,
			latestProductTitle: bucket.products[0].title
		});
	}
	for (const [key, bucket] of buckets.entries()) {
		if (seenKeys.has(key) || bucket.products.length === 0) continue;
		orderedCards.push({
			id: bucket.id,
			name: bucket.name,
			slug: bucket.slug,
			image: bucket.products[0].coverImage,
			productCount: bucket.products.length,
			latestProductTitle: bucket.products[0].title
		});
	}
	return orderedCards;
}
// src/pages/HomePage.tsx
var _jsxFileName$13 = "/app/applet/src/pages/HomePage.tsx";
function HomePage({ onNetworkError }) {
	const { theme, toggleTheme } = useTheme();
	const { t, locale, isRtl, localize } = useLocale();
	const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;
	const catalogRevealRef = useScrollReveal();
	const installmentsRevealRef = useScrollReveal();
	const contactRevealRef = useScrollReveal();
	const { data, isLoading: loading, error: queryError, refetch } = useQuery({
		queryKey: ["home", "catalog"],
		queryFn: async () => {
			const [prods, cats, pls] = await Promise.all([
				productService.listProducts({ sort: "latest" }),
				productService.listCategories(),
				productService.listInstallmentPlans()
			]);
			return {
				allProducts: prods,
				featuredProducts: prods.slice(0, 6),
				categories: cats,
				plans: pls
			};
		}
	});
	const allProducts = data?.allProducts ?? [];
	const products = data?.featuredProducts ?? [];
	const categories = data?.categories ?? [];
	const plans = data?.plans ?? [];
	const activeCategoryCards = useMemo(() => deriveActiveCategoryCards(categories, allProducts), [categories, allProducts]);
	const error = queryError ? queryError instanceof Error ? queryError.message : "Could not load storefront catalog." : null;
	useEffect(() => {
		onNetworkError?.(error);
	}, [error, onNetworkError]);
	const origin = typeof window !== "undefined" ? window.location.origin : STORE_CONFIG.siteUrl;
	const homeJsonLd = useMemo(() => [
		buildOrganizationJsonLd(origin),
		buildWebSiteJsonLd(origin, locale),
		buildLocalBusinessJsonLd(origin),
		buildFaqPageJsonLd(locale)
	], [origin, locale]);
	return /* @__PURE__ */ jsxDEV(Fragment, { children: [
		/* @__PURE__ */ jsxDEV(SeoHead, {
			title: locale === "ur" ? "سنیماٹک آرٹس — ملبوسات، ان سٹچڈ سوٹ اور اقساط" : "Cinematic Arts (CA) — Clothing & PKR Installments",
			description: t.hero.subtitle,
			canonicalPath: localize("/"),
			locale,
			jsonLd: homeJsonLd
		}, void 0, false, {
			fileName: _jsxFileName$13,
			lineNumber: 90,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ jsxDEV("section", {
			className: "mx-auto max-w-6xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10",
			children: /* @__PURE__ */ jsxDEV("div", {
				className: "glass-panel overflow-hidden rounded-2xl p-6 sm:p-8 lg:p-10",
				children: [/* @__PURE__ */ jsxDEV("div", {
					className: "grid grid-cols-1 items-center gap-8 lg:grid-cols-12",
					children: [/* @__PURE__ */ jsxDEV("div", {
						className: "flex flex-col justify-between lg:col-span-5",
						children: [
							/* @__PURE__ */ jsxDEV("div", {
								className: "flex items-center justify-between gap-4",
								children: [/* @__PURE__ */ jsxDEV("span", {
									className: "text-xs font-medium text-[var(--ca-text-muted)]",
									children: t.locationShort
								}, void 0, false, {
									fileName: _jsxFileName$13,
									lineNumber: 108,
									columnNumber: 17
								}, this), /* @__PURE__ */ jsxDEV("button", {
									type: "button",
									onClick: toggleTheme,
									"aria-label": theme === "light" ? t.footer.darkMode : t.footer.lightMode,
									className: "inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] bg-[var(--ca-surface-subtle)] px-3.5 py-2 text-xs font-medium text-[var(--ca-text)] hover:opacity-85",
									children: [theme === "light" ? /* @__PURE__ */ jsxDEV(Moon, { className: "h-3.5 w-3.5" }, void 0, false, {
										fileName: _jsxFileName$13,
										lineNumber: 117,
										columnNumber: 40
									}, this) : /* @__PURE__ */ jsxDEV(Sun, { className: "h-3.5 w-3.5" }, void 0, false, {
										fileName: _jsxFileName$13,
										lineNumber: 117,
										columnNumber: 75
									}, this), /* @__PURE__ */ jsxDEV("span", { children: theme === "light" ? t.footer.darkMode : t.footer.lightMode }, void 0, false, {
										fileName: _jsxFileName$13,
										lineNumber: 118,
										columnNumber: 19
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName$13,
									lineNumber: 111,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$13,
								lineNumber: 107,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ jsxDEV("div", {
								className: "mt-6",
								children: [/* @__PURE__ */ jsxDEV("h1", {
									className: `font-display text-4xl font-semibold text-[var(--ca-text)] sm:text-5xl ${isRtl ? "leading-[1.85] sm:leading-[1.8]" : "leading-[1.1]"}`,
									children: t.hero.title
								}, void 0, false, {
									fileName: _jsxFileName$13,
									lineNumber: 123,
									columnNumber: 17
								}, this), /* @__PURE__ */ jsxDEV("p", {
									className: "mt-4 max-w-md text-base leading-relaxed text-[var(--ca-text-muted)]",
									children: t.hero.subtitle
								}, void 0, false, {
									fileName: _jsxFileName$13,
									lineNumber: 130,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$13,
								lineNumber: 122,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ jsxDEV("div", {
								className: "mt-8 flex flex-wrap items-center gap-3",
								children: [/* @__PURE__ */ jsxDEV(Link, {
									to: localize("/shop"),
									className: "btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-text)] px-6 py-3 text-sm font-semibold text-[var(--ca-bg)] hover:opacity-90",
									children: [t.hero.shopCollection, /* @__PURE__ */ jsxDEV(ArrowIcon, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName$13,
										lineNumber: 141,
										columnNumber: 19
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName$13,
									lineNumber: 136,
									columnNumber: 17
								}, this), /* @__PURE__ */ jsxDEV("a", {
									href: "#installments",
									className: "btn-press inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-surface-subtle)] px-5 py-3 text-sm font-medium text-[var(--ca-text)] hover:opacity-85",
									children: t.hero.installmentPlans
								}, void 0, false, {
									fileName: _jsxFileName$13,
									lineNumber: 143,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$13,
								lineNumber: 135,
								columnNumber: 15
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName$13,
						lineNumber: 106,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("div", {
						className: "lg:col-span-7",
						children: /* @__PURE__ */ jsxDEV("div", {
							className: "aspect-[4/3] w-full overflow-hidden rounded-xl bg-[var(--ca-surface-subtle)]",
							children: /* @__PURE__ */ jsxDEV(ResilientImage, {
								src: "/src/assets/images/womens_unstitched_suit_1795333234539.jpg",
								alt: "Women's unstitched embroidered 3-piece clothing fabric at Cinematic Arts Peshawar",
								width: 900,
								height: 675,
								priority: true,
								className: "h-full w-full object-cover"
							}, void 0, false, {
								fileName: _jsxFileName$13,
								lineNumber: 154,
								columnNumber: 17
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName$13,
							lineNumber: 153,
							columnNumber: 15
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName$13,
						lineNumber: 152,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$13,
					lineNumber: 105,
					columnNumber: 11
				}, this), /* @__PURE__ */ jsxDEV("div", {
					className: "mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3",
					children: [
						/* @__PURE__ */ jsxDEV("div", {
							className: "flex items-start gap-3",
							children: [/* @__PURE__ */ jsxDEV(Truck, { className: "mt-0.5 h-4 w-4 shrink-0 text-[var(--ca-accent)]" }, void 0, false, {
								fileName: _jsxFileName$13,
								lineNumber: 168,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("p", {
								className: "text-sm font-semibold text-[var(--ca-text)]",
								children: t.hero.codTitle
							}, void 0, false, {
								fileName: _jsxFileName$13,
								lineNumber: 170,
								columnNumber: 17
							}, this), /* @__PURE__ */ jsxDEV("p", {
								className: "mt-0.5 text-xs leading-relaxed text-[var(--ca-text-muted)]",
								children: t.hero.codDesc
							}, void 0, false, {
								fileName: _jsxFileName$13,
								lineNumber: 171,
								columnNumber: 17
							}, this)] }, void 0, true, {
								fileName: _jsxFileName$13,
								lineNumber: 169,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$13,
							lineNumber: 167,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "flex items-start gap-3",
							children: [/* @__PURE__ */ jsxDEV(CreditCard, { className: "mt-0.5 h-4 w-4 shrink-0 text-[var(--ca-accent)]" }, void 0, false, {
								fileName: _jsxFileName$13,
								lineNumber: 177,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("p", {
								className: "text-sm font-semibold text-[var(--ca-text)]",
								children: t.hero.plansTitle
							}, void 0, false, {
								fileName: _jsxFileName$13,
								lineNumber: 179,
								columnNumber: 17
							}, this), /* @__PURE__ */ jsxDEV("p", {
								className: "mt-0.5 text-xs leading-relaxed text-[var(--ca-text-muted)]",
								children: t.hero.plansDesc
							}, void 0, false, {
								fileName: _jsxFileName$13,
								lineNumber: 180,
								columnNumber: 17
							}, this)] }, void 0, true, {
								fileName: _jsxFileName$13,
								lineNumber: 178,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$13,
							lineNumber: 176,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "flex items-start gap-3",
							children: [/* @__PURE__ */ jsxDEV(ShieldCheck, { className: "mt-0.5 h-4 w-4 shrink-0 text-[var(--ca-accent)]" }, void 0, false, {
								fileName: _jsxFileName$13,
								lineNumber: 186,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("p", {
								className: "text-sm font-semibold text-[var(--ca-text)]",
								children: t.hero.exchangeTitle
							}, void 0, false, {
								fileName: _jsxFileName$13,
								lineNumber: 188,
								columnNumber: 17
							}, this), /* @__PURE__ */ jsxDEV("p", {
								className: "mt-0.5 text-xs leading-relaxed text-[var(--ca-text-muted)]",
								children: t.hero.exchangeDesc
							}, void 0, false, {
								fileName: _jsxFileName$13,
								lineNumber: 189,
								columnNumber: 17
							}, this)] }, void 0, true, {
								fileName: _jsxFileName$13,
								lineNumber: 187,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$13,
							lineNumber: 185,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName$13,
					lineNumber: 166,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$13,
				lineNumber: 104,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName$13,
			lineNumber: 103,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ jsxDEV("section", {
			ref: catalogRevealRef,
			className: "ca-reveal mx-auto max-w-6xl px-4 py-8 sm:px-6",
			children: [
				/* @__PURE__ */ jsxDEV("div", {
					className: "flex flex-wrap items-end justify-between gap-4",
					children: [/* @__PURE__ */ jsxDEV("h2", {
						className: "font-display text-3xl font-semibold text-[var(--ca-text)] sm:text-4xl",
						children: t.home.featuredProducts
					}, void 0, false, {
						fileName: _jsxFileName$13,
						lineNumber: 201,
						columnNumber: 11
					}, this), /* @__PURE__ */ jsxDEV(Link, {
						to: localize("/shop"),
						className: "inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-[var(--ca-accent)] hover:underline",
						children: [
							t.home.viewAllProducts,
							" ",
							/* @__PURE__ */ jsxDEV(ArrowIcon, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName$13,
								lineNumber: 208,
								columnNumber: 38
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName$13,
						lineNumber: 204,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$13,
					lineNumber: 200,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ jsxDEV("div", {
					className: "mt-6",
					children: loading ? /* @__PURE__ */ jsxDEV(ProductGridSkeleton, { count: 6 }, void 0, false, {
						fileName: _jsxFileName$13,
						lineNumber: 214,
						columnNumber: 13
					}, this) : error ? /* @__PURE__ */ jsxDEV(FriendlyErrorState, {
						title: "Could not load featured products",
						message: error,
						onRetry: () => refetch()
					}, void 0, false, {
						fileName: _jsxFileName$13,
						lineNumber: 216,
						columnNumber: 13
					}, this) : products.length === 0 ? /* @__PURE__ */ jsxDEV("div", {
						className: "glass-panel rounded-2xl p-8 text-center",
						children: [/* @__PURE__ */ jsxDEV("p", {
							className: "font-display text-xl font-semibold text-[var(--ca-text)]",
							children: t.home.noProductsTitle
						}, void 0, false, {
							fileName: _jsxFileName$13,
							lineNumber: 223,
							columnNumber: 15
						}, this), /* @__PURE__ */ jsxDEV("p", {
							className: "mt-1.5 text-sm text-[var(--ca-text-muted)]",
							children: t.home.noProductsDesc
						}, void 0, false, {
							fileName: _jsxFileName$13,
							lineNumber: 226,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$13,
						lineNumber: 222,
						columnNumber: 13
					}, this) : /* @__PURE__ */ jsxDEV("div", {
						className: "ca-fade-in grid grid-cols-2 gap-3 sm:gap-6",
						children: products.map((product) => /* @__PURE__ */ jsxDEV(ProductCard, { product }, product.id, false, {
							fileName: _jsxFileName$13,
							lineNumber: 233,
							columnNumber: 17
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName$13,
						lineNumber: 231,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName$13,
					lineNumber: 212,
					columnNumber: 9
				}, this),
				!loading && !error && activeCategoryCards.length > 0 && /* @__PURE__ */ jsxDEV("div", {
					className: "mt-16",
					children: [/* @__PURE__ */ jsxDEV("h3", {
						className: "font-display text-2xl font-semibold text-[var(--ca-text)] sm:text-3xl",
						children: t.home.shopByCategory
					}, void 0, false, {
						fileName: _jsxFileName$13,
						lineNumber: 242,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("div", {
						className: "mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4",
						children: activeCategoryCards.map((cat) => /* @__PURE__ */ jsxDEV(Link, {
							to: localize(`/category/${cat.slug}`),
							className: "glass-panel group overflow-hidden rounded-2xl p-2.5 transition-transform duration-200 hover:-translate-y-0.5 sm:p-3",
							children: [
								/* @__PURE__ */ jsxDEV("div", {
									className: "aspect-[4/3] overflow-hidden rounded-xl bg-[var(--ca-surface-subtle)]",
									children: /* @__PURE__ */ jsxDEV(ResilientImage, {
										src: cat.image,
										alt: `${cat.name} — ${cat.latestProductTitle || "Cinematic Arts"}`,
										width: 400,
										height: 300,
										className: "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
									}, void 0, false, {
										fileName: _jsxFileName$13,
										lineNumber: 253,
										columnNumber: 21
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName$13,
									lineNumber: 252,
									columnNumber: 19
								}, this),
								/* @__PURE__ */ jsxDEV("p", {
									className: "mt-2.5 text-sm font-semibold text-[var(--ca-text)]",
									children: cat.name
								}, void 0, false, {
									fileName: _jsxFileName$13,
									lineNumber: 261,
									columnNumber: 19
								}, this),
								/* @__PURE__ */ jsxDEV("p", {
									className: "mt-0.5 line-clamp-1 text-xs text-[var(--ca-text-muted)]",
									children: [
										cat.productCount,
										" ",
										cat.productCount === 1 ? "product" : "products",
										" ·",
										" ",
										cat.latestProductTitle
									]
								}, void 0, true, {
									fileName: _jsxFileName$13,
									lineNumber: 264,
									columnNumber: 19
								}, this)
							]
						}, cat.id, true, {
							fileName: _jsxFileName$13,
							lineNumber: 247,
							columnNumber: 17
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName$13,
						lineNumber: 245,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$13,
					lineNumber: 241,
					columnNumber: 11
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName$13,
			lineNumber: 199,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ jsxDEV("section", {
			ref: installmentsRevealRef,
			id: "installments",
			className: "ca-reveal mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6",
			children: [/* @__PURE__ */ jsxDEV("div", {
				className: "grid grid-cols-1 gap-6 lg:grid-cols-2",
				children: [/* @__PURE__ */ jsxDEV("div", {
					className: "glass-panel flex flex-col justify-between rounded-2xl p-6 sm:p-8",
					children: [/* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("h2", {
						className: "font-display text-3xl font-semibold text-[var(--ca-text)]",
						children: t.home.aboutTitle
					}, void 0, false, {
						fileName: _jsxFileName$13,
						lineNumber: 280,
						columnNumber: 15
					}, this), /* @__PURE__ */ jsxDEV("p", {
						className: "mt-4 text-sm leading-relaxed text-[var(--ca-text-muted)]",
						children: t.home.aboutBody
					}, void 0, false, {
						fileName: _jsxFileName$13,
						lineNumber: 283,
						columnNumber: 15
					}, this)] }, void 0, true, {
						fileName: _jsxFileName$13,
						lineNumber: 279,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("div", {
						className: "mt-5 flex flex-wrap gap-4 text-xs font-medium",
						children: [
							/* @__PURE__ */ jsxDEV(Link, {
								to: localize("/about"),
								className: "inline-flex min-h-[36px] items-center text-[var(--ca-accent)] hover:underline",
								children: t.home.readStory
							}, void 0, false, {
								fileName: _jsxFileName$13,
								lineNumber: 288,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ jsxDEV(Link, {
								to: localize("/size-guide"),
								className: "inline-flex min-h-[36px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)] hover:underline",
								children: t.nav.sizeGuide
							}, void 0, false, {
								fileName: _jsxFileName$13,
								lineNumber: 291,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ jsxDEV(Link, {
								to: localize("/shipping"),
								className: "inline-flex min-h-[36px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)] hover:underline",
								children: t.nav.shipping
							}, void 0, false, {
								fileName: _jsxFileName$13,
								lineNumber: 294,
								columnNumber: 15
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName$13,
						lineNumber: 287,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$13,
					lineNumber: 278,
					columnNumber: 11
				}, this), /* @__PURE__ */ jsxDEV("div", {
					className: "glass-panel flex flex-col justify-between rounded-2xl p-6 sm:p-8",
					children: [/* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("h2", {
						className: "font-display text-3xl font-semibold text-[var(--ca-text)]",
						children: t.home.howInstallmentsTitle
					}, void 0, false, {
						fileName: _jsxFileName$13,
						lineNumber: 302,
						columnNumber: 15
					}, this), /* @__PURE__ */ jsxDEV("ul", {
						className: "mt-4 space-y-3 text-sm leading-relaxed text-[var(--ca-text-muted)]",
						children: [
							/* @__PURE__ */ jsxDEV("li", { children: [/* @__PURE__ */ jsxDEV("strong", {
								className: "text-[var(--ca-text)]",
								children: "Pick a schedule:"
							}, void 0, false, {
								fileName: _jsxFileName$13,
								lineNumber: 307,
								columnNumber: 19
							}, this), " Choose a 2-month (15%), 3-month (25%), or 4-month (40% interest) plan to see your exact monthly amount in PKR."] }, void 0, true, {
								fileName: _jsxFileName$13,
								lineNumber: 306,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ jsxDEV("li", { children: [
								/* @__PURE__ */ jsxDEV("strong", {
									className: "text-[var(--ca-text)]",
									children: "Add a Seller Referral ID:"
								}, void 0, false, {
									fileName: _jsxFileName$13,
									lineNumber: 312,
									columnNumber: 19
								}, this),
								" Enter a verified seller code (such as",
								" ",
								/* @__PURE__ */ jsxDEV("span", {
									className: "font-mono-nums font-medium text-[var(--ca-text)]",
									children: "CA-XXXXXX"
								}, void 0, false, {
									fileName: _jsxFileName$13,
									lineNumber: 314,
									columnNumber: 19
								}, this),
								") when ordering on installments, or check out with Cash on Delivery without a code."
							] }, void 0, true, {
								fileName: _jsxFileName$13,
								lineNumber: 311,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ jsxDEV("li", { children: [/* @__PURE__ */ jsxDEV("strong", {
								className: "text-[var(--ca-text)]",
								children: "Follow each payment:"
							}, void 0, false, {
								fileName: _jsxFileName$13,
								lineNumber: 318,
								columnNumber: 19
							}, this), " Check shipping progress and paid versus remaining installments anytime inside My Orders."] }, void 0, true, {
								fileName: _jsxFileName$13,
								lineNumber: 317,
								columnNumber: 17
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName$13,
						lineNumber: 305,
						columnNumber: 15
					}, this)] }, void 0, true, {
						fileName: _jsxFileName$13,
						lineNumber: 301,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("div", {
						className: "mt-5",
						children: /* @__PURE__ */ jsxDEV(Link, {
							to: localize("/faq"),
							className: "inline-flex min-h-[36px] items-center text-xs font-medium text-[var(--ca-accent)] hover:underline",
							children: t.home.readFaq
						}, void 0, false, {
							fileName: _jsxFileName$13,
							lineNumber: 324,
							columnNumber: 15
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName$13,
						lineNumber: 323,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$13,
					lineNumber: 300,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$13,
				lineNumber: 277,
				columnNumber: 9
			}, this), /* @__PURE__ */ jsxDEV(InstallmentCalculator, {
				products: allProducts,
				plans
			}, void 0, false, {
				fileName: _jsxFileName$13,
				lineNumber: 331,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$13,
			lineNumber: 276,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ jsxDEV("section", {
			ref: contactRevealRef,
			id: "contact",
			className: "ca-reveal mx-auto max-w-6xl px-4 pt-2 pb-16 sm:px-6",
			children: /* @__PURE__ */ jsxDEV("div", {
				className: "glass-panel flex flex-col items-start justify-between gap-6 rounded-2xl p-6 sm:flex-row sm:items-center sm:p-8",
				children: [/* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("h2", {
					className: "font-display text-3xl font-semibold text-[var(--ca-text)]",
					children: t.home.needHelpTitle
				}, void 0, false, {
					fileName: _jsxFileName$13,
					lineNumber: 338,
					columnNumber: 13
				}, this), /* @__PURE__ */ jsxDEV("p", {
					className: "mt-1.5 text-sm text-[var(--ca-text-muted)]",
					children: t.home.needHelpSubtitle
				}, void 0, false, {
					fileName: _jsxFileName$13,
					lineNumber: 341,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName$13,
					lineNumber: 337,
					columnNumber: 11
				}, this), /* @__PURE__ */ jsxDEV("div", {
					className: "flex flex-wrap gap-3",
					children: [
						/* @__PURE__ */ jsxDEV("a", {
							href: `mailto:${STORE_CONFIG.email}`,
							className: "btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-surface-subtle)] px-4 py-2.5 text-xs font-semibold text-[var(--ca-text)] hover:opacity-85",
							children: [/* @__PURE__ */ jsxDEV(Mail, { className: "h-3.5 w-3.5 text-[var(--ca-accent)]" }, void 0, false, {
								fileName: _jsxFileName$13,
								lineNumber: 351,
								columnNumber: 15
							}, this), t.home.emailUs]
						}, void 0, true, {
							fileName: _jsxFileName$13,
							lineNumber: 347,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("a", {
							href: `tel:${STORE_CONFIG.phoneDisplay}`,
							className: "btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-surface-subtle)] px-4 py-2.5 text-xs font-semibold text-[var(--ca-text)] hover:opacity-85",
							children: [/* @__PURE__ */ jsxDEV(Phone, { className: "h-3.5 w-3.5 text-[var(--ca-accent)]" }, void 0, false, {
								fileName: _jsxFileName$13,
								lineNumber: 358,
								columnNumber: 15
							}, this), STORE_CONFIG.phoneDisplay]
						}, void 0, true, {
							fileName: _jsxFileName$13,
							lineNumber: 354,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("a", {
							href: STORE_CONFIG.whatsappUrl,
							target: "_blank",
							rel: "noopener noreferrer",
							className: "btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-text)] px-4 py-2.5 text-xs font-semibold text-[var(--ca-bg)] hover:opacity-90",
							children: [/* @__PURE__ */ jsxDEV(MessageCircle, { className: "h-3.5 w-3.5" }, void 0, false, {
								fileName: _jsxFileName$13,
								lineNumber: 367,
								columnNumber: 15
							}, this), t.home.whatsapp]
						}, void 0, true, {
							fileName: _jsxFileName$13,
							lineNumber: 361,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName$13,
					lineNumber: 346,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$13,
				lineNumber: 336,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName$13,
			lineNumber: 335,
			columnNumber: 7
		}, this)
	] }, void 0, true, {
		fileName: _jsxFileName$13,
		lineNumber: 89,
		columnNumber: 5
	}, this);
}
// src/components/Breadcrumbs.tsx
var _jsxFileName$12 = "/app/applet/src/components/Breadcrumbs.tsx";
function Breadcrumbs({ items }) {
	const { isRtl } = useLocale();
	if (items.length === 0) return null;
	return /* @__PURE__ */ jsxDEV("nav", {
		"aria-label": "Breadcrumb",
		className: "mb-5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--ca-text-muted)]",
		children: items.map((item, idx) => {
			const isLast = idx === items.length - 1;
			return /* @__PURE__ */ jsxDEV("span", {
				className: "inline-flex items-center gap-1.5",
				children: [idx > 0 && /* @__PURE__ */ jsxDEV(ChevronRight, {
					"aria-hidden": "true",
					className: `h-3.5 w-3.5 opacity-60 ${isRtl ? "rotate-180" : ""}`
				}, void 0, false, {
					fileName: _jsxFileName$12,
					lineNumber: 22,
					columnNumber: 15
				}, this), item.to && !isLast ? /* @__PURE__ */ jsxDEV(Link, {
					to: item.to,
					className: "inline-flex min-h-[32px] items-center hover:text-[var(--ca-text)] hover:underline",
					children: item.label
				}, void 0, false, {
					fileName: _jsxFileName$12,
					lineNumber: 28,
					columnNumber: 15
				}, this) : /* @__PURE__ */ jsxDEV("span", {
					"aria-current": isLast ? "page" : void 0,
					className: isLast ? "font-medium text-[var(--ca-text)]" : "",
					children: item.label
				}, void 0, false, {
					fileName: _jsxFileName$12,
					lineNumber: 35,
					columnNumber: 15
				}, this)]
			}, `${item.label}-${idx}`, true, {
				fileName: _jsxFileName$12,
				lineNumber: 20,
				columnNumber: 11
			}, this);
		})
	}, void 0, false, {
		fileName: _jsxFileName$12,
		lineNumber: 16,
		columnNumber: 5
	}, this);
}
// src/pages/ShopPage.tsx
var _jsxFileName$11 = "/app/applet/src/pages/ShopPage.tsx";
var PAGE_SIZE = 12;
function ShopPage({ onNetworkError }) {
	const { t, locale, localize } = useLocale();
	const [searchParams, setSearchParams] = useSearchParams();
	const initialQuery = sanitizePlainText(searchParams.get("q") || "", 80);
	const initialCat = sanitizePlainText(searchParams.get("category") || "all", 60) || "all";
	const [search, setSearch] = useState(initialQuery);
	const [debouncedSearch, setDebouncedSearch] = useState(initialQuery);
	const [categoryId, setCategoryId] = useState(initialCat);
	const [sort, setSort] = useState("latest");
	const [page, setPage] = useState(1);
	const [showCalculator, setShowCalculator] = useState(false);
	const gridRevealRef = useScrollReveal();
	useEffect(() => {
		const timer = window.setTimeout(() => {
			setDebouncedSearch(sanitizePlainText(search, 80));
			setPage(1);
		}, 300);
		return () => window.clearTimeout(timer);
	}, [search]);
	const { data: categories = [] } = useQuery({
		queryKey: ["categories"],
		queryFn: () => productService.listCategories()
	});
	const { data: products = [], isLoading: loading, error: queryError, refetch } = useQuery({
		queryKey: ["products", {
			categoryId,
			search: debouncedSearch,
			sort
		}],
		queryFn: () => productService.listProducts({
			categoryId,
			search: debouncedSearch,
			sort
		})
	});
	const error = queryError ? queryError instanceof Error ? queryError.message : "Unable to load products." : null;
	useEffect(() => {
		onNetworkError?.(error);
	}, [error, onNetworkError]);
	const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
	const safePage = Math.min(page, totalPages);
	const visibleProducts = useMemo(() => products.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [products, safePage]);
	const handleCategoryChange = (nextCat) => {
		const sanitized = sanitizePlainText(nextCat, 60) || "all";
		setCategoryId(sanitized);
		setPage(1);
		const next = new URLSearchParams(searchParams);
		if (sanitized === "all") next.delete("category");
		else next.set("category", sanitized);
		setSearchParams(next, { replace: true });
	};
	const activeCategory = useMemo(() => categoryId !== "all" ? categories.find((c) => c.id === categoryId) : void 0, [categories, categoryId]);
	const origin = typeof window !== "undefined" ? window.location.origin : STORE_CONFIG.siteUrl;
	const shopSeoTitle = activeCategory ? `${activeCategory.name} — ${t.brand}` : locale === "ur" ? `مکمل کلیکشن — ${t.brand}` : "Shop Clothing & Accessories in PKR — Cinematic Arts";
	const shopSeoDescription = activeCategory ? t.category.intros[activeCategory.slug] || `Browse ${activeCategory.name} from Cinematic Arts in PKR with Cash on Delivery and monthly installments.` : t.hero.subtitle;
	const shopCanonicalPath = localize(categoryId !== "all" ? `/shop?category=${encodeURIComponent(categoryId)}` : "/shop");
	return /* @__PURE__ */ jsxDEV(Fragment, { children: [/* @__PURE__ */ jsxDEV(SeoHead, {
		title: shopSeoTitle,
		description: shopSeoDescription,
		canonicalPath: shopCanonicalPath,
		locale,
		jsonLd: [buildOrganizationJsonLd(origin), buildBreadcrumbJsonLd([{
			name: t.nav.home,
			path: localize("/")
		}, {
			name: t.nav.shop,
			path: localize("/shop")
		}], origin)]
	}, void 0, false, {
		fileName: _jsxFileName$11,
		lineNumber: 116,
		columnNumber: 7
	}, this), /* @__PURE__ */ jsxDEV("section", {
		className: "mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12",
		children: [
			/* @__PURE__ */ jsxDEV(Breadcrumbs, { items: [{
				label: t.nav.home,
				to: localize("/")
			}, { label: t.nav.shop }] }, void 0, false, {
				fileName: _jsxFileName$11,
				lineNumber: 134,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV("div", {
				className: "flex flex-col justify-between gap-4 sm:flex-row sm:items-end",
				children: [/* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("h1", {
					className: "font-display text-4xl font-semibold text-[var(--ca-text)]",
					children: t.shop.heading
				}, void 0, false, {
					fileName: _jsxFileName$11,
					lineNumber: 143,
					columnNumber: 13
				}, this), /* @__PURE__ */ jsxDEV("p", {
					className: "mt-1 text-xs text-[var(--ca-text-muted)]",
					children: t.shop.subtitle
				}, void 0, false, {
					fileName: _jsxFileName$11,
					lineNumber: 146,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName$11,
					lineNumber: 142,
					columnNumber: 11
				}, this), /* @__PURE__ */ jsxDEV("div", {
					className: "flex flex-col gap-3 sm:flex-row sm:items-center",
					children: [
						/* @__PURE__ */ jsxDEV("div", {
							className: "relative w-full sm:w-64",
							children: [/* @__PURE__ */ jsxDEV(Search, { className: "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ca-text-muted)]" }, void 0, false, {
								fileName: _jsxFileName$11,
								lineNumber: 153,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("input", {
								type: "search",
								maxLength: 80,
								value: search,
								onChange: (e) => setSearch(e.target.value),
								"aria-label": "Search products",
								placeholder: t.shop.searchPlaceholder,
								className: "w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] py-2.5 pl-10 pr-3.5 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
							}, void 0, false, {
								fileName: _jsxFileName$11,
								lineNumber: 154,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$11,
							lineNumber: 152,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "inline-flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2.5 sm:w-auto",
							children: [/* @__PURE__ */ jsxDEV(SlidersHorizontal, { className: "h-3.5 w-3.5 text-[var(--ca-text-muted)]" }, void 0, false, {
								fileName: _jsxFileName$11,
								lineNumber: 166,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("select", {
								value: sort,
								onChange: (e) => {
									setSort(e.target.value);
									setPage(1);
								},
								"aria-label": "Sort products",
								className: "bg-transparent text-xs font-medium text-[var(--ca-text)] focus:outline-none",
								children: [
									/* @__PURE__ */ jsxDEV("option", {
										value: "latest",
										children: t.shop.sortLatest
									}, void 0, false, {
										fileName: _jsxFileName$11,
										lineNumber: 176,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("option", {
										value: "price_asc",
										children: t.shop.sortPriceAsc
									}, void 0, false, {
										fileName: _jsxFileName$11,
										lineNumber: 177,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("option", {
										value: "price_desc",
										children: t.shop.sortPriceDesc
									}, void 0, false, {
										fileName: _jsxFileName$11,
										lineNumber: 178,
										columnNumber: 17
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName$11,
								lineNumber: 167,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$11,
							lineNumber: 165,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("button", {
							type: "button",
							onClick: () => setShowCalculator((v) => !v),
							"aria-expanded": showCalculator,
							className: `btn-press inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors sm:w-auto whitespace-nowrap ${showCalculator ? "border-[var(--ca-accent)] bg-[var(--ca-accent)] text-[var(--ca-accent-fg)]" : "border-[var(--ca-border)] bg-[var(--ca-surface-solid)] text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]"}`,
							children: [/* @__PURE__ */ jsxDEV(Calculator, { className: "h-3.5 w-3.5" }, void 0, false, {
								fileName: _jsxFileName$11,
								lineNumber: 192,
								columnNumber: 15
							}, this), showCalculator ? t.shop.hideCalc : t.shop.installmentCalc]
						}, void 0, true, {
							fileName: _jsxFileName$11,
							lineNumber: 182,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName$11,
					lineNumber: 151,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$11,
				lineNumber: 141,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV("div", {
				role: "tablist",
				"aria-label": "Product Categories",
				className: "mt-6 flex flex-wrap gap-1.5 rounded-xl bg-[var(--ca-surface-subtle)] p-1.5",
				children: [/* @__PURE__ */ jsxDEV("button", {
					type: "button",
					role: "tab",
					"aria-selected": categoryId === "all",
					onClick: () => handleCategoryChange("all"),
					className: `btn-press min-h-[44px] rounded-xl px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${categoryId === "all" ? "bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm" : "text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"}`,
					children: t.shop.allItems
				}, void 0, false, {
					fileName: _jsxFileName$11,
					lineNumber: 204,
					columnNumber: 11
				}, this), categories.map((c) => /* @__PURE__ */ jsxDEV("button", {
					type: "button",
					role: "tab",
					"aria-selected": categoryId === c.id,
					onClick: () => handleCategoryChange(c.id),
					className: `btn-press min-h-[44px] rounded-xl px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${categoryId === c.id ? "bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm" : "text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"}`,
					children: c.name
				}, c.id, false, {
					fileName: _jsxFileName$11,
					lineNumber: 218,
					columnNumber: 13
				}, this))]
			}, void 0, true, {
				fileName: _jsxFileName$11,
				lineNumber: 199,
				columnNumber: 9
			}, this),
			categories.length > 0 && /* @__PURE__ */ jsxDEV("div", {
				className: "mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--ca-text-muted)]",
				children: categories.map((c) => /* @__PURE__ */ jsxDEV(Link, {
					to: localize(`/category/${c.slug}`),
					className: "hover:text-[var(--ca-text)] hover:underline",
					children: c.name
				}, c.id, false, {
					fileName: _jsxFileName$11,
					lineNumber: 239,
					columnNumber: 15
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName$11,
				lineNumber: 237,
				columnNumber: 11
			}, this),
			showCalculator && /* @__PURE__ */ jsxDEV("div", {
				className: "mt-6",
				children: /* @__PURE__ */ jsxDEV(InstallmentCalculator, { products }, void 0, false, {
					fileName: _jsxFileName$11,
					lineNumber: 252,
					columnNumber: 13
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$11,
				lineNumber: 251,
				columnNumber: 11
			}, this),
			/* @__PURE__ */ jsxDEV("div", {
				ref: gridRevealRef,
				className: "ca-reveal mt-8",
				children: loading ? /* @__PURE__ */ jsxDEV(ProductGridSkeleton, { count: 6 }, void 0, false, {
					fileName: _jsxFileName$11,
					lineNumber: 259,
					columnNumber: 13
				}, this) : error ? /* @__PURE__ */ jsxDEV(FriendlyErrorState, {
					title: "Could not load catalog",
					message: error,
					onRetry: () => refetch()
				}, void 0, false, {
					fileName: _jsxFileName$11,
					lineNumber: 261,
					columnNumber: 13
				}, this) : products.length === 0 ? /* @__PURE__ */ jsxDEV("div", {
					className: "ca-fade-in glass-panel rounded-2xl p-12 text-center",
					children: [
						/* @__PURE__ */ jsxDEV("h2", {
							className: "font-display text-2xl font-semibold text-[var(--ca-text)]",
							children: t.shop.noMatchTitle
						}, void 0, false, {
							fileName: _jsxFileName$11,
							lineNumber: 268,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ jsxDEV("p", {
							className: "mt-2 text-sm text-[var(--ca-text-muted)]",
							children: t.shop.noMatchDesc
						}, void 0, false, {
							fileName: _jsxFileName$11,
							lineNumber: 271,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ jsxDEV("button", {
							type: "button",
							onClick: () => {
								setSearch("");
								setDebouncedSearch("");
								handleCategoryChange("all");
							},
							className: "btn-press mt-5 min-h-[44px] rounded-xl bg-[var(--ca-surface-subtle)] px-5 py-2 text-xs font-semibold text-[var(--ca-text)] hover:opacity-85",
							children: t.shop.resetFilters
						}, void 0, false, {
							fileName: _jsxFileName$11,
							lineNumber: 274,
							columnNumber: 15
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName$11,
					lineNumber: 267,
					columnNumber: 13
				}, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [/* @__PURE__ */ jsxDEV("div", {
					className: "ca-fade-in grid grid-cols-2 gap-3 sm:gap-6",
					children: visibleProducts.map((product) => /* @__PURE__ */ jsxDEV(ProductCard, { product }, product.id, false, {
						fileName: _jsxFileName$11,
						lineNumber: 290,
						columnNumber: 19
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName$11,
					lineNumber: 288,
					columnNumber: 15
				}, this), totalPages > 1 && /* @__PURE__ */ jsxDEV("nav", {
					"aria-label": "Catalog pagination",
					className: "glass-panel mt-8 flex items-center justify-between rounded-2xl px-4 py-3 text-xs",
					children: [
						/* @__PURE__ */ jsxDEV("button", {
							type: "button",
							disabled: safePage <= 1,
							onClick: () => {
								setPage((p) => Math.max(1, p - 1));
								window.scrollTo({
									top: 0,
									behavior: "smooth"
								});
							},
							className: "btn-press inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-[var(--ca-border)] px-3 py-1.5 font-semibold disabled:opacity-40",
							children: [/* @__PURE__ */ jsxDEV(ChevronLeft, { className: "h-3.5 w-3.5" }, void 0, false, {
								fileName: _jsxFileName$11,
								lineNumber: 308,
								columnNumber: 21
							}, this), t.shop.previous]
						}, void 0, true, {
							fileName: _jsxFileName$11,
							lineNumber: 299,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ jsxDEV("span", {
							className: "font-mono-nums text-[var(--ca-text-muted)]",
							children: [
								"Page ",
								/* @__PURE__ */ jsxDEV("strong", {
									className: "text-[var(--ca-text)]",
									children: safePage
								}, void 0, false, {
									fileName: _jsxFileName$11,
									lineNumber: 313,
									columnNumber: 26
								}, this),
								" of ",
								totalPages,
								" (",
								products.length,
								" items)"
							]
						}, void 0, true, {
							fileName: _jsxFileName$11,
							lineNumber: 312,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ jsxDEV("button", {
							type: "button",
							disabled: safePage >= totalPages,
							onClick: () => {
								setPage((p) => Math.min(totalPages, p + 1));
								window.scrollTo({
									top: 0,
									behavior: "smooth"
								});
							},
							className: "btn-press inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-[var(--ca-border)] px-3 py-1.5 font-semibold disabled:opacity-40",
							children: [t.shop.next, /* @__PURE__ */ jsxDEV(ChevronRight, { className: "h-3.5 w-3.5" }, void 0, false, {
								fileName: _jsxFileName$11,
								lineNumber: 326,
								columnNumber: 21
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$11,
							lineNumber: 316,
							columnNumber: 19
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName$11,
					lineNumber: 295,
					columnNumber: 17
				}, this)] }, void 0, true, {
					fileName: _jsxFileName$11,
					lineNumber: 287,
					columnNumber: 13
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$11,
				lineNumber: 257,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$11,
		lineNumber: 133,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName$11,
		lineNumber: 115,
		columnNumber: 5
	}, this);
}
// src/pages/CategoryPage.tsx
var _jsxFileName$10 = "/app/applet/src/pages/CategoryPage.tsx";
function CategoryPage() {
	const { slug = "" } = useParams();
	const { t, locale, localize } = useLocale();
	const slugValid = useMemo(() => urlSlugSchema.safeParse(slug).success, [slug]);
	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ["category", slug],
		enabled: slugValid,
		queryFn: async () => {
			const [categories, allProducts] = await Promise.all([productService.listCategories(), productService.listProducts({ sort: "latest" })]);
			return {
				categories,
				allProducts
			};
		}
	});
	const categories = data?.categories ?? [];
	const allProducts = data?.allProducts ?? [];
	const matchedCategory = useMemo(() => {
		const clean = slug.toLowerCase();
		return categories.find((c) => c.slug.toLowerCase() === clean || c.id.toLowerCase() === clean || c.id.toLowerCase() === `cat-${clean}`) || null;
	}, [categories, slug]);
	const filteredProducts = useMemo(() => {
		if (!matchedCategory) return [];
		return allProducts.filter((p) => p.categoryId === matchedCategory.id || p.categoryName.trim().toLowerCase() === matchedCategory.name.trim().toLowerCase());
	}, [allProducts, matchedCategory]);
	const origin = typeof window !== "undefined" ? window.location.origin : STORE_CONFIG.siteUrl;
	if (!slugValid || !isLoading && !error && !matchedCategory) return /* @__PURE__ */ jsxDEV(Fragment, { children: [/* @__PURE__ */ jsxDEV(SeoHead, {
		title: `Category Not Found — ${t.brand}`,
		description: "This product category was not found.",
		canonicalPath: localize(`/category/${slug}`),
		locale,
		noIndex: true
	}, void 0, false, {
		fileName: _jsxFileName$10,
		lineNumber: 66,
		columnNumber: 9
	}, this), /* @__PURE__ */ jsxDEV("section", {
		className: "mx-auto max-w-3xl px-4 py-16 text-center",
		children: [
			/* @__PURE__ */ jsxDEV("h1", {
				className: "font-display text-3xl font-semibold text-[var(--ca-text)]",
				children: t.notFound.heading
			}, void 0, false, {
				fileName: _jsxFileName$10,
				lineNumber: 74,
				columnNumber: 11
			}, this),
			/* @__PURE__ */ jsxDEV("p", {
				className: "mt-2 text-sm text-[var(--ca-text-muted)]",
				children: t.category.emptyDesc
			}, void 0, false, {
				fileName: _jsxFileName$10,
				lineNumber: 77,
				columnNumber: 11
			}, this),
			/* @__PURE__ */ jsxDEV(Link, {
				to: localize("/shop"),
				className: "btn-press mt-6 inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-text)] px-6 py-3 text-sm font-semibold text-[var(--ca-bg)]",
				children: t.category.browseAllCta
			}, void 0, false, {
				fileName: _jsxFileName$10,
				lineNumber: 80,
				columnNumber: 11
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$10,
		lineNumber: 73,
		columnNumber: 9
	}, this)] }, void 0, true, {
		fileName: _jsxFileName$10,
		lineNumber: 65,
		columnNumber: 7
	}, this);
	const displayCategory = matchedCategory || {
		id: `cat-${slug}`,
		name: formatSlugAsTitle(slug),
		slug,
		description: t.category.intros[slug] || t.category.fallbackIntro(formatSlugAsTitle(slug)),
		image: ""
	};
	const categorySeo = buildCategorySeoConfig(displayCategory, origin, locale);
	const introText = t.category.intros[displayCategory.slug] || displayCategory.description || t.category.fallbackIntro(displayCategory.name);
	return /* @__PURE__ */ jsxDEV(Fragment, { children: [/* @__PURE__ */ jsxDEV(SeoHead, { ...categorySeo }, void 0, false, {
		fileName: _jsxFileName$10,
		lineNumber: 107,
		columnNumber: 7
	}, this), /* @__PURE__ */ jsxDEV("section", {
		className: "mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12",
		children: [
			/* @__PURE__ */ jsxDEV(Breadcrumbs, { items: [
				{
					label: t.nav.home,
					to: localize("/")
				},
				{
					label: t.category.breadcrumbShop,
					to: localize("/shop")
				},
				{ label: displayCategory.name }
			] }, void 0, false, {
				fileName: _jsxFileName$10,
				lineNumber: 110,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV("div", {
				className: "glass-panel rounded-2xl p-6 sm:p-8",
				children: [/* @__PURE__ */ jsxDEV("div", {
					className: "flex flex-col justify-between gap-4 sm:flex-row sm:items-end",
					children: [/* @__PURE__ */ jsxDEV("div", { children: [
						/* @__PURE__ */ jsxDEV("h1", {
							className: "font-display text-4xl font-semibold text-[var(--ca-text)] sm:text-5xl",
							children: displayCategory.name
						}, void 0, false, {
							fileName: _jsxFileName$10,
							lineNumber: 121,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ jsxDEV("p", {
							className: "mt-2 max-w-2xl text-sm leading-relaxed text-[var(--ca-text-muted)] sm:text-base",
							children: introText
						}, void 0, false, {
							fileName: _jsxFileName$10,
							lineNumber: 124,
							columnNumber: 15
						}, this),
						!isLoading && !error && /* @__PURE__ */ jsxDEV("p", {
							className: "mt-2 text-xs font-medium text-[var(--ca-accent)]",
							children: t.category.itemsCountLabel(filteredProducts.length)
						}, void 0, false, {
							fileName: _jsxFileName$10,
							lineNumber: 128,
							columnNumber: 17
						}, this)
					] }, void 0, true, {
						fileName: _jsxFileName$10,
						lineNumber: 120,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV(Link, {
						to: localize("/size-guide"),
						className: "btn-press inline-flex min-h-[44px] shrink-0 items-center rounded-xl bg-[var(--ca-surface-subtle)] px-4 py-2.5 text-xs font-semibold text-[var(--ca-text)] hover:opacity-85",
						children: t.category.sizeGuideCta
					}, void 0, false, {
						fileName: _jsxFileName$10,
						lineNumber: 134,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$10,
					lineNumber: 119,
					columnNumber: 11
				}, this), categories.length > 0 && /* @__PURE__ */ jsxDEV("nav", {
					"aria-label": t.category.allCategories,
					className: "mt-6 flex flex-wrap gap-2",
					children: categories.map((cat) => /* @__PURE__ */ jsxDEV(Link, {
						to: localize(`/category/${cat.slug}`),
						className: `btn-press inline-flex min-h-[40px] items-center rounded-[10px] px-3.5 py-1.5 text-xs font-medium transition-colors ${cat.slug === displayCategory.slug ? "bg-[var(--ca-text)] text-[var(--ca-bg)]" : "bg-[var(--ca-surface-subtle)] text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"}`,
						children: cat.name
					}, cat.id, false, {
						fileName: _jsxFileName$10,
						lineNumber: 145,
						columnNumber: 17
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName$10,
					lineNumber: 143,
					columnNumber: 13
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$10,
				lineNumber: 118,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV("div", {
				className: "mt-8",
				children: isLoading ? /* @__PURE__ */ jsxDEV(ProductGridSkeleton, { count: 4 }, void 0, false, {
					fileName: _jsxFileName$10,
					lineNumber: 163,
					columnNumber: 13
				}, this) : error ? /* @__PURE__ */ jsxDEV(FriendlyErrorState, {
					title: "Could not load category",
					message: error instanceof Error ? error.message : "Failed to load category items.",
					onRetry: () => refetch()
				}, void 0, false, {
					fileName: _jsxFileName$10,
					lineNumber: 165,
					columnNumber: 13
				}, this) : filteredProducts.length === 0 ? /* @__PURE__ */ jsxDEV("div", {
					className: "glass-panel rounded-2xl p-10 text-center",
					children: [
						/* @__PURE__ */ jsxDEV("h2", {
							className: "font-display text-2xl font-semibold text-[var(--ca-text)]",
							children: t.category.emptyTitle
						}, void 0, false, {
							fileName: _jsxFileName$10,
							lineNumber: 172,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ jsxDEV("p", {
							className: "mt-2 text-sm text-[var(--ca-text-muted)]",
							children: t.category.emptyDesc
						}, void 0, false, {
							fileName: _jsxFileName$10,
							lineNumber: 175,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ jsxDEV(Link, {
							to: localize("/shop"),
							className: "btn-press mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-bg)]",
							children: t.category.browseAllCta
						}, void 0, false, {
							fileName: _jsxFileName$10,
							lineNumber: 178,
							columnNumber: 15
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName$10,
					lineNumber: 171,
					columnNumber: 13
				}, this) : /* @__PURE__ */ jsxDEV("div", {
					className: "grid grid-cols-2 gap-3 sm:gap-6",
					children: filteredProducts.map((product) => /* @__PURE__ */ jsxDEV(ProductCard, { product }, product.id, false, {
						fileName: _jsxFileName$10,
						lineNumber: 188,
						columnNumber: 17
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName$10,
					lineNumber: 186,
					columnNumber: 13
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$10,
				lineNumber: 161,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$10,
		lineNumber: 109,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName$10,
		lineNumber: 106,
		columnNumber: 5
	}, this);
}
var dynamicRedirects = new Map(Object.entries({}));
function resolveProductSlugRedirect(slug, extraMap) {
	const normalized = slug.trim().toLowerCase();
	if (!normalized) return null;
	let current = normalized;
	const visited = /* @__PURE__ */ new Set();
	for (let i = 0; i < 5; i += 1) {
		if (visited.has(current)) break;
		visited.add(current);
		const next = extraMap?.[current] || dynamicRedirects.get(current);
		if (!next || next === current) break;
		current = next;
	}
	return current !== normalized ? current : null;
}
// src/pages/ProductDetailPage.tsx
var _jsxFileName$9 = "/app/applet/src/pages/ProductDetailPage.tsx";
function ProductDetailPage() {
	const { slug = "" } = useParams();
	const { t, locale, isRtl, localize } = useLocale();
	const { addItem, openBuySheet, isWishlisted, toggleWishlist } = useCart();
	const { showToast } = useToast();
	const redirectedSlug = useMemo(() => resolveProductSlugRedirect(slug), [slug]);
	const slugValid = useMemo(() => urlSlugSchema.safeParse(slug).success, [slug]);
	const { data, isLoading: loading, error: queryError, refetch } = useQuery({
		queryKey: ["product", slug],
		enabled: Boolean(slug && slugValid && !redirectedSlug),
		queryFn: async () => {
			const [prod, pls, catalog] = await Promise.all([
				productService.getProductBySlug(slug),
				productService.listInstallmentPlans(),
				productService.listProducts({
					sort: "latest",
					limit: 12
				})
			]);
			return {
				product: prod,
				plans: pls,
				catalog
			};
		}
	});
	const product = data?.product ?? null;
	const plans = data?.plans ?? [];
	const catalog = data?.catalog ?? [];
	const [selectedPlanId, setSelectedPlanId] = useState("");
	const [selectedImage, setSelectedImage] = useState("");
	const [selectedSize, setSelectedSize] = useState("");
	const [quantity, setQuantity] = useState(1);
	const [addedStatus, setAddedStatus] = useState("idle");
	const [heartPopKey, setHeartPopKey] = useState(0);
	useEffect(() => {
		if (product) {
			setSelectedImage(product.coverImage);
			setSelectedSize(product.sizes?.[0] || "One Size");
		}
	}, [product]);
	useEffect(() => {
		if (plans.length > 0 && !selectedPlanId) setSelectedPlanId(plans[0].id);
	}, [plans, selectedPlanId]);
	const activePlan = useMemo(() => plans.find((p) => p.id === selectedPlanId) || plans[0], [plans, selectedPlanId]);
	const calc = useMemo(() => {
		if (!product || !activePlan) return null;
		return calculateInstallmentPlan(product.price, quantity, activePlan);
	}, [
		product,
		activePlan,
		quantity
	]);
	const relatedProducts = useMemo(() => {
		if (!product || catalog.length === 0) return [];
		const sameCategory = catalog.filter((p) => p.id !== product.id && p.categoryId === product.categoryId);
		const others = catalog.filter((p) => p.id !== product.id && p.categoryId !== product.categoryId);
		return [...sameCategory, ...others].slice(0, 4);
	}, [product, catalog]);
	if (redirectedSlug) return /* @__PURE__ */ jsxDEV(Navigate, {
		to: localize(`/product/${redirectedSlug}`),
		replace: true
	}, void 0, false, {
		fileName: _jsxFileName$9,
		lineNumber: 93,
		columnNumber: 12
	}, this);
	if (!slugValid) return /* @__PURE__ */ jsxDEV(Fragment, { children: [/* @__PURE__ */ jsxDEV(SeoHead, {
		title: `${t.product.notFoundTitle} — ${t.brand}`,
		description: t.product.notFoundDesc,
		canonicalPath: localize("/shop"),
		locale,
		noIndex: true
	}, void 0, false, {
		fileName: _jsxFileName$9,
		lineNumber: 99,
		columnNumber: 9
	}, this), /* @__PURE__ */ jsxDEV("div", {
		className: "mx-auto max-w-2xl px-4 py-20 text-center",
		children: [
			/* @__PURE__ */ jsxDEV("h1", {
				className: "font-display text-3xl font-semibold",
				children: t.product.notFoundTitle
			}, void 0, false, {
				fileName: _jsxFileName$9,
				lineNumber: 107,
				columnNumber: 11
			}, this),
			/* @__PURE__ */ jsxDEV("p", {
				className: "mt-2 text-sm text-[var(--ca-text-muted)]",
				children: t.product.notFoundDesc
			}, void 0, false, {
				fileName: _jsxFileName$9,
				lineNumber: 108,
				columnNumber: 11
			}, this),
			/* @__PURE__ */ jsxDEV(Link, {
				to: localize("/shop"),
				className: "mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-sm font-semibold text-[var(--ca-bg)]",
				children: t.product.backToCollection
			}, void 0, false, {
				fileName: _jsxFileName$9,
				lineNumber: 111,
				columnNumber: 11
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$9,
		lineNumber: 106,
		columnNumber: 9
	}, this)] }, void 0, true, {
		fileName: _jsxFileName$9,
		lineNumber: 98,
		columnNumber: 7
	}, this);
	if (loading) return /* @__PURE__ */ jsxDEV(ProductDetailSkeleton, {}, void 0, false, {
		fileName: _jsxFileName$9,
		lineNumber: 123,
		columnNumber: 12
	}, this);
	if (queryError) return /* @__PURE__ */ jsxDEV(Fragment, { children: [/* @__PURE__ */ jsxDEV(SeoHead, {
		title: `Could Not Load Product — ${t.brand}`,
		description: "Unable to load product details right now. Please try again.",
		canonicalPath: localize(slug ? `/product/${slug}` : "/shop"),
		locale,
		noIndex: true
	}, void 0, false, {
		fileName: _jsxFileName$9,
		lineNumber: 129,
		columnNumber: 9
	}, this), /* @__PURE__ */ jsxDEV("div", {
		className: "mx-auto max-w-3xl px-4 py-12 sm:px-6",
		children: /* @__PURE__ */ jsxDEV(FriendlyErrorState, {
			title: "Could not load product",
			message: queryError instanceof Error ? queryError.message : "Unable to load product details.",
			onRetry: () => refetch()
		}, void 0, false, {
			fileName: _jsxFileName$9,
			lineNumber: 137,
			columnNumber: 11
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName$9,
		lineNumber: 136,
		columnNumber: 9
	}, this)] }, void 0, true, {
		fileName: _jsxFileName$9,
		lineNumber: 128,
		columnNumber: 7
	}, this);
	if (!product) return /* @__PURE__ */ jsxDEV(Fragment, { children: [/* @__PURE__ */ jsxDEV(SeoHead, {
		title: `${t.product.notFoundTitle} — ${t.brand}`,
		description: t.product.notFoundDesc,
		canonicalPath: localize(slug ? `/product/${slug}` : "/shop"),
		locale,
		noIndex: true
	}, void 0, false, {
		fileName: _jsxFileName$9,
		lineNumber: 150,
		columnNumber: 9
	}, this), /* @__PURE__ */ jsxDEV("div", {
		className: "mx-auto max-w-2xl px-4 py-20 text-center",
		children: [
			/* @__PURE__ */ jsxDEV("h1", {
				className: "font-display text-3xl font-semibold",
				children: t.product.notFoundTitle
			}, void 0, false, {
				fileName: _jsxFileName$9,
				lineNumber: 158,
				columnNumber: 11
			}, this),
			/* @__PURE__ */ jsxDEV("p", {
				className: "mt-2 text-sm text-[var(--ca-text-muted)]",
				children: t.product.notFoundDesc
			}, void 0, false, {
				fileName: _jsxFileName$9,
				lineNumber: 159,
				columnNumber: 11
			}, this),
			/* @__PURE__ */ jsxDEV(Link, {
				to: localize("/shop"),
				className: "mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-sm font-semibold text-[var(--ca-bg)]",
				children: t.product.backToCollection
			}, void 0, false, {
				fileName: _jsxFileName$9,
				lineNumber: 162,
				columnNumber: 11
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$9,
		lineNumber: 157,
		columnNumber: 9
	}, this)] }, void 0, true, {
		fileName: _jsxFileName$9,
		lineNumber: 149,
		columnNumber: 7
	}, this);
	const allImages = [product.coverImage, ...product.extraImages || []];
	const productSeo = buildProductSeoConfig(product, typeof window !== "undefined" ? window.location.origin : STORE_CONFIG.siteUrl, locale);
	const categorySlug = product.categoryId.replace(/^cat-/i, "");
	const sku = deriveProductSku(product);
	const BackIcon = isRtl ? ArrowRight : ArrowLeft;
	return /* @__PURE__ */ jsxDEV(Fragment, { children: [/* @__PURE__ */ jsxDEV(SeoHead, { ...productSeo }, void 0, false, {
		fileName: _jsxFileName$9,
		lineNumber: 183,
		columnNumber: 7
	}, this), /* @__PURE__ */ jsxDEV("section", {
		className: "ca-fade-in mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12",
		children: [
			/* @__PURE__ */ jsxDEV(Breadcrumbs, { items: [
				{
					label: t.nav.home,
					to: localize("/")
				},
				{
					label: t.nav.shop,
					to: localize("/shop")
				},
				{
					label: product.categoryName,
					to: localize(`/category/${categorySlug}`)
				},
				{ label: product.title }
			] }, void 0, false, {
				fileName: _jsxFileName$9,
				lineNumber: 186,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV(Link, {
				to: localize("/shop"),
				className: "inline-flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]",
				children: [/* @__PURE__ */ jsxDEV(BackIcon, { className: "h-3.5 w-3.5" }, void 0, false, {
					fileName: _jsxFileName$9,
					lineNumber: 199,
					columnNumber: 11
				}, this), t.product.backToCollection]
			}, void 0, true, {
				fileName: _jsxFileName$9,
				lineNumber: 195,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV("div", {
				className: "mt-4 grid grid-cols-1 gap-8 lg:grid-cols-12",
				children: [/* @__PURE__ */ jsxDEV("div", {
					className: "space-y-3 lg:col-span-7",
					children: [/* @__PURE__ */ jsxDEV("div", {
						className: "glass-panel overflow-hidden rounded-2xl p-2 sm:p-3",
						children: /* @__PURE__ */ jsxDEV("div", {
							className: "aspect-[4/3] overflow-hidden rounded-xl bg-[var(--ca-surface-subtle)]",
							children: /* @__PURE__ */ jsxDEV(ResilientImage, {
								src: selectedImage || product.coverImage,
								alt: `${product.title} — ${product.categoryName}`,
								width: 800,
								height: 600,
								priority: true,
								className: "h-full w-full object-cover"
							}, void 0, false, {
								fileName: _jsxFileName$9,
								lineNumber: 208,
								columnNumber: 17
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName$9,
							lineNumber: 207,
							columnNumber: 15
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName$9,
						lineNumber: 206,
						columnNumber: 13
					}, this), allImages.length > 1 && /* @__PURE__ */ jsxDEV("div", {
						className: "flex gap-3 overflow-x-auto pb-1",
						children: allImages.map((img, i) => /* @__PURE__ */ jsxDEV("button", {
							type: "button",
							onClick: () => setSelectedImage(img),
							className: `h-20 w-24 shrink-0 overflow-hidden rounded-xl p-1 transition-all ${selectedImage === img ? "ring-2 ring-[var(--ca-accent)]" : "opacity-75 hover:opacity-100"}`,
							children: /* @__PURE__ */ jsxDEV(ResilientImage, {
								src: img,
								alt: `${product.title} gallery photo ${i + 1}`,
								width: 160,
								height: 120,
								className: "h-full w-full rounded-lg object-cover"
							}, void 0, false, {
								fileName: _jsxFileName$9,
								lineNumber: 231,
								columnNumber: 21
							}, this)
						}, i, false, {
							fileName: _jsxFileName$9,
							lineNumber: 221,
							columnNumber: 19
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName$9,
						lineNumber: 219,
						columnNumber: 15
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$9,
					lineNumber: 205,
					columnNumber: 11
				}, this), /* @__PURE__ */ jsxDEV("div", {
					className: "lg:col-span-5",
					children: /* @__PURE__ */ jsxDEV("div", {
						className: "glass-panel sticky top-20 rounded-2xl p-6 sm:p-7",
						children: [
							/* @__PURE__ */ jsxDEV("div", {
								className: "flex items-start justify-between gap-3",
								children: [/* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("div", {
									className: "flex flex-wrap items-center gap-2 text-xs text-[var(--ca-text-muted)]",
									children: [
										/* @__PURE__ */ jsxDEV(Link, {
											to: localize(`/category/${categorySlug}`),
											className: "hover:text-[var(--ca-text)] hover:underline",
											children: product.categoryName
										}, void 0, false, {
											fileName: _jsxFileName$9,
											lineNumber: 250,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ jsxDEV("span", {
											className: "font-mono-nums opacity-75",
											children: [
												t.product.skuLabel,
												": ",
												sku
											]
										}, void 0, true, {
											fileName: _jsxFileName$9,
											lineNumber: 256,
											columnNumber: 21
										}, this),
										!product.inStock && /* @__PURE__ */ jsxDEV("span", {
											className: "rounded-full bg-[var(--ca-surface-subtle)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--ca-text-muted)]",
											children: t.product.outOfStock
										}, void 0, false, {
											fileName: _jsxFileName$9,
											lineNumber: 260,
											columnNumber: 23
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName$9,
									lineNumber: 249,
									columnNumber: 19
								}, this), /* @__PURE__ */ jsxDEV("h1", {
									className: "font-display mt-1.5 text-3xl font-semibold text-[var(--ca-text)]",
									children: product.title
								}, void 0, false, {
									fileName: _jsxFileName$9,
									lineNumber: 265,
									columnNumber: 19
								}, this)] }, void 0, true, {
									fileName: _jsxFileName$9,
									lineNumber: 248,
									columnNumber: 17
								}, this), /* @__PURE__ */ jsxDEV("button", {
									type: "button",
									onClick: () => {
										const nextSaved = !isWishlisted(product.id);
										toggleWishlist(product.id);
										setHeartPopKey((k) => k + 1);
										showToast(nextSaved ? `Saved ${product.title} to wishlist.` : `Removed ${product.title} from wishlist.`, "info");
									},
									"aria-label": isWishlisted(product.id) ? `Remove ${product.title} from wishlist` : `Save ${product.title} to wishlist`,
									"aria-pressed": isWishlisted(product.id),
									className: "btn-press inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]",
									children: /* @__PURE__ */ jsxDEV(Heart, { className: `h-4 w-4 ${heartPopKey > 0 ? "ca-heart-pop" : ""} ${isWishlisted(product.id) ? "fill-[var(--ca-accent)] text-[var(--ca-accent)]" : ""}` }, heartPopKey, false, {
										fileName: _jsxFileName$9,
										lineNumber: 284,
										columnNumber: 19
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName$9,
									lineNumber: 269,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$9,
								lineNumber: 247,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ jsxDEV("p", {
								className: "font-mono-nums mt-3 text-2xl font-bold text-[var(--ca-text)]",
								children: formatPKR(product.price)
							}, void 0, false, {
								fileName: _jsxFileName$9,
								lineNumber: 296,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ jsxDEV("p", {
								className: "mt-4 text-sm leading-relaxed text-[var(--ca-text-muted)]",
								children: product.description
							}, void 0, false, {
								fileName: _jsxFileName$9,
								lineNumber: 299,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ jsxDEV("div", {
								className: "mt-6 flex flex-wrap items-center justify-between gap-4 pt-2",
								children: [product.sizes && /* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("div", {
									className: "flex items-center gap-3",
									children: [/* @__PURE__ */ jsxDEV("span", {
										className: "text-xs font-medium text-[var(--ca-text-muted)]",
										children: t.product.sizeLabel
									}, void 0, false, {
										fileName: _jsxFileName$9,
										lineNumber: 308,
										columnNumber: 23
									}, this), /* @__PURE__ */ jsxDEV(Link, {
										to: localize("/size-guide"),
										className: "inline-flex items-center gap-1 text-[11px] font-medium text-[var(--ca-accent)] hover:underline",
										children: [/* @__PURE__ */ jsxDEV(Ruler, { className: "h-3 w-3" }, void 0, false, {
											fileName: _jsxFileName$9,
											lineNumber: 315,
											columnNumber: 25
										}, this), t.product.sizeGuideLink]
									}, void 0, true, {
										fileName: _jsxFileName$9,
										lineNumber: 311,
										columnNumber: 23
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName$9,
									lineNumber: 307,
									columnNumber: 21
								}, this), /* @__PURE__ */ jsxDEV("div", {
									className: "mt-1.5 flex gap-1.5",
									children: product.sizes.map((sz) => /* @__PURE__ */ jsxDEV("button", {
										type: "button",
										onClick: () => setSelectedSize(sz),
										className: `rounded-lg border px-3 py-1.5 text-xs font-medium ${selectedSize === sz ? "border-[var(--ca-text)] bg-[var(--ca-text)] text-[var(--ca-bg)]" : "border-[var(--ca-border)] text-[var(--ca-text)]"}`,
										children: sz
									}, sz, false, {
										fileName: _jsxFileName$9,
										lineNumber: 321,
										columnNumber: 25
									}, this))
								}, void 0, false, {
									fileName: _jsxFileName$9,
									lineNumber: 319,
									columnNumber: 21
								}, this)] }, void 0, true, {
									fileName: _jsxFileName$9,
									lineNumber: 306,
									columnNumber: 19
								}, this), /* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("span", {
									className: "block text-xs font-medium text-[var(--ca-text-muted)]",
									children: t.product.quantityLabel
								}, void 0, false, {
									fileName: _jsxFileName$9,
									lineNumber: 339,
									columnNumber: 19
								}, this), /* @__PURE__ */ jsxDEV("div", {
									className: "mt-1.5 inline-flex items-center rounded-xl border border-[var(--ca-border)]",
									children: [
										/* @__PURE__ */ jsxDEV("button", {
											type: "button",
											onClick: () => setQuantity((q) => Math.max(1, q - 1)),
											"aria-label": "Decrease quantity",
											className: "p-2",
											children: /* @__PURE__ */ jsxDEV(Minus, { className: "h-3.5 w-3.5" }, void 0, false, {
												fileName: _jsxFileName$9,
												lineNumber: 349,
												columnNumber: 23
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName$9,
											lineNumber: 343,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ jsxDEV("span", {
											className: "font-mono-nums min-w-[2rem] text-center text-sm font-medium",
											children: quantity
										}, void 0, false, {
											fileName: _jsxFileName$9,
											lineNumber: 351,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ jsxDEV("button", {
											type: "button",
											onClick: () => setQuantity((q) => Math.min(20, q + 1)),
											"aria-label": "Increase quantity",
											className: "p-2",
											children: /* @__PURE__ */ jsxDEV(Plus, { className: "h-3.5 w-3.5" }, void 0, false, {
												fileName: _jsxFileName$9,
												lineNumber: 360,
												columnNumber: 23
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName$9,
											lineNumber: 354,
											columnNumber: 21
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName$9,
									lineNumber: 342,
									columnNumber: 19
								}, this)] }, void 0, true, {
									fileName: _jsxFileName$9,
									lineNumber: 338,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$9,
								lineNumber: 304,
								columnNumber: 15
							}, this),
							plans.length > 0 && calc && activePlan && /* @__PURE__ */ jsxDEV("div", {
								className: "mt-6 rounded-xl bg-[var(--ca-surface-subtle)] p-4 space-y-3",
								children: [
									/* @__PURE__ */ jsxDEV("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ jsxDEV("p", {
											className: "text-xs font-semibold text-[var(--ca-text)]",
											children: "Installment Plan Preview"
										}, void 0, false, {
											fileName: _jsxFileName$9,
											lineNumber: 370,
											columnNumber: 21
										}, this), /* @__PURE__ */ jsxDEV("span", {
											className: "font-mono-nums text-[11px] font-semibold text-[var(--ca-accent)]",
											children: [calc.markupPercent, "% Interest"]
										}, void 0, true, {
											fileName: _jsxFileName$9,
											lineNumber: 373,
											columnNumber: 21
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName$9,
										lineNumber: 369,
										columnNumber: 19
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "flex flex-wrap gap-1.5",
										children: plans.map((p) => /* @__PURE__ */ jsxDEV("button", {
											type: "button",
											onClick: () => setSelectedPlanId(p.id),
											className: `rounded-[10px] px-2.5 py-1.5 text-xs font-medium ${selectedPlanId === p.id ? "bg-[var(--ca-accent)] text-[var(--ca-accent-fg)]" : "bg-[var(--ca-surface-solid)] text-[var(--ca-text-muted)]"}`,
											children: [
												p.label,
												" (",
												p.markupPercent,
												"%)"
											]
										}, p.id, true, {
											fileName: _jsxFileName$9,
											lineNumber: 379,
											columnNumber: 23
										}, this))
									}, void 0, false, {
										fileName: _jsxFileName$9,
										lineNumber: 377,
										columnNumber: 19
									}, this),
									/* @__PURE__ */ jsxDEV("dl", {
										className: "space-y-1 text-xs pt-2",
										children: [
											/* @__PURE__ */ jsxDEV("div", {
												className: "flex justify-between",
												children: [/* @__PURE__ */ jsxDEV("dt", {
													className: "text-[var(--ca-text-muted)]",
													children: [
														"Interest (",
														calc.markupPercent,
														"%)"
													]
												}, void 0, true, {
													fileName: _jsxFileName$9,
													lineNumber: 395,
													columnNumber: 23
												}, this), /* @__PURE__ */ jsxDEV("dd", {
													className: "font-mono-nums font-medium text-[var(--ca-accent)]",
													children: ["+ ", formatPKR(calc.markupAmount)]
												}, void 0, true, {
													fileName: _jsxFileName$9,
													lineNumber: 396,
													columnNumber: 23
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName$9,
												lineNumber: 394,
												columnNumber: 21
											}, this),
											calc.advancePercent > 0 && /* @__PURE__ */ jsxDEV("div", {
												className: "flex justify-between",
												children: [/* @__PURE__ */ jsxDEV("dt", {
													className: "text-[var(--ca-text-muted)]",
													children: [
														"Advance (",
														calc.advancePercent,
														"%)"
													]
												}, void 0, true, {
													fileName: _jsxFileName$9,
													lineNumber: 402,
													columnNumber: 25
												}, this), /* @__PURE__ */ jsxDEV("dd", {
													className: "font-mono-nums font-medium text-[var(--ca-text)]",
													children: formatPKR(calc.advanceAmount)
												}, void 0, false, {
													fileName: _jsxFileName$9,
													lineNumber: 403,
													columnNumber: 25
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName$9,
												lineNumber: 401,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ jsxDEV("div", {
												className: "flex justify-between",
												children: [/* @__PURE__ */ jsxDEV("dt", {
													className: "text-[var(--ca-text-muted)]",
													children: [
														"Monthly (",
														calc.months,
														" mos)"
													]
												}, void 0, true, {
													fileName: _jsxFileName$9,
													lineNumber: 409,
													columnNumber: 23
												}, this), /* @__PURE__ */ jsxDEV("dd", {
													className: "font-mono-nums font-semibold text-[var(--ca-text)]",
													children: [formatPKR(calc.monthlyAmount), " / mo"]
												}, void 0, true, {
													fileName: _jsxFileName$9,
													lineNumber: 410,
													columnNumber: 23
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName$9,
												lineNumber: 408,
												columnNumber: 21
											}, this),
											/* @__PURE__ */ jsxDEV("div", {
												className: "flex justify-between pt-1",
												children: [/* @__PURE__ */ jsxDEV("dt", {
													className: "font-semibold text-[var(--ca-text)]",
													children: "Total on Plan"
												}, void 0, false, {
													fileName: _jsxFileName$9,
													lineNumber: 415,
													columnNumber: 23
												}, this), /* @__PURE__ */ jsxDEV("dd", {
													className: "font-mono-nums font-bold text-[var(--ca-text)]",
													children: formatPKR(calc.totalPayable)
												}, void 0, false, {
													fileName: _jsxFileName$9,
													lineNumber: 416,
													columnNumber: 23
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName$9,
												lineNumber: 414,
												columnNumber: 21
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName$9,
										lineNumber: 393,
										columnNumber: 19
									}, this),
									/* @__PURE__ */ jsxDEV("button", {
										type: "button",
										onClick: () => openBuySheet(product, quantity, selectedSize, {
											paymentMethod: "installments",
											planId: activePlan.id
										}),
										className: "w-full rounded-xl border border-[var(--ca-accent)]/40 bg-[var(--ca-accent)]/10 py-2 text-xs font-semibold text-[var(--ca-text)] hover:bg-[var(--ca-accent)]/20",
										children: [
											"Buy on ",
											activePlan.label,
											" Plan (",
											formatPKR(calc.totalPayable),
											")"
										]
									}, void 0, true, {
										fileName: _jsxFileName$9,
										lineNumber: 421,
										columnNumber: 19
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName$9,
								lineNumber: 368,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ jsxDEV("div", {
								className: "mt-6 flex flex-col gap-3 sm:flex-row",
								children: [/* @__PURE__ */ jsxDEV(CAProcessButton, {
									type: "button",
									status: addedStatus,
									onClick: () => {
										addItem(product, quantity, selectedSize);
										setAddedStatus("success");
										showToast(`Added ${product.title} to bag.`, "success");
										window.setTimeout(() => setAddedStatus("idle"), 900);
									},
									className: "flex-1 rounded-xl border border-[var(--ca-border)] py-3 text-sm font-medium text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]",
									children: t.product.addToBag
								}, void 0, false, {
									fileName: _jsxFileName$9,
									lineNumber: 437,
									columnNumber: 17
								}, this), /* @__PURE__ */ jsxDEV("button", {
									type: "button",
									onClick: () => openBuySheet(product, quantity, selectedSize),
									className: "btn-press inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--ca-text)] py-3 text-sm font-semibold text-[var(--ca-bg)] hover:opacity-90",
									children: [/* @__PURE__ */ jsxDEV(ShoppingBag, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName$9,
										lineNumber: 455,
										columnNumber: 19
									}, this), t.product.buyNow]
								}, void 0, true, {
									fileName: _jsxFileName$9,
									lineNumber: 450,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$9,
								lineNumber: 436,
								columnNumber: 15
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName$9,
						lineNumber: 246,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName$9,
					lineNumber: 245,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$9,
				lineNumber: 203,
				columnNumber: 9
			}, this),
			relatedProducts.length > 0 && /* @__PURE__ */ jsxDEV("div", {
				className: "mt-16",
				children: [/* @__PURE__ */ jsxDEV("h2", {
					className: "font-display text-2xl font-semibold text-[var(--ca-text)] sm:text-3xl",
					children: t.product.relatedTitle
				}, void 0, false, {
					fileName: _jsxFileName$9,
					lineNumber: 466,
					columnNumber: 13
				}, this), /* @__PURE__ */ jsxDEV("div", {
					className: "mt-5 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4",
					children: relatedProducts.map((rel) => /* @__PURE__ */ jsxDEV(ProductCard, { product: rel }, rel.id, false, {
						fileName: _jsxFileName$9,
						lineNumber: 471,
						columnNumber: 17
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName$9,
					lineNumber: 469,
					columnNumber: 13
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$9,
				lineNumber: 465,
				columnNumber: 11
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$9,
		lineNumber: 185,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName$9,
		lineNumber: 182,
		columnNumber: 5
	}, this);
}
// src/pages/AboutPage.tsx
var _jsxFileName$8 = "/app/applet/src/pages/AboutPage.tsx";
function AboutPage() {
	const { t, locale, isRtl, localize } = useLocale();
	const origin = typeof window !== "undefined" ? window.location.origin : STORE_CONFIG.siteUrl;
	const canonicalPath = localize("/about");
	const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;
	return /* @__PURE__ */ jsxDEV(Fragment, { children: [/* @__PURE__ */ jsxDEV(SeoHead, {
		title: locale === "ur" ? `ہمارے بارے میں — ${t.brand}` : "About Cinematic Arts (CA) — Peshawar Clothing Store",
		description: t.about.lead,
		canonicalPath,
		locale,
		jsonLd: [buildOrganizationJsonLd(origin), buildBreadcrumbJsonLd([{
			name: t.nav.home,
			path: localize("/")
		}, {
			name: t.nav.about,
			path: canonicalPath
		}], origin)]
	}, void 0, false, {
		fileName: _jsxFileName$8,
		lineNumber: 18,
		columnNumber: 7
	}, this), /* @__PURE__ */ jsxDEV("article", {
		className: "mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14",
		children: [/* @__PURE__ */ jsxDEV(Breadcrumbs, { items: [{
			label: t.nav.home,
			to: localize("/")
		}, { label: t.nav.about }] }, void 0, false, {
			fileName: _jsxFileName$8,
			lineNumber: 40,
			columnNumber: 9
		}, this), /* @__PURE__ */ jsxDEV("div", {
			className: "glass-panel rounded-2xl p-6 sm:p-10",
			children: [
				/* @__PURE__ */ jsxDEV("h1", {
					className: "font-display text-3xl font-semibold text-[var(--ca-text)] sm:text-5xl",
					children: t.about.heading
				}, void 0, false, {
					fileName: _jsxFileName$8,
					lineNumber: 48,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("p", {
					className: "mt-4 max-w-2xl text-base leading-relaxed text-[var(--ca-text-muted)]",
					children: t.about.lead
				}, void 0, false, {
					fileName: _jsxFileName$8,
					lineNumber: 51,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("div", {
					className: "mt-8 grid grid-cols-1 gap-6 md:grid-cols-3",
					children: t.about.sections.map((section) => /* @__PURE__ */ jsxDEV("section", {
						className: "rounded-xl bg-[var(--ca-surface-subtle)] p-5",
						children: [/* @__PURE__ */ jsxDEV("h2", {
							className: "font-display text-2xl font-semibold text-[var(--ca-text)]",
							children: section.heading
						}, void 0, false, {
							fileName: _jsxFileName$8,
							lineNumber: 61,
							columnNumber: 17
						}, this), /* @__PURE__ */ jsxDEV("p", {
							className: "mt-2.5 text-sm leading-relaxed text-[var(--ca-text-muted)]",
							children: section.body
						}, void 0, false, {
							fileName: _jsxFileName$8,
							lineNumber: 64,
							columnNumber: 17
						}, this)]
					}, section.heading, true, {
						fileName: _jsxFileName$8,
						lineNumber: 57,
						columnNumber: 15
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName$8,
					lineNumber: 55,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("div", {
					className: "mt-8 flex flex-wrap gap-3",
					children: [
						/* @__PURE__ */ jsxDEV(Link, {
							to: localize("/shop"),
							className: "btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-text)] px-6 py-3 text-sm font-semibold text-[var(--ca-bg)] hover:opacity-90",
							children: [t.about.ctaShop, /* @__PURE__ */ jsxDEV(ArrowIcon, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName$8,
								lineNumber: 77,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$8,
							lineNumber: 72,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV(Link, {
							to: localize("/contact"),
							className: "btn-press inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-surface-subtle)] px-5 py-3 text-sm font-medium text-[var(--ca-text)] hover:opacity-85",
							children: t.about.ctaContact
						}, void 0, false, {
							fileName: _jsxFileName$8,
							lineNumber: 79,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV(Link, {
							to: localize("/faq"),
							className: "btn-press inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-surface-subtle)] px-5 py-3 text-sm font-medium text-[var(--ca-text)] hover:opacity-85",
							children: t.nav.faq
						}, void 0, false, {
							fileName: _jsxFileName$8,
							lineNumber: 85,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName$8,
					lineNumber: 71,
					columnNumber: 11
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName$8,
			lineNumber: 47,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$8,
		lineNumber: 39,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName$8,
		lineNumber: 17,
		columnNumber: 5
	}, this);
}
// src/pages/FaqPage.tsx
var _jsxFileName$7 = "/app/applet/src/pages/FaqPage.tsx";
function FaqPage() {
	const { t, locale, localize } = useLocale();
	const origin = typeof window !== "undefined" ? window.location.origin : STORE_CONFIG.siteUrl;
	const canonicalPath = localize("/faq");
	return /* @__PURE__ */ jsxDEV(Fragment, { children: [/* @__PURE__ */ jsxDEV(SeoHead, {
		title: locale === "ur" ? `اقساط اور آرڈرز سوالات — ${t.brand}` : "Installment & COD FAQ — Cinematic Arts (CA)",
		description: t.faq.intro,
		canonicalPath,
		locale,
		jsonLd: [buildFaqPageJsonLd(locale), buildBreadcrumbJsonLd([{
			name: t.nav.home,
			path: localize("/")
		}, {
			name: t.nav.faq,
			path: canonicalPath
		}], origin)]
	}, void 0, false, {
		fileName: _jsxFileName$7,
		lineNumber: 16,
		columnNumber: 7
	}, this), /* @__PURE__ */ jsxDEV("section", {
		className: "mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14",
		children: [/* @__PURE__ */ jsxDEV(Breadcrumbs, { items: [{
			label: t.nav.home,
			to: localize("/")
		}, { label: t.nav.faq }] }, void 0, false, {
			fileName: _jsxFileName$7,
			lineNumber: 38,
			columnNumber: 9
		}, this), /* @__PURE__ */ jsxDEV("div", {
			className: "glass-panel rounded-2xl p-6 sm:p-10",
			children: [
				/* @__PURE__ */ jsxDEV("h1", {
					className: "font-display text-3xl font-semibold text-[var(--ca-text)] sm:text-5xl",
					children: t.faq.heading
				}, void 0, false, {
					fileName: _jsxFileName$7,
					lineNumber: 46,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("p", {
					className: "mt-3 max-w-2xl text-sm leading-relaxed text-[var(--ca-text-muted)] sm:text-base",
					children: t.faq.intro
				}, void 0, false, {
					fileName: _jsxFileName$7,
					lineNumber: 49,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("div", {
					className: "mt-8 space-y-4",
					children: t.faq.items.map((item) => /* @__PURE__ */ jsxDEV("article", {
						id: item.id,
						className: "rounded-xl bg-[var(--ca-surface-subtle)] p-5 sm:p-6",
						children: [/* @__PURE__ */ jsxDEV("h2", {
							className: "font-display text-2xl font-semibold text-[var(--ca-text)]",
							children: item.question
						}, void 0, false, {
							fileName: _jsxFileName$7,
							lineNumber: 60,
							columnNumber: 17
						}, this), /* @__PURE__ */ jsxDEV("p", {
							className: "mt-2 text-sm leading-relaxed text-[var(--ca-text-muted)]",
							children: item.answer
						}, void 0, false, {
							fileName: _jsxFileName$7,
							lineNumber: 63,
							columnNumber: 17
						}, this)]
					}, item.id, true, {
						fileName: _jsxFileName$7,
						lineNumber: 55,
						columnNumber: 15
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName$7,
					lineNumber: 53,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("div", {
					className: "mt-10 flex flex-col items-start justify-between gap-4 rounded-xl bg-[var(--ca-surface-subtle)] p-6 sm:flex-row sm:items-center",
					children: [/* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("h2", {
						className: "font-display text-2xl font-semibold text-[var(--ca-text)]",
						children: t.faq.ctaTitle
					}, void 0, false, {
						fileName: _jsxFileName$7,
						lineNumber: 72,
						columnNumber: 15
					}, this), /* @__PURE__ */ jsxDEV("p", {
						className: "mt-1 text-sm text-[var(--ca-text-muted)]",
						children: t.faq.ctaDesc
					}, void 0, false, {
						fileName: _jsxFileName$7,
						lineNumber: 75,
						columnNumber: 15
					}, this)] }, void 0, true, {
						fileName: _jsxFileName$7,
						lineNumber: 71,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("div", {
						className: "flex flex-wrap gap-3",
						children: [/* @__PURE__ */ jsxDEV(Link, {
							to: localize("/contact"),
							className: "btn-press inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-bg)]",
							children: t.faq.ctaButton
						}, void 0, false, {
							fileName: _jsxFileName$7,
							lineNumber: 78,
							columnNumber: 15
						}, this), /* @__PURE__ */ jsxDEV(Link, {
							to: localize("/shipping"),
							className: "btn-press inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-surface-solid)] px-4 py-2.5 text-xs font-semibold text-[var(--ca-text)]",
							children: t.nav.shipping
						}, void 0, false, {
							fileName: _jsxFileName$7,
							lineNumber: 84,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$7,
						lineNumber: 77,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$7,
					lineNumber: 70,
					columnNumber: 11
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName$7,
			lineNumber: 45,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$7,
		lineNumber: 37,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName$7,
		lineNumber: 15,
		columnNumber: 5
	}, this);
}
// src/pages/SizeGuidePage.tsx
var _jsxFileName$6 = "/app/applet/src/pages/SizeGuidePage.tsx";
function SizeGuidePage() {
	const { t, locale, localize } = useLocale();
	const origin = typeof window !== "undefined" ? window.location.origin : STORE_CONFIG.siteUrl;
	const canonicalPath = localize("/size-guide");
	return /* @__PURE__ */ jsxDEV(Fragment, { children: [/* @__PURE__ */ jsxDEV(SeoHead, {
		title: locale === "ur" ? `سائز گائیڈ — ${t.brand}` : "Clothing Size Guide — Cinematic Arts (CA)",
		description: t.sizeGuide.intro,
		canonicalPath,
		locale,
		jsonLd: [buildBreadcrumbJsonLd([{
			name: t.nav.home,
			path: localize("/")
		}, {
			name: t.nav.sizeGuide,
			path: canonicalPath
		}], origin)]
	}, void 0, false, {
		fileName: _jsxFileName$6,
		lineNumber: 16,
		columnNumber: 7
	}, this), /* @__PURE__ */ jsxDEV("section", {
		className: "mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14",
		children: [/* @__PURE__ */ jsxDEV(Breadcrumbs, { items: [{
			label: t.nav.home,
			to: localize("/")
		}, { label: t.nav.sizeGuide }] }, void 0, false, {
			fileName: _jsxFileName$6,
			lineNumber: 37,
			columnNumber: 9
		}, this), /* @__PURE__ */ jsxDEV("div", {
			className: "glass-panel space-y-8 rounded-2xl p-6 sm:p-10",
			children: [
				/* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("h1", {
					className: "font-display text-3xl font-semibold text-[var(--ca-text)] sm:text-5xl",
					children: t.sizeGuide.heading
				}, void 0, false, {
					fileName: _jsxFileName$6,
					lineNumber: 46,
					columnNumber: 13
				}, this), /* @__PURE__ */ jsxDEV("p", {
					className: "mt-3 max-w-2xl text-sm leading-relaxed text-[var(--ca-text-muted)] sm:text-base",
					children: t.sizeGuide.intro
				}, void 0, false, {
					fileName: _jsxFileName$6,
					lineNumber: 49,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName$6,
					lineNumber: 45,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("section", { children: [
					/* @__PURE__ */ jsxDEV("h2", {
						className: "font-display text-2xl font-semibold text-[var(--ca-text)]",
						children: t.sizeGuide.unstitchedTitle
					}, void 0, false, {
						fileName: _jsxFileName$6,
						lineNumber: 55,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ jsxDEV("p", {
						className: "mt-1 text-sm text-[var(--ca-text-muted)]",
						children: t.sizeGuide.unstitchedDesc
					}, void 0, false, {
						fileName: _jsxFileName$6,
						lineNumber: 58,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ jsxDEV("div", {
						className: "mt-4 overflow-x-auto rounded-xl bg-[var(--ca-surface-subtle)] p-3",
						children: /* @__PURE__ */ jsxDEV("table", {
							className: "w-full text-start text-sm",
							children: [/* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", {
								className: "text-xs font-semibold text-[var(--ca-text-muted)]",
								children: [
									/* @__PURE__ */ jsxDEV("th", {
										className: "px-3 py-2 text-start",
										children: locale === "ur" ? "حصہ" : "Fabric Piece"
									}, void 0, false, {
										fileName: _jsxFileName$6,
										lineNumber: 65,
										columnNumber: 21
									}, this),
									/* @__PURE__ */ jsxDEV("th", {
										className: "px-3 py-2 text-start",
										children: locale === "ur" ? "لمبائی" : "Length"
									}, void 0, false, {
										fileName: _jsxFileName$6,
										lineNumber: 66,
										columnNumber: 21
									}, this),
									/* @__PURE__ */ jsxDEV("th", {
										className: "px-3 py-2 text-start",
										children: locale === "ur" ? "نوٹ" : "Tailoring Note"
									}, void 0, false, {
										fileName: _jsxFileName$6,
										lineNumber: 67,
										columnNumber: 21
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName$6,
								lineNumber: 64,
								columnNumber: 19
							}, this) }, void 0, false, {
								fileName: _jsxFileName$6,
								lineNumber: 63,
								columnNumber: 17
							}, this), /* @__PURE__ */ jsxDEV("tbody", { children: t.sizeGuide.unstitchedRows.map((row) => /* @__PURE__ */ jsxDEV("tr", { children: [
								/* @__PURE__ */ jsxDEV("td", {
									className: "px-3 py-2.5 font-medium text-[var(--ca-text)]",
									children: row.piece
								}, void 0, false, {
									fileName: _jsxFileName$6,
									lineNumber: 73,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ jsxDEV("td", {
									className: "font-mono-nums px-3 py-2.5 text-[var(--ca-text)]",
									children: row.measurement
								}, void 0, false, {
									fileName: _jsxFileName$6,
									lineNumber: 74,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ jsxDEV("td", {
									className: "px-3 py-2.5 text-[var(--ca-text-muted)]",
									children: row.note
								}, void 0, false, {
									fileName: _jsxFileName$6,
									lineNumber: 75,
									columnNumber: 23
								}, this)
							] }, row.piece, true, {
								fileName: _jsxFileName$6,
								lineNumber: 72,
								columnNumber: 21
							}, this)) }, void 0, false, {
								fileName: _jsxFileName$6,
								lineNumber: 70,
								columnNumber: 17
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$6,
							lineNumber: 62,
							columnNumber: 15
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName$6,
						lineNumber: 61,
						columnNumber: 13
					}, this)
				] }, void 0, true, {
					fileName: _jsxFileName$6,
					lineNumber: 54,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("section", { children: [
					/* @__PURE__ */ jsxDEV("h2", {
						className: "font-display text-2xl font-semibold text-[var(--ca-text)]",
						children: t.sizeGuide.apparelTitle
					}, void 0, false, {
						fileName: _jsxFileName$6,
						lineNumber: 84,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ jsxDEV("p", {
						className: "mt-1 text-sm text-[var(--ca-text-muted)]",
						children: t.sizeGuide.apparelDesc
					}, void 0, false, {
						fileName: _jsxFileName$6,
						lineNumber: 87,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ jsxDEV("div", {
						className: "mt-4 overflow-x-auto rounded-xl bg-[var(--ca-surface-subtle)] p-3",
						children: /* @__PURE__ */ jsxDEV("table", {
							className: "w-full text-start text-sm",
							children: [/* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", {
								className: "text-xs font-semibold text-[var(--ca-text-muted)]",
								children: [
									/* @__PURE__ */ jsxDEV("th", {
										className: "px-3 py-2 text-start",
										children: locale === "ur" ? "سائز" : "Size"
									}, void 0, false, {
										fileName: _jsxFileName$6,
										lineNumber: 94,
										columnNumber: 21
									}, this),
									/* @__PURE__ */ jsxDEV("th", {
										className: "px-3 py-2 text-start",
										children: locale === "ur" ? "چھاتی" : "Chest"
									}, void 0, false, {
										fileName: _jsxFileName$6,
										lineNumber: 95,
										columnNumber: 21
									}, this),
									/* @__PURE__ */ jsxDEV("th", {
										className: "px-3 py-2 text-start",
										children: locale === "ur" ? "لمبائی" : "Length"
									}, void 0, false, {
										fileName: _jsxFileName$6,
										lineNumber: 96,
										columnNumber: 21
									}, this),
									/* @__PURE__ */ jsxDEV("th", {
										className: "px-3 py-2 text-start",
										children: locale === "ur" ? "کمر" : "Waist Fit"
									}, void 0, false, {
										fileName: _jsxFileName$6,
										lineNumber: 97,
										columnNumber: 21
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName$6,
								lineNumber: 93,
								columnNumber: 19
							}, this) }, void 0, false, {
								fileName: _jsxFileName$6,
								lineNumber: 92,
								columnNumber: 17
							}, this), /* @__PURE__ */ jsxDEV("tbody", { children: t.sizeGuide.apparelRows.map((row) => /* @__PURE__ */ jsxDEV("tr", { children: [
								/* @__PURE__ */ jsxDEV("td", {
									className: "px-3 py-2.5 font-semibold text-[var(--ca-text)]",
									children: row.size
								}, void 0, false, {
									fileName: _jsxFileName$6,
									lineNumber: 103,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ jsxDEV("td", {
									className: "font-mono-nums px-3 py-2.5 text-[var(--ca-text-muted)]",
									children: row.chest
								}, void 0, false, {
									fileName: _jsxFileName$6,
									lineNumber: 104,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ jsxDEV("td", {
									className: "font-mono-nums px-3 py-2.5 text-[var(--ca-text-muted)]",
									children: row.length
								}, void 0, false, {
									fileName: _jsxFileName$6,
									lineNumber: 105,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ jsxDEV("td", {
									className: "font-mono-nums px-3 py-2.5 text-[var(--ca-text-muted)]",
									children: row.waist
								}, void 0, false, {
									fileName: _jsxFileName$6,
									lineNumber: 106,
									columnNumber: 23
								}, this)
							] }, row.size, true, {
								fileName: _jsxFileName$6,
								lineNumber: 102,
								columnNumber: 21
							}, this)) }, void 0, false, {
								fileName: _jsxFileName$6,
								lineNumber: 100,
								columnNumber: 17
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$6,
							lineNumber: 91,
							columnNumber: 15
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName$6,
						lineNumber: 90,
						columnNumber: 13
					}, this)
				] }, void 0, true, {
					fileName: _jsxFileName$6,
					lineNumber: 83,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("section", { children: [/* @__PURE__ */ jsxDEV("h2", {
					className: "font-display text-2xl font-semibold text-[var(--ca-text)]",
					children: t.sizeGuide.boysTitle
				}, void 0, false, {
					fileName: _jsxFileName$6,
					lineNumber: 115,
					columnNumber: 13
				}, this), /* @__PURE__ */ jsxDEV("div", {
					className: "mt-4 overflow-x-auto rounded-xl bg-[var(--ca-surface-subtle)] p-3",
					children: /* @__PURE__ */ jsxDEV("table", {
						className: "w-full text-start text-sm",
						children: [/* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", {
							className: "text-xs font-semibold text-[var(--ca-text-muted)]",
							children: [
								/* @__PURE__ */ jsxDEV("th", {
									className: "px-3 py-2 text-start",
									children: locale === "ur" ? "سائز" : "Size"
								}, void 0, false, {
									fileName: _jsxFileName$6,
									lineNumber: 122,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ jsxDEV("th", {
									className: "px-3 py-2 text-start",
									children: locale === "ur" ? "کمر" : "Waist"
								}, void 0, false, {
									fileName: _jsxFileName$6,
									lineNumber: 123,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ jsxDEV("th", {
									className: "px-3 py-2 text-start",
									children: locale === "ur" ? "لمبائی" : "Outseam"
								}, void 0, false, {
									fileName: _jsxFileName$6,
									lineNumber: 124,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ jsxDEV("th", {
									className: "px-3 py-2 text-start",
									children: locale === "ur" ? "عمر (تقریباً)" : "Approx. Age"
								}, void 0, false, {
									fileName: _jsxFileName$6,
									lineNumber: 125,
									columnNumber: 21
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName$6,
							lineNumber: 121,
							columnNumber: 19
						}, this) }, void 0, false, {
							fileName: _jsxFileName$6,
							lineNumber: 120,
							columnNumber: 17
						}, this), /* @__PURE__ */ jsxDEV("tbody", { children: t.sizeGuide.boysRows.map((row) => /* @__PURE__ */ jsxDEV("tr", { children: [
							/* @__PURE__ */ jsxDEV("td", {
								className: "px-3 py-2.5 font-semibold text-[var(--ca-text)]",
								children: row.size
							}, void 0, false, {
								fileName: _jsxFileName$6,
								lineNumber: 131,
								columnNumber: 23
							}, this),
							/* @__PURE__ */ jsxDEV("td", {
								className: "font-mono-nums px-3 py-2.5 text-[var(--ca-text-muted)]",
								children: row.waist
							}, void 0, false, {
								fileName: _jsxFileName$6,
								lineNumber: 132,
								columnNumber: 23
							}, this),
							/* @__PURE__ */ jsxDEV("td", {
								className: "font-mono-nums px-3 py-2.5 text-[var(--ca-text-muted)]",
								children: row.length
							}, void 0, false, {
								fileName: _jsxFileName$6,
								lineNumber: 133,
								columnNumber: 23
							}, this),
							/* @__PURE__ */ jsxDEV("td", {
								className: "px-3 py-2.5 text-[var(--ca-text-muted)]",
								children: row.ageApprox
							}, void 0, false, {
								fileName: _jsxFileName$6,
								lineNumber: 134,
								columnNumber: 23
							}, this)
						] }, row.size, true, {
							fileName: _jsxFileName$6,
							lineNumber: 130,
							columnNumber: 21
						}, this)) }, void 0, false, {
							fileName: _jsxFileName$6,
							lineNumber: 128,
							columnNumber: 17
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$6,
						lineNumber: 119,
						columnNumber: 15
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName$6,
					lineNumber: 118,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName$6,
					lineNumber: 114,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("div", {
					className: "flex flex-col items-start justify-between gap-4 rounded-xl bg-[var(--ca-surface-subtle)] p-5 sm:flex-row sm:items-center",
					children: [/* @__PURE__ */ jsxDEV("p", {
						className: "text-sm text-[var(--ca-text-muted)]",
						children: t.sizeGuide.careNote
					}, void 0, false, {
						fileName: _jsxFileName$6,
						lineNumber: 143,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV(Link, {
						to: localize("/shop"),
						className: "btn-press inline-flex min-h-[44px] shrink-0 items-center rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-bg)]",
						children: t.hero.shopCollection
					}, void 0, false, {
						fileName: _jsxFileName$6,
						lineNumber: 144,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$6,
					lineNumber: 142,
					columnNumber: 11
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName$6,
			lineNumber: 44,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$6,
		lineNumber: 36,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName$6,
		lineNumber: 15,
		columnNumber: 5
	}, this);
}
// src/pages/ShippingPage.tsx
var _jsxFileName$5 = "/app/applet/src/pages/ShippingPage.tsx";
function ShippingPage() {
	const { t, locale, localize } = useLocale();
	const origin = typeof window !== "undefined" ? window.location.origin : STORE_CONFIG.siteUrl;
	const canonicalPath = localize("/shipping");
	return /* @__PURE__ */ jsxDEV(Fragment, { children: [/* @__PURE__ */ jsxDEV(SeoHead, {
		title: locale === "ur" ? `ڈیلیوری اور واپسی — ${t.brand}` : "Shipping, COD & 7-Day Returns — Cinematic Arts",
		description: t.shipping.intro,
		canonicalPath,
		locale,
		jsonLd: [buildBreadcrumbJsonLd([{
			name: t.nav.home,
			path: localize("/")
		}, {
			name: t.nav.shipping,
			path: canonicalPath
		}], origin)]
	}, void 0, false, {
		fileName: _jsxFileName$5,
		lineNumber: 17,
		columnNumber: 7
	}, this), /* @__PURE__ */ jsxDEV("section", {
		className: "mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14",
		children: [/* @__PURE__ */ jsxDEV(Breadcrumbs, { items: [{
			label: t.nav.home,
			to: localize("/")
		}, { label: t.nav.shipping }] }, void 0, false, {
			fileName: _jsxFileName$5,
			lineNumber: 38,
			columnNumber: 9
		}, this), /* @__PURE__ */ jsxDEV("div", {
			className: "glass-panel space-y-8 rounded-2xl p-6 sm:p-10",
			children: [
				/* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("h1", {
					className: "font-display text-3xl font-semibold text-[var(--ca-text)] sm:text-5xl",
					children: t.shipping.heading
				}, void 0, false, {
					fileName: _jsxFileName$5,
					lineNumber: 47,
					columnNumber: 13
				}, this), /* @__PURE__ */ jsxDEV("p", {
					className: "mt-3 max-w-2xl text-sm leading-relaxed text-[var(--ca-text-muted)] sm:text-base",
					children: t.shipping.intro
				}, void 0, false, {
					fileName: _jsxFileName$5,
					lineNumber: 50,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName$5,
					lineNumber: 46,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("section", { children: [/* @__PURE__ */ jsxDEV("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ jsxDEV(Truck, { className: "h-5 w-5 text-[var(--ca-accent)]" }, void 0, false, {
						fileName: _jsxFileName$5,
						lineNumber: 57,
						columnNumber: 15
					}, this), /* @__PURE__ */ jsxDEV("h2", {
						className: "font-display text-2xl font-semibold text-[var(--ca-text)]",
						children: t.shipping.zonesTitle
					}, void 0, false, {
						fileName: _jsxFileName$5,
						lineNumber: 58,
						columnNumber: 15
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$5,
					lineNumber: 56,
					columnNumber: 13
				}, this), /* @__PURE__ */ jsxDEV("div", {
					className: "mt-4 grid grid-cols-1 gap-4 md:grid-cols-3",
					children: t.shipping.zones.map((zone) => /* @__PURE__ */ jsxDEV("div", {
						className: "rounded-xl bg-[var(--ca-surface-subtle)] p-5",
						children: [
							/* @__PURE__ */ jsxDEV("p", {
								className: "text-sm font-semibold text-[var(--ca-text)]",
								children: zone.region
							}, void 0, false, {
								fileName: _jsxFileName$5,
								lineNumber: 69,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ jsxDEV("p", {
								className: "font-mono-nums mt-2 text-base font-bold text-[var(--ca-accent)]",
								children: zone.eta
							}, void 0, false, {
								fileName: _jsxFileName$5,
								lineNumber: 70,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ jsxDEV("p", {
								className: "mt-1.5 text-xs text-[var(--ca-text-muted)]",
								children: zone.payment
							}, void 0, false, {
								fileName: _jsxFileName$5,
								lineNumber: 73,
								columnNumber: 19
							}, this)
						]
					}, zone.region, true, {
						fileName: _jsxFileName$5,
						lineNumber: 65,
						columnNumber: 17
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName$5,
					lineNumber: 63,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName$5,
					lineNumber: 55,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("section", { children: [/* @__PURE__ */ jsxDEV("h2", {
					className: "font-display text-2xl font-semibold text-[var(--ca-text)]",
					children: t.shipping.returnsTitle
				}, void 0, false, {
					fileName: _jsxFileName$5,
					lineNumber: 80,
					columnNumber: 13
				}, this), /* @__PURE__ */ jsxDEV("ul", {
					className: "mt-4 space-y-3",
					children: t.shipping.returnsPoints.map((point, idx) => /* @__PURE__ */ jsxDEV("li", {
						className: "flex items-start gap-3 rounded-xl bg-[var(--ca-surface-subtle)] p-4 text-sm leading-relaxed text-[var(--ca-text-muted)]",
						children: [/* @__PURE__ */ jsxDEV(CheckCircle2, { className: "mt-0.5 h-4 w-4 shrink-0 text-[var(--ca-accent)]" }, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 89,
							columnNumber: 19
						}, this), /* @__PURE__ */ jsxDEV("span", { children: point }, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 90,
							columnNumber: 19
						}, this)]
					}, idx, true, {
						fileName: _jsxFileName$5,
						lineNumber: 85,
						columnNumber: 17
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName$5,
					lineNumber: 83,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName$5,
					lineNumber: 79,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("div", {
					className: "flex flex-wrap gap-3",
					children: [
						/* @__PURE__ */ jsxDEV(Link, {
							to: localize("/size-guide"),
							className: "btn-press inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-surface-subtle)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-text)]",
							children: t.nav.sizeGuide
						}, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 97,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV(Link, {
							to: localize("/faq"),
							className: "btn-press inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-surface-subtle)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-text)]",
							children: t.nav.faq
						}, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 103,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV(Link, {
							to: localize("/shop"),
							className: "btn-press inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-bg)]",
							children: t.hero.shopCollection
						}, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 109,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName$5,
					lineNumber: 96,
					columnNumber: 11
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName$5,
			lineNumber: 45,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$5,
		lineNumber: 37,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName$5,
		lineNumber: 16,
		columnNumber: 5
	}, this);
}
// src/pages/ContactPage.tsx
var _jsxFileName$4 = "/app/applet/src/pages/ContactPage.tsx";
function ContactPage() {
	const { t, locale, localize } = useLocale();
	const origin = typeof window !== "undefined" ? window.location.origin : STORE_CONFIG.siteUrl;
	const canonicalPath = localize("/contact");
	return /* @__PURE__ */ jsxDEV(Fragment, { children: [/* @__PURE__ */ jsxDEV(SeoHead, {
		title: locale === "ur" ? `رابطہ اور پتہ — ${t.brand}` : "Contact Store & WhatsApp — Cinematic Arts Peshawar",
		description: t.contact.intro,
		canonicalPath,
		locale,
		jsonLd: [buildLocalBusinessJsonLd(origin), buildBreadcrumbJsonLd([{
			name: t.nav.home,
			path: localize("/")
		}, {
			name: t.nav.contact,
			path: canonicalPath
		}], origin)]
	}, void 0, false, {
		fileName: _jsxFileName$4,
		lineNumber: 17,
		columnNumber: 7
	}, this), /* @__PURE__ */ jsxDEV("section", {
		className: "mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14",
		children: [/* @__PURE__ */ jsxDEV(Breadcrumbs, { items: [{
			label: t.nav.home,
			to: localize("/")
		}, { label: t.nav.contact }] }, void 0, false, {
			fileName: _jsxFileName$4,
			lineNumber: 39,
			columnNumber: 9
		}, this), /* @__PURE__ */ jsxDEV("div", {
			className: "glass-panel rounded-2xl p-6 sm:p-10",
			children: [
				/* @__PURE__ */ jsxDEV("h1", {
					className: "font-display text-3xl font-semibold text-[var(--ca-text)] sm:text-5xl",
					children: t.contact.heading
				}, void 0, false, {
					fileName: _jsxFileName$4,
					lineNumber: 47,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("p", {
					className: "mt-3 max-w-2xl text-sm leading-relaxed text-[var(--ca-text-muted)] sm:text-base",
					children: t.contact.intro
				}, void 0, false, {
					fileName: _jsxFileName$4,
					lineNumber: 50,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("div", {
					className: "mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2",
					children: [
						/* @__PURE__ */ jsxDEV("div", {
							className: "rounded-xl bg-[var(--ca-surface-subtle)] p-5",
							children: [
								/* @__PURE__ */ jsxDEV("div", {
									className: "flex items-center gap-2 text-xs font-semibold text-[var(--ca-text-muted)]",
									children: [/* @__PURE__ */ jsxDEV(MapPin, { className: "h-4 w-4 text-[var(--ca-accent)]" }, void 0, false, {
										fileName: _jsxFileName$4,
										lineNumber: 57,
										columnNumber: 17
									}, this), /* @__PURE__ */ jsxDEV("span", { children: t.contact.addressLabel }, void 0, false, {
										fileName: _jsxFileName$4,
										lineNumber: 58,
										columnNumber: 17
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName$4,
									lineNumber: 56,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ jsxDEV("p", {
									className: "mt-2 text-sm font-medium text-[var(--ca-text)]",
									children: STORE_CONFIG.brandName
								}, void 0, false, {
									fileName: _jsxFileName$4,
									lineNumber: 60,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ jsxDEV("p", {
									className: "mt-1 text-sm text-[var(--ca-text-muted)]",
									children: [
										STORE_CONFIG.address.streetAddress,
										/* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
											fileName: _jsxFileName$4,
											lineNumber: 65,
											columnNumber: 17
										}, this),
										STORE_CONFIG.address.locality,
										", ",
										STORE_CONFIG.address.region,
										" ",
										STORE_CONFIG.address.postalCode,
										", ",
										STORE_CONFIG.address.countryName
									]
								}, void 0, true, {
									fileName: _jsxFileName$4,
									lineNumber: 63,
									columnNumber: 15
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName$4,
							lineNumber: 55,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "rounded-xl bg-[var(--ca-surface-subtle)] p-5",
							children: [
								/* @__PURE__ */ jsxDEV("div", {
									className: "flex items-center gap-2 text-xs font-semibold text-[var(--ca-text-muted)]",
									children: [/* @__PURE__ */ jsxDEV(Clock, { className: "h-4 w-4 text-[var(--ca-accent)]" }, void 0, false, {
										fileName: _jsxFileName$4,
										lineNumber: 73,
										columnNumber: 17
									}, this), /* @__PURE__ */ jsxDEV("span", { children: t.contact.hoursLabel }, void 0, false, {
										fileName: _jsxFileName$4,
										lineNumber: 74,
										columnNumber: 17
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName$4,
									lineNumber: 72,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ jsxDEV("p", {
									className: "mt-2 text-sm font-medium text-[var(--ca-text)]",
									children: locale === "ur" ? STORE_CONFIG.openingHours.displayUr : STORE_CONFIG.openingHours.displayEn
								}, void 0, false, {
									fileName: _jsxFileName$4,
									lineNumber: 76,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ jsxDEV("p", {
									className: "mt-1 text-xs text-[var(--ca-text-muted)]",
									children: STORE_CONFIG.priceRange
								}, void 0, false, {
									fileName: _jsxFileName$4,
									lineNumber: 81,
									columnNumber: 15
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName$4,
							lineNumber: 71,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "rounded-xl bg-[var(--ca-surface-subtle)] p-5",
							children: [/* @__PURE__ */ jsxDEV("div", {
								className: "flex items-center gap-2 text-xs font-semibold text-[var(--ca-text-muted)]",
								children: [/* @__PURE__ */ jsxDEV(Phone, { className: "h-4 w-4 text-[var(--ca-accent)]" }, void 0, false, {
									fileName: _jsxFileName$4,
									lineNumber: 88,
									columnNumber: 17
								}, this), /* @__PURE__ */ jsxDEV("span", { children: t.contact.phoneLabel }, void 0, false, {
									fileName: _jsxFileName$4,
									lineNumber: 89,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$4,
								lineNumber: 87,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("a", {
								href: `tel:${STORE_CONFIG.phoneDisplay}`,
								className: "font-mono-nums mt-2 inline-flex min-h-[44px] items-center text-base font-semibold text-[var(--ca-text)] hover:text-[var(--ca-accent)]",
								children: [
									STORE_CONFIG.phoneE164,
									" (",
									STORE_CONFIG.phoneDisplay,
									")"
								]
							}, void 0, true, {
								fileName: _jsxFileName$4,
								lineNumber: 91,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$4,
							lineNumber: 86,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "rounded-xl bg-[var(--ca-surface-subtle)] p-5",
							children: [/* @__PURE__ */ jsxDEV("div", {
								className: "flex items-center gap-2 text-xs font-semibold text-[var(--ca-text-muted)]",
								children: [/* @__PURE__ */ jsxDEV(Mail, { className: "h-4 w-4 text-[var(--ca-accent)]" }, void 0, false, {
									fileName: _jsxFileName$4,
									lineNumber: 101,
									columnNumber: 17
								}, this), /* @__PURE__ */ jsxDEV("span", { children: t.contact.emailLabel }, void 0, false, {
									fileName: _jsxFileName$4,
									lineNumber: 102,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$4,
								lineNumber: 100,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("a", {
								href: `mailto:${STORE_CONFIG.email}`,
								className: "mt-2 inline-flex min-h-[44px] items-center text-base font-semibold text-[var(--ca-text)] hover:text-[var(--ca-accent)]",
								children: STORE_CONFIG.email
							}, void 0, false, {
								fileName: _jsxFileName$4,
								lineNumber: 104,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$4,
							lineNumber: 99,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName$4,
					lineNumber: 54,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("div", {
					className: "mt-8 flex flex-wrap gap-3",
					children: [
						/* @__PURE__ */ jsxDEV("a", {
							href: STORE_CONFIG.whatsappUrl,
							target: "_blank",
							rel: "noopener noreferrer",
							className: "btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-bg)]",
							children: [/* @__PURE__ */ jsxDEV(MessageCircle, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName$4,
								lineNumber: 120,
								columnNumber: 15
							}, this), t.contact.whatsappCta]
						}, void 0, true, {
							fileName: _jsxFileName$4,
							lineNumber: 114,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("a", {
							href: STORE_CONFIG.mapUrl,
							target: "_blank",
							rel: "noopener noreferrer",
							className: "btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-surface-subtle)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-text)]",
							children: [/* @__PURE__ */ jsxDEV(MapPin, { className: "h-4 w-4 text-[var(--ca-accent)]" }, void 0, false, {
								fileName: _jsxFileName$4,
								lineNumber: 129,
								columnNumber: 15
							}, this), t.contact.mapCta]
						}, void 0, true, {
							fileName: _jsxFileName$4,
							lineNumber: 123,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV(Link, {
							to: localize("/faq"),
							className: "btn-press inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-surface-subtle)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-text)]",
							children: t.contact.faqLinkLabel
						}, void 0, false, {
							fileName: _jsxFileName$4,
							lineNumber: 132,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName$4,
					lineNumber: 113,
					columnNumber: 11
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName$4,
			lineNumber: 46,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$4,
		lineNumber: 38,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName$4,
		lineNumber: 16,
		columnNumber: 5
	}, this);
}
// src/pages/LegalPages.tsx
var _jsxFileName$3 = "/app/applet/src/pages/LegalPages.tsx";
function TermsPage() {
	const { t, locale, localize } = useLocale();
	const [doc, setDoc] = useState(DEFAULT_TERMS_POLICY);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const loadTerms = useCallback(async () => {
		setError(null);
		try {
			const live = await productService.getTermsPolicy();
			setDoc(live);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not load Terms & Policy.");
		} finally {
			setLoading(false);
		}
	}, []);
	useEffect(() => {
		loadTerms();
	}, [loadTerms]);
	return /* @__PURE__ */ jsxDEV(Fragment, { children: [/* @__PURE__ */ jsxDEV(SeoHead, {
		title: locale === "ur" ? `شرائط و اقساط پالیسی — ${t.brand}` : "Terms & Installment Policy — Cinematic Arts (CA)",
		description: "Read Cinematic Arts terms of service, 7-day exchanges, PKR installment financing rules, and 10% seller referral commission.",
		canonicalPath: localize("/terms"),
		locale
	}, void 0, false, {
		fileName: _jsxFileName$3,
		lineNumber: 34,
		columnNumber: 7
	}, this), /* @__PURE__ */ jsxDEV("article", {
		className: "mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12",
		children: [/* @__PURE__ */ jsxDEV(Breadcrumbs, { items: [{
			label: t.nav.home,
			to: localize("/")
		}, { label: t.nav.terms }] }, void 0, false, {
			fileName: _jsxFileName$3,
			lineNumber: 45,
			columnNumber: 9
		}, this), /* @__PURE__ */ jsxDEV("div", {
			className: "glass-panel rounded-2xl p-7 sm:p-10 space-y-6",
			children: [/* @__PURE__ */ jsxDEV("header", {
				className: "pb-2",
				children: [/* @__PURE__ */ jsxDEV("p", {
					className: "text-xs text-[var(--ca-text-muted)]",
					children: doc.effectiveLabel
				}, void 0, false, {
					fileName: _jsxFileName$3,
					lineNumber: 53,
					columnNumber: 13
				}, this), /* @__PURE__ */ jsxDEV("h1", {
					className: "font-display mt-2 text-4xl font-semibold text-[var(--ca-text)]",
					children: locale === "ur" ? t.nav.terms : doc.title
				}, void 0, false, {
					fileName: _jsxFileName$3,
					lineNumber: 56,
					columnNumber: 13
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$3,
				lineNumber: 52,
				columnNumber: 11
			}, this), loading ? /* @__PURE__ */ jsxDEV("div", {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ jsxDEV("div", { className: "h-6 w-1/2 animate-pulse rounded-lg bg-[var(--ca-surface-subtle)]" }, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 63,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ jsxDEV("div", { className: "h-20 w-full animate-pulse rounded-xl bg-[var(--ca-surface-subtle)]" }, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 64,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ jsxDEV("div", { className: "h-20 w-full animate-pulse rounded-xl bg-[var(--ca-surface-subtle)]" }, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 65,
						columnNumber: 15
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName$3,
				lineNumber: 62,
				columnNumber: 13
			}, this) : error ? /* @__PURE__ */ jsxDEV("div", {
				className: "rounded-2xl border border-red-500/25 bg-red-500/10 p-5 text-sm text-red-700 dark:text-red-300",
				children: [/* @__PURE__ */ jsxDEV("p", { children: error }, void 0, false, {
					fileName: _jsxFileName$3,
					lineNumber: 69,
					columnNumber: 15
				}, this), /* @__PURE__ */ jsxDEV("button", {
					type: "button",
					onClick: loadTerms,
					className: "mt-3 inline-flex items-center gap-1.5 rounded-xl border border-current px-3.5 py-1.5 text-xs font-semibold",
					children: [/* @__PURE__ */ jsxDEV(RefreshCw, { className: "h-3.5 w-3.5" }, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 75,
						columnNumber: 17
					}, this), "Retry"]
				}, void 0, true, {
					fileName: _jsxFileName$3,
					lineNumber: 70,
					columnNumber: 15
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$3,
				lineNumber: 68,
				columnNumber: 13
			}, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [doc.sections.map((section) => /* @__PURE__ */ jsxDEV("section", {
				className: "space-y-2 text-sm leading-relaxed text-[var(--ca-text-muted)]",
				children: [/* @__PURE__ */ jsxDEV("h2", {
					className: "font-display text-2xl font-semibold text-[var(--ca-text)]",
					children: section.heading
				}, void 0, false, {
					fileName: _jsxFileName$3,
					lineNumber: 86,
					columnNumber: 19
				}, this), /* @__PURE__ */ jsxDEV("p", {
					className: "whitespace-pre-line",
					children: section.body
				}, void 0, false, {
					fileName: _jsxFileName$3,
					lineNumber: 89,
					columnNumber: 19
				}, this)]
			}, section.id, true, {
				fileName: _jsxFileName$3,
				lineNumber: 82,
				columnNumber: 17
			}, this)), /* @__PURE__ */ jsxDEV("footer", {
				className: "pt-4 text-xs text-[var(--ca-text-muted)] flex flex-wrap items-center justify-between gap-2",
				children: [/* @__PURE__ */ jsxDEV("span", { children: doc.footerNote || "Questions? Email masihsam587@gmail.com or call 03355329722." }, void 0, false, {
					fileName: _jsxFileName$3,
					lineNumber: 94,
					columnNumber: 17
				}, this), /* @__PURE__ */ jsxDEV("span", {
					className: "font-mono-nums",
					children: ["Updated ", doc.updatedAt.slice(0, 10)]
				}, void 0, true, {
					fileName: _jsxFileName$3,
					lineNumber: 98,
					columnNumber: 17
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$3,
				lineNumber: 93,
				columnNumber: 15
			}, this)] }, void 0, true, {
				fileName: _jsxFileName$3,
				lineNumber: 80,
				columnNumber: 13
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$3,
			lineNumber: 51,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$3,
		lineNumber: 44,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName$3,
		lineNumber: 33,
		columnNumber: 5
	}, this);
}
function PrivacyPage() {
	const { t, locale, localize } = useLocale();
	return /* @__PURE__ */ jsxDEV(Fragment, { children: [/* @__PURE__ */ jsxDEV(SeoHead, {
		title: locale === "ur" ? `پرائیویسی پالیسی — ${t.brand}` : "Privacy Policy & Data Usage — Cinematic Arts (CA)",
		description: "How Cinematic Arts handles customer delivery details, seller verification records, and account deletion rights.",
		canonicalPath: localize("/privacy"),
		locale
	}, void 0, false, {
		fileName: _jsxFileName$3,
		lineNumber: 114,
		columnNumber: 7
	}, this), /* @__PURE__ */ jsxDEV("article", {
		className: "mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12",
		children: [/* @__PURE__ */ jsxDEV(Breadcrumbs, { items: [{
			label: t.nav.home,
			to: localize("/")
		}, { label: t.nav.privacy }] }, void 0, false, {
			fileName: _jsxFileName$3,
			lineNumber: 125,
			columnNumber: 9
		}, this), /* @__PURE__ */ jsxDEV("div", {
			className: "glass-panel rounded-2xl p-7 sm:p-10 space-y-6",
			children: [
				/* @__PURE__ */ jsxDEV("header", {
					className: "pb-2",
					children: [/* @__PURE__ */ jsxDEV("p", {
						className: "text-xs text-[var(--ca-text-muted)]",
						children: [
							t.brandFull,
							" · ",
							t.locationShort
						]
					}, void 0, true, {
						fileName: _jsxFileName$3,
						lineNumber: 133,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("h1", {
						className: "font-display mt-2 text-4xl font-semibold text-[var(--ca-text)]",
						children: t.nav.privacy
					}, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 136,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$3,
					lineNumber: 132,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("section", {
					className: "space-y-2 text-sm leading-relaxed text-[var(--ca-text-muted)]",
					children: [/* @__PURE__ */ jsxDEV("h2", {
						className: "font-display text-2xl font-semibold text-[var(--ca-text)]",
						children: "1. Information We Collect"
					}, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 142,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("p", { children: "We collect only the contact and delivery fields required to fulfill your order: full name, mobile number, WhatsApp contact, street address, city, and postal code. Seller applicants additionally provide father's name and profile identification for installment referral verification." }, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 145,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$3,
					lineNumber: 141,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("section", {
					className: "space-y-2 text-sm leading-relaxed text-[var(--ca-text-muted)]",
					children: [/* @__PURE__ */ jsxDEV("h2", {
						className: "font-display text-2xl font-semibold text-[var(--ca-text)]",
						children: "2. How Your Data Is Used"
					}, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 154,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("p", { children: "Your contact details are used exclusively for order dispatch, WhatsApp delivery coordination, installment recovery tracking, and customer support replies. We never sell or rent customer records to third-party advertisers." }, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 157,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$3,
					lineNumber: 153,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("section", {
					className: "space-y-2 text-sm leading-relaxed text-[var(--ca-text-muted)]",
					children: [/* @__PURE__ */ jsxDEV("h2", {
						className: "font-display text-2xl font-semibold text-[var(--ca-text)]",
						children: "3. Account Deletion & Security"
					}, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 165,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("p", { children: "Customers may edit their personal delivery details or permanently delete their account at any time from the Profile screen. Passwords and administrative credentials are verified exclusively on the server using salted cryptographic hashing." }, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 168,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$3,
					lineNumber: 164,
					columnNumber: 11
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName$3,
			lineNumber: 131,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$3,
		lineNumber: 124,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName$3,
		lineNumber: 113,
		columnNumber: 5
	}, this);
}
// src/pages/NotFoundPage.tsx
var _jsxFileName$2 = "/app/applet/src/pages/NotFoundPage.tsx";
function NotFoundPage() {
	const { t, locale, isRtl, localize } = useLocale();
	const ArrowIcon = isRtl ? ArrowRight : ArrowLeft;
	return /* @__PURE__ */ jsxDEV(Fragment, { children: [/* @__PURE__ */ jsxDEV(SeoHead, {
		title: `404 Page Not Found — ${t.brand}`,
		description: "The requested page could not be found on Cinematic Arts (CA).",
		locale,
		noIndex: true
	}, void 0, false, {
		fileName: _jsxFileName$2,
		lineNumber: 12,
		columnNumber: 7
	}, this), /* @__PURE__ */ jsxDEV("section", {
		className: "mx-auto max-w-xl px-4 py-24 text-center",
		children: /* @__PURE__ */ jsxDEV("div", {
			className: "glass-panel rounded-2xl p-10",
			children: [
				/* @__PURE__ */ jsxDEV("p", {
					className: "font-mono-nums text-xs font-medium text-[var(--ca-accent)]",
					children: t.notFound.code
				}, void 0, false, {
					fileName: _jsxFileName$2,
					lineNumber: 20,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("h1", {
					className: "font-display mt-3 text-4xl font-semibold text-[var(--ca-text)]",
					children: t.notFound.heading
				}, void 0, false, {
					fileName: _jsxFileName$2,
					lineNumber: 23,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("p", {
					className: "mt-3 text-sm leading-relaxed text-[var(--ca-text-muted)]",
					children: t.notFound.body
				}, void 0, false, {
					fileName: _jsxFileName$2,
					lineNumber: 26,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("div", {
					className: "mt-7 flex flex-wrap justify-center gap-3",
					children: [/* @__PURE__ */ jsxDEV(Link, {
						to: localize("/"),
						className: "btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-bg)]",
						children: [/* @__PURE__ */ jsxDEV(ArrowIcon, { className: "h-3.5 w-3.5" }, void 0, false, {
							fileName: _jsxFileName$2,
							lineNumber: 34,
							columnNumber: 15
						}, this), t.notFound.backHome]
					}, void 0, true, {
						fileName: _jsxFileName$2,
						lineNumber: 30,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV(Link, {
						to: localize("/shop"),
						className: "inline-flex min-h-[44px] items-center rounded-xl border border-[var(--ca-border)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]",
						children: t.nav.browseShop
					}, void 0, false, {
						fileName: _jsxFileName$2,
						lineNumber: 37,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$2,
					lineNumber: 29,
					columnNumber: 11
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName$2,
			lineNumber: 19,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName$2,
		lineNumber: 18,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName$2,
		lineNumber: 11,
		columnNumber: 5
	}, this);
}
// src/App.tsx
/**
* @license
* SPDX-License-Identifier: Apache-2.0
*/
var _jsxFileName$1 = "/app/applet/src/App.tsx";
var OrdersPage = lazy(() => import("./assets/OrdersPage-LH2lIlVy.js").then((m) => ({ default: m.OrdersPage })));
var ProfilePage = lazy(() => import("./assets/ProfilePage-DKrZm3bZ.js").then((m) => ({ default: m.ProfilePage })));
var AuthPage = lazy(() => import("./assets/AuthPage-DF4RiyEB.js").then((m) => ({ default: m.AuthPage })));
var AdminPage = lazy(() => import("./assets/AdminPage-CMqWiOAr.js").then((m) => ({ default: m.AdminPage })));
var AdminModal = lazy(() => import("./assets/AdminModal-DcilNRBp.js").then((m) => ({ default: m.AdminModal })));
function PrivateRouteFallback() {
	return /* @__PURE__ */ jsxDEV("div", {
		className: "flex min-h-[60vh] items-center justify-center px-4",
		children: /* @__PURE__ */ jsxDEV(CALoader, {
			size: "lg",
			label: "Loading view..."
		}, void 0, false, {
			fileName: _jsxFileName$1,
			lineNumber: 54,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName$1,
		lineNumber: 53,
		columnNumber: 5
	}, this);
}
function PrivateShell({ children }) {
	return /* @__PURE__ */ jsxDEV(Suspense, {
		fallback: /* @__PURE__ */ jsxDEV(PrivateRouteFallback, {}, void 0, false, {
			fileName: _jsxFileName$1,
			lineNumber: 60,
			columnNumber: 30
		}, this),
		children
	}, void 0, false, {
		fileName: _jsxFileName$1,
		lineNumber: 60,
		columnNumber: 10
	}, this);
}
function ScrollToTop() {
	const { pathname } = useLocation();
	useEffect(() => {
		window.scrollTo({
			top: 0,
			behavior: "auto"
		});
	}, [pathname]);
	return null;
}
function AppShell({ queryClient: queryClient$1 = queryClient }) {
	const [adminOpen, setAdminOpen] = useState(false);
	const [networkError, setNetworkError] = useState(null);
	const handleCloseAdmin = () => {
		setAdminOpen(false);
		if (typeof window !== "undefined" && isValidAdminHash(window.location.hash)) window.history.replaceState(null, "", window.location.pathname + window.location.search);
	};
	useEffect(() => {
		const syncHash = () => {
			if (isValidAdminHash(window.location.hash)) setAdminOpen(true);
		};
		const onKeyDown = (e) => {
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "a") {
				e.preventDefault();
				setAdminOpen((prev) => {
					const next = !prev;
					if (!next && isValidAdminHash(window.location.hash)) window.history.replaceState(null, "", window.location.pathname + window.location.search);
					return next;
				});
			}
		};
		syncHash();
		window.addEventListener("hashchange", syncHash);
		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("hashchange", syncHash);
			window.removeEventListener("keydown", onKeyDown);
		};
	}, []);
	const renderStoreRoutes = (prefix) => {
		const p = (sub) => prefix ? `${prefix}${sub === "/" ? "" : sub}` : sub;
		return /* @__PURE__ */ jsxDEV(Fragment, { children: [
			/* @__PURE__ */ jsxDEV(Route, {
				path: p("/"),
				element: /* @__PURE__ */ jsxDEV(HomePage, { onNetworkError: setNetworkError }, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 129,
					columnNumber: 39
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 129,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV(Route, {
				path: p("/shop"),
				element: /* @__PURE__ */ jsxDEV(ShopPage, { onNetworkError: setNetworkError }, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 130,
					columnNumber: 43
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 130,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV(Route, {
				path: p("/category/:slug"),
				element: /* @__PURE__ */ jsxDEV(CategoryPage, {}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 131,
					columnNumber: 53
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 131,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV(Route, {
				path: p("/product/:slug"),
				element: /* @__PURE__ */ jsxDEV(ProductDetailPage, {}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 132,
					columnNumber: 52
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 132,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV(Route, {
				path: p("/about"),
				element: /* @__PURE__ */ jsxDEV(AboutPage, {}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 133,
					columnNumber: 44
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 133,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV(Route, {
				path: p("/faq"),
				element: /* @__PURE__ */ jsxDEV(FaqPage, {}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 134,
					columnNumber: 42
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 134,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV(Route, {
				path: p("/size-guide"),
				element: /* @__PURE__ */ jsxDEV(SizeGuidePage, {}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 135,
					columnNumber: 49
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 135,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV(Route, {
				path: p("/shipping"),
				element: /* @__PURE__ */ jsxDEV(ShippingPage, {}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 136,
					columnNumber: 47
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 136,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV(Route, {
				path: p("/contact"),
				element: /* @__PURE__ */ jsxDEV(ContactPage, {}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 137,
					columnNumber: 46
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 137,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV(Route, {
				path: p("/terms"),
				element: /* @__PURE__ */ jsxDEV(TermsPage, {}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 138,
					columnNumber: 44
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 138,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV(Route, {
				path: p("/privacy"),
				element: /* @__PURE__ */ jsxDEV(PrivacyPage, {}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 139,
					columnNumber: 46
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 139,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV(Route, {
				path: p("/orders"),
				element: /* @__PURE__ */ jsxDEV(PrivateShell, { children: /* @__PURE__ */ jsxDEV(OrdersPage, {}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 140,
					columnNumber: 59
				}, this) }, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 140,
					columnNumber: 45
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 140,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV(Route, {
				path: p("/cart"),
				element: /* @__PURE__ */ jsxDEV(PrivateShell, { children: /* @__PURE__ */ jsxDEV(OrdersPage, {}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 141,
					columnNumber: 57
				}, this) }, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 141,
					columnNumber: 43
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 141,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV(Route, {
				path: p("/checkout"),
				element: /* @__PURE__ */ jsxDEV(PrivateShell, { children: /* @__PURE__ */ jsxDEV(OrdersPage, {}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 142,
					columnNumber: 61
				}, this) }, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 142,
					columnNumber: 47
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 142,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV(Route, {
				path: p("/profile"),
				element: /* @__PURE__ */ jsxDEV(PrivateShell, { children: /* @__PURE__ */ jsxDEV(ProfilePage, {}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 143,
					columnNumber: 60
				}, this) }, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 143,
					columnNumber: 46
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 143,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV(Route, {
				path: p("/auth"),
				element: /* @__PURE__ */ jsxDEV(PrivateShell, { children: /* @__PURE__ */ jsxDEV(AuthPage, {}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 144,
					columnNumber: 57
				}, this) }, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 144,
					columnNumber: 43
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 144,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV(Route, {
				path: p("/admin"),
				element: /* @__PURE__ */ jsxDEV(PrivateShell, { children: /* @__PURE__ */ jsxDEV(AdminPage, {}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 145,
					columnNumber: 58
				}, this) }, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 145,
					columnNumber: 44
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 145,
				columnNumber: 9
			}, this)
		] }, void 0, true, {
			fileName: _jsxFileName$1,
			lineNumber: 128,
			columnNumber: 7
		}, this);
	};
	return /* @__PURE__ */ jsxDEV(ErrorBoundary, { children: /* @__PURE__ */ jsxDEV(QueryClientProvider, {
		client: queryClient$1,
		children: /* @__PURE__ */ jsxDEV(ThemeProvider, { children: /* @__PURE__ */ jsxDEV(ToastProvider, { children: /* @__PURE__ */ jsxDEV(AuthProvider, { children: /* @__PURE__ */ jsxDEV(CartProvider, { children: [
			/* @__PURE__ */ jsxDEV(RouteSeoManager, {}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 157,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ jsxDEV(ScrollToTop, {}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 158,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ jsxDEV(IntroSplash, {}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 159,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ jsxDEV(Layout, {
				networkError,
				onRetry: () => window.location.reload(),
				children: /* @__PURE__ */ jsxDEV(Routes, { children: [
					renderStoreRoutes(""),
					renderStoreRoutes("/ur"),
					/* @__PURE__ */ jsxDEV(Route, {
						path: "/ur/*",
						element: /* @__PURE__ */ jsxDEV(NotFoundPage, {}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 167,
							columnNumber: 50
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 167,
						columnNumber: 21
					}, this),
					/* @__PURE__ */ jsxDEV(Route, {
						path: "*",
						element: /* @__PURE__ */ jsxDEV(NotFoundPage, {}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 168,
							columnNumber: 46
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 168,
						columnNumber: 21
					}, this)
				] }, void 0, true, {
					fileName: _jsxFileName$1,
					lineNumber: 164,
					columnNumber: 19
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 160,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ jsxDEV(PurchaseSheet, {}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 171,
				columnNumber: 17
			}, this),
			adminOpen && /* @__PURE__ */ jsxDEV(Suspense, {
				fallback: null,
				children: /* @__PURE__ */ jsxDEV(AdminModal, {
					open: adminOpen,
					onClose: handleCloseAdmin
				}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 174,
					columnNumber: 21
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 173,
				columnNumber: 19
			}, this)
		] }, void 0, true, {
			fileName: _jsxFileName$1,
			lineNumber: 156,
			columnNumber: 15
		}, this) }, void 0, false, {
			fileName: _jsxFileName$1,
			lineNumber: 155,
			columnNumber: 13
		}, this) }, void 0, false, {
			fileName: _jsxFileName$1,
			lineNumber: 154,
			columnNumber: 11
		}, this) }, void 0, false, {
			fileName: _jsxFileName$1,
			lineNumber: 153,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName$1,
		lineNumber: 152,
		columnNumber: 7
	}, this) }, void 0, false, {
		fileName: _jsxFileName$1,
		lineNumber: 151,
		columnNumber: 5
	}, this);
}
// src/entry-server.tsx
var _jsxFileName = "/app/applet/src/entry-server.tsx";
var KNOWN_STATIC_BASE_PATHS = /* @__PURE__ */ new Set([
	"/",
	"/shop",
	"/about",
	"/faq",
	"/size-guide",
	"/shipping",
	"/contact",
	"/terms",
	"/privacy",
	"/orders",
	"/cart",
	"/checkout",
	"/profile",
	"/auth",
	"/admin"
]);
function renderRoute(options) {
	const origin = (options.origin || STORE_CONFIG.siteUrl).replace(/\/+$/, "");
	const parsedUrl = new globalThis.URL(options.url || "/", origin);
	const pathname = parsedUrl.pathname || "/";
	const search = parsedUrl.search || "";
	const locale = getLocaleFromPath(pathname);
	const rawBasePath = stripLocalePrefix(pathname);
	const basePath = rawBasePath.length > 1 ? rawBasePath.replace(/\/+$/, "") : rawBasePath;
	const { snapshot } = options;
	if (basePath.startsWith("/product/")) {
		const redirected = resolveProductSlugRedirect(basePath.slice(9).split("/")[0] || "", snapshot.slugRedirects);
		if (redirected) {
			const targetPath = localizePath(`/product/${redirected}`, locale);
			const seoConfig = getRouteSeoConfig(targetPath, "", origin);
			return {
				html: "",
				headTagsHtml: renderHeadTagsHtml(seoConfig, origin),
				lang: locale,
				dir: locale === "ur" ? "rtl" : "ltr",
				statusCode: 301,
				redirectTo: `${targetPath}${search}`,
				dehydratedState: {
					mutations: [],
					queries: []
				},
				seoConfig
			};
		}
	}
	const ssrQueryClient = new QueryClient({ defaultOptions: { queries: {
		staleTime: 3e5,
		retry: false
	} } });
	ssrQueryClient.setQueryData(["home", "catalog"], {
		allProducts: snapshot.products,
		featuredProducts: snapshot.products.slice(0, 6),
		categories: snapshot.categories,
		plans: snapshot.plans
	});
	ssrQueryClient.setQueryData(["categories"], snapshot.categories);
	ssrQueryClient.setQueryData(["products", {
		categoryId: "all",
		search: "",
		sort: "latest"
	}], snapshot.products);
	let statusCode = 200;
	let seoConfig = getRouteSeoConfig(pathname, search, origin);
	if (basePath === "/shop") {
		const categoryParam = parsedUrl.searchParams.get("category") || "all";
		const searchParam = parsedUrl.searchParams.get("q") || "";
		if (categoryParam !== "all" || searchParam) {
			const qLower = searchParam.trim().toLowerCase();
			const filtered = snapshot.products.filter((p) => {
				const matchCat = categoryParam === "all" || p.categoryId === categoryParam || p.categoryId === `cat-${categoryParam}`;
				const matchSearch = !qLower || p.title.toLowerCase().includes(qLower) || p.description.toLowerCase().includes(qLower) || p.categoryName.toLowerCase().includes(qLower);
				return matchCat && matchSearch;
			});
			ssrQueryClient.setQueryData(["products", {
				categoryId: categoryParam,
				search: searchParam,
				sort: "latest"
			}], filtered);
		}
	} else if (basePath.startsWith("/category/")) {
		const slug = basePath.slice(10).split("/")[0] || "";
		const clean = slug.toLowerCase();
		const matchedCategory = snapshot.categories.find((c) => c.slug.toLowerCase() === clean || c.id.toLowerCase() === clean || c.id.toLowerCase() === `cat-${clean}`) || null;
		ssrQueryClient.setQueryData(["category", slug], {
			categories: snapshot.categories,
			allProducts: snapshot.products
		});
		if (matchedCategory) seoConfig = buildCategorySeoConfig(matchedCategory, origin, locale);
		else {
			statusCode = 404;
			seoConfig = {
				...seoConfig,
				noIndex: true
			};
		}
	} else if (basePath.startsWith("/product/")) {
		const slug = basePath.slice(9).split("/")[0] || "";
		const clean = slug.toLowerCase();
		const matchedProduct = snapshot.products.find((p) => p.slug.toLowerCase() === clean) || null;
		ssrQueryClient.setQueryData(["product", slug], {
			product: matchedProduct,
			plans: snapshot.plans,
			catalog: snapshot.products.slice(0, 12)
		});
		if (matchedProduct) seoConfig = buildProductSeoConfig(matchedProduct, origin, locale);
		else {
			statusCode = 404;
			seoConfig = {
				...seoConfig,
				noIndex: true
			};
		}
	} else if (!KNOWN_STATIC_BASE_PATHS.has(basePath)) {
		statusCode = 404;
		seoConfig = {
			...seoConfig,
			noIndex: true
		};
	}
	const locationPath = `${pathname}${search}`;
	const html = renderToString(/* @__PURE__ */ jsxDEV(StaticRouter, {
		location: locationPath,
		children: /* @__PURE__ */ jsxDEV(AppShell, { queryClient: ssrQueryClient }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 185,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 184,
		columnNumber: 5
	}, this));
	const dehydratedState = dehydrate(ssrQueryClient);
	ssrQueryClient.clear();
	return {
		html,
		headTagsHtml: renderHeadTagsHtml(seoConfig, origin),
		lang: locale,
		dir: locale === "ur" ? "rtl" : "ltr",
		statusCode,
		dehydratedState,
		seoConfig
	};
}
export { NotificationListSkeleton as a, TurnstileField as c, useTheme as d, FriendlyErrorState as i, ResilientImage as l, AdminWorkspaceSkeleton as n, ProfilePageSkeleton as o, CardListSkeleton as r, renderRoute, SellerDashboardSkeleton as s, SeoHead as t, useCart as u };
