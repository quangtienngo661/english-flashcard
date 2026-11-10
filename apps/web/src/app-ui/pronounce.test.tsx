// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pronounce } from './SpeakButtons';
import { installSpeech, makeVoice } from '@/lib/speech/speech-test-support';
import { renderApp } from './test-utils';

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

describe('Pronounce (đợt C §5.5, DC24, DC34)', () => {
  it('plays the pre-made file of its voice; no browser speech', async () => {
    const synth = installSpeech([makeVoice('en-GB'), makeVoice('en-US')]);
    renderApp(<Pronounce text="lead" voice="uk" audioUrl="https://audio.wordmet.com/tts/v1/a.mp3" />);
    await userEvent.click(screen.getByRole('button', { name: 'Nghe giọng Anh-Anh' }));
    expect(played).toEqual(['https://audio.wordmet.com/tts/v1/a.mp3']);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('one player for the page: pressing another speaker stops the file playing', async () => {
    installSpeech([makeVoice('en-US')]);
    renderApp(<><Pronounce text="lead" voice="uk" audioUrl="https://a/uk.mp3" /><Pronounce text="lead" voice="us" audioUrl="https://a/us.mp3" /></>);
    await userEvent.click(screen.getByRole('button', { name: 'Nghe giọng Anh-Anh' }));
    await userEvent.click(screen.getByRole('button', { name: 'Nghe giọng Anh-Mỹ' }));
    expect(pause).toHaveBeenCalled();
    expect(played).toEqual(['https://a/uk.mp3', 'https://a/us.mp3']);
  });

  it('a file that fails to play falls back to the browser voice of the same accent', async () => {
    const uk = makeVoice('en-GB');
    const synth = installSpeech([uk, makeVoice('en-US')]);
    play.mockRejectedValueOnce(new Error('NotSupportedError'));
    renderApp(<Pronounce text="lead" voice="uk" audioUrl="https://a/broken.mp3" />);
    await userEvent.click(screen.getByRole('button', { name: 'Nghe giọng Anh-Anh' }));
    await vi.waitFor(() => expect(synth.speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'lead', voice: uk })));
  });

  it('no file yet: the browser voice of that accent reads it', async () => {
    const us = makeVoice('en-US');
    const synth = installSpeech([us]);
    renderApp(<Pronounce text="look after" voice="us" audioUrl={null} />);
    await userEvent.click(screen.getByRole('button', { name: 'Nghe giọng Anh-Mỹ' }));
    expect(synth.speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'look after', voice: us }));
    expect(played).toEqual([]);
  });

  it('DC34: no file and no UK voice on the device → the UK button is dimmed and says the voice is being made; a press does nothing', async () => {
    const synth = installSpeech([makeVoice('en-US')]);
    renderApp(<Pronounce text="lead" voice="uk" audioUrl={null} />);
    const button = screen.getByRole('button', { name: 'Nghe giọng Anh-Anh' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAccessibleDescription('Đang tạo giọng đọc');
    await userEvent.click(button);
    expect(synth.speak).not.toHaveBeenCalled();
    expect(played).toEqual([]);
  });

  it('Space, 1 and 2 on it never reach the review keys', async () => {
    installSpeech([makeVoice('en-GB')]);
    const listener = vi.fn();
    window.addEventListener('keydown', listener);
    try {
      renderApp(<Pronounce text="lead" voice="uk" audioUrl="https://a/uk.mp3" />);
      screen.getByRole('button').focus();
      await userEvent.keyboard('12 ');
      expect(listener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('keydown', listener);
    }
  });
});
