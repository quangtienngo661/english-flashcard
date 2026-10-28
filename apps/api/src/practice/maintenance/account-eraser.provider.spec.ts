import { describe, expect, it, vi } from 'vitest';
import type { ContentService } from '../../content/index.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AccountDeletionRegistry, type AccountDataEraser } from '../../identity/deletion/account-eraser.js';
import { PracticeAccountEraser } from './account-eraser.provider.js';

function setup(privateSenseIds: string[] = ['s-private']) {
  const events: string[] = [];
  const del = (name: string) => ({ deleteMany: vi.fn(async (_args: unknown) => { events.push(name); return { count: 0 }; }) });
  const tx = {
    $executeRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join('?');
      events.push(sql.includes('UPDATE practice_reports') ? 'anonymise-reports' : `lock:${String(values[0])}`);
      return 1;
    }),
    practiceReport: del('reports-delete'), practiceSessionItem: del('items'), practiceQuestion: del('questions'),
    practiceSession: del('sessions'), practiceAiRequest: del('ai-requests'), practiceWordCheck: del('word-checks'),
  };
  const content = { privateSenseIdsOf: vi.fn(async () => { events.push('private-senses'); return privateSenseIds; }) };
  const eraser: AccountDataEraser = new PracticeAccountEraser(new AccountDeletionRegistry(), content as unknown as ContentService);
  return { tx, events, content, eraser, client: tx as unknown as Prisma.TransactionClient };
}

describe('PracticeAccountEraser (unit: statements and their order; real effects are proven in the smoke)', () => {
  it('runs in lock order: items before questions, reports of private words deleted, the rest anonymised', async () => {
    const { tx, events, eraser, client } = setup();
    await eraser.erase(client, 'u1', 'anon-1', { checks: 'normal' });
    expect(events).toEqual([
      'lock:practice.user:u1', 'private-senses', 'reports-delete', 'anonymise-reports',
      'items', 'questions', 'sessions', 'ai-requests', 'word-checks',
    ]);
    expect(tx.practiceReport.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', senseId: { in: ['s-private'] } } });
    for (const delegate of [tx.practiceSessionItem, tx.practiceQuestion, tx.practiceSession, tx.practiceAiRequest, tx.practiceWordCheck]) {
      expect(delegate.deleteMany).toHaveBeenCalledExactlyOnceWith({ where: { userId: 'u1' } });
    }
  });

  it('the anonymising statement sets the anon id, clears the note and the three learner keys, for this user only', async () => {
    const { tx, eraser, client } = setup();
    await eraser.erase(client, 'u1', 'anon-1', { checks: 'normal' });
    const call = tx.$executeRaw.mock.calls.find(([strings]) => strings.join('?').includes('UPDATE practice_reports'))!;
    const sql = call[0].join('?');
    expect(call.slice(1)).toEqual(['anon-1', 'u1']);
    expect(sql).toContain('note = NULL');
    for (const key of ['{learner,answer}', '{learner,option_index}', '{learner,answers_tried}']) expect(sql).toContain(key);
  });

  it('without private words it deletes no report by sense, and a second run issues the same statements without error', async () => {
    const { tx, eraser, client } = setup([]);
    await eraser.erase(client, 'u1', 'anon-1', { checks: 'normal' });
    await eraser.erase(client, 'u1', 'anon-2', { checks: 'skip' });
    expect(tx.practiceReport.deleteMany).not.toHaveBeenCalled();
    expect(tx.practiceSessionItem.deleteMany).toHaveBeenCalledTimes(2);
  });
});
