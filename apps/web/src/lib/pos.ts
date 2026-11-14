/** The API's value for a part of speech nobody set (`PRIVATE_POS_UNSET`, `AI_POS_UNSET`). It is never shown to the learner. */
export const POS_UNSET = 'unspecified';

/** The part of speech to print: empty when it was never set. */
export const shownPos = (pos: string | null | undefined): string => (pos && pos !== POS_UNSET ? pos : '');
