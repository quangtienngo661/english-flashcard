// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpeakButton } from './SpeakButton';
import { installSpeech, makeVoice } from '@/lib/speech/speech-test-support';
import { renderApp } from '@/test-utils/render-app';

vi.mock('next/navigation', () => ({ usePathname: () => '/vi/app', useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

const play = vi.fn<() => Promise<void>>();
const pause = vi.fn();
beforeEach(() => {
  play.mockReset().mockResolvedValue(undefined);
  pause.mockReset();
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    played.push(this.src);
    return play();
  });
  vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(pause);
  played.length = 0;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const played: string[] = [];

describe('SpeakButton (đợt C §5.5, DC24, DC34)', () => {
  it('plays the pre-made file of its voice; no browser speech', async () => {
    const synth = installSpeech([makeVoice('en-GB'), makeVoice('en-US')]);
    renderApp(<SpeakButton text="lead" voice="uk" audioUrl="https://audio.wordmet.com/tts/v1/a.mp3" />);
    await userEvent.click(screen.getByRole('button', { name: 'Nghe giọng Anh-Anh' }));
    expect(played).toEqual(['https://audio.wordmet.com/tts/v1/a.mp3']);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('one player for the page: pressing another speaker stops the file playing', async () => {
    installSpeech([makeVoice('en-US')]);
    renderApp(<><SpeakButton text="lead" voice="uk" audioUrl="https://a/uk.mp3" /><SpeakButton text="lead" voice="us" audioUrl="https://a/us.mp3" /></>);
    await userEvent.click(screen.getByRole('button', { name: 'Nghe giọng Anh-Anh' }));
    await userEvent.click(screen.getByRole('button', { name: 'Nghe giọng Anh-Mỹ' }));
    expect(pause).toHaveBeenCalled();
    expect(played).toEqual(['https://a/uk.mp3', 'https://a/us.mp3']);
  });

  it('a file that fails to play falls back to the browser voice of the same accent', async () => {
    const uk = makeVoice('en-GB');
    const synth = installSpeech([uk, makeVoice('en-US')]);
    play.mockRejectedValueOnce(new Error('NotSupportedError'));
    renderApp(<SpeakButton text="lead" voice="uk" audioUrl="https://a/broken.mp3" />);
    await userEvent.click(screen.getByRole('button', { name: 'Nghe giọng Anh-Anh' }));
    await vi.waitFor(() => expect(synth.speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'lead', voice: uk })));
  });

  it('no file yet: the browser voice of that accent reads it', async () => {
    const us = makeVoice('en-US');
    const synth = installSpeech([us]);
    renderApp(<SpeakButton text="look after" voice="us" audioUrl={null} />);
    await userEvent.click(screen.getByRole('button', { name: 'Nghe giọng Anh-Mỹ' }));
    expect(synth.speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'look after', voice: us }));
    expect(played).toEqual([]);
  });

  it('DC34: no file and no UK voice on the device → the UK button is dimmed and says the voice is being made; a press does nothing', async () => {
    const synth = installSpeech([makeVoice('en-US')]);
    renderApp(<SpeakButton text="lead" voice="uk" audioUrl={null} />);
    const button = screen.getByRole('button', { name: 'Nghe giọng Anh-Anh' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAccessibleDescription('Đang tạo âm thanh');
    await userEvent.click(button);
    expect(synth.speak).not.toHaveBeenCalled();
    expect(played).toEqual([]);
  });

  it('Space, 1 and 2 on it never reach the review keys', async () => {
    installSpeech([makeVoice('en-GB')]);
    const listener = vi.fn();
    window.addEventListener('keydown', listener);
    try {
      renderApp(<SpeakButton text="lead" voice="uk" audioUrl="https://a/uk.mp3" />);
      screen.getByRole('button').focus();
      await userEvent.keyboard('12 ');
      expect(listener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('keydown', listener);
    }
  });
});

describe('SpeakButton look (Figma Nút loa 54:657)', () => {
  it('is a 32 px circle by default and 28 px with size={28}', () => {
    installSpeech([makeVoice('en-US')]);
    renderApp(<><SpeakButton text="a" voice="us" audioUrl={null} /><SpeakButton text="b" voice="uk" audioUrl={null} size={28} /></>);
    expect(screen.getByRole('button', { name: 'Nghe giọng Anh-Mỹ' }).className.split(' ')).toContain('size-8');
    expect(screen.getByRole('button', { name: 'Nghe giọng Anh-Anh' }).className.split(' ')).toContain('size-7');
  });
});
