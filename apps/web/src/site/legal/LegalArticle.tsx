import { isValidElement, type ReactNode } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { headingIds, linkContents, type Heading } from '@/lib/legal-outline';
import { ARTICLE_TEXT, DOC_H2, DOC_H3, DOC_LINK, DOC_LIST } from './styles';

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children);
  return '';
}

const COMPONENTS: Components = {
  // The page title is the layout's h1 (QM8-4: the owner removes the text's own title in admin); one left in the text reads as a section.
  h1: ({ children }) => <h2 className={DOC_H2}>{children}</h2>,
  p: ({ children }) => <p className={ARTICLE_TEXT}>{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  ul: ({ children }) => <ul className={`list-disc ${DOC_LIST} ${ARTICLE_TEXT}`}>{children}</ul>,
  ol: ({ children }) => <ol className={`list-decimal ${DOC_LIST} ${ARTICLE_TEXT}`}>{children}</ol>,
  // Not drawn in Figma (R224): a soft accent block, a bordered table on the surface, mono code.
  blockquote: ({ children }) => <blockquote className="flex flex-col gap-2 rounded-wm-lg bg-wm-accent-soft px-5 py-4">{children}</blockquote>,
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-wm-lg border border-wm-line bg-wm-surface">
      <table className="w-full border-collapse font-wm-sans text-wm-small text-wm-ink">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-wm-line bg-wm-accent-soft px-3 py-2.5 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-wm-line px-3 py-2.5 align-top">{children}</td>,
  code: ({ children }) => <code className="rounded-wm-xs bg-wm-accent-soft px-1 font-wm-mono">{children}</code>,
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-wm-lg border border-wm-line bg-wm-surface p-4 font-wm-mono text-wm-small whitespace-pre-wrap text-wm-ink [&_code]:bg-transparent [&_code]:px-0">
      {children}
    </pre>
  ),
  hr: () => <hr className="border-wm-line" />,
  a: ({ href, children }) => {
    const outside = typeof href === 'string' && /^https?:\/\//i.test(href);
    return (
      <a href={href} className={DOC_LINK} {...(outside ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    );
  },
};

/**
 * An admin-written Markdown text in Figma's article styles (M8 Figma B §3). react-markdown never renders raw HTML and drops
 * `javascript:` links, so nothing typed in the admin can run script; GFM turns a bare email into a `mailto:` link (kept, R224). Every
 * `##` and `###` gets the id `outline` gave it, and a hand-written `**Mục lục**` list in the text links to the sections.
 */
export function LegalArticle({ id, markdown, outline }: { id: string; markdown: string; outline: Heading[] }) {
  const nextId = headingIds(outline);
  const components: Components = {
    ...COMPONENTS,
    h2: ({ children }) => (
      <h2 id={nextId(textOf(children))} className={`${DOC_H2} scroll-mt-40 lg:scroll-mt-28`}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 id={nextId(textOf(children))} className={`${DOC_H3} scroll-mt-40 lg:scroll-mt-28`}>
        {children}
      </h3>
    ),
  };
  return (
    <article id={id} className="flex min-w-0 flex-col gap-3.5 md:gap-4">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {linkContents(markdown, outline)}
      </Markdown>
    </article>
  );
}
