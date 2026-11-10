// Flags keep their real colours in both themes (copy doc §12, "màu cờ cố định, không theo biến"), so they are drawn here and
// not taken from the colour tokens.
export function Flag({ code }: { code: 'vi' | 'en' }) {
  if (code === 'vi') {
    return (
      <svg aria-hidden viewBox="0 0 30 20" className="h-3.5 w-5 shrink-0 rounded-xs">
        <rect width="30" height="20" fill="#da251d" />
        <polygon fill="#ffff00" points="15,4 16.76,9.42 22.47,9.42 17.85,12.77 19.61,18.19 15,14.84 10.39,18.19 12.15,12.77 7.53,9.42 13.24,9.42" />
      </svg>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 60 30" className="h-3.5 w-5 shrink-0 rounded-xs">
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 60,30 M60,0 0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 60,30 M60,0 0,30" stroke="#c8102e" strokeWidth="2" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
    </svg>
  );
}
