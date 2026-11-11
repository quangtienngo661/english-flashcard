/** The first stop of the keyboard on every public page: jumps to `main#main`. Hidden until focused. */
export function SkipLink({ label }: { label: string }) {
  return (
    <a
      href="#main"
      className="sr-only rounded-wm-button bg-wm-ink px-4 py-3 font-wm-sans text-wm-small-strong text-wm-surface focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
    >
      {label}
    </a>
  );
}
