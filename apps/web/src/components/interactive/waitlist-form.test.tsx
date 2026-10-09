// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { WaitlistState } from '@/features/waitlist/store';
import { WaitlistForm, type WaitlistLabels } from './WaitlistForm';

const join = vi.fn<(prev: WaitlistState, form: FormData) => Promise<WaitlistState>>();
vi.mock('@/features/waitlist/actions', () => ({ joinWaitlist: (prev: WaitlistState, form: FormData) => join(prev, form) }));

const labels: WaitlistLabels = {
  emailLabel: 'Email address', emailPlaceholder: 'Your email address', submit: 'Get notified', submitting: 'Sending…',
  invalidEmail: 'Enter a valid email', missingConsent: 'Please agree', error: 'Could not send', success: 'You are on the list',
  consent: 'I agree to the Privacy Policy.',
};

const renderForm = (idPrefix: 'hero' | 'cta' = 'hero') =>
  render(<WaitlistForm idPrefix={idPrefix} tone="default" layout="inline" locale="en" labels={labels} />);

beforeEach(() => {
  join.mockReset();
});

describe('WaitlistForm', () => {
  it('LP14 invalid_email state sets aria-invalid and aria-describedby on the email input and keeps its value', async () => {
    join.mockResolvedValue({ status: 'invalid_email', email: 'ten@gmail' });
    const user = userEvent.setup();
    renderForm();
    const email = screen.getByRole('textbox', { name: 'Email address' });
    await user.type(email, 'ten@gmail');
    await user.click(screen.getByRole('button', { name: 'Get notified' }));
    expect(await screen.findByText('Enter a valid email')).toBeInTheDocument();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('Enter a valid email');
    expect(email).toHaveValue('ten@gmail');
  });

  it('LP15 missing_consent marks the checkbox the same way', async () => {
    join.mockResolvedValue({ status: 'missing_consent', email: 'ten@gmail.com' });
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'ten@gmail.com');
    await user.click(screen.getByRole('button', { name: 'Get notified' }));
    const consent = screen.getByRole('checkbox', { name: 'I agree to the Privacy Policy.' });
    expect(await screen.findByText('Please agree')).toBeInTheDocument();
    expect(consent).toHaveAttribute('aria-invalid', 'true');
    expect(consent).toHaveAccessibleDescription('Please agree');
  });

  it('LP16 success renders the success copy in role=status and hides the inputs', async () => {
    join.mockResolvedValue({ status: 'success' });
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'ten@gmail.com');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Get notified' }));
    expect(await screen.findByRole('status')).toHaveTextContent('You are on the list');
    expect(screen.queryByRole('textbox')).toBeNull();
    const sent = join.mock.calls[0][1];
    expect(sent.get('email')).toBe('ten@gmail.com');
    expect(sent.get('consent')).toBe('on');
    expect(sent.get('locale')).toBe('en');
  });

  it('submit is disabled with the submitting label while pending', async () => {
    let resolve!: (s: WaitlistState) => void;
    join.mockImplementation(() => new Promise((r) => (resolve = r)));
    const user = userEvent.setup();
    renderForm();
    // Not awaited: React keeps the click's action transition open until the action settles.
    const clicking = user.click(screen.getByRole('button', { name: 'Get notified' }));
    expect(await screen.findByRole('button', { name: 'Sending…' })).toBeDisabled();
    resolve({ status: 'success' });
    await clicking;
    expect(await screen.findByRole('status')).toBeInTheDocument();
  });

  it('LPE8 two forms on one page have distinct input ids', () => {
    render(
      <>
        <WaitlistForm idPrefix="hero" tone="default" layout="inline" locale="en" labels={labels} />
        <WaitlistForm idPrefix="cta" tone="inverse" layout="inline" locale="en" labels={labels} />
      </>,
    );
    const ids = [...document.querySelectorAll('input[id]')].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
