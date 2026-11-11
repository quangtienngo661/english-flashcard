// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { SiteLive } from './SiteLive';

afterEach(() => {
  document.documentElement.classList.remove('wm-live');
});

describe('SiteLive (R249)', () => {
  it('marks <html> `wm-live` once React has mounted it, and draws nothing', () => {
    expect(document.documentElement.classList.contains('wm-live')).toBe(false);
    const { container } = render(<SiteLive />);
    expect(document.documentElement.classList.contains('wm-live')).toBe(true);
    expect(container).toBeEmptyDOMElement();
  });
});
