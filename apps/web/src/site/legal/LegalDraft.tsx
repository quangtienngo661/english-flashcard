import { useTranslations } from 'next-intl';
import { site } from '@/lib/site';
import { Container } from '../layout/Container';
import { LegalHeader } from './LegalLayout';
import { ARTICLE_TEXT, DOC_LINK } from './styles';

/**
 * Nothing published, or the API did not answer (not drawn in Figma, M8 Figma B §9.16): the header block without the meta line, then the
 * draft notice and the contact address where the article goes. No reading bar and no contents.
 */
export function LegalDraft({ title, lead }: { title: string; lead: string }) {
  const t = useTranslations('Legal');
  return (
    <>
      <LegalHeader title={title} lead={lead} />
      <Container className="pb-16 lg:pb-30">
        <div className="flex max-w-175 flex-col gap-4">
          <p className={ARTICLE_TEXT}>{t('draftNotice')}</p>
          <p className={ARTICLE_TEXT}>
            <a href={`mailto:${site.contactEmail}`} className={DOC_LINK}>
              {site.contactEmail}
            </a>
          </p>
        </div>
      </Container>
    </>
  );
}
