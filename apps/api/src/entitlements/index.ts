// The only entry point other modules (Practice; Content and Practice AI in Bước 7) may import from Entitlements.
export { EntitlementsModule } from './entitlements.module.js';
export { EntitlementsService, type EntitlementsSnapshot, type Feature } from './entitlements.service.js';
export type { AiPool, Pool } from './entitlements.types.js';
export { refusalProblem, type Refusal } from './refusal.js';
export type { ReserveResult } from './usage/usage-ledger.service.js';
