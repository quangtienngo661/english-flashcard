import { groupByMonth } from './month-groups';

// M7.1: month cards of "Báo lỗi của tôi" and "Lịch sử giao dịch" group by the learner's zone, keeping the API's order.
type Item = { id: string; at: string };
const at = (item: Item) => item.at;
const shape = (groups: { key: string; items: Item[] }[]) => groups.map((g) => [g.key, g.items.map((i) => i.id)]);

describe('groupByMonth', () => {
  it('is empty for no items', () => {
    expect(groupByMonth<Item>([], at, 'UTC')).toEqual([]);
  });

  it('one item gives one group', () => {
    expect(shape(groupByMonth([{ id: 'a', at: '2026-11-08T10:00:00Z' }], at, 'UTC'))).toEqual([['2026-11', ['a']]]);
  });

  const items: Item[] = [
    { id: 'a', at: '2026-11-08T10:00:00Z' },
    { id: 'b', at: '2026-10-31T17:30:00Z' },
    { id: 'c', at: '2026-10-28T10:00:00Z' },
  ];

  it('17:30 UTC on 31/10 belongs to November at UTC+7', () => {
    expect(shape(groupByMonth(items, at, 'Asia/Ho_Chi_Minh'))).toEqual([['2026-11', ['a', 'b']], ['2026-10', ['c']]]);
  });

  it('17:30 UTC on 31/10 belongs to October in UTC', () => {
    expect(shape(groupByMonth(items, at, 'UTC'))).toEqual([['2026-11', ['a']], ['2026-10', ['b', 'c']]]);
  });

  it('keeps the input order: November, October, November is three groups', () => {
    const mixed: Item[] = [
      { id: 'a', at: '2026-11-08T10:00:00Z' },
      { id: 'b', at: '2026-10-20T10:00:00Z' },
      { id: 'c', at: '2026-11-02T10:00:00Z' },
    ];
    expect(shape(groupByMonth(mixed, at, 'UTC'))).toEqual([['2026-11', ['a']], ['2026-10', ['b']], ['2026-11', ['c']]]);
  });
});
