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
