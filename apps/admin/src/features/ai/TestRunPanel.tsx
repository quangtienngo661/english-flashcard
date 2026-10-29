import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTranslations } from 'use-intl';
import { ApiError, NetworkError } from '../../api/problem';
import { useErrorDetails } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import {
  aiKeys, getTestQuota, isDevExample, listExamples, runTest, type AiOperation, type PromptExample, type TestResult, type TestStatus,
} from './ai-api';
import { useAiFormat } from './useAiFormat';

/** The API runs at most this many inputs per test (`ai.constants.ts` TEST_EXAMPLES_MAX). */
const TEST_MAX = 5;
const NEED_EXAMPLE = 'examples: at least one example is needed';
const STATUSES: TestStatus[] = ['succeeded', 'transient_failure', 'permanent_failure', 'unavailable'];
const linkClass =
  'inline-flex min-h-control w-fit items-center whitespace-nowrap rounded-control px-4 text-ui font-medium text-primary outline-none hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary pointer-coarse:min-h-control-touch';
const block = 'whitespace-pre-wrap wrap-anywhere rounded-inner bg-canvas p-3 font-mono text-xs text-ink';

type Failure = { message: string; code?: string | null; toOperations?: boolean; offline?: boolean };

/** "go · verb": the first two text values of an example's input, so the admin can tell examples apart. */
function summary(input: Record<string, unknown>): string {
  const texts = Object.values(input).filter((value): value is string => typeof value === 'string' && value !== '');
  return texts.length > 0 ? texts.slice(0, 2).join(' · ') : JSON.stringify(input);
}

type Props = {
  op: AiOperation;
  /** Replaces the sentence under the title (the draft test runs the saved draft, not the text on screen). */
  note?: string;
  /** The run button is off (the draft has unsaved edits, so a run would not be of what is on screen). */
  isDisabled?: boolean;
} & (
  | {
      /** The saved draft's test: sends the chosen example ids (none = the API's own choice) and returns the samples. Replaces `prepare` and `runTest`. */
      send: (exampleIds: string[]) => Promise<TestResult>;
      prepare?: undefined;
      showViolations?: undefined;
    }
  | {
      send?: undefined;
      /** The editor's content as a body, or null when it cannot be sent (the editor then marks its boxes). Clears the editor's old errors. */
      prepare: () => { instructions: string; examples: PromptExample[] } | null;
      /** Puts a 400's violations on the editor's boxes; returns those that fit no box. */
      showViolations: (violations: string[]) => string[];
    }
);

/**
 * A/82 [Chạy thử]: runs the unsaved editor content at once on up to five inputs. Never re-sent automatically (each run is an AI
 * call and one `ai.test` slot, design §4.6); the quota line is read on open and after every run, failed ones included.
 */
