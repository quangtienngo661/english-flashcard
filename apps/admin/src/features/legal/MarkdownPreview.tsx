import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * The admin's preview of a legal text. It renders the same way as the public pages: Markdown with tables, never raw HTML
 * (react-markdown skips it) and never a `javascript:` link (its default URL filter).
 */
export function MarkdownPreview({ source }: { source: string }) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed text-ink [&_a]:text-primary [&_a]:underline [&_h1]:text-lg [&_h1]:font-bold [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-bold [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-1.5 [&_th]:border [&_th]:border-border [&_th]:p-1.5 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-5">
      <Markdown remarkPlugins={[remarkGfm]}>{source}</Markdown>
    </div>
  );
}
