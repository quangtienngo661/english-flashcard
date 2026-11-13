const STORAGE_KEY = 'wordmet-web.own-sentences';

/** C3: "Điền từ vào câu bạn đã lưu" is remembered on this device only; blocked storage means "off". */
export function readOwnSentencesOn(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

export function writeOwnSentencesOn(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // Not remembered; the dialog still works.
  }
}
