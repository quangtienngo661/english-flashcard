import { Container } from '@/components/ui/Container';
import type { PublicSource } from '@/lib/sources';

type Labels = { title: string; intro: string; empty: string; license: string; version: string; link: string };

// Only an http(s) address becomes a link: the API already validates it, this keeps a bad value from ever being clickable.
const isWebAddress = (url: string | null): url is string => url !== null && /^https?:\/\//i.test(url);

/**
 * The public "Nguồn dữ liệu" page body. The attribution is shown as plain text (whitespace kept, nothing parsed), so a licence
 * notice with line breaks reads as written and markup typed into it never renders. `null` (API unreachable) reads as an empty
 * list: this page is a courtesy to the licences, it is not worth an error screen.
 */
export function SourcesList({ sources, labels }: { sources: PublicSource[] | null; labels: Labels }) {
  const items = sources ?? [];
  return (
    <Container className="flex flex-col gap-6 py-16 md:py-24">
      <h1 className="text-h2 font-extrabold text-ink">{labels.title}</h1>
      <p className="max-w-prose text-subtitle text-muted">{labels.intro}</p>
      {items.length === 0 ? (
        <p className="max-w-prose text-body text-ink">{labels.empty}</p>
      ) : (
        <ul className="flex max-w-prose flex-col gap-8">
          {items.map((source) => (
            <li key={`${source.name}|${source.version}`} className="flex flex-col gap-2 border-t border-border pt-6">
              <h2 className="text-h3 font-bold text-ink">{source.name}</h2>
              {(source.version !== '' || source.license !== '') && (
                <dl className="flex flex-wrap gap-x-6 gap-y-1 text-small text-muted">
                  {source.version !== '' && (
                    <div className="flex gap-1">
                      <dt>{labels.version}</dt>
                      <dd className="text-ink">{source.version}</dd>
                    </div>
                  )}
                  {source.license !== '' && (
                    <div className="flex gap-1">
                      <dt>{labels.license}</dt>
                      <dd className="text-ink">{source.license}</dd>
                    </div>
                  )}
                </dl>
              )}
              {source.attribution !== '' && <p className="whitespace-pre-line text-body text-ink">{source.attribution}</p>}
              {isWebAddress(source.url) && (
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="w-fit text-body font-semibold text-primary underline underline-offset-4">
                  {labels.link} ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
