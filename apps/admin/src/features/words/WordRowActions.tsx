import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button as AriaButton, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import { useNavigate } from 'react-router';
import { useTranslations } from 'use-intl';
import { useErrorMessage } from '../../api/use-error-message';
import { useDialogDirtyClose } from '../../app/dirty-form';
import { useApi } from '../../auth/session-context';
import { useCan } from '../../auth/use-can';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { Dialog } from '../../ui/Dialog';
import { RadioGroup } from '../../ui/RadioGroup';
import { Select } from '../../ui/Select';
import { TextField } from '../../ui/TextField';
import { showToast } from '../../ui/Toast';
import { LEVELS } from '../content/content-api';
import { addSense, setEditorialLevel, setFunctionWord, setVariants, type EntryView, type Level, type Variant } from './words-api';

type Action = 'level' | 'variants' | 'functionWord';

/** "Thao tác" of one word (A/87): edit level, variants, function word (`taxonomy.manage`), add a sense. */
export function WordRowActions({ entry }: { entry: EntryView }) {
  const t = useTranslations('words');
  const api = useApi();
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const canTaxonomy = useCan('taxonomy.manage');
  const [open, setOpen] = useState<Action | null>(null);
  const add = useMutation({
    mutationFn: () => addSense(api, entry.id),
    onSuccess: (created) => void navigate(`/senses/${created.sense_id}`),
    onError: (e) => showToast(errorMessage(e)),
  });
  const name = `${entry.lemma} · ${entry.pos}`;

  return (
    <>
      <MenuTrigger>
        <AriaButton
          aria-label={t('actionsFor', { word: name })}
          className="flex min-h-control items-center gap-1 rounded-control px-2 text-ui font-semibold text-primary outline-none hover:bg-primary-soft data-focus-visible:ring-2 data-focus-visible:ring-primary"
        >
          {t('actions')}
          <ChevronDown aria-hidden className="size-4" />
        </AriaButton>
        <Popover placement="bottom end" className="min-w-56 rounded-inner bg-surface p-1 shadow-menu motion-safe:data-entering:animate-menu-in motion-safe:data-exiting:animate-menu-out">
          <Menu
            className="outline-none"
            onAction={(key) => (key === 'sense' ? add.mutate() : setOpen(key as Action))}
          >
            {[
              { id: 'level', label: t('editLevel') },
              { id: 'variants', label: t('editVariants') },
              ...(canTaxonomy ? [{ id: 'functionWord', label: t('editFunctionWord') }] : []),
              { id: 'sense', label: t('addSense') },
            ].map((item) => (
              <MenuItem key={item.id} id={item.id} className="cursor-pointer rounded-sm px-3 py-2 text-ui text-ink outline-none data-focused:bg-primary-soft">
                {item.label}
              </MenuItem>
            ))}
          </Menu>
        </Popover>
      </MenuTrigger>
      {open === 'level' && <LevelDialog entry={entry} onClose={() => setOpen(null)} />}
      {open === 'variants' && <VariantsDialog entry={entry} onClose={() => setOpen(null)} />}
      {open === 'functionWord' && <FunctionWordDialog entry={entry} onClose={() => setOpen(null)} />}
    </>
  );
}

