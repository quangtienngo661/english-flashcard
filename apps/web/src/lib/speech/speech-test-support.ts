export function makeVoice(lang: string, localService = true): SpeechSynthesisVoice {
  return { lang, localService, name: `${lang}-${localService}`, voiceURI: `${lang}-${localService}`, default: false };
}

export class FakeUtterance {
  voice: SpeechSynthesisVoice | null = null;
  lang = '';
  constructor(public text: string) {}
}

/** Install a fresh browser speech service in each test; callers can deliver voices later. */
export function installSpeech(initialVoices: SpeechSynthesisVoice[] = []) {
  let voices = initialVoices;
  const events = new EventTarget();
  const synth = {
    getVoices: vi.fn(() => [...voices]),
    cancel: vi.fn(),
    speak: vi.fn<(utterance: SpeechSynthesisUtterance) => void>(),
    addEventListener: vi.fn((type: string, listener: EventListener) => events.addEventListener(type, listener)),
    removeEventListener: vi.fn((type: string, listener: EventListener) => events.removeEventListener(type, listener)),
  };
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return {
    ...synth,
    setVoices(next: SpeechSynthesisVoice[]) {
      voices = next;
      events.dispatchEvent(new Event('voiceschanged'));
    },
  };
}
