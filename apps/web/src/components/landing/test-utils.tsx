import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import vi from '../../../messages/vi.json';
import { ThemeProvider } from '@/app-shell/theme/ThemeProvider';
import { buildAppCopy } from './copy';

/** The Vietnamese copy the landing components receive as props, taken straight from the message files. */
export const landing = vi.Landing;
export const appCopy = buildAppCopy(vi.App);

/** Renders a landing component with the intl provider the shared pieces (Logo) read from, and the theme provider the toggle needs. */
export function renderLanding(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="vi" messages={{ App: vi.App, Landing: vi.Landing }} timeZone="UTC">
      <ThemeProvider>{ui}</ThemeProvider>
    </NextIntlClientProvider>,
  );
}
