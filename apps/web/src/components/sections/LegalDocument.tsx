import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Container } from '@/components/ui/Container';

const COMPONENTS: Components = {
  h1: ({ children }) => <h1 className="text-h2 font-extrabold text-ink">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-6 text-title-lg font-bold text-ink">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-4 text-body font-bold text-ink">{children}</h3>,
  p: ({ children }) => <p className="max-w-prose text-body text-ink">{children}</p>,
  ul: ({ children }) => <ul className="max-w-prose list-disc space-y-1 pl-6 text-body text-ink">{children}</ul>,
  ol: ({ children }) => <ol className="max-w-prose list-decimal space-y-1 pl-6 text-body text-ink">{children}</ol>,
  blockquote: ({ children }) => <blockquote className="max-w-prose border-l-4 border-primary pl-4 text-body text-muted">{children}</blockquote>,
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

/** An admin-written Markdown text. react-markdown never renders raw HTML and drops `javascript:` links, so nothing typed in the admin can run script. */
export function LegalDocument({ title, source, effective }: { title: string; source: string; effective: string | null }) {
  const hasTitle = /^#\s/m.test(source);
  return (
    <Container className="flex flex-col gap-4 py-16 md:py-24">
      {!hasTitle && <h1 className="text-h2 font-extrabold text-ink">{title}</h1>}
      {effective && <p className="text-body text-muted">{effective}</p>}
      <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>{source}</Markdown>
    </Container>
  );
}
