import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
import type { GroupsService } from '../../learning/groups/groups.service.js';
import type { ItemsService } from '../../learning/items/items.service.js';
import { QuickAddService } from '../../learning/quick-add/quick-add.service.js';
import { ContentService } from '../content.service.js';
import { MyWordsController } from '../private/my-words.controller.js';
import type { PrivateWordsService } from '../private/private-words.service.js';
import type { PublishService } from '../senses/publish.service.js';
import type { AudioService } from './audio.service.js';
import type { ContentService as ContentFacade } from '../content.service.js';

/** A ContentService with only the parts the publish hooks use; the order of calls is recorded in `order`. */
function contentService(publish: Partial<Record<keyof PublishService, unknown>>) {
  const order: string[] = [];
  const audio = { ensureForSenses: vi.fn(async (_ids: string[]) => { order.push('ensure'); return []; }) };
  const service = Object.create(ContentService.prototype) as ContentService;
  Object.assign(service, {
    publish: new Proxy(publish, { get: (target, name: string) => (target[name as keyof PublishService] ? (...args: unknown[]) => {
      order.push(String(name));
      return (target[name as keyof PublishService] as (...a: unknown[]) => unknown)(...args);
    } : undefined) }),
    audio,
    saveDraft: vi.fn(),
  });
  return { service, audio, order };
}

describe('publishing queues the recordings after it has committed (round C, task 17)', () => {
  it('a publish: ensure runs after publishItem resolved, for that sense', async () => {
    const { service, audio, order } = contentService({ publishItem: async () => ({ outcome: 'published' }) });
    await service.publishItem({ senseId: 's1', revision: 2 }, 'staff');
    expect(order).toEqual(['publishItem', 'ensure']);
    expect(audio.ensureForSenses).toHaveBeenCalledExactlyOnceWith(['s1']);
  });

  it('a publish that did nothing (already published, refused) queues nothing', async () => {
    for (const result of [{ outcome: 'already_published' }, { outcome: 'refused', reason: 'stale-revision' }]) {
      const { service, audio } = contentService({ publishItem: async () => result });
      await service.publishItem({ senseId: 's1', revision: 2 }, 'staff');
      expect(audio.ensureForSenses).not.toHaveBeenCalled();
    }
  });

  it('a failed publish rethrows and queues nothing', async () => {
    const { service, audio } = contentService({ publishItem: async () => { throw new Error('boom'); } });
    await expect(service.publishItem({ senseId: 's1', revision: 2 }, 'staff')).rejects.toThrow('boom');
    expect(audio.ensureForSenses).not.toHaveBeenCalled();
  });

  it('quick-publish: ensure after the transaction of quickPublish', async () => {
    const { service, audio, order } = contentService({ quickPublish: async () => ({ outcome: 'published', revisionNo: 3, droppedTopics: [] }) });
    await service.quickPublish({ senseId: 's1', baseRevision: 2, content: {}, actorId: 'staff' });
    expect(order).toEqual(['quickPublish', 'ensure']);
    expect(audio.ensureForSenses).toHaveBeenCalledExactlyOnceWith(['s1']);
  });

  it('unpublish and retire look at the siblings of the senses they changed, and skip the ones that failed', async () => {
    const results = [{ senseId: 'a', ok: true }, { senseId: 'b', ok: false, reason: 'sense-not-found' }];
    for (const method of ['unpublish', 'retire'] as const) {
      const { service, audio } = contentService({ [method]: async () => results });
      await expect(service[method](['a', 'b'], 'staff')).resolves.toBe(results);
      expect(audio.ensureForSenses).toHaveBeenCalledExactlyOnceWith(['a']);
    }
  });

  it('ensureAudio hands the ids to the audio service', async () => {
    const { service, audio } = contentService({});
    await service.ensureAudio(['s1', 's2']);
    expect(audio.ensureForSenses).toHaveBeenCalledExactlyOnceWith(['s1', 's2']);
  });
});

describe('a learner own word is queued after its transaction (round C, task 17)', () => {
  function quickAdd() {
    const order: string[] = [];
    const tx = { $executeRaw: vi.fn(async () => 0) };
    const prisma = { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => { const r = await fn(tx); order.push('committed'); return r; }) } as unknown as PrismaClient;
    const content = {
      createPrivateSense: vi.fn(async () => ({ senseId: 'sense-new' })),
      visibleSenseIds: vi.fn(async () => new Set(['s1'])),
      addSentence: vi.fn(),
      ensureAudio: vi.fn(async (_ids: string[]) => { order.push('ensure'); return []; }),
    };
    const service = new QuickAddService(prisma, new FakeClock(new Date('2026-11-07T03:00:00Z')),
      { getProfile: vi.fn(async () => ({ timezone: 'UTC' })) } as unknown as IdentityService, content as unknown as ContentFacade,
      { assertOwned: vi.fn(async () => ({})) } as unknown as GroupsService,
      { linkInTx: vi.fn(async () => ({ item_id: 'i1', created: true })) } as unknown as ItemsService);
    return { service, content, order };
  }

  it('a new word: ensureAudio runs once, after the commit, for its sense', async () => {
    const { service, content, order } = quickAdd();
    await service.quickAdd('u1', 'vi', { groupId: 'g1', newWord: { lemma: 'phobia', meaning: 'nỗi sợ' } });
    expect(order).toEqual(['committed', 'ensure']);
    expect(content.ensureAudio).toHaveBeenCalledExactlyOnceWith(['sense-new']);
  });

  it('an existing sense: nothing is queued', async () => {
    const { service, content } = quickAdd();
    await service.quickAdd('u1', 'vi', { groupId: 'g1', senseId: 's1' });
    expect(content.ensureAudio).not.toHaveBeenCalled();
  });

  it('PATCH of a private word: the recordings of all its meanings are looked at after the transaction', async () => {
    const order: string[] = [];
    const prisma = {
      $transaction: vi.fn(async (fn: (t: unknown) => unknown) => { const r = await fn({}); order.push('committed'); return r; }),
      sense: { findMany: vi.fn(async () => [{ id: 'a' }, { id: 'b' }]) },
    } as unknown as PrismaClient;
    const words = { updatePrivateWord: vi.fn(async () => undefined) } as unknown as PrivateWordsService;
    const audio = { ensureForSenses: vi.fn(async () => { order.push('ensure'); return []; }) } as unknown as AudioService;
    const controller = new MyWordsController(prisma, words, audio);
    await controller.update({ id: 'e1' }, { lemma: 'phobias' } as never, { userId: 'u1', nativeLanguage: 'vi' });
    expect(order).toEqual(['committed', 'ensure']);
    expect(audio.ensureForSenses).toHaveBeenCalledExactlyOnceWith(['a', 'b']);
    expect(prisma.sense.findMany).toHaveBeenCalledWith({ where: { entryId: 'e1' }, select: { id: true } });
  });
});
