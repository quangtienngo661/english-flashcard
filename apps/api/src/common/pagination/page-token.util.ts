export interface PageCursor {
  id: string;
}

export function encodePageToken(cursor: PageCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodePageToken(token: string): PageCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    if (typeof parsed === 'object' && parsed !== null && typeof parsed.id === 'string') {
      return parsed as PageCursor;
    }
    return null;
  } catch {
    return null;
  }
}

export function encodeBoundToken(payload: Record<string, string | number>, binding: string): string {
  return Buffer.from(JSON.stringify({ binding, payload }), 'utf8').toString('base64url');
}

export function decodeBoundToken(token: string, binding: string): Record<string, string | number> | null {
  try {
    // Buffer's decoder accepts stray characters and truncated encodings; bound tokens are canonical.
    if (!token || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
    const bytes = Buffer.from(token, 'base64url');
    if (bytes.toString('base64url') !== token) return null;
    const parsed: unknown = JSON.parse(bytes.toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    const envelope = parsed as Record<string, unknown>;
    if (envelope.binding !== binding || Object.keys(envelope).length !== 2) return null;
    const payload = envelope.payload;
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
    if (!Object.values(payload).every((value) => typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value)))) return null;
    return payload as Record<string, string | number>;
  } catch {
    return null;
  }
}
