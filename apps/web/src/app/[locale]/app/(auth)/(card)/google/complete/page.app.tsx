import { GoogleComplete } from '@/features/learner/auth/GoogleComplete';

// Design §9.2: in the (auth) group, because there is no account yet for RequireSession to find. The ticket is read in the browser.
export default function Page() {
  return <GoogleComplete />;
}
