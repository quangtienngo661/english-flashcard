// The only entry point other modules (Learning, Notifications) may import from Settings.
export {
  AI_MAX_MODES, AI_PLACEMENTS, SCOPE_QUESTIONS_MAX, SESSION_MAX_MODES, SETTINGS_BOUNDS, SETTINGS_DEFAULTS, type AiMaxMode, type AiPlacementSetting,
  type AppSettings, type SessionMaxMode,
} from './settings.definitions.js';
export { SettingsModule } from './settings.module.js';
export { SettingsService } from './settings.service.js';
export type { SettingKeyChange } from './setting-history.js';
