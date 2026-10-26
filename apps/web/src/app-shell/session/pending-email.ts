const KEY = 'wordmet-web.pending-email';
let pendingPassword: string | null = null;

export function readPendingEmail(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function writePendingEmail(email: string): void {
  try {
    sessionStorage.setItem(KEY, email);
  } catch {
    // Storage blocked: the verification page asks for the email again.
  }
}

export function clearPendingEmail(): void {
  clearPendingPassword();
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Storage may be blocked or unavailable.
  }
}

export function setPendingPassword(password: string): void {
  pendingPassword = password;
}

/** Read without clearing (React may render twice); the code page clears it on leaving through clearPendingPassword. */
export function readPendingPassword(): string | null {
  return pendingPassword;
}

export function clearPendingPassword(): void {
  pendingPassword = null;
}
