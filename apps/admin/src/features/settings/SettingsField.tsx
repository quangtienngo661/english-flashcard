import { useFormatter, useTranslations } from 'use-intl';
import { NumberField } from '../../ui/NumberField';
import { Select } from '../../ui/Select';
import { Switch } from '../../ui/Switch';
import { fieldId, timeOptions, type Bound, type FieldSpec, type Section, type SettingValue } from './settings-api';

type Props = {
  section: Section;
  spec: FieldSpec;
  value: SettingValue;
  defaultValue: SettingValue;
  bound: Bound | undefined;
  error?: string;
  onChange: (value: SettingValue) => void;
};

/** The hint line under a field (design §6.7): "`khóa` · 1–30 ngày hoặc để trống = không gửi · mặc định để trống". */
function useHint() {
  const t = useTranslations('settings');
  const format = useFormatter();
  const shown = (spec: FieldSpec, value: SettingValue) => {
    if (value === null) return t('hint.empty');
    if (typeof value === 'boolean') return value ? t('hint.on') : t('hint.off');
    if (typeof value === 'number') return spec.unit === 'percent' ? `${format.number(value)}%` : format.number(value);
    return value;
  };
  return (spec: FieldSpec, bound: Bound | undefined, defaultValue: SettingValue) => {
    const parts: string[] = [spec.key];
    if (spec.kind === 'bool') parts.push(t('hint.onOff'));
    else if (bound) {
      const n = (v: number | string) => (typeof v === 'number' ? format.number(v) : v);
      const unit = spec.unit === undefined ? '' : spec.unit === 'percent' ? '%' : ` ${t(`units.${spec.unit}`)}`;
      let range = `${n(bound.min)}–${n(bound.max)}${unit}`;
      if (bound.step_minutes) range += `, ${t('hint.step', { minutes: bound.step_minutes })}`;
      if (spec.key in CROSS) range += ` ${t(`cross.${spec.key as keyof typeof CROSS}`)}`;
      if (bound.nullable) {
        const meaning = spec.key in EMPTY ? t(`emptyMeaning.${spec.key as keyof typeof EMPTY}`) : t('emptyMeaning.noLimit');
        range += ` ${t('hint.orEmpty', { meaning })}`;
      }
      if (spec.key in ZERO) range += `, ${t('hint.zero', { meaning: t(`zeroMeaning.${spec.key as keyof typeof ZERO}`) })}`;
      parts.push(range);
    }
    parts.push(t('hint.default', { value: shown(spec, defaultValue) }));
    return parts.join(' · ');
  };
}

const CROSS = { stop_after_days: 1, default_questions_per_session: 1, pro_practice_sessions_per_day: 1 } as const;
const EMPTY = { renewal_notice_days_before: 1, ai_cap_alert_percent: 1 } as const;
const ZERO = { ai_prefetch_count: 1, content_retention_days: 1 } as const;

/** One setting: a switch, the send-time select or a number field, with its hint and error. */
export function SettingsField({ section, spec, value, defaultValue, bound, error, onChange }: Props) {
  const t = useTranslations('settings');
  const hint = useHint()(spec, bound, defaultValue);
  const id = fieldId(section, spec.key);
  const label = t(`fields.${section}.${spec.key}` as Parameters<typeof t>[0]);

  if (spec.kind === 'bool') {
    return <Switch id={id} label={label} description={hint} isSelected={value === true} onChange={onChange} />;
  }
  if (spec.kind === 'time') {
    return (
      <div className="max-w-md">
        <Select
          id={id}
          label={label}
          description={hint}
          error={error}
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
          items={timeOptions(bound).map((time) => ({ id: time, label: time }))}
        />
      </div>
    );
  }
  return (
    <div className="max-w-md">
      <NumberField
        id={id}
        label={label}
        description={hint}
        error={error}
        value={typeof value === 'number' ? value : null}
        onChange={onChange}
        isNullable={bound?.nullable === true}
        minValue={typeof bound?.min === 'number' ? bound.min : undefined}
        maxValue={typeof bound?.max === 'number' ? bound.max : undefined}
        step={1}
      />
    </div>
  );
}
