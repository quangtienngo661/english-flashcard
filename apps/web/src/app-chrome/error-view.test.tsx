// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/app-ui/test-utils';
import { ErrorView } from './ErrorView';

describe('ErrorView (design §5.5)', () => {
  it('says what happened and retries on "Thử lại"', async () => {
    const retry = vi.fn();
    renderApp(<ErrorView retry={retry} />);
    expect(screen.getByRole('heading', { name: 'Không tải được trang này.' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
