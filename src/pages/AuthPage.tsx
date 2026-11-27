import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Copy, Check, Upload, ArrowRight } from 'lucide-react';
import { authService, storageService } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLocale } from '../i18n';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import {
  canTriggerAction,
  copyTextToClipboard,
  sanitizePlainText,
  sanitizeUrlPath,
} from '../utils/security';
import {
  forgotPasswordSchema,
  loginSchema,
  passwordPolicySchema,
  signupSellerSchema,
  signupUserSchema,
} from '../utils/validation';
import { SeoHead } from '../components/SeoHead';
import { CALoader, CALoadingOverlay, CAProcessButton } from '../components/CALoader';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { TurnstileField } from '../components/TurnstileField';

export function AuthPage() {
  const { login, signup, refreshSession } = useAuth();
  const { showToast } = useToast();
  const { localize } = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const safeRedirect = sanitizeUrlPath(searchParams.get('redirect'), '/profile');
  const initialRecovery =
    searchParams.get('type') === 'recovery' ||
    (typeof window !== 'undefined' && window.location.hash.includes('type=recovery'));

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'update_password'>(
    initialRecovery ? 'update_password' : 'login'
  );
  const [accountType, setAccountType] = useState<'user' | 'seller'>('user');
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Peshawar');
  const [postalCode, setPostalCode] = useState('25000');
  const [fatherName, setFatherName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [generatedSellerId, setGeneratedSellerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (searchParams.get('type') === 'recovery') {
      setMode('update_password');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let subscription: { unsubscribe: () => void } | undefined;
    try {
      const sb = getSupabase();
      const { data } = sb.auth.onAuthStateChange((event: string) => {
        if (event === 'PASSWORD_RECOVERY') {
          setMode('update_password');
          setError(null);
          setInfoMsg('Enter your new password below to finish resetting your account.');
        }
      });
      subscription = data?.subscription;
    } catch {
      // Ignore if Supabase unavailable
    }
    return () => subscription?.unsubscribe();
  }, []);

  const triggerError = (msg: string) => {
    setError(msg);
    setSubmitStatus('error');
    window.setTimeout(() => setSubmitStatus('idle'), 500);
  };

  const handleAvatarUpload = async (file: File | undefined) => {
    if (!file || uploadingAvatar) return;
    setUploadingAvatar(true);
    try {
      const url = await storageService.uploadImage(file, 'avatars');
      setAvatarUrl(url);
      showToast('Profile portrait attached.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || uploadingAvatar) return;
    if (!canTriggerAction('auth-submit', 800)) return;
    setError(null);
    setInfoMsg(null);
    setSubmitStatus('idle');

    if (mode === 'update_password') {
      const parsedPwd = passwordPolicySchema.safeParse(password);
      if (!parsedPwd.success) {
        triggerError(parsedPwd.error.issues[0]?.message || 'Enter a stronger password.');
        return;
      }
      if (password !== confirmNewPassword) {
        triggerError('Passwords do not match.');
        return;
      }
      setLoading(true);
      try {
        const res = await authService.updatePassword(parsedPwd.data);
        await refreshSession();
        setSubmitStatus('success');
        setInfoMsg(res.message);
        showToast('Password updated successfully.', 'success');
        navigate(localize(safeRedirect), { replace: true });
      } catch (err) {
        triggerError(err instanceof Error ? err.message : 'Could not update password.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'forgot') {
      const parsed = forgotPasswordSchema.safeParse({ email });
      if (!parsed.success) {
        triggerError(parsed.error.issues[0]?.message || 'Enter a valid email address.');
        return;
      }
      setLoading(true);
      try {
        const res = await authService.requestPasswordReset(parsed.data.email);
        setInfoMsg(res.message);
        setSubmitStatus('success');
      } catch (err) {
        triggerError(err instanceof Error ? err.message : 'Reset failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'login') {
      const parsed = loginSchema.safeParse({ email, password });
      if (!parsed.success) {
        triggerError(parsed.error.issues[0]?.message || 'Email and password are required.');
        return;
      }
      setLoading(true);
      try {
        await login({
          email: parsed.data.email,
          password: parsed.data.password,
          honeypot: honeypot || undefined,
          turnstileToken: turnstileToken || undefined,
        });
        setSubmitStatus('success');
        showToast('Signed in to Cinematic Arts.', 'success');
        navigate(localize(safeRedirect), { replace: true });
      } catch (err) {
        triggerError(err instanceof Error ? err.message : 'Invalid credentials.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Signup validation
    if (!acceptedLegal) {
      triggerError('You must accept the Terms of Service and Privacy Policy to create an account.');
      return;
    }

    if (accountType === 'seller') {
      const parsed = signupSellerSchema.safeParse({
        role: 'seller',
        name,
        email,
        password,
        phone,
        whatsapp,
        address,
        city,
        postalCode,
        fatherName,
        avatarUrl: avatarUrl || undefined,
      });
      if (!parsed.success) {
        triggerError(parsed.error.issues[0]?.message || 'Review your seller registration details.');
        return;
      }

      setLoading(true);
      try {
        const createdUser = (await signup({
          role: 'seller',
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
          honeypot: honeypot || undefined,
          turnstileToken: turnstileToken || undefined,
        })) as Awaited<ReturnType<typeof signup>> & { emailConfirmationRequired?: boolean };
        setSubmitStatus('success');
        if (createdUser.emailConfirmationRequired) {
          setInfoMsg(
            'Seller account created! Please confirm your email via the link sent to your inbox, then sign in to activate your Seller ID and profile portrait.'
          );
          setMode('login');
          showToast('Check your email to confirm your account.', 'info');
        } else if (createdUser.role === 'seller' && createdUser.sellerCode) {
          setGeneratedSellerId(createdUser.sellerCode);
          showToast(`Seller account created! ID: ${createdUser.sellerCode}`, 'success');
        } else {
          showToast('Account created successfully.', 'success');
          navigate(localize(safeRedirect), { replace: true });
        }
      } catch (err) {
        triggerError(err instanceof Error ? err.message : 'Could not create account.');
      } finally {
        setLoading(false);
      }
      return;
    }

    const parsedUser = signupUserSchema.safeParse({
      role: 'user',
      name,
      email,
      password,
    });
    if (!parsedUser.success) {
      triggerError(parsedUser.error.issues[0]?.message || 'Check your registration fields.');
      return;
    }

    setLoading(true);
    try {
      const created = (await signup({
        role: 'user',
        name: sanitizePlainText(parsedUser.data.name, 80),
        email: parsedUser.data.email,
        password: parsedUser.data.password,
        honeypot: honeypot || undefined,
        turnstileToken: turnstileToken || undefined,
      })) as Awaited<ReturnType<typeof signup>> & { emailConfirmationRequired?: boolean };
      setSubmitStatus('success');
      if (created.emailConfirmationRequired) {
        setInfoMsg(
          'Account created! Please check your email inbox and confirm your address before signing in.'
        );
        setMode('login');
        showToast('Check your email to confirm your account.', 'info');
      } else {
        showToast('Account created successfully.', 'success');
        navigate(localize(safeRedirect), { replace: true });
      }
    } catch (err) {
      triggerError(err instanceof Error ? err.message : 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  if (generatedSellerId) {
    return (
      <>
        <SeoHead
          title="Seller Verified — Cinematic Arts (CA)"
          description="Your Cinematic Arts Seller Referral ID is ready."
          canonicalPath="/auth"
          noIndex
        />
        <section className="mx-auto max-w-lg px-4 py-14 sm:px-6">
          <div className="glass-panel rounded-2xl p-8 text-center">
            <p className="text-xs font-medium text-[var(--ca-accent)]">
              Seller account verified
            </p>
            <h1 className="font-display mt-2 text-3xl font-semibold text-[var(--ca-text)]">
              Welcome to CA Seller Network
            </h1>
            <p className="mt-3 text-sm text-[var(--ca-text-muted)]">
              Share your unique Seller Referral ID with customers. You earn <strong>10% commission</strong> on every completed referred order.
            </p>

            <div className="mt-6 rounded-xl bg-[var(--ca-surface-subtle)] p-5">
              <span className="text-xs text-[var(--ca-text-muted)]">Your Unique Seller ID</span>
              <p className="font-mono-nums mt-1 text-3xl font-bold text-[var(--ca-accent)]">
                {generatedSellerId}
              </p>
              <button
                type="button"
                onClick={async () => {
                  const ok = await copyTextToClipboard(generatedSellerId);
                  if (ok) {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  } else {
                    showToast(`Seller ID: ${generatedSellerId}`, 'info');
                  }
                }}
                className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[var(--ca-border)] px-3.5 py-1.5 text-xs font-medium"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied ID' : 'Copy Seller ID'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate(localize(safeRedirect), { replace: true })}
              className="btn-press mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ca-text)] py-3 text-sm font-semibold text-[var(--ca-bg)]"
            >
              Open Seller Dashboard
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <CALoadingOverlay
        open={loading || uploadingAvatar}
        label={
          uploadingAvatar
            ? 'Uploading portrait...'
            : mode === 'login'
            ? 'Signing you in...'
            : mode === 'signup'
            ? 'Creating your account...'
            : mode === 'update_password'
            ? 'Updating your password...'
            : 'Sending reset instructions...'
        }
      />
      <SeoHead
        title="Sign In or Join — Cinematic Arts (CA)"
        description="Sign in to track orders or register as a Cinematic Arts Customer or Verified Seller to earn 10% referral commission."
        canonicalPath="/auth"
        noIndex
      />

      <section className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="glass-panel rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4 pb-2">
            <h1 className="font-display text-3xl font-semibold text-[var(--ca-text)]">
              {mode === 'login'
                ? 'Sign In'
                : mode === 'signup'
                ? 'Create Account'
                : mode === 'update_password'
                ? 'Set New Password'
                : 'Reset Password'}
            </h1>

            {mode !== 'forgot' && mode !== 'update_password' && (
              <div className="flex rounded-xl bg-[var(--ca-surface-subtle)] p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`rounded-lg px-3 py-1.5 transition-colors ${
                    mode === 'login'
                      ? 'bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm'
                      : 'text-[var(--ca-text-muted)]'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className={`rounded-lg px-3 py-1.5 transition-colors ${
                    mode === 'signup'
                      ? 'bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm'
                      : 'text-[var(--ca-text-muted)]'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          {error && (
            <div role="alert" className="ca-shake mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          {infoMsg && (
            <div role="status" className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300">
              {infoMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <span className="block text-xs font-medium text-[var(--ca-text-muted)]">
                    Account Type
                  </span>
                  <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-xl bg-[var(--ca-surface-subtle)] p-1">
                    <button
                      type="button"
                      onClick={() => setAccountType('user')}
                      className={`rounded-lg py-2 text-xs font-semibold ${
                        accountType === 'user'
                          ? 'bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm'
                          : 'text-[var(--ca-text-muted)]'
                      }`}
                    >
                      User Account
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType('seller')}
                      className={`rounded-lg py-2 text-xs font-semibold ${
                        accountType === 'seller'
                          ? 'bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm'
                          : 'text-[var(--ca-text-muted)]'
                      }`}
                    >
                      Seller Account (10% Commission)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                  />
                </div>
              </>
            )}

            {mode !== 'update_password' && (
              <div>
                <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  maxLength={120}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                />
              </div>
            )}

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                    {mode === 'update_password' ? 'New Password *' : 'Password *'}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-[var(--ca-accent)] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={mode === 'signup' || mode === 'update_password' ? 8 : 1}
                    maxLength={128}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ca-text-muted)]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {(mode === 'signup' || mode === 'update_password') && (
                  <PasswordStrengthMeter password={password} />
                )}
              </div>
            )}

            {mode === 'update_password' && (
              <div>
                <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                  Confirm New Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                />
              </div>
            )}

            {mode === 'signup' && accountType === 'seller' && (
              <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                    Father&apos;s Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="Father's full name"
                    className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={24}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03355329722"
                    className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                    WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={24}
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="03355329722"
                    className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="25000"
                    className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                    Full Residential / Office Address *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street 4, University Town, Peshawar"
                    className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                    City
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--ca-text-muted)]">
                    Profile Photo Upload
                  </label>
                  <label className="mt-1 flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3.5 py-2.5 text-xs font-medium hover:bg-[var(--ca-surface-subtle)]">
                    {uploadingAvatar ? <CALoader size="sm" /> : <Upload className="h-3.5 w-3.5" />}
                    <span>
                      {uploadingAvatar
                        ? 'Processing...'
                        : avatarUrl
                        ? 'Photo Attached'
                        : 'Upload Portrait'}
                    </span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      disabled={uploadingAvatar}
                      className="hidden"
                      onChange={(e) => handleAvatarUpload(e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <label className="flex items-start gap-2.5 pt-1 text-xs text-[var(--ca-text-muted)]">
                <input
                  type="checkbox"
                  checked={acceptedLegal}
                  onChange={(e) => setAcceptedLegal(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I agree to the{' '}
                  <Link to={localize('/terms')} className="text-[var(--ca-text)] underline">
                    Terms of Service &amp; Installment Policy
                  </Link>{' '}
                  and{' '}
                  <Link to={localize('/privacy')} className="text-[var(--ca-text)] underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
            )}

            <TurnstileField
              action={`auth_${mode}`}
              onToken={setTurnstileToken}
              honeypot={honeypot}
              onHoneypotChange={setHoneypot}
            />

            <CAProcessButton
              type="submit"
              loading={loading}
              status={submitStatus}
              disabled={uploadingAvatar}
              className="w-full rounded-xl bg-[var(--ca-text)] py-3 text-sm font-semibold text-[var(--ca-bg)] hover:opacity-90"
            >
              {mode === 'login'
                ? 'Sign In'
                : mode === 'signup'
                ? accountType === 'seller'
                  ? 'Register & Generate Seller ID'
                  : 'Create Customer Account'
                : mode === 'update_password'
                ? 'Save New Password'
                : 'Send Reset Instructions'}
            </CAProcessButton>

            {(mode === 'forgot' || mode === 'update_password') && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs font-medium text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"
              >
                Back to Login
              </button>
            )}
          </form>
        </div>
      </section>
    </>
  );
}
