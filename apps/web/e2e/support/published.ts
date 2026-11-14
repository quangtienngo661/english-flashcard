// M8.9: a second e2e Worker serves the same build with the published legal texts and data sources of public-api.mjs behind its server
// reads (playwright.config.ts). Tests that need those states open `PUBLISHED` URLs; the default base URL keeps the "no API" states.
export const PUBLISHED_PORT = 3101;
export const PUBLIC_API_PORT = 3199;
export const PUBLISHED = `http://localhost:${PUBLISHED_PORT}`;
