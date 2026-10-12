import { z } from 'zod';

const topicCode = z.string().regex(/^[a-z0-9-]+$/);
const topicNamesSchema = z.strictObject({
  vi: z.string().trim().min(1).optional(),
  en: z.string().trim().min(1).optional(),
});

export const createTopicSchema = z.strictObject({ code: topicCode, names: topicNamesSchema });
export const topicParamsSchema = z.strictObject({ code: topicCode });
export const updateTopicSchema = z.strictObject({
  names: topicNamesSchema.optional(),
  archived: z.boolean().optional(),
});

export type TopicNames = z.infer<typeof topicNamesSchema>;
export type CreateTopicBody = z.infer<typeof createTopicSchema>;
export type TopicParams = z.infer<typeof topicParamsSchema>;
export type UpdateTopicBody = z.infer<typeof updateTopicSchema>;
