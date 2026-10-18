import { Injectable } from '@nestjs/common';

export type Feature = 'practice.basic';

/**
 * Placeholder for the Entitlements module (Bước 4 D25): every signed-in user may use every feature. Bước 5 replaces the
 * body of `check` with the real tier rules; callers already handle `{ allowed: false }`.
 */
@Injectable()
export class EntitlementsService {
  async check(_userId: string, _feature: Feature): Promise<{ allowed: true } | { allowed: false }> {
    return { allowed: true };
  }
}
