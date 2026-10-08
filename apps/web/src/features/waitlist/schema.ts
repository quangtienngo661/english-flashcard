import { z } from 'zod';
import { routing } from '@/i18n/routing';

export const emailSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.email().max(254),
);

export const localeSchema = z.enum(routing.locales);
