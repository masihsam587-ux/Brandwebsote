import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { SeoHead } from '../components/SeoHead';
import { useLocale } from '../i18n';
import { buildBreadcrumbJsonLd, buildLocalBusinessJsonLd } from '../services/seoService';
import { getRuntimeOrigin, STORE_CONFIG } from '../services/siteConfig';

export function ContactPage() {
  const { t, locale, localize } = useLocale();
  const origin = getRuntimeOrigin();
  const canonicalPath = localize('/contact');

  return (
    <>
      <SeoHead
        title={
          locale === 'ur'
            ? `رابطہ اور پتہ — ${t.brand}`
            : 'Contact Store & WhatsApp — Cinematic Arts Peshawar'
        }
        description={t.contact.intro}
        canonicalPath={canonicalPath}
        locale={locale}
        jsonLd={[
          buildLocalBusinessJsonLd(origin),
          buildBreadcrumbJsonLd(
            [
              { name: t.nav.home, path: localize('/') },
              { name: t.nav.contact, path: canonicalPath },
            ],
            origin
          ),
        ]}
      />

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumbs
          items={[
            { label: t.nav.home, to: localize('/') },
            { label: t.nav.contact },
          ]}
        />

        <div className="glass-panel rounded-2xl p-6 sm:p-10">
          <h1 className="font-display text-3xl font-semibold text-[var(--ca-text)] sm:text-5xl">
            {t.contact.heading}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--ca-text-muted)] sm:text-base">
            {t.contact.intro}
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-[var(--ca-surface-subtle)] p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ca-text-muted)]">
                <MapPin className="h-4 w-4 text-[var(--ca-accent)]" />
                <span>{t.contact.addressLabel}</span>
              </div>
              <p className="mt-2 text-sm font-medium text-[var(--ca-text)]">
                {STORE_CONFIG.brandName}
              </p>
              <p className="mt-1 text-sm text-[var(--ca-text-muted)]">
                {STORE_CONFIG.address.streetAddress}
                <br />
                {STORE_CONFIG.address.locality}, {STORE_CONFIG.address.region}{' '}
                {STORE_CONFIG.address.postalCode}, {STORE_CONFIG.address.countryName}
              </p>
            </div>

            <div className="rounded-xl bg-[var(--ca-surface-subtle)] p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ca-text-muted)]">
                <Clock className="h-4 w-4 text-[var(--ca-accent)]" />
                <span>{t.contact.hoursLabel}</span>
              </div>
              <p className="mt-2 text-sm font-medium text-[var(--ca-text)]">
                {locale === 'ur'
                  ? STORE_CONFIG.openingHours.displayUr
                  : STORE_CONFIG.openingHours.displayEn}
              </p>
              <p className="mt-1 text-xs text-[var(--ca-text-muted)]">
                {STORE_CONFIG.priceRange}
              </p>
            </div>

            <div className="rounded-xl bg-[var(--ca-surface-subtle)] p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ca-text-muted)]">
                <Phone className="h-4 w-4 text-[var(--ca-accent)]" />
                <span>{t.contact.phoneLabel}</span>
              </div>
              <a
                href={`tel:${STORE_CONFIG.phoneDisplay}`}
                className="font-mono-nums mt-2 inline-flex min-h-[44px] items-center text-base font-semibold text-[var(--ca-text)] hover:text-[var(--ca-accent)]"
              >
                {STORE_CONFIG.phoneE164} ({STORE_CONFIG.phoneDisplay})
              </a>
            </div>

            <div className="rounded-xl bg-[var(--ca-surface-subtle)] p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ca-text-muted)]">
                <Mail className="h-4 w-4 text-[var(--ca-accent)]" />
                <span>{t.contact.emailLabel}</span>
              </div>
              <a
                href={`mailto:${STORE_CONFIG.email}`}
                className="mt-2 inline-flex min-h-[44px] items-center text-base font-semibold text-[var(--ca-text)] hover:text-[var(--ca-accent)]"
              >
                {STORE_CONFIG.email}
              </a>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={STORE_CONFIG.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-bg)]"
            >
              <MessageCircle className="h-4 w-4" />
              {t.contact.whatsappCta}
            </a>
            <a
              href={STORE_CONFIG.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-surface-subtle)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-text)]"
            >
              <MapPin className="h-4 w-4 text-[var(--ca-accent)]" />
              {t.contact.mapCta}
            </a>
            <Link
              to={localize('/faq')}
              className="btn-press inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-surface-subtle)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-text)]"
            >
              {t.contact.faqLinkLabel}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
