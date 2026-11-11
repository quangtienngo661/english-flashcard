import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PublicSource } from '@/lib/sources';
import { Container } from '../layout/Container';
import { Halo } from '../layout/Halo';
import { ARTICLE_TEXT, FOCUS, PAGE_TITLE } from '../legal/styles';

// raw-ok: the count heading is Bricolage Bold 40 / 1.24, −2 % from md (`16:270`); phones use Display/Section mobile 30
const COUNT_TITLE = 'font-wm-display text-wm-site-section-mobile text-wm-ink md:text-[2.5rem]/[1.24] md:font-bold md:tracking-[-0.02em]';

// raw-ok: a source's name is Bricolage Bold 22 / 1.3 on a phone (`18:326`) and Display/Doc heading 28 from lg (`16:272`)
const NAME = 'font-wm-display text-[1.375rem]/[1.3] font-bold text-wm-ink lg:text-wm-site-doc-heading';

// raw-ok: the lead is Noto 17 / 1.6 `--ink` on a phone (`18:290`) and Body/Lead 19 from md (`16:221`)
const LEAD = 'max-w-115 font-wm-sans text-[1.0625rem]/[1.6] text-wm-ink md:text-wm-lead';

// raw-ok: the display address after "Trang gốc" is Noto 15 / 1.6 `--muted` (`16:272`)
const DISPLAY_URL = 'hidden font-wm-sans text-[0.9375rem]/[1.6] font-normal text-wm-muted lg:inline';

// Only an http(s) address becomes a link: the API already validates it, this keeps a bad value from ever being clickable.
const isWebAddress = (url: string | null): url is string => url !== null && /^https?:\/\//i.test(url);

/** "github.com/openlanguageprofiles/olp-en-cefrj": the address without its protocol and trailing slash. */
const displayUrl = (url: string) => url.replace(/^https?:\/\//i, '').replace(/\/+$/, '');

/**
 * Nguồn dữ liệu (Figma `16:210` / `18:283`, M8 Figma B §5): title, lead, the auto-update note (desktop only), "{n} nguồn đang dùng", then
 * one card per source, `--surface` with Shadow/Soft and `--accent-soft` in turn. No "Dùng cho" label (QM8-5: the API has no such field).
 * The attribution shows at every width (QM8-5: the licences ask for it; Figma drops it on a phone) as plain text, whitespace kept, nothing
 * parsed. `null` (API unreachable) reads as an empty list: this page is a courtesy to the licences, not worth an error screen.
 */
export function SourcesPage({ items }: { items: PublicSource[] | null }) {
  const t = useTranslations('Sources');
  const sources = items ?? [];
  return (
    <div className="relative isolate overflow-x-clip">
      <Container className="relative flex flex-col pt-10 pb-16 md:pt-24 lg:pb-30">
        <Halo tone="accent" className="top-30 left-30 h-70 w-90 md:-top-10 md:left-150 md:h-95 md:w-130" />
        <Halo tone="mark" className="top-75 -left-20 h-65 w-85 md:top-50 md:left-215 md:h-85 md:w-115" />
        <div className="flex max-w-120 flex-col gap-3.5 pb-6 md:gap-5 md:pb-16">
          <h1 className={PAGE_TITLE}>{t('title')}</h1>
          <p className={LEAD}>{t('intro')}</p>
          <p className="hidden max-w-115 font-wm-sans text-wm-small text-wm-muted md:block">{t('autoUpdate')}</p>
        </div>
        {sources.length === 0 ? (
          <p className={ARTICLE_TEXT}>{t('empty')}</p>
        ) : (
          <div className="flex flex-col gap-3 md:gap-4">
            <h2 className={COUNT_TITLE}>{t('count', { count: sources.length })}</h2>
            <ul className="flex flex-col gap-3 md:gap-4">
              {sources.map((source, index) => (
                <li
                  key={`${source.name}|${source.version}`}
                  className={`flex flex-col gap-2 rounded-wm-xl p-5 lg:flex-row lg:gap-14 lg:px-9 lg:py-8 ${index % 2 === 0 ? 'bg-wm-surface shadow-wm-soft' : 'bg-wm-accent-soft'}`}
                >
                  <h3 className={`lg:w-95 lg:shrink-0 ${NAME}`}>{source.name}</h3>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 lg:gap-3">
                    {(source.version !== '' || source.license !== '') && (
                      <div className="flex flex-col gap-2 lg:flex-row lg:gap-6">
                        {source.version !== '' && (
                          <p className="font-wm-sans text-wm-base-strong text-wm-ink lg:whitespace-nowrap">{t('version', { version: source.version })}</p>
                        )}
                        {source.license !== '' && (
                          <p className="font-wm-sans text-wm-small text-wm-muted lg:text-wm-base">{t('license', { license: source.license })}</p>
                        )}
                      </div>
                    )}
                    {source.attribution !== '' && <p className={`whitespace-pre-line ${ARTICLE_TEXT}`}>{source.attribution}</p>}
                    {isWebAddress(source.url) && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex min-h-11 w-fit items-center gap-1.5 rounded-wm-sm font-wm-sans text-wm-base-strong text-wm-accent ${FOCUS}`}
                      >
                        {t('link')}
                        <ArrowUpRight aria-hidden className="size-4" />
                        <span className={DISPLAY_URL}>{displayUrl(source.url)}</span>
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Container>
    </div>
  );
}
