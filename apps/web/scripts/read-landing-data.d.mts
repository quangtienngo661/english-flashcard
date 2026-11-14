export function readLandingData(options: {
  baseUrl: string;
  required: boolean;
  offline: boolean;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<string | undefined>;
export function readLandingDataOnce(
  env: Record<string, string | undefined>,
  options: Parameters<typeof readLandingData>[0],
): Promise<string | undefined>;
