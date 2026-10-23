import { describe, expect, it, vi } from 'vitest';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { Learner } from '../learner/learner-content.guard.js';
import { SentencesController } from './sentences.controller.js';
import type { SentencesService } from './sentences.service.js';

const learner = { userId: 'u1', nativeLanguage: 'vi' } as Learner;
const SENSE = '00000000-0000-4000-8000-0000000000aa';

describe('GET /v1/senses/{id}/sentences (API (e))', () => {
  it('GE1: { items: [{ id, text, created_at }] } in the order the service gives', async () => {
    const sentences = { listForSense: vi.fn(async () => [{ id: 'cs1', text: 'We deploy on Fridays.', createdAt: new Date('2026-10-19T03:00:00Z') }]) };
    const controller = new SentencesController({} as PrismaClient, sentences as unknown as SentencesService);
    expect(await controller.list({ id: SENSE }, learner)).toEqual({
      items: [{ id: 'cs1', text: 'We deploy on Fridays.', created_at: '2026-10-19T03:00:00.000Z' }],
    });
    expect(sentences.listForSense).toHaveBeenCalledWith('u1', SENSE);
  });

  it('GE3: a sense the learner cannot see is 404 not-found', async () => {
    const controller = new SentencesController({} as PrismaClient, { listForSense: async () => null } as unknown as SentencesService);
    const error = await controller.list({ id: SENSE }, learner).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProblemDetailsException);
    expect((error as ProblemDetailsException).getStatus()).toBe(404);
  });

  it("GE4: deleting one of the listed sentences is 204; another learner's id is 404", async () => {
    const deleteSentence = vi.fn(async (_user: string, id: string) => id === 'cs1');
    const controller = new SentencesController({} as PrismaClient, { deleteSentence } as unknown as SentencesService);
    await expect(controller.remove({ id: 'cs1' }, learner)).resolves.toBeUndefined();
    await expect(controller.remove({ id: 'cs9' }, learner)).rejects.toBeInstanceOf(ProblemDetailsException);
  });
});
