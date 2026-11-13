import { z } from 'zod';

/** Plain text with line breaks (no Markdown); trimmed before the length check. */
const question = z.string().trim().min(1).max(300);
const answer = z.string().trim().min(1).max(2000);
/** Smaller numbers come first, as report reasons (design §10.7). */
const position = z.number().int().min(0).max(10_000);
const uuid = z.uuid().transform((id) => id.toLowerCase());

export const createFaqSchema = z.strictObject({ question, answer, position, published: z.boolean().optional() });
export type CreateFaqBody = z.infer<typeof createFaqSchema>;

/** `expected_version` plus at least one field to change. */
export const updateFaqSchema = z.strictObject({
  expected_version: z.number().int().min(1),
  question: question.optional(), answer: answer.optional(), position: position.optional(), published: z.boolean().optional(),
}).refine((body) => Object.keys(body).some((key) => key !== 'expected_version'), {
  message: 'Change at least one field', path: ['question'],
});
export type UpdateFaqBody = z.infer<typeof updateFaqSchema>;

export const faqIdParams = z.strictObject({ id: uuid });
export type FaqIdParams = z.infer<typeof faqIdParams>;
