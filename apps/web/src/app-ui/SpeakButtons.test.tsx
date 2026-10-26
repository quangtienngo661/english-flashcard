// @vitest-environment jsdom
import { act, cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpeakSentence, SpeakWord } from './SpeakButtons';
import { installSpeech, makeVoice } from './speech-test-support';
import { renderApp } from './test-utils';

vi.mock('next/navigation', () => ({ usePathname: () => '/vi/app', useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('pronunciation buttons', () => {
  it('A1-1: UK reads the word with the local en-GB voice', async () => {
    const uk = makeVoice('en-GB');
    const us = makeVoice('en-US');
    const synth = installSpeech([makeVoice('en-GB', false), uk, us]);
    renderApp(<SpeakWord text="hello" />);
    expect(screen.getByRole('button', { name: 'UK, nghe giọng Anh' })).toHaveTextContent(/^UK$/);
    expect(screen.getByRole('button', { name: 'US, nghe giọng Mỹ' })).toHaveTextContent(/^US$/);
    await userEvent.click(screen.getByRole('button', { name: 'UK, nghe giọng Anh' }));
    expect(synth.speak).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'hello', voice: uk, lang: 'en-GB' }));
    await userEvent.click(screen.getByRole('button', { name: 'US, nghe giọng Mỹ' }));
    expect(synth.speak).toHaveBeenLastCalledWith(expect.objectContaining({ voice: us }));
  });

  it('WCAG 2.5.3: the accessible name starts with the visible "UK" / "US" (audit 26/10/2026 #12)', () => {
    installSpeech([makeVoice('en-GB'), makeVoice('en-US')]);
    renderApp(<SpeakWord text="deploy" />);
    expect(screen.getByRole('button', { name: /^UK/ })).toHaveTextContent(/^UK$/);
    expect(screen.getByRole('button', { name: /^US/ })).toHaveTextContent(/^US$/);
  });

  it('A1-2: no en-GB voice → no UK button; US still there', () => {
    installSpeech([makeVoice('en-US')]);
    renderApp(<SpeakWord text="hello" />);
    expect(screen.queryByRole('button', { name: 'UK, nghe giọng Anh' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'US, nghe giọng Mỹ' })).toBeInTheDocument();
  });

  it.each([
    ['A1-3: no English voice → no button, nothing thrown', [makeVoice('vi-VN')]],
    ['Review Focus 5: speechSynthesis exists but getVoices() stays empty → no button, no error', []],
  ])('%s', (_name, voices) => {
    const synth = installSpeech(voices);
    renderApp(<><SpeakWord text="hello" /><SpeakSentence text="Hello there." /></>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('no speechSynthesis at all → no button', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    renderApp(<><SpeakWord text="hello" /><SpeakSentence text="Hello there." private /></>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('A1-5: remote voices allow words and public sentences but hide private sentences', async () => {
    const us = makeVoice('en-US', false);
    const synth = installSpeech([makeVoice('en-GB', false), us]);
    renderApp(<><SpeakWord text="hello" /><SpeakSentence text="Hello there." /><SpeakSentence text="Saved sentence." private /></>);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    await userEvent.click(screen.getByRole('button', { name: 'Nghe câu' }));
    expect(synth.speak).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ text: 'Hello there.', voice: us }));
  });

  it('private sentences use only the local US voice', async () => {
    const local = makeVoice('en-US');
    const synth = installSpeech([makeVoice('en-US', false), local]);
    renderApp(<SpeakSentence text="Saved sentence." private />);
    await userEvent.click(screen.getByRole('button', { name: 'Nghe câu' }));
    expect(synth.speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'Saved sentence.', voice: local }));
  });

  it('A1-7: voices arrive later via voiceschanged → the buttons appear', () => {
    const synth = installSpeech();
    renderApp(<><SpeakWord text="hello" /><SpeakSentence text="Hello there." /></>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    act(() => synth.setVoices([makeVoice('en-GB'), makeVoice('en-US')]));
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it.each(['word', 'sentence'] as const)('A1-6: Space / 1 / 2 on a %s button never reach window; Space speaks', async (kind) => {
    const synth = installSpeech([makeVoice('en-US')]);
    const listener = vi.fn();
    window.addEventListener('keydown', listener);
    try {
      renderApp(kind === 'word' ? <SpeakWord text="hello" /> : <SpeakSentence text="Hello there." />);
      screen.getByRole('button').focus();
      await userEvent.keyboard('12 ');
      expect(listener).not.toHaveBeenCalled();
      expect(synth.speak).toHaveBeenCalledTimes(1);
      await userEvent.keyboard('{Escape}');
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener('keydown', listener);
    }
  });

  it('clicks never reach a parent or submit a form, for either control', async () => {
    installSpeech([makeVoice('en-GB'), makeVoice('en-US')]);
    const parent = vi.fn();
    const submit = vi.fn((e) => e.preventDefault());
    renderApp(<form aria-label="Test" onClick={parent} onSubmit={submit}><SpeakWord text="hello" /><SpeakSentence text="Hello there." /></form>);
    for (const button of within(screen.getByRole('form')).getAllByRole('button')) {
      expect(button).toHaveAttribute('type', 'button');
      await userEvent.click(button);
    }
    expect(parent).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it('uses English accessible labels in English', () => {
    installSpeech([makeVoice('en-GB'), makeVoice('en-US')]);
    renderApp(<><SpeakWord text="hello" /><SpeakSentence text="Hello there." /></>, { locale: 'en' });
    for (const name of ['UK, British voice', 'US, American voice', 'Listen to the sentence']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });
});
