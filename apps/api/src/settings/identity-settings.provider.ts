import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { AccountDeletionRegistry, type IdentitySettingsReader } from '../identity/deletion/account-eraser.js';
import { SettingsService } from './settings.service.js';

/** Identity never imports Settings (D3): it reads the two numbers it needs through the port registered here (Bước 8, design §4). */
@Injectable()
export class IdentitySettingsProvider implements IdentitySettingsReader, OnModuleInit {
  constructor(
    @Inject(AccountDeletionRegistry) private readonly registry: AccountDeletionRegistry,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  onModuleInit(): void {
    this.registry.registerSettingsReader(this);
  }

  async unverifiedCleanupDays(): Promise<number> {
    return (await this.settings.get()).identity.unverifiedCleanupDays;
  }

  async transactionRetentionYears(): Promise<number> {
    return (await this.settings.get()).entitlements.transactionRetentionYears;
  }
}
