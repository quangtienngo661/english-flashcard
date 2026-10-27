import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useFormatter, useTranslations } from 'use-intl';
import { useFocusFirstError, violationsToFields } from '../../api/field-errors';
import { useKeptDraft } from '../../api/use-kept-draft';
import { useUrlFilters } from '../../api/use-url-filters';
import { useDirtyForm } from '../../app/dirty-form';
import { PageActions } from '../../app/shell-slots';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { ListState } from '../../ui/ListState';
import { RestoreDraftBanner } from '../../ui/RestoreDraftBanner';
import { Tabs } from '../../ui/Tabs';
import { showToast } from '../../ui/Toast';
import { useSubmitAction } from '../content/useSubmitAction';
import {
  applyPatch,
  changedValues,
  FIELD_ORDER,
  fieldOfPath,
  getAiUsage,
  getSettings,
  isEmptyPatch,
  saveSettings,
  sectionOfField,
  SECTIONS,
  SETTINGS_LAYOUT,
  type Section,
  type SettingsView,
  type SettingValue,
  type Values,
} from './settings-api';
import { SettingsField } from './SettingsField';
import { SettingsHistoryDialog } from './SettingsHistoryDialog';

const TAB_FILTER = { tab: { default: 'reminders', valid: (v: string) => (SECTIONS as string[]).includes(v) } };
const panel = 'flex flex-col gap-3 rounded-panel border-2 border-border p-4';

/** A/70a–A/70f `/settings` (admin, `settings.manage`): six tabs, one [Lưu thay đổi] for the whole page (design §6.7). */
export function SettingsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => getSettings(api) });

  if (settings.isPending || (settings.isError && !settings.data)) {
    return <ListState state={settings.isPending ? 'loading' : 'error'} onRetry={() => void settings.refetch()} />;
  }
  return (
    <SettingsForm
      key={settings.data.version}
      view={settings.data}
      onSaved={(next) => queryClient.setQueryData<SettingsView>(['settings'], { ...settings.data, ...next })}
      onReload={() => void settings.refetch()}
    />
  );
}

