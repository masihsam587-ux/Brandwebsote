import { _ as sanitizePlainText, c as storageService, f as canTriggerAction, m as evaluatePasswordStrength, r as authService, v as sanitizeUrlPath } from "./api-CtuVoLbu.js";
import { S as useToast, _ as signupUserSchema, b as useAuth, f as forgotPasswordSchema, g as signupSellerSchema, n as CALoadingOverlay, p as loginSchema, r as CAProcessButton, t as CALoader } from "./CALoader-DYHlE_Xc.js";
import { c as TurnstileField, t as SeoHead } from "../entry-server.js";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { ArrowRight, Check, Circle, Copy, Eye, EyeOff, Upload } from "lucide-react";
// src/components/PasswordStrengthMeter.tsx
function PasswordStrengthMeter({ password }) {
	if (!password) return null;
	const { score, label, checks } = evaluatePasswordStrength(password);
	const barColors = [
		"bg-red-500",
		"bg-red-500",
		"bg-amber-500",
		"bg-emerald-500",
		"bg-emerald-600"
	];
	const requirements = [
		{
			ok: checks.minLength,
			text: "At least 8 characters"
		},
		{
			ok: checks.hasUpper,
			text: "Uppercase letter (A-Z)"
		},
		{
			ok: checks.hasLower,
			text: "Lowercase letter (a-z)"
		},
		{
			ok: checks.hasDigitOrSymbol,
			text: "Number or symbol"
		}
	];
	return /* @__PURE__ */ jsxs("div", {
		className: "mt-2 space-y-2 rounded-xl bg-[var(--ca-surface-subtle)] p-3",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center justify-between text-[11px]",
				children: [/* @__PURE__ */ jsx("span", {
					className: "text-[var(--ca-text-muted)]",
					children: "Password strength"
				}), /* @__PURE__ */ jsx("span", {
					className: "font-semibold text-[var(--ca-text)]",
					children: label
				})]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "grid grid-cols-4 gap-1.5",
				"aria-hidden": "true",
				children: [
					1,
					2,
					3,
					4
				].map((step) => /* @__PURE__ */ jsx("div", { className: `h-1.5 rounded-sm transition-colors ${score >= step ? barColors[score] : "bg-[var(--ca-border)]"}` }, step))
			}),
			/* @__PURE__ */ jsx("ul", {
				className: "grid grid-cols-2 gap-1 text-[11px]",
				children: requirements.map((req) => /* @__PURE__ */ jsxs("li", {
					className: `flex items-center gap-1 ${req.ok ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--ca-text-muted)]"}`,
					children: [req.ok ? /* @__PURE__ */ jsx(Check, { className: "h-3 w-3 shrink-0" }) : /* @__PURE__ */ jsx(Circle, { className: "h-2.5 w-2.5 shrink-0" }), /* @__PURE__ */ jsx("span", { children: req.text })]
				}, req.text))
			})
		]
	});
}
// src/pages/AuthPage.tsx
function AuthPage() {
	const { login, signup } = useAuth();
	const { showToast } = useToast();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const safeRedirect = sanitizeUrlPath(searchParams.get("redirect"), "/profile");
	const [mode, setMode] = useState("login");
	const [accountType, setAccountType] = useState("user");
	const [showPassword, setShowPassword] = useState(false);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [phone, setPhone] = useState("");
	const [whatsapp, setWhatsapp] = useState("");
	const [address, setAddress] = useState("");
	const [city, setCity] = useState("Peshawar");
	const [postalCode, setPostalCode] = useState("25000");
	const [fatherName, setFatherName] = useState("");
	const [avatarUrl, setAvatarUrl] = useState("");
	const [acceptedLegal, setAcceptedLegal] = useState(false);
	const [honeypot, setHoneypot] = useState("");
	const [turnstileToken, setTurnstileToken] = useState("");
	const [error, setError] = useState(null);
	const [infoMsg, setInfoMsg] = useState(null);
	const [loading, setLoading] = useState(false);
	const [uploadingAvatar, setUploadingAvatar] = useState(false);
	const [submitStatus, setSubmitStatus] = useState("idle");
	const [generatedSellerId, setGeneratedSellerId] = useState(null);
	const [copied, setCopied] = useState(false);
	const triggerError = (msg) => {
		setError(msg);
		setSubmitStatus("error");
		window.setTimeout(() => setSubmitStatus("idle"), 500);
	};
	const handleAvatarUpload = async (file) => {
		if (!file || uploadingAvatar) return;
		setUploadingAvatar(true);
		try {
			const url = await storageService.uploadImage(file, "avatars");
			setAvatarUrl(url);
			showToast("Profile portrait attached.", "success");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Upload failed", "error");
		} finally {
			setUploadingAvatar(false);
		}
	};
	const handleSubmit = async (e) => {
		e.preventDefault();
		if (loading || uploadingAvatar) return;
		if (!canTriggerAction("auth-submit", 800)) return;
		setError(null);
		setInfoMsg(null);
		setSubmitStatus("idle");
		if (mode === "forgot") {
			const parsed = forgotPasswordSchema.safeParse({ email });
			if (!parsed.success) {
				triggerError(parsed.error.issues[0]?.message || "Enter a valid email address.");
				return;
			}
			setLoading(true);
			try {
				const res = await authService.requestPasswordReset(parsed.data.email);
				setInfoMsg(res.message);
				setSubmitStatus("success");
			} catch (err) {
				triggerError(err instanceof Error ? err.message : "Reset failed");
			} finally {
				setLoading(false);
			}
			return;
		}
		if (mode === "login") {
			const parsed = loginSchema.safeParse({
				email,
				password
			});
			if (!parsed.success) {
				triggerError(parsed.error.issues[0]?.message || "Email and password are required.");
				return;
			}
			setLoading(true);
			try {
				await login({
					email: parsed.data.email,
					password: parsed.data.password,
					honeypot: honeypot || void 0,
					turnstileToken: turnstileToken || void 0
				});
				setSubmitStatus("success");
				showToast("Signed in to Cinematic Arts.", "success");
				navigate(safeRedirect, { replace: true });
			} catch (err) {
				triggerError(err instanceof Error ? err.message : "Invalid credentials.");
			} finally {
				setLoading(false);
			}
			return;
		}
		if (!acceptedLegal) {
			triggerError("You must accept the Terms of Service and Privacy Policy to create an account.");
			return;
		}
		if (accountType === "seller") {
			const parsed = signupSellerSchema.safeParse({
				role: "seller",
				name,
				email,
				password,
				phone,
				whatsapp,
				address,
				city,
				postalCode,
				fatherName,
				avatarUrl: avatarUrl || void 0
			});
			if (!parsed.success) {
				triggerError(parsed.error.issues[0]?.message || "Review your seller registration details.");
				return;
			}
			setLoading(true);
			try {
				const createdUser = await signup({
					role: "seller",
					name: sanitizePlainText(parsed.data.name, 80),
					email: parsed.data.email,
					password: parsed.data.password,
					phone: parsed.data.phone,
					whatsapp: parsed.data.whatsapp,
					address: sanitizePlainText(parsed.data.address, 200),
					city: sanitizePlainText(parsed.data.city, 60),
					postalCode: parsed.data.postalCode,
					fatherName: sanitizePlainText(parsed.data.fatherName, 80),
					avatarUrl: parsed.data.avatarUrl,
					honeypot: honeypot || void 0,
					turnstileToken: turnstileToken || void 0
				});
				setSubmitStatus("success");
				if (createdUser.emailConfirmationRequired) {
					setInfoMsg("Seller account created! Please confirm your email via the link sent to your inbox, then sign in to activate your Seller ID and profile portrait.");
					setMode("login");
					showToast("Check your email to confirm your account.", "info");
				} else if (createdUser.role === "seller" && createdUser.sellerCode) {
					setGeneratedSellerId(createdUser.sellerCode);
					showToast(`Seller account created! ID: ${createdUser.sellerCode}`, "success");
				} else {
					showToast("Account created successfully.", "success");
					navigate(safeRedirect, { replace: true });
				}
			} catch (err) {
				triggerError(err instanceof Error ? err.message : "Could not create account.");
			} finally {
				setLoading(false);
			}
			return;
		}
		const parsedUser = signupUserSchema.safeParse({
			role: "user",
			name,
			email,
			password
		});
		if (!parsedUser.success) {
			triggerError(parsedUser.error.issues[0]?.message || "Check your registration fields.");
			return;
		}
		setLoading(true);
		try {
			const created = await signup({
				role: "user",
				name: sanitizePlainText(parsedUser.data.name, 80),
				email: parsedUser.data.email,
				password: parsedUser.data.password,
				honeypot: honeypot || void 0,
				turnstileToken: turnstileToken || void 0
			});
			setSubmitStatus("success");
			if (created.emailConfirmationRequired) {
				setInfoMsg("Account created! Please check your email inbox and confirm your address before signing in.");
				setMode("login");
				showToast("Check your email to confirm your account.", "info");
			} else {
				showToast("Account created successfully.", "success");
				navigate(safeRedirect, { replace: true });
			}
		} catch (err) {
			triggerError(err instanceof Error ? err.message : "Could not create account.");
		} finally {
			setLoading(false);
		}
	};
	if (generatedSellerId) return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(SeoHead, {
		title: "Seller Verified — Cinematic Arts (CA)",
		description: "Your Cinematic Arts Seller Referral ID is ready.",
		canonicalPath: "/auth",
		noIndex: true
	}), /* @__PURE__ */ jsx("section", {
		className: "mx-auto max-w-lg px-4 py-14 sm:px-6",
		children: /* @__PURE__ */ jsxs("div", {
			className: "glass-panel rounded-2xl p-8 text-center",
			children: [
				/* @__PURE__ */ jsx("p", {
					className: "text-xs font-medium text-[var(--ca-accent)]",
					children: "Seller account verified"
				}),
				/* @__PURE__ */ jsx("h1", {
					className: "font-display mt-2 text-3xl font-semibold text-[var(--ca-text)]",
					children: "Welcome to CA Seller Network"
				}),
				/* @__PURE__ */ jsxs("p", {
					className: "mt-3 text-sm text-[var(--ca-text-muted)]",
					children: [
						"Share your unique Seller Referral ID with customers. You earn ",
						/* @__PURE__ */ jsx("strong", { children: "10% commission" }),
						" on every completed referred order."
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-6 rounded-xl bg-[var(--ca-surface-subtle)] p-5",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "text-xs text-[var(--ca-text-muted)]",
							children: "Your Unique Seller ID"
						}),
						/* @__PURE__ */ jsx("p", {
							className: "font-mono-nums mt-1 text-3xl font-bold text-[var(--ca-accent)]",
							children: generatedSellerId
						}),
						/* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => {
								navigator.clipboard?.writeText(generatedSellerId);
								setCopied(true);
								window.setTimeout(() => setCopied(false), 2e3);
							},
							className: "mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[var(--ca-border)] px-3.5 py-1.5 text-xs font-medium",
							children: [copied ? /* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5 text-emerald-600" }) : /* @__PURE__ */ jsx(Copy, { className: "h-3.5 w-3.5" }), copied ? "Copied ID" : "Copy Seller ID"]
						})
					]
				}),
				/* @__PURE__ */ jsxs("button", {
					type: "button",
					onClick: () => navigate(safeRedirect, { replace: true }),
					className: "btn-press mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ca-text)] py-3 text-sm font-semibold text-[var(--ca-bg)]",
					children: ["Open Seller Dashboard", /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" })]
				})
			]
		})
	})] });
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx(CALoadingOverlay, {
			open: loading || uploadingAvatar,
			label: uploadingAvatar ? "Uploading portrait..." : mode === "login" ? "Signing you in..." : mode === "signup" ? "Creating your account..." : "Sending reset instructions..."
		}),
		/* @__PURE__ */ jsx(SeoHead, {
			title: "Sign In or Join — Cinematic Arts (CA)",
			description: "Sign in to track orders or register as a Cinematic Arts Customer or Verified Seller to earn 10% referral commission.",
			canonicalPath: "/auth",
			noIndex: true
		}),
		/* @__PURE__ */ jsx("section", {
			className: "mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14",
			children: /* @__PURE__ */ jsxs("div", {
				className: "glass-panel rounded-2xl p-6 sm:p-8",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between gap-4 pb-2",
						children: [/* @__PURE__ */ jsx("h1", {
							className: "font-display text-3xl font-semibold text-[var(--ca-text)]",
							children: mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Reset Password"
						}), mode !== "forgot" && /* @__PURE__ */ jsxs("div", {
							className: "flex rounded-xl bg-[var(--ca-surface-subtle)] p-1 text-xs font-semibold",
							children: [/* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => {
									setMode("login");
									setError(null);
								},
								className: `rounded-lg px-3 py-1.5 transition-colors ${mode === "login" ? "bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm" : "text-[var(--ca-text-muted)]"}`,
								children: "Login"
							}), /* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => {
									setMode("signup");
									setError(null);
								},
								className: `rounded-lg px-3 py-1.5 transition-colors ${mode === "signup" ? "bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm" : "text-[var(--ca-text-muted)]"}`,
								children: "Sign Up"
							})]
						})]
					}),
					error && /* @__PURE__ */ jsx("div", {
						role: "alert",
						className: "ca-shake mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-600 dark:text-red-400",
						children: error
					}),
					infoMsg && /* @__PURE__ */ jsx("div", {
						role: "status",
						className: "mt-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300",
						children: infoMsg
					}),
					/* @__PURE__ */ jsxs("form", {
						onSubmit: handleSubmit,
						noValidate: true,
						className: "mt-5 space-y-4",
						children: [
							mode === "signup" && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
								className: "block text-xs font-medium text-[var(--ca-text-muted)]",
								children: "Account Type"
							}), /* @__PURE__ */ jsxs("div", {
								className: "mt-1.5 grid grid-cols-2 gap-2 rounded-xl bg-[var(--ca-surface-subtle)] p-1",
								children: [/* @__PURE__ */ jsx("button", {
									type: "button",
									onClick: () => setAccountType("user"),
									className: `rounded-lg py-2 text-xs font-semibold ${accountType === "user" ? "bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm" : "text-[var(--ca-text-muted)]"}`,
									children: "User Account"
								}), /* @__PURE__ */ jsx("button", {
									type: "button",
									onClick: () => setAccountType("seller"),
									className: `rounded-lg py-2 text-xs font-semibold ${accountType === "seller" ? "bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm" : "text-[var(--ca-text-muted)]"}`,
									children: "Seller Account (10% Commission)"
								})]
							})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "block text-xs font-medium text-[var(--ca-text-muted)]",
								children: "Full Name *"
							}), /* @__PURE__ */ jsx("input", {
								type: "text",
								required: true,
								maxLength: 80,
								autoComplete: "name",
								value: name,
								onChange: (e) => setName(e.target.value),
								placeholder: "Your full name",
								className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
							})] })] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "block text-xs font-medium text-[var(--ca-text-muted)]",
								children: "Email Address *"
							}), /* @__PURE__ */ jsx("input", {
								type: "email",
								required: true,
								maxLength: 120,
								autoComplete: "email",
								value: email,
								onChange: (e) => setEmail(e.target.value),
								placeholder: "you@example.com",
								className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
							})] }),
							mode !== "forgot" && /* @__PURE__ */ jsxs("div", { children: [
								/* @__PURE__ */ jsxs("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ jsx("label", {
										className: "block text-xs font-medium text-[var(--ca-text-muted)]",
										children: "Password *"
									}), mode === "login" && /* @__PURE__ */ jsx("button", {
										type: "button",
										onClick: () => setMode("forgot"),
										className: "text-xs text-[var(--ca-accent)] hover:underline",
										children: "Forgot password?"
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "relative mt-1",
									children: [/* @__PURE__ */ jsx("input", {
										type: showPassword ? "text" : "password",
										required: true,
										minLength: mode === "signup" ? 8 : 1,
										maxLength: 128,
										autoComplete: mode === "login" ? "current-password" : "new-password",
										value: password,
										onChange: (e) => setPassword(e.target.value),
										placeholder: "••••••••",
										className: "w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 pr-10 text-sm"
									}), /* @__PURE__ */ jsx("button", {
										type: "button",
										onClick: () => setShowPassword((v) => !v),
										"aria-label": showPassword ? "Hide password" : "Show password",
										className: "absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ca-text-muted)]",
										children: showPassword ? /* @__PURE__ */ jsx(EyeOff, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx(Eye, { className: "h-4 w-4" })
									})]
								}),
								mode === "signup" && /* @__PURE__ */ jsx(PasswordStrengthMeter, { password })
							] }),
							mode === "signup" && accountType === "seller" && /* @__PURE__ */ jsxs("div", {
								className: "grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2",
								children: [
									/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "block text-xs font-medium text-[var(--ca-text-muted)]",
										children: "Father's Name *"
									}), /* @__PURE__ */ jsx("input", {
										type: "text",
										required: true,
										maxLength: 80,
										value: fatherName,
										onChange: (e) => setFatherName(e.target.value),
										placeholder: "Father's full name",
										className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
									})] }),
									/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "block text-xs font-medium text-[var(--ca-text-muted)]",
										children: "Phone Number *"
									}), /* @__PURE__ */ jsx("input", {
										type: "tel",
										required: true,
										maxLength: 24,
										value: phone,
										onChange: (e) => setPhone(e.target.value),
										placeholder: "03355329722",
										className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
									})] }),
									/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "block text-xs font-medium text-[var(--ca-text-muted)]",
										children: "WhatsApp Number *"
									}), /* @__PURE__ */ jsx("input", {
										type: "tel",
										required: true,
										maxLength: 24,
										value: whatsapp,
										onChange: (e) => setWhatsapp(e.target.value),
										placeholder: "03355329722",
										className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
									})] }),
									/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "block text-xs font-medium text-[var(--ca-text-muted)]",
										children: "Postal Code *"
									}), /* @__PURE__ */ jsx("input", {
										type: "text",
										required: true,
										maxLength: 12,
										value: postalCode,
										onChange: (e) => setPostalCode(e.target.value),
										placeholder: "25000",
										className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
									})] }),
									/* @__PURE__ */ jsxs("div", {
										className: "sm:col-span-2",
										children: [/* @__PURE__ */ jsx("label", {
											className: "block text-xs font-medium text-[var(--ca-text-muted)]",
											children: "Full Residential / Office Address *"
										}), /* @__PURE__ */ jsx("input", {
											type: "text",
											required: true,
											maxLength: 200,
											value: address,
											onChange: (e) => setAddress(e.target.value),
											placeholder: "Street 4, University Town, Peshawar",
											className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
										})]
									}),
									/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "block text-xs font-medium text-[var(--ca-text-muted)]",
										children: "City"
									}), /* @__PURE__ */ jsx("input", {
										type: "text",
										maxLength: 60,
										value: city,
										onChange: (e) => setCity(e.target.value),
										className: "mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
									})] }),
									/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "block text-xs font-medium text-[var(--ca-text-muted)]",
										children: "Profile Photo Upload"
									}), /* @__PURE__ */ jsxs("label", {
										className: "mt-1 flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-xs font-medium hover:bg-[var(--ca-surface-subtle)]",
										children: [
											uploadingAvatar ? /* @__PURE__ */ jsx(CALoader, { size: "sm" }) : /* @__PURE__ */ jsx(Upload, { className: "h-3.5 w-3.5" }),
											/* @__PURE__ */ jsx("span", { children: uploadingAvatar ? "Processing..." : avatarUrl ? "Photo Attached" : "Upload Portrait" }),
											/* @__PURE__ */ jsx("input", {
												type: "file",
												accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
												disabled: uploadingAvatar,
												className: "hidden",
												onChange: (e) => handleAvatarUpload(e.target.files?.[0])
											})
										]
									})] })
								]
							}),
							mode === "signup" && /* @__PURE__ */ jsxs("label", {
								className: "flex items-start gap-2.5 pt-1 text-xs text-[var(--ca-text-muted)]",
								children: [/* @__PURE__ */ jsx("input", {
									type: "checkbox",
									checked: acceptedLegal,
									onChange: (e) => setAcceptedLegal(e.target.checked),
									className: "mt-0.5"
								}), /* @__PURE__ */ jsxs("span", { children: [
									"I agree to the",
									" ",
									/* @__PURE__ */ jsx(Link, {
										to: "/terms",
										className: "text-[var(--ca-text)] underline",
										children: "Terms of Service & Installment Policy"
									}),
									" ",
									"and",
									" ",
									/* @__PURE__ */ jsx(Link, {
										to: "/privacy",
										className: "text-[var(--ca-text)] underline",
										children: "Privacy Policy"
									}),
									"."
								] })]
							}),
							/* @__PURE__ */ jsx(TurnstileField, {
								action: `auth_${mode}`,
								onToken: setTurnstileToken,
								honeypot,
								onHoneypotChange: setHoneypot
							}),
							/* @__PURE__ */ jsx(CAProcessButton, {
								type: "submit",
								loading,
								status: submitStatus,
								disabled: uploadingAvatar,
								className: "w-full rounded-xl bg-[var(--ca-text)] py-3 text-sm font-semibold text-[var(--ca-bg)] hover:opacity-90",
								children: mode === "login" ? "Sign In" : mode === "signup" ? accountType === "seller" ? "Register & Generate Seller ID" : "Create Customer Account" : "Send Reset Instructions"
							}),
							mode === "forgot" && /* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => setMode("login"),
								className: "w-full text-center text-xs font-medium text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]",
								children: "Back to Login"
							})
						]
					})
				]
			})
		})
	] });
}
export { AuthPage };
