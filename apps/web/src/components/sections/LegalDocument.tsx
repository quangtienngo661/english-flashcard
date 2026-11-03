import { isValidElement, type ReactNode } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Container } from '@/components/ui/Container';
import { cn } from '@/lib/cn';
import { headingIds, linkContents, outlineOf } from '@/lib/legal-outline';

const COMPONENTS: Components = {
  h1: ({ children }) => <h1 className="text-h2 font-extrabold text-ink">{children}</h1>,
  p: ({ children }) => <p className="text-body text-ink">{children}</p>,
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-6 text-body text-ink">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-6 text-body text-ink">{children}</ol>,
  blockquote: ({ children }) => <blockquote className="border-l-4 border-primary pl-4 text-body text-muted">{children}</blockquote>,
  table: ({ children }) => <div className="overflow-x-auto"><table className="w-full border-collapse text-body text-ink">{children}</table></div>,
  th: ({ children }) => <th className="border border-border px-3 py-2 text-left font-bold">{children}</th>,
  td: ({ children }) => <td className="border border-border px-3 py-2 align-top">{children}</td>,
  a: ({ href, children }) => {
    const outside = typeof href === 'string' && /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        className="font-semibold text-primary underline underline-offset-4"
        {...(outside ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    );
  },
};

// raw-ok: from lg the 40rem text column sits beside a 15rem contents column and the pair is centred
const WITH_CONTENTS = 'lg:grid lg:max-w-none lg:grid-cols-[minmax(0,40rem)_15rem] lg:justify-center lg:gap-14';
// raw-ok: a contents list longer than the screen scrolls on its own, inside the viewport minus the header and its gap
const CONTENTS_NAV = 'sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto border-l border-border pl-5';

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children);
  return '';
}

/**
 * An admin-written Markdown text. react-markdown never renders raw HTML and drops `javascript:` links, so nothing typed in the
 * admin can run script. Every `##` and `###` heading gets an id; the `##` sections are listed in a navigation beside the text
 * (from `lg`), and a hand-written `**Mục lục**` list in the text becomes links to them.
 */
export function LegalDocument({ title, source, effective, contentsLabel }: { title: string; source: string; effective: string | null; contentsLabel: string }) {
  const hasTitle = /^#\s/m.test(source);
  const outline = outlineOf(source);
  const sections = outline.filter((heading) => heading.level === 2);
  const nextId = headingIds(outline);
  const components: Components = {
    ...COMPONENTS,
    h2: ({ children }) => <h2 id={nextId(textOf(children))} className="mt-6 scroll-mt-4 text-title-lg font-bold text-ink">{children}</h2>,
    h3: ({ children }) => <h3 id={nextId(textOf(children))} className="mt-4 scroll-mt-4 text-body font-bold text-ink">{children}</h3>,
  };
  return (
    <Container className="py-16 md:py-24">
      <div className={cn('mx-auto w-full max-w-prose', sections.length > 0 && WITH_CONTENTS)}>
        <div className="flex min-w-0 flex-col gap-4">
          {!hasTitle && <h1 className="text-h2 font-extrabold text-ink">{title}</h1>}
          {effective && <p className="text-body text-muted">{effective}</p>}
          <article className="flex flex-col gap-4">
            <Markdown remarkPlugins={[remarkGfm]} components={components}>{linkContents(source, outline)}</Markdown>
          </article>
        </div>
        {sections.length > 0 && (
          <aside className="hidden lg:block">
            <nav aria-label={contentsLabel} className={CONTENTS_NAV}>
              <p className="text-sm font-bold uppercase tracking-wide text-muted">{contentsLabel}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="text-sm text-muted underline-offset-4 hover:text-primary hover:underline">{section.text}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}
      </div>
    </Container>
  );
}
