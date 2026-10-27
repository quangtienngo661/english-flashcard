import type { ReactNode } from 'react';
import { Tab, TabList, TabPanel, Tabs as AriaTabs } from 'react-aria-components';
import { useTranslations } from 'use-intl';

type Item = { id: string; label: string; marked?: boolean };

type Props = {
  /** Names the tab list for screen readers. */
  label: string;
  items: Item[];
  selected: string;
  onSelect: (id: string) => void;
  /** Sits beside the tab list (e.g. a [Lịch sử thay đổi] link). */
  aside?: ReactNode;
  /** The panel of the selected tab; only that one is rendered. */
  children: (id: string) => ReactNode;
};

/** Controlled tabs (the caller keeps `selected`, e.g. in `?tab=`); a `marked` tab carries a dot for unsaved changes (§6.7). */
export function Tabs({ label, items, selected, onSelect, aside, children }: Props) {
  const t = useTranslations();
  return (
    <AriaTabs selectedKey={selected} onSelectionChange={(key) => onSelect(String(key))} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <TabList
          aria-label={label}
          className="flex max-w-full flex-wrap gap-1 rounded-panel border-2 border-border bg-surface p-1"
        >
          {items.map((item) => (
            <Tab
              key={item.id}
              id={item.id}
              className="flex min-h-control cursor-pointer items-center gap-1.5 rounded-control px-3 text-ui font-medium text-ink outline-none data-focus-visible:ring-2 data-focus-visible:ring-primary data-hovered:bg-canvas data-selected:bg-ink data-selected:text-surface"
            >
              {item.label}
              {item.marked && (
                <span data-testid="tab-dot" className="size-2 rounded-full bg-accent">
                  <span className="sr-only">{' '}{t('common.unsavedChanges')}</span>
                </span>
              )}
            </Tab>
          ))}
        </TabList>
        {aside}
      </div>
      {items
        .filter((item) => item.id === selected)
        .map((item) => (
          <TabPanel key={item.id} id={item.id} className="outline-none">
            {children(item.id)}
          </TabPanel>
        ))}
    </AriaTabs>
  );
}
