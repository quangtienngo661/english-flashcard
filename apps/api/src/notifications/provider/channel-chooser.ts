import { Inject, Injectable } from '@nestjs/common';
import { SettingsService } from '../../settings/index.js';
import { ReminderPrefsService } from '../prefs/reminder-prefs.service.js';
import { EmailProvider } from './email.provider.js';
import type { NotificationProvider } from './notification-provider.js';

/**
 * Picks the channels for one reminder (design 8.1). Bước 3 has email only: it is chosen when the system
 * and the learner both have reminders on. "Push first, email less often" is added with push.
 */
@Injectable()
export class ChannelChooser {
  constructor(
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(ReminderPrefsService) private readonly prefs: ReminderPrefsService,
    @Inject(EmailProvider) private readonly email: EmailProvider,
  ) {}

  async choose(userId: string): Promise<NotificationProvider[]> {
    const [settings, learnerOn] = await Promise.all([this.settings.get(), this.prefs.isEnabled(userId)]);
    return settings.reminders.enabled && learnerOn ? [this.email] : [];
  }
}
