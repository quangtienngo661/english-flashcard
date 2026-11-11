import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { formatDay } from '@/lib/format-day';
import { outlineOf } from '@/lib/legal-outline';
import { Container } from '../layout/Container';
import { LegalArticle } from './LegalArticle';
import { LegalCallout } from './LegalCallout';
import { LegalToc } from './LegalToc';
import { ReadingProgress } from './ReadingProgress';
import { PAGE_TITLE } from './styles';

const ARTICLE_ID = 'van-ban';

/**
 * "Đầu trang" (`14:185` / `17:269`): the optional meta line, the page title and the lead; on desktop a yellow halo (radial `--mark`, no
 * blur; `--color-wm-glow-mark` .42 for Figma's .45, R224) sits behind the title block from lg.
 */
export function LegalHeader({ title, lead, meta }: { title: string; lead: string; meta?: ReactNode }) {
  return (
    <div className="relative isolate overflow-x-clip">
      <Container className="relative pt-10 pb-7 md:pt-24 md:pb-16">
        <div
          aria-hidden
          className="pointer-events-none absolute top-10 left-170 -z-10 hidden h-90 w-130 rounded-full bg-radial from-wm-glow-mark to-transparent to-70% lg:block"
        />
        <div className="flex max-w-150 flex-col gap-3.5 md:gap-5">
          {meta && <p className="font-wm-sans text-wm-caption text-wm-muted md:text-wm-small">{meta}</p>}
          <h1 className={PAGE_TITLE}>{title}</h1>
          <p className="max-w-130 font-wm-sans text-wm-base text-wm-muted md:text-wm-lead">{lead}</p>
        </div>
      </Container>
    </div>
  );
}

type Props = {
  title: string;
  lead: string;
  /** `version` of `GET /v1/legal/current`: the published number as text ("3"). */
  version: string;
  /** `YYYY-MM-DD`, or `null` when the admin set no date. */
  effectiveDate: string | null;
  kind: 'privacy' | 'terms';
  markdown: string;
};

/**
 * Chính sách bảo mật and Điều khoản sử dụng with a published text (Figma `14:172` / `17:260`, `15:190` / `17:355`, M8 Figma B §2–§4):
 * the reading bar, the header block with "Phiên bản N · Có hiệu lực từ …" (QM8-4), then the contents and the article with its callout.
 * Server-rendered; the bar and the contents are the only client code.
 */
export function LegalLayout({ title, lead, version, effectiveDate, kind, markdown }: Props) {
  const t = useTranslations('Legal');
  const outline = outlineOf(markdown);
  const sections = outline.filter((heading) => heading.level === 2).map(({ id, text }) => ({ id, text }));
  const meta = (
    <>
      {t('versionLine', { version })}
      {effectiveDate && ` · ${t('effective', { date: formatDay(effectiveDate) })}`}
      {kind === 'terms' && <span className="hidden md:inline">{` · ${t('termsScope')}`}</span>}
    </>
  );
  return (
    <>
      <ReadingProgress target={ARTICLE_ID} />
      <LegalHeader title={title} lead={lead} meta={meta} />
      <Container className="flex flex-col pb-16 lg:flex-row lg:items-start lg:gap-20 lg:pb-30">
        {sections.length > 0 && <LegalToc sections={sections} labels={{ heading: t('contents'), open: t('contentsOpen') }} />}
        <div className="flex max-w-175 min-w-0 flex-1 flex-col gap-3.5 pt-4 md:gap-4 lg:pt-0">
          <LegalArticle id={ARTICLE_ID} markdown={markdown} outline={outline} />
          <LegalCallout kind={kind} />
        </div>
      </Container>
    </>
  );
}
