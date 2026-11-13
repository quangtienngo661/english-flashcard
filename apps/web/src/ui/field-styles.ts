// Shared look of the new UI's fields (Figma "Ô nhập" 34:345): label above, constraint below, error right under the field.
// 48px tall, radius 10, 1.5px border in field-line (ink 22 % on surface, P.14: visible on the mesh too); typing: accent border with a 4px
// glow; error: fail border.
export const FIELD_LABEL = 'font-wm-sans text-wm-small-strong text-wm-ink';
export const FIELD_BOX =
  'min-h-12 w-full min-w-0 rounded-wm-control border-2 border-wm-field-line bg-wm-surface px-3.5 py-2 font-wm-sans text-wm-base text-wm-ink ' +
  'outline-none placeholder:text-wm-muted focus-visible:border-wm-accent focus-visible:ring-4 focus-visible:ring-wm-accent/16 ' +
  'disabled:opacity-60 read-only:bg-wm-bg';
export const FIELD_HINT = 'font-wm-sans text-wm-caption text-wm-muted';
export const FIELD_ERROR = 'flex items-start gap-1.5 font-wm-sans text-wm-caption text-wm-fail';
