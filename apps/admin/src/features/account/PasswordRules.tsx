import { Check, X } from 'lucide-react';
import { useTranslations } from 'use-intl';

const BASE = ['min_length', 'uppercase', 'lowercase', 'digit', 'special'] as const;

/**
 * The password rules, the unmet ones in red (Figma `violations`). `violations` are API codes: the policy codes
 * plus `same_as_current` from the change-password endpoint, which is listed only when the server reports it.
 */
export function PasswordRules({ violations }: { violations: string[] }) {
  const t = useTranslations();
  const rules: string[] = [...BASE];
  for (const extra of ['max_length', 'same_as_current']) if (violations.includes(extra)) rules.push(extra);
  return (
    <ul className="flex flex-col gap-0.5">
      {rules.map((rule) => {
        const bad = violations.includes(rule);
        const Icon = bad ? X : Check;
        return (
          <li
            key={rule}
            data-violated={bad}
            className={`flex items-center gap-1.5 text-xs ${bad ? 'text-danger' : 'text-muted'}`}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            {rule === 'same_as_current' ? t('errors.same_as_current') : t(`account.passwordRules.${rule}`)}
          </li>
        );
      })}
    </ul>
  );
}
