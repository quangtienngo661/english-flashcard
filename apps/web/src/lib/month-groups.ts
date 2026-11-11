import { monthOf, todayIn } from '@/lib/learner-date';

/**
 * Month cards of a newest-first list (M7.1: "Báo lỗi của tôi", "Lịch sử giao dịch"). `key` is `YYYY-MM` in `zone` (the learner's
 * zone, design §10.4). The input order is kept: a new group starts whenever the month changes, so groups are never merged.
 */
export function groupByMonth<T>(items: T[], at: (item: T) => string, zone: string): { key: string; items: T[] }[] {
  const groups: { key: string; items: T[] }[] = [];
  for (const item of items) {
    const key = monthOf(todayIn(zone, new Date(at(item))));
    const last = groups.at(-1);
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  }
  return groups;
}
