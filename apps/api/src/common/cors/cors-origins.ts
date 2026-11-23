export interface CorsHostConfig {
  corsOrigins: string[];
  adminAppUrl: string;
}

/**
 * Resolves allowed CORS origins for the incoming Host header (SEC-01).
 * The staff API host (`admin-api.*`) accepts only the admin origin; all other hosts use `corsOrigins`.
 */
export function corsOriginsFor(host: string | undefined, config: CorsHostConfig): string[] {
  if (host && host.toLowerCase().split(':')[0].startsWith('admin-api.')) {
    return [new URL(config.adminAppUrl).origin];
  }
  return config.corsOrigins;
}
