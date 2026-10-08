import { emailSchema, localeSchema } from './schema';
import type { WaitlistState, WaitlistStore } from './store';

// Spec §8: honeypot and "already registered" both answer success, so bots and email probing learn nothing.
export async function handleJoin(store: WaitlistStore, _prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  const rawEmail = String(form.get('email') ?? '');
  if (String(form.get('company') ?? '') !== '') return { status: 'success' };

  const email = emailSchema.safeParse(rawEmail);
  if (!email.success) return { status: 'invalid_email', email: rawEmail };
  if (form.get('consent') !== 'on') return { status: 'missing_consent', email: rawEmail };

  const locale = localeSchema.safeParse(form.get('locale'));
  if (!locale.success) return { status: 'error', email: rawEmail };

  try {
    await store.add(email.data, locale.data);
    return { status: 'success' };
  } catch {
    return { status: 'error', email: rawEmail };
  }
}
