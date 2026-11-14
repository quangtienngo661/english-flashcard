// Runs inline before the app paints so a dark choice never flashes light (design §4.4). Keep it in sync with theme.ts;
// THEME_SCRIPT_HASH is its CSP hash (theme-script.test.ts recomputes it).
export const THEME_SCRIPT =
  "(function(){var c='system';try{c=localStorage.getItem('wordmet-web.theme')||'system'}catch(e){}var d=c==='dark'||(c!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light'})();";

export const THEME_SCRIPT_HASH = "'sha256-4qCbwRV0mTFT1agN4flhun8CI1pHQO8k/Bd4U69TcB0='";
