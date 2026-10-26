'use client';

import { useSyncExternalStore } from 'react';

type Voices = {
  uk: SpeechSynthesisVoice | null;
  us: SpeechSynthesisVoice | null;
  usLocal: SpeechSynthesisVoice | null;
  ready: boolean;
};

// Unsupported speech and an empty (possibly still loading) list both use ready: false.
const EMPTY: Voices = { uk: null, us: null, usLocal: null, ready: false };
let cachedSource: SpeechSynthesis | null = null;
let cachedList: { voice: SpeechSynthesisVoice; lang: string; local: boolean }[] = [];
let cachedSnapshot = EMPTY;

function getSpeech(): SpeechSynthesis | null {
  return typeof window === 'undefined' ? null : window.speechSynthesis ?? null;
}

function subscribe(onChange: () => void): () => void {
  const synth = getSpeech();
  synth?.addEventListener('voiceschanged', onChange);
  return () => synth?.removeEventListener('voiceschanged', onChange);
}

function getSnapshot(): Voices {
  const synth = getSpeech();
  if (!synth) return EMPTY;

  const voices = synth.getVoices();
  // Browsers may return a fresh array on every call. Compare its entries so React
  // sees the same snapshot until the list (or selection metadata) actually changes.
  if (
    synth === cachedSource && voices.length === cachedList.length &&
    voices.every((voice, i) => voice === cachedList[i].voice && voice.lang === cachedList[i].lang && voice.localService === cachedList[i].local)
  ) return cachedSnapshot;

  cachedSource = synth;
  cachedList = voices.map((voice) => ({ voice, lang: voice.lang, local: voice.localService }));
  const matches = (voice: SpeechSynthesisVoice, lang: string) => voice.lang.replaceAll('_', '-').toLowerCase().startsWith(lang);
  const ukVoices = voices.filter((voice) => matches(voice, 'en-gb'));
  const usVoices = voices.filter((voice) => matches(voice, 'en-us'));
  const usLocal = usVoices.find((voice) => voice.localService === true) ?? null;
  cachedSnapshot = voices.length === 0 ? EMPTY : {
    uk: ukVoices.find((voice) => voice.localService === true) ?? ukVoices[0] ?? null,
    us: usLocal ?? usVoices[0] ?? null,
    usLocal,
    ready: true,
  };
  return cachedSnapshot;
}

const getServerSnapshot = (): Voices => EMPTY;

/** Browser voices arrive through voiceschanged; there is deliberately no polling. */
export function useVoices(): Voices {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Call from an event handler: interrupt any current speech before starting again. */
export function speak(text: string, voice: SpeechSynthesisVoice): void {
  const synth = getSpeech();
  if (!synth) return;
  synth.cancel();
  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  synth.speak(utterance);
}