export function TestRunPanel(props: Props) {
  const { op, note, isDisabled, send, prepare, showViolations } = props;
  const t = useTranslations();
  const api = useApi();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  const format = useAiFormat();
  const quota = useQuery({ queryKey: aiKeys.testQuota(), queryFn: () => getTestQuota(api) });
  // A prompt test takes dev examples only (design §5.1): a held-out example is neither listed nor counted.
  const examples = useQuery({ queryKey: aiKeys.examples(op), queryFn: () => listExamples(api, op), select: (reply) => reply.items.filter(isDevExample) });
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const [result, setResult] = useState<TestResult | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  const set = examples.data ?? [];
  const chosenIds = set.filter((example) => chosen.has(example.id)).map((example) => example.id);
  const runsWith =
    chosenIds.length > 0 ? t('ai.prompts.test.withSelected', { count: chosenIds.length })
    : !examples.data ? null
    : set.length > 0 ? t('ai.prompts.test.withFirst', { count: Math.min(TEST_MAX, set.length) })
    : t('ai.prompts.test.withPrompt');

  function toggle(id: string, on: boolean) {
    setChosen((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function describe(e: unknown): Failure {
    if (e instanceof NetworkError) return { message: t('offline.message'), offline: true };
    if (e instanceof ApiError && e.problem.slug === 'model-not-set') {
      // The draft is on the same page: no link, the model box is right above.
      return send ? { message: t('ai.configs.draft.noModelToTest') } : { message: t('errors.model-not-set'), toOperations: true };
    }
    if (e instanceof ApiError && e.problem.status === 429) {
      const at = e.retryAfterSeconds !== null ? new Date(Date.now() + e.retryAfterSeconds * 1000)
        : quota.data ? new Date(quota.data.resets_at) : null;
      if (at) return { message: t('ai.prompts.test.rateLimited', { limit: quota.data?.limit ?? 20, time: format.time(at) }) };
    }
    if (e instanceof ApiError && e.problem.slug === 'validation-failed') {
      const violations = e.problem.violations ?? [];
      if (violations.includes(NEED_EXAMPLE)) return { message: t('ai.prompts.test.needExample') };
      const rest = showViolations ? showViolations(violations) : violations;
      return { message: [t('errors.validation-failed'), ...rest].join(' ') };
    }
    return errorDetails(e);
  }

  async function run() {
    if (busy.current) return;
    const body = send ? null : prepare();
    if (!send && !body) return;
    busy.current = true;
    setPending(true);
    setFailure(null);
    setResult(null);
    try {
      setResult(send ? await send(chosenIds) : await runTest(api, op, chosenIds.length > 0 ? { ...body!, example_ids: chosenIds } : body!));
    } catch (e) {
      setFailure(describe(e));
    } finally {
      busy.current = false;
      setPending(false);
      // A failed run also used a slot (design §6.4).
      void queryClient.invalidateQueries({ queryKey: aiKeys.testQuota() });
    }
  }

  return (
    <section aria-labelledby="prompt-test" className="flex flex-col gap-3 rounded-panel border-2 border-border p-4">
      <h2 id="prompt-test" className="text-lg font-bold text-ink">{t('ai.prompts.test.title')}</h2>
      <p className="text-ui text-muted">{note ?? t('ai.prompts.test.note')}</p>
      {examples.data && (
        set.length === 0 ? (
          <p className="text-ui text-muted">{t('ai.prompts.test.pickEmpty')}</p>
        ) : (
          <div role="group" aria-labelledby="prompt-test-pick" className="flex flex-col gap-2">
            <span id="prompt-test-pick" className="text-ui font-medium text-ink">{t('ai.prompts.test.pick')}</span>
            {set.map((example) => (
              <Checkbox
                key={example.id}
                isSelected={chosen.has(example.id)}
                onChange={(on) => toggle(example.id, on)}
                isDisabled={!chosen.has(example.id) && chosenIds.length >= TEST_MAX}
              >
                <span className="min-w-0 wrap-anywhere">
                  {summary(example.input)}
                  {example.note && <span className="text-muted"> — {example.note}</span>}
                </span>
              </Checkbox>
            ))}
          </div>
        )
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onPress={() => void run()} isPending={pending} isDisabled={isDisabled}>{t('ai.prompts.test.run')}</Button>
        {runsWith && <span className="text-ui text-ink">{runsWith}</span>}
      </div>
      {quota.data && (
        <p className="text-ui text-muted">{t('ai.prompts.test.quota', { remaining: quota.data.remaining, limit: quota.data.limit })}</p>
      )}
      {quota.isError && <p className="text-ui text-danger">{t('ai.prompts.test.quotaFailed')}</p>}
      {examples.isError && <p className="text-ui text-danger">{t('ai.prompts.test.examplesFailed')}</p>}
      {failure && (
        <Banner
          variant={failure.offline ? 'offline' : 'error'}
          code={failure.code}
          action={failure.toOperations ? <Link to="/ai/operations" className={linkClass}>{t('ai.prompts.test.openOperations')}</Link> : undefined}
        >
          {failure.message}
        </Banner>
      )}
      {result && (
        <div className="flex flex-col gap-3">
          <h3 className="text-ui font-semibold text-ink">{t('ai.prompts.test.results')}</h3>
          {result.items.map((item, index) => (
            <div key={index} role="group" aria-label={t('ai.prompts.test.sample', { n: index + 1 })} className="flex flex-col gap-2 rounded-inner border-2 border-border p-3">
              <span className="font-semibold text-ink">{t('ai.prompts.test.sample', { n: index + 1 })}</span>
              <dl className="grid min-w-0 gap-2 text-ui">
                <dt className="text-xs font-medium text-muted">{t('ai.prompts.test.input')}</dt>
                <dd className={block}>{JSON.stringify(item.input, null, 2)}</dd>
                <dt className="text-xs font-medium text-muted">{t('ai.prompts.test.status')}</dt>
                <dd className={item.status === 'succeeded' ? 'text-ink' : 'font-semibold text-danger'}>
                  {STATUSES.includes(item.status) ? t(`ai.prompts.test.statuses.${item.status}`) : item.status}
                </dd>
                <dt className="text-xs font-medium text-muted">{t('ai.prompts.test.reason')}</dt>
                <dd className="wrap-anywhere text-ink">{item.reason ?? t('ai.prompts.test.none')}</dd>
                <dt className="text-xs font-medium text-muted">{t('ai.prompts.test.outputLabel')}</dt>
                <dd className={block}>
                  {item.output ? JSON.stringify(item.output, null, 2) : (item.raw_output ?? t('ai.prompts.test.none'))}
                </dd>
              </dl>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
