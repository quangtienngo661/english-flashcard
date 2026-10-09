'use server';

import { handleJoin } from './join';
import { getWaitlistStore, type WaitlistState, type WaitlistStore } from './store';

export async function joinWaitlist(prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  let store: WaitlistStore;
  try {
    store = await getWaitlistStore();
  } catch (error) {
    console.error('waitlist_store_failed', { error: error instanceof Error ? error.name : 'unknown' });
    return { status: 'error', email: String(form.get('email') ?? '') };
  }
  return handleJoin(store, prev, form);
}