/** Keyed by `version`: a save or a reload that brings a new version starts the form from the server values. */
function SettingsForm({ view, onSaved, onReload }: { view: SettingsView; onSaved: (next: { version: number; values: Values }) => void; onReload: () => void }) {
  const t = useTranslations();
  const api = useApi();
  const [{ tab }, setFilters] = useUrlFilters(TAB_FILTER);
  const section = tab as Section;
  const [draft, setDraft] = useState<Values>(view.values);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [askReload, setAskReload] = useState(false);

  const patch = useMemo(() => changedValues(view.values, draft), [view.values, draft]);
  const dirty = !isEmptyPatch(patch);
  const kept = useKeptDraft<unknown>('settings', patch, dirty);
  const { release } = useDirtyForm(dirty, { onLeave: kept.clear });

  const save = useSubmitAction(
    (key) => saveSettings(api, view.version, patch, key),
    JSON.stringify({ version: view.version, patch }),
    (next) => {
      release();
      kept.clear();
      showToast(t('settings.saved'));
      onSaved(next);
    },
  );

  const problem = save.problem;
  const { fields: fieldErrors, form: formErrors } = useMemo(
    () => (problem?.slug === 'validation-failed' ? violationsToFields(problem.violations ?? [], fieldOfPath) : { fields: {}, form: [] }),
    [problem],
  );
  const firstErrorSection = FIELD_ORDER.filter((id) => fieldErrors[id]).map(sectionOfField)[0];
  // A 400 on a field of another tab opens that tab (§6.7); the focus then follows on the field once it is shown.
  useEffect(() => {
    if (firstErrorSection && firstErrorSection !== section) setFilters({ tab: firstErrorSection });
    // Only when the errors change, not when the user later moves to another tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem]);
  const shownErrors = useMemo(
    () => Object.fromEntries(Object.entries(fieldErrors).filter(([id]) => sectionOfField(id) === section)),
    [fieldErrors, section],
  );
  useFocusFirstError(shownErrors, FIELD_ORDER);

  const conflict = problem?.slug === 'version-conflict';
  const setValue = (s: Section, key: string, value: SettingValue) => setDraft((d) => ({ ...d, [s]: { ...d[s], [key]: value } }));
  const marked = (s: Section) => patch[s] !== undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageActions>
        <Button isPending={save.pending} isDisabled={!dirty || save.waitSeconds > 0} onPress={() => void save.submit()}>
          {save.waitSeconds > 0 ? t('errors.retryIn', { seconds: save.waitSeconds }) : t('settings.save')}
        </Button>
      </PageActions>

      {kept.kept !== null && !dirty && (
        <RestoreDraftBanner
          onRestore={() => {
            setDraft(applyPatch(view.values, kept.kept));
            kept.discard();
          }}
          onDiscard={kept.discard}
        />
      )}

      {conflict ? (
        <Banner
          variant="error"
          action={
            <Button variant="secondary" onPress={() => (dirty ? setAskReload(true) : onReload())}>
              {t('settings.reload')}
            </Button>
          }
        >
          {t('errors.version-conflict')}
        </Banner>
      ) : problem?.slug === 'validation-failed' ? (
        <Banner variant="error">
          {t('settings.outOfRange')}
          {formErrors.length > 0 && <span className="block text-xs">{formErrors.join(' · ')}</span>}
        </Banner>
      ) : (
        save.error && (
          <Banner
            variant={save.canRetry ? 'offline' : 'error'}
            code={save.error.code}
            action={
              save.canRetry && (
                <Button variant="secondary" onPress={() => void save.submit()}>
                  {t('common.retry')}
                </Button>
              )
            }
          >
            {save.error.message}
          </Banner>
        )
      )}

      <Tabs
        label={t('settings.tabsLabel')}
        items={SECTIONS.map((s) => ({ id: s, label: t(`settings.tabs.${s}`), marked: marked(s) }))}
        selected={section}
        onSelect={(id) => setFilters({ tab: id })}
        aside={
          <Button variant="ghost" onPress={() => setHistoryOpen(true)}>
            {t('settings.history')}
          </Button>
        }
      >
        {(id) => {
          const s = id as Section;
          return (
            <div className="flex flex-col gap-6">
              {s === 'entitlements' && <AiUsageBlock />}
              <section aria-labelledby={`settings-${s}`} className={`${panel} gap-0 bg-surface`}>
                <h2 id={`settings-${s}`} className="pb-2 text-xl font-extrabold tracking-tight text-ink">
                  {t(`settings.tabs.${s}`)}
                </h2>
                {SETTINGS_LAYOUT[s].map((spec) => (
                  <div key={spec.key} className="border-b border-border py-4 last:border-b-0">
                    <SettingsField
                      section={s}
                      spec={spec}
                      value={draft[s][spec.key] ?? null}
                      defaultValue={view.defaults?.[s]?.[spec.key] ?? null}
                      bound={view.bounds[s]?.[spec.key]}
                      error={fieldErrors[`${s}.${spec.key}`] ? t('settings.outOfRange') : undefined}
                      onChange={(value) => setValue(s, spec.key, value)}
                    />
                  </div>
                ))}
                {s === 'reminders' && <p className="pt-2 text-xs text-muted">{t('settings.emailTemplates')}</p>}
              </section>
            </div>
          );
        }}
      </Tabs>

      {historyOpen && <SettingsHistoryDialog onClose={() => setHistoryOpen(false)} />}
      <ConfirmDialog
        isOpen={askReload}
        title={t('settings.reloadTitle')}
        confirmLabel={t('settings.reload')}
        tone="danger"
        onConfirm={() => {
          setAskReload(false);
          release();
          kept.clear();
          setDraft(view.values);
          onReload();
        }}
        onCancel={() => setAskReload(false)}
      >
        {t('settings.reloadBody')}
      </ConfirmDialog>
    </div>
  );
}

/** A/70d head: today's system AI uses, yellow once the alert threshold is reached. */
function AiUsageBlock() {
  const t = useTranslations('settings.aiUsage');
  const api = useApi();
  const format = useFormatter();
  const usage = useQuery({ queryKey: ['settings', 'ai-usage'], queryFn: () => getAiUsage(api) });
  if (usage.isPending) return null;
  if (!usage.data) return <Banner variant="error">{t('error')}</Banner>;
  const { used, cap, confirmed, reserved, alert_reached: alert } = usage.data;
  const percent = cap > 0 ? Math.round((used / cap) * 100) : 0;
  return (
    <div role="status" className={`${panel} gap-1 ${alert ? 'bg-accent-soft' : 'bg-primary-soft'}`}>
      <p className="text-ui font-extrabold text-ink">
        {t('today', { used: format.number(used), cap: format.number(cap), percent })}
      </p>
      <p className="text-xs text-ink">{t('split', { confirmed: format.number(confirmed), reserved: format.number(reserved) })}</p>
      <p className="text-xs text-ink">{t('zone')}</p>
    </div>
  );
}