/** A small form dialog: dirty close asks first, a save refreshes the list and closes. */
function useEntrySave<V>(entry: EntryView, run: (value: V) => Promise<void>, onClose: () => void) {
  const queryClient = useQueryClient();
  const t = useTranslations('words');
  return useMutation({
    mutationFn: run,
    onSuccess: async () => {
      onClose();
      showToast(t('saved', { word: entry.lemma }));
      await queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

function FormDialog({
  title,
  isDirty,
  onClose,
  onSave,
  pending,
  error,
  children,
}: {
  title: string;
  isDirty: boolean;
  onClose: () => void;
  onSave: () => void;
  pending: boolean;
  error: unknown;
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const close = useDialogDirtyClose(isDirty, onClose);
  return (
    <Dialog
      isOpen
      onOpenChange={(isOpen) => !isOpen && close()}
      title={title}
      size="md"
      isDismissable={!pending}
      actions={
        <>
          <Button variant="secondary" onPress={close} isDisabled={pending}>
            {t('common.cancel')}
          </Button>
          <Button onPress={onSave} isPending={pending}>
            {t('words.save')}
          </Button>
        </>
      }
    >
      {error !== null && error !== undefined && <Banner variant="error">{errorMessage(error)}</Banner>}
      {children}
    </Dialog>
  );
}

function LevelDialog({ entry, onClose }: { entry: EntryView; onClose: () => void }) {
  const t = useTranslations('words');
  const api = useApi();
  const [level, setLevel] = useState<string>(entry.displayed_level ?? '');
  const save = useEntrySave(entry, (value: Level) => setEditorialLevel(api, entry.id, value), onClose);
  return (
    <FormDialog
      title={t('levelTitle', { word: entry.lemma })}
      isDirty={level !== (entry.displayed_level ?? '')}
      onClose={onClose}
      onSave={() => level && save.mutate(level as Level)}
      pending={save.isPending}
      error={save.error}
    >
      <Select label={t('level')} value={level} onChange={setLevel} items={LEVELS.map((l) => ({ id: l, label: l }))} placeholder={t('noLevel')} />
      <p className="text-xs text-muted">{t('levelHint')}</p>
    </FormDialog>
  );
}

function FunctionWordDialog({ entry, onClose }: { entry: EntryView; onClose: () => void }) {
  const t = useTranslations('words');
  const api = useApi();
  const initial = entry.function_word_override === null ? 'auto' : String(entry.function_word_override);
  const [value, setValue] = useState(initial);
  const save = useEntrySave(entry, (v: string) => setFunctionWord(api, entry.id, v === 'auto' ? null : v === 'true'), onClose);
  return (
    <FormDialog
      title={t('functionWordTitle', { word: entry.lemma })}
      isDirty={value !== initial}
      onClose={onClose}
      onSave={() => save.mutate(value)}
      pending={save.isPending}
      error={save.error}
    >
      <RadioGroup
        label={t('functionWord')}
        value={value}
        onChange={setValue}
        items={[
          { id: 'true', label: t('yes') },
          { id: 'false', label: t('no') },
          { id: 'auto', label: t('auto', { value: entry.function_word_derived ? t('yes') : t('no') }) },
        ]}
      />
    </FormDialog>
  );
}

function VariantsDialog({ entry, onClose }: { entry: EntryView; onClose: () => void }) {
  const t = useTranslations('words');
  const api = useApi();
  const [rows, setRows] = useState<Variant[]>(entry.variants.map((v) => ({ ...v })));
  const save = useEntrySave(entry, (value: Variant[]) => setVariants(api, entry.id, value), onClose);
  const cleaned = rows.filter((r) => r.text.trim() !== '').map((r) => ({ ...r, text: r.text.trim() }));
  const isDirty = JSON.stringify(cleaned.map(({ text, kind, accepted_as_answer }) => [text, kind, accepted_as_answer])) !==
    JSON.stringify(entry.variants.map(({ text, kind, accepted_as_answer }) => [text, kind, accepted_as_answer]));
  const update = (i: number, change: Partial<Variant>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...change } : r)));
  return (
    <FormDialog
      title={t('variantsTitle', { word: entry.lemma })}
      isDirty={isDirty}
      onClose={onClose}
      onSave={() => save.mutate(cleaned)}
      pending={save.isPending}
      error={save.error}
    >
      {rows.length === 0 && <p className="text-ui text-muted">{t('noVariants')}</p>}
      {rows.map((row, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-panel border-2 border-border p-3">
          <TextField label={t('variantText')} value={row.text} onChange={(text) => update(i, { text })} />
          <Select
            label={t('variantKind')}
            value={row.kind}
            onChange={(kind) => update(i, { kind: kind as Variant['kind'] })}
            items={[
              { id: 'spelling', label: t('kinds.spelling') },
              { id: 'alias', label: t('kinds.alias') },
            ]}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Checkbox isSelected={row.accepted_as_answer} onChange={(on) => update(i, { accepted_as_answer: on })}>
              {t('acceptedAsAnswer')}
            </Checkbox>
            <Button variant="ghost" onPress={() => setRows(rows.filter((_, j) => j !== i))}>
              <Trash2 aria-hidden className="size-4" />
              {t('removeVariant')}
            </Button>
          </div>
        </div>
      ))}
      <Button variant="ghost" className="w-fit" onPress={() => setRows([...rows, { text: '', kind: 'spelling', accepted_as_answer: true }])}>
        <Plus aria-hidden className="size-4" />
        {t('addVariant')}
      </Button>
    </FormDialog>
  );
}
