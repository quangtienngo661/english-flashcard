import { Global, Injectable, Module } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PRIVATE_SENSES_CLEANUP, type PrivateSensesCleanup } from '../../learning/index.js';

/**
 * Removes what Practice keeps about private senses being deleted, inside `deleteMyWord`'s transaction (design §11, R2).
 * Lock order: the learner's open sessions holding those senses (step 2), then the AI requests for them (Bước 7 §12.1), then
 * their items (step 3), each in id order; Learning locks its own items only after this returns. The requests go first: a
 * generation that reaches step H afterwards finds no row and writes no question (B7E115); one that wrote before is committed,
 * so its question is deleted below with the others.
 */
@Injectable()
export class PracticePrivateSensesCleanup implements PrivateSensesCleanup {
  async deleteForSenses(tx: Prisma.TransactionClient, userId: string, senseIds: string[]): Promise<void> {
    if (senseIds.length === 0) return;
    await tx.$queryRaw`
      SELECT s.id FROM practice_sessions s
      WHERE s.user_id = ${userId}::uuid AND s.status IN ('active', 'waiting_continue')
        AND (EXISTS (SELECT 1 FROM practice_session_items i WHERE i.session_id = s.id AND i.sense_id = ANY(${senseIds}::uuid[]))
          OR EXISTS (SELECT 1 FROM practice_ai_requests r WHERE r.id = s.pending_ai_request_id AND r.sense_id = ANY(${senseIds}::uuid[])))
      ORDER BY s.id FOR UPDATE`;
    const requests = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM practice_ai_requests
      WHERE user_id = ${userId}::uuid AND sense_id = ANY(${senseIds}::uuid[]) ORDER BY id FOR UPDATE`;
    await tx.$queryRaw`
      SELECT id FROM practice_session_items
      WHERE user_id = ${userId}::uuid AND sense_id = ANY(${senseIds}::uuid[]) ORDER BY id FOR UPDATE`;
    const requestIds = requests.map(({ id }) => id);
    if (requestIds.length > 0) await tx.practiceAiRequest.deleteMany({ where: { id: { in: requestIds } } });
    await tx.practiceWordCheck.deleteMany({ where: { userId, senseId: { in: senseIds } } });
    if (requestIds.length > 0) {
      await tx.practiceSession.updateMany({ where: { userId, pendingAiRequestId: { in: requestIds } }, data: { pendingAiRequestId: null } });
    }
    // The next next/current reads the notice and says "Không tìm thấy từ này" (B4E8); a final item needs none.
    await tx.practiceSession.updateMany({
      where: {
        userId, status: { in: ['active', 'waiting_continue'] },
        items: { some: { senseId: { in: senseIds }, result: null } },
      },
      data: { pendingNotice: 'word-not-found' },
    });
    await tx.practiceReport.deleteMany({ where: { userId, senseId: { in: senseIds } } });
    await tx.practiceSessionItem.deleteMany({ where: { userId, senseId: { in: senseIds } } });
    // Questions of other words that used these senses as distractors stay: they live only in this learner's history.
    await tx.practiceQuestion.deleteMany({ where: { userId, senseId: { in: senseIds } } });
  }
}

/** Global so Learning's `@Optional()` injection finds it without importing Practice (as BATCH_SCOPE). */
@Global()
@Module({
  providers: [PracticePrivateSensesCleanup, { provide: PRIVATE_SENSES_CLEANUP, useExisting: PracticePrivateSensesCleanup }],
  exports: [PRIVATE_SENSES_CLEANUP],
})
export class PracticePortsModule {}
