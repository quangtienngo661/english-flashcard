import { vi as vitest } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { IntlProvider } from 'use-intl';
import vi from '../../messages/vi.json';
import { TurnstileWidget, type TurnstileHandle } from './TurnstileWidget';

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const scripts = () => [...document.querySelectorAll('script')].filter((s) => s.src.includes('challenges.cloudflare.com'));

type RenderOptions = { sitekey: string; 'refresh-expired': string; callback: (token: string) => void; 'expired-callback': () => void; 'error-callback': () => void; 'timeout-callback': () => void };
function installTurnstile() {
  const api = { render: vitest.fn<(element: HTMLElement, options: RenderOptions) => string>(() => 'widget-1'), reset: vitest.fn(), remove: vitest.fn() };
  (window as unknown as { turnstile?: typeof api }).turnstile = api;
  return api;
}
const view = (ui: React.ReactElement) => render(<IntlProvider locale="vi" messages={vi}>{ui}</IntlProvider>);

afterEach(() => {
  vitest.unstubAllEnvs();
  delete (window as unknown as { turnstile?: unknown }).turnstile;
  for (const script of scripts()) script.remove();
});

describe('TurnstileWidget without a site key (launch prep A, design 4.3, RA-7)', () => {
  beforeEach(() => vitest.stubEnv('VITE_TURNSTILE_SITE_KEY', ''));

  it('loads no script, hands the fake token over on mount and after every reset(), and shows nothing', () => {
    const onToken = vitest.fn();
    const ref = createRef<TurnstileHandle>();
    const { container } = view(<TurnstileWidget ref={ref} onToken={onToken} />);
    expect(scripts()).toEqual([]);
    expect(container).toBeEmptyDOMElement();
    expect(onToken).toHaveBeenCalledExactlyOnceWith('fake-turnstile-token');
    act(() => ref.current!.reset());
    expect(onToken).toHaveBeenCalledTimes(2);
    expect(onToken).toHaveBeenLastCalledWith('fake-turnstile-token');
    expect(scripts()).toEqual([]);
  });
});

describe('TurnstileWidget with a site key', () => {
  beforeEach(() => vitest.stubEnv('VITE_TURNSTILE_SITE_KEY', '1x00000000000000000000AA'));

  it('inserts the explicit-render script once and renders into its own container when the script loads', () => {
    const onToken = vitest.fn();
    const { container } = view(<TurnstileWidget onToken={onToken} />);
    expect(scripts()).toHaveLength(1);
    expect(scripts()[0]!.src).toBe(SCRIPT_URL);
    const api = installTurnstile();
    expect(api.render).not.toHaveBeenCalled();
    act(() => scripts()[0]!.dispatchEvent(new Event('load')));
    expect(api.render).toHaveBeenCalledTimes(1);
    const [element, options] = api.render.mock.calls[0]!;
    expect(container.contains(element)).toBe(true);
    expect(options).toMatchObject({ sitekey: '1x00000000000000000000AA', 'refresh-expired': 'auto' });
    expect(onToken).not.toHaveBeenCalled();
  });

  it('script already loaded: renders at once and adds no script', () => {
    const api = installTurnstile();
    view(<TurnstileWidget onToken={vitest.fn()} />);
    expect(api.render).toHaveBeenCalledTimes(1);
    expect(scripts()).toEqual([]);
  });

  it('passes the token on; an expired, errored or timed-out challenge clears it', () => {
    const api = installTurnstile();
    const onToken = vitest.fn();
    view(<TurnstileWidget onToken={onToken} />);
    const options = api.render.mock.calls[0]![1];
    act(() => options.callback('tok-abc'));
    expect(onToken).toHaveBeenLastCalledWith('tok-abc');
    for (const name of ['expired-callback', 'error-callback', 'timeout-callback'] as const) {
      act(() => options.callback('tok-again'));
      act(() => options[name]());
      expect(onToken, name).toHaveBeenLastCalledWith(null);
    }
  });

  it('reset() clears the token first, then asks Cloudflare for a new one for this widget', () => {
    const api = installTurnstile();
    const onToken = vitest.fn();
    const ref = createRef<TurnstileHandle>();
    view(<TurnstileWidget ref={ref} onToken={onToken} />);
    act(() => ref.current!.reset());
    expect(onToken).toHaveBeenLastCalledWith(null);
    expect(api.reset).toHaveBeenCalledExactlyOnceWith('widget-1');
  });

  it('removes the widget when the form goes away', () => {
    const api = installTurnstile();
    const rendered = view(<TurnstileWidget onToken={vitest.fn()} />);
    rendered.unmount();
    expect(api.remove).toHaveBeenCalledExactlyOnceWith('widget-1');
  });

  it('a script that fails to load leaves no token and says the check is unavailable', () => {
    const onToken = vitest.fn();
    view(<TurnstileWidget onToken={onToken} />);
    act(() => scripts()[0]!.dispatchEvent(new Event('error')));
    expect(onToken).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole('status')).toHaveTextContent(vi.errors['captcha-unavailable']);
  });
});
