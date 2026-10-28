import { Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';

/** Modules that hold a user's rows and erase or anonymise them when the account is deleted (design §7.3). */
export type ErasableModule = 'practice' | 'learning' | 'content' | 'notifications' | 'entitlements' | 'ai';

/**
 * Practice first (its row locks come first in the code and it needs the learner's private senses before Content deletes them,
 * with items before questions inside Practice), then Learning, Content, Notifications, Entitlements, AI (design §7.3).
 */
export const ERASE_ORDER: readonly ErasableModule[] = ['practice', 'learning', 'content', 'notifications', 'entitlements', 'ai'];

/**
 * `'normal'`: a precondition that is false makes the eraser throw (Entitlements: a subscription still renewing). `'skip'`: replay after
 * a restore from backup, when the restored rows may say anything (design §7.5, B8E53).
 */
export type EraseOptions = { checks: 'normal' | 'skip' };

export interface AccountDataEraser {
  readonly module: ErasableModule;
  /** Idempotent, and it must work when the `users` row is already gone (the sweep and the replay run it again): only `userId` is needed. */
  erase(tx: Prisma.TransactionClient, userId: string, anonId: string, opts: EraseOptions): Promise<void>;
}

/** Registered by Entitlements. */
export interface AccountDeletionPrecondition {
  /** True when any of the user's subscriptions is auto-renewing (D11, D28). `db` is a transaction or the client. */
  renewing(db: Prisma.TransactionClient | PrismaClient, userId: string): Promise<boolean>;
  /** Admin deletion (D31): turn auto-renewal off at the provider before the deletion starts. */
  turnOffRenewalForAdminDelete(userId: string): Promise<'turned_off' | 'none' | 'not_supported'>;
}

/** Registered by Settings: Identity never imports Settings (D3), so it reads the two numbers it needs through this port. */
export interface IdentitySettingsReader {
  unverifiedCleanupDays(): Promise<number>;
  transactionRetentionYears(): Promise<number>;
}

/**
 * Other modules register at start-up, as they do for entry-usage probes. A missing port is an error, never "nothing to erase":
 * the deletion fails closed (design §7.4, B8E23).
 */
@Injectable()
export class AccountDeletionRegistry {
  private readonly erasersByModule = new Map<ErasableModule, AccountDataEraser>();
  private preconditionPort: AccountDeletionPrecondition | null = null;
  private settingsReader: IdentitySettingsReader | null = null;

  registerEraser(eraser: AccountDataEraser): void {
    this.erasersByModule.set(eraser.module, eraser);
  }

  registerPrecondition(port: AccountDeletionPrecondition): void {
    this.preconditionPort = port;
  }

  registerSettingsReader(reader: IdentitySettingsReader): void {
    this.settingsReader = reader;
  }

  /** Every eraser in `ERASE_ORDER`. */
  erasers(): AccountDataEraser[] {
    const missing = ERASE_ORDER.filter((module) => !this.erasersByModule.has(module));
    if (missing.length > 0) throw new Error(`Account deletion port not registered: eraser of ${missing.join(', ')}`);
    return ERASE_ORDER.map((module) => this.erasersByModule.get(module)!);
  }

  precondition(): AccountDeletionPrecondition {
    if (!this.preconditionPort) throw new Error('Account deletion port not registered: precondition');
    return this.preconditionPort;
  }

  settings(): IdentitySettingsReader {
    if (!this.settingsReader) throw new Error('Account deletion port not registered: settings reader');
    return this.settingsReader;
  }
}
