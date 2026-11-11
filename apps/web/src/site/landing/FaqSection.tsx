import { Minus, Plus } from 'lucide-react';
import { site } from '@/lib/site';
import { Container } from '../layout/Container';
import type { LandingCopy } from './copy';
import type { FaqItem } from './landing-data';
import { FAQ_QUESTION, FAQ_TITLE, FOCUS } from './styles';

/**
 * "Câu hỏi thường gặp" `28:359` (phone `28:470`): the title and the support address on the left, the questions on the right from lg.
 * Native `<details name="faq">`: one open at a time, and it works with no JavaScript. The questions come from the admin's published FAQ,
 * read at build (M8.3); the page leaves the section out when there is none.
 */
export function FaqSection({ copy, items }: { copy: LandingCopy['faq']; items: FaqItem[] }) {
  if (items.length === 0) return null;
  const [before, after] = copy.lead.split('{email}');
  return (
    <section id="hoi-dap" aria-labelledby="hoi-dap-title" className="scroll-mt-15 md:scroll-mt-17">
      <Container className="flex flex-col gap-6 pt-12 pb-10 md:pt-14 lg:flex-row lg:justify-center lg:gap-12">
        <div className="flex flex-col gap-3 lg:w-105">
          <h2 id="hoi-dap-title" className={FAQ_TITLE}>
            {copy.title}
          </h2>
          <p className="font-wm-sans text-wm-base text-wm-muted">
            {before}
            <a href={`mailto:${site.supportEmail}`} className={`rounded-wm-xs font-semibold text-wm-accent ${FOCUS}`}>
              {site.supportEmail}
            </a>
            {after}
          </p>
        </div>
        <div className="flex flex-col gap-2.5 lg:w-165">
          {items.map((item, i) => (
            <details key={item.question} name="faq" open={i === 0} className="group rounded-wm-lg bg-wm-surface px-5.5 py-4.5 open:shadow-wm-soft">
              <summary className={`flex cursor-pointer list-none items-start justify-between gap-4 rounded-wm-sm text-wm-ink [&::-webkit-details-marker]:hidden ${FOCUS}`}>
                <span className={FAQ_QUESTION}>{item.question}</span>
                <Plus aria-hidden className="mt-0.5 size-5 shrink-0 text-wm-muted group-open:hidden" />
                <Minus aria-hidden className="mt-0.5 hidden size-5 shrink-0 text-wm-muted group-open:block" />
              </summary>
              <p className="mt-2.5 font-wm-sans text-wm-base text-wm-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
