// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { speak, useVoices } from './speech';
import { FakeUtterance, installSpeech, makeVoice } from './speech-test-support';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('browser speech', () => {
  it('prefers local voices, normalizes case and underscores, and keeps snapshots stable', () => {
    const uk = makeVoice('EN_gb');
    const us = makeVoice('en_US');
    installSpeech([makeVoice('en-GB', false), makeVoice('en-US', false), uk, us]);
    const { result, rerender } = renderHook(useVoices);
    expect(result.current).toEqual({ uk, us, usLocal: us, ready: true });
    const snapshot = result.current;
    rerender();
    expect(result.current).toBe(snapshot);
  });

  it('uses a remote US voice as fallback but never as usLocal', () => {
    const us = makeVoice('en-US', false);
    installSpeech([us]);
    const { result } = renderHook(useVoices);
    expect(result.current).toEqual({ uk: null, us, usLocal: null, ready: true });
  });

  it('A1-4: cancels before speaking a new utterance with the requested text, voice and lang', () => {
    const synth = installSpeech();
    const voice = makeVoice('en-GB');
    speak('hello', voice);
    speak('again', voice);
    expect(synth.cancel).toHaveBeenCalledTimes(2);
    expect(synth.speak).toHaveBeenCalledTimes(2);
    expect(synth.speak.mock.calls[0][0]).toBeInstanceOf(FakeUtterance);
    expect(synth.speak.mock.calls[1][0]).toMatchObject({ text: 'again', voice, lang: 'en-GB' });
    expect(synth.cancel.mock.invocationCallOrder[0]).toBeLessThan(synth.speak.mock.invocationCallOrder[0]);
    expect(synth.speak.mock.invocationCallOrder[0]).toBeLessThan(synth.cancel.mock.invocationCallOrder[1]);
    expect(synth.cancel.mock.invocationCallOrder[1]).toBeLessThan(synth.speak.mock.invocationCallOrder[1]);
  });

  it('A1-7: updates when voices arrive and when they disappear', () => {
    const synth = installSpeech();
    const { result } = renderHook(useVoices);
    expect(result.current).toEqual({ uk: null, us: null, usLocal: null, ready: false });
    const us = makeVoice('en-US');
    act(() => synth.setVoices([us]));
    expect(result.current.us).toBe(us);
    const snapshot = result.current;
    act(() => synth.setVoices([us]));
    expect(result.current).toBe(snapshot);
    act(() => synth.setVoices([]));
    expect(result.current).toEqual({ uk: null, us: null, usLocal: null, ready: false });
  });

  it('the listener is removed on unmount', () => {
    const synth = installSpeech();
    const { unmount } = renderHook(useVoices);
    expect(synth.addEventListener).toHaveBeenCalledWith('voiceschanged', expect.any(Function));
    const listener = synth.addEventListener.mock.calls[0][1];
    unmount();
    expect(synth.removeEventListener).toHaveBeenCalledWith('voiceschanged', listener);
  });

  it('server rendering uses the null snapshot without reading browser speech', () => {
    const synth = installSpeech([makeVoice('en-US')]);
    function Harness() {
      return JSON.stringify(useVoices());
    }
    const html = renderToString(createElement(Harness));
    expect(html).toContain('false');
    expect(html).toContain('null');
    expect(synth.getVoices).not.toHaveBeenCalled();
    expect(synth.addEventListener).not.toHaveBeenCalled();
  });
});
