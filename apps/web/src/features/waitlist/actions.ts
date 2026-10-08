'use server';

import { handleJoin } from './join';
import { getWaitlistStore, type WaitlistState } from './store';

export async function joinWaitlist(prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  return handleJoin(getWaitlistStore(), prev, form);
}
