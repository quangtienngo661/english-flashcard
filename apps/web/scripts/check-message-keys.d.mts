export function findUnusedKeys(input: {
  messages: Record<string, unknown>;
  sources: Array<{ path: string; text: string }>;
  allow: Array<{ key: string; why: string }>;
}): { unused: string[]; staleAllow: string[] };
export function leafKeys(messages: Record<string, unknown>): string[];
export function readRepoInput(root: string): { messages: Record<string, unknown>; sources: Array<{ path: string; text: string }>; allow: Array<{ key: string; why: string }> };
