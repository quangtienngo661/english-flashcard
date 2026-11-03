import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

// The page already has its own h1, so a text's `#` is drawn as an h2, `##` as an h3, and so on (never past h6).
const COMPONENTS: Components = {
  h1: ({ children }) => <h2 className="text-lg font-bold">{children}</h2>,
  h2: ({ children }) => <h3 className="mt-3 text-base font-bold">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-2 font-bold">{children}</h4>,
  h4: ({ children }) => <h5 className="font-bold">{children}</h5>,
  h5: ({ children }) => <h6 className="font-bold">{children}</h6>,
  h6: ({ children }) => <h6 className="font-bold">{children}</h6>,
};

/**
 * The admin's preview of a legal text. It renders the same way as the public pages: Markdown with tables, never raw HTML
 * (react-markdown skips it) and never a `javascript:` link (its default URL filter).
 */
export function MarkdownPreview({ source }: { source: string }) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed text-ink [&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-1.5 [&_th]:border [&_th]:border-border [&_th]:p-1.5 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-5">
      <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>{source}</Markdown>
    </div>
  );
}
