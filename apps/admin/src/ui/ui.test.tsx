import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { Link, MemoryRouter, Route, Routes, useLocation, useNavigationType } from 'react-router';
import { IntlProvider } from 'use-intl';
import { describe, expect, it, vi } from 'vitest';
import en from '../../messages/en.json';
import { Banner } from './Banner';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { ConfirmDialog } from './ConfirmDialog';
import { DataList } from './DataList';
import { FileDrop } from './FileDrop';
import { ListState } from './ListState';
import { Stat } from './Stat';
import { TextField } from './TextField';

const wrap = (ui: React.ReactNode, path = '/list') =>
  render(
    <IntlProvider locale="en" messages={en}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </IntlProvider>,
  );

type Visit = { path: string; type: string };

/** Records every location the router settles on, with how it got there (PUSH, REPLACE or POP). */
function Probe({ log }: { log: Visit[] }) {
  const location = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    log.push({ path: location.pathname, type });
  }, [location, type, log]);
  return null;
}

describe('ListState', () => {
  it('loading, empty and error each render their own region; error offers retry', async () => {
    const onRetry = vi.fn();
    const { rerender } = wrap(<ListState state="loading" />);
    expect(screen.getByRole('status')).toHaveTextContent(en.list.loading);

    rerender(
      <IntlProvider locale="en" messages={en}>
        <ListState state="empty" emptyText="No staff yet" />
      </IntlProvider>,
    );
    expect(screen.getByText('No staff yet')).toBeInTheDocument();

    rerender(
      <IntlProvider locale="en" messages={en}>
        <ListState state="error" onRetry={onRetry} />
      </IntlProvider>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(en.list.error);
    await userEvent.click(screen.getByRole('button', { name: en.common.retry }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('DataList', () => {
  const rows = [
    { id: '1', email: 'a@x.co', role: 'admin' },
    { id: '2', email: 'b@x.co', role: 'editor' },
  ];
  const columns = [
    { key: 'email', header: 'Email', cell: (r: (typeof rows)[number]) => r.email },
    { key: 'role', header: 'Role', cell: (r: (typeof rows)[number]) => r.role },
  ];

  it('renders a table and the same rows as cards (the container query picks which is visible)', () => {
    wrap(<DataList rows={rows} rowKey={(r) => r.id} columns={columns} state="ready" />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Email', 'Role']);
    expect(screen.getAllByTestId('card')).toHaveLength(2);
  });

  const linked = [
    ...columns,
    { key: 'open', header: '', card: 'action' as const, cell: (r: (typeof rows)[number]) => <Link to={`/list/${r.id}`}>Open {r.id}</Link> },
  ];
  function renderLinked(path: string, selectedKey?: string) {
    const log: Visit[] = [];
    wrap(
      <Routes>
        <Route
          path="*"
          element={
            <>
              <DataList rows={rows} rowKey={(r) => r.id} columns={linked} state="ready" rowHref={(r) => `/list/${r.id}`} selectedKey={selectedKey} />
              <Probe log={log} />
            </>
          }
        />
      </Routes>,
      path,
    );
    return log;
  }

  it('a click on a cell opens rowHref', async () => {
    const log = renderLinked('/list');
    await userEvent.click(within(screen.getByRole('table')).getByText('b@x.co'));
    expect(log.at(-1)).toEqual({ path: '/list/2', type: 'PUSH' });
  });

  it("a click on the row's own link navigates once", async () => {
    const log = renderLinked('/list');
    await userEvent.click(within(screen.getByRole('table')).getByRole('link', { name: 'Open 1' }));
    expect(log.slice(1)).toEqual([{ path: '/list/1', type: 'PUSH' }]);
  });

  it('clicking the open row replaces instead of pushing', async () => {
    const log = renderLinked('/list/1', '1');
    await userEvent.click(within(screen.getByRole('table')).getByText('a@x.co'));
    expect(log.at(-1)).toEqual({ path: '/list/1', type: 'REPLACE' });
  });

  it('marks the selected row and card with data-selected', () => {
    renderLinked('/list/2', '2');
    const selectedRows = within(screen.getByRole('table')).getAllByRole('row').filter((r) => r.hasAttribute('data-selected'));
    expect(selectedRows.map((r) => r.textContent)).toEqual([expect.stringContaining('b@x.co')]);
    const selectedCards = screen.getAllByTestId('card').filter((c) => c.hasAttribute('data-selected'));
    expect(selectedCards.map((c) => c.textContent)).toEqual([expect.stringContaining('b@x.co')]);
  });

  it('delegates empty to ListState', () => {
    wrap(<DataList rows={[]} rowKey={(r: { id: string }) => r.id} columns={[]} state="ready" emptyText="Nothing here" />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});

describe('direction B controls', () => {
  const classes = (el: Element) => el.className.split(/\s+/);

  it('Button each variant carries its B background and ledge', () => {
    const expected = {
      primary: ['bg-primary', 'shadow-button'],
      secondary: ['bg-surface', 'ring-border-strong', 'shadow-button-secondary'],
      danger: ['bg-danger', 'shadow-button-danger'],
      ghost: ['text-primary'],
    } as const;
    for (const [variant, wanted] of Object.entries(expected)) {
      const { unmount } = wrap(<Button variant={variant as keyof typeof expected}>Go</Button>);
      const cls = classes(screen.getByRole('button'));
      expect(cls, variant).toEqual(expect.arrayContaining([...wanted]));
      if (variant === 'ghost') expect(cls.filter((c) => c.startsWith('shadow-'))).toEqual([]);
      unmount();
    }
  });

  it('Button presses down only with motion allowed and grows on coarse pointers', () => {
    wrap(<Button>Go</Button>);
    expect(classes(screen.getByRole('button'))).toEqual(
      expect.arrayContaining(['min-h-control', 'motion-safe:data-pressed:pressed', 'pointer-coarse:min-h-control-touch']),
    );
  });

  it('TextField input sits on canvas with a border-strong ring and the placeholder colour', () => {
    wrap(<TextField label="Email" value="" onChange={() => {}} placeholder="ten@wordmet.com" />);
    expect(classes(screen.getByLabelText('Email'))).toEqual(
      expect.arrayContaining(['bg-canvas', 'ring-2', 'ring-inset', 'ring-border-strong', 'placeholder:text-placeholder', 'focus-visible:ring-primary']),
    );
  });

  it('Checkbox box is size-5 with a border-strong edge', () => {
    const { container } = wrap(
      <Checkbox isSelected={false} onChange={() => {}}>
        Level source
      </Checkbox>,
    );
    const box = container.querySelector('label > span:not([style])'); // React Aria's visually hidden input wrapper carries an inline style
    expect(classes(box!)).toEqual(expect.arrayContaining(['size-5', 'rounded-sm', 'border-2', 'border-border-strong', 'bg-canvas']));
  });

  it('FileDrop at rest is primary-soft with a dashed border-strong edge', () => {
    const { container } = wrap(
      <FileDrop prompt="Drop a CSV" hint="Up to 10 MB" chooseLabel="Choose" changeLabel="Change" onSelect={() => {}} />,
    );
    expect(classes(container.firstElementChild!)).toEqual(
      expect.arrayContaining(['rounded-panel', 'border-2', 'border-dashed', 'border-border-strong', 'bg-primary-soft']),
    );
  });
});

describe('Stat and Banner', () => {
  it('Stat tones map to their soft backgrounds', () => {
    const expected = { primary: 'bg-primary-soft', accent: 'bg-accent-soft', neutral: 'bg-neutral-soft', danger: 'bg-danger-soft' } as const;
    for (const [tone, bg] of Object.entries(expected)) {
      const { container, unmount } = wrap(<Stat label="Created" value="7" tone={tone as keyof typeof expected} />);
      expect(container.firstElementChild!.className, tone).toContain(bg);
      unmount();
    }
    const { container } = wrap(<Stat label="Rejected" value="7" tone="danger" />);
    expect(within(container).getByText('7').className).toContain('text-danger');
  });

  it('Banner info, error and offline use the B fills', () => {
    const expected = { info: 'bg-primary-soft', error: 'bg-danger-soft', offline: 'bg-accent-soft' } as const;
    for (const [variant, bg] of Object.entries(expected)) {
      const { unmount } = wrap(<Banner variant={variant as keyof typeof expected}>Note</Banner>);
      expect(screen.getByText('Note').parentElement!.className, variant).toContain(bg);
      unmount();
    }
  });
});

describe('Banner error code', () => {
  it('B25#19: shows "Code: op-123" as rendered text', () => {
    wrap(<Banner variant="error" code="op-123">Oops</Banner>);
    expect(screen.getByText('Code: op-123')).toBeTruthy();
  });

  it('the copy button writes op-123 to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    wrap(<Banner variant="error" code="op-123">Oops</Banner>);
    await userEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(writeText).toHaveBeenCalledWith('op-123');
  });

  it('without a code there is no code text and no copy button', () => {
    wrap(<Banner variant="error">Oops</Banner>);
    expect(screen.queryByText(/Code:/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copy code' })).toBeNull();
  });

  it('a missing navigator.clipboard does not throw when copying', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    wrap(<Banner variant="error" code="op-123">Oops</Banner>);
    await userEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(screen.getByText('Code: op-123')).toBeTruthy();
  });
});

describe('Button and TextField', () => {
  it('a pending Button ignores a second click (Review Focus 3)', async () => {
    const onPress = vi.fn();
    wrap(<Button onPress={onPress} isPending>Save</Button>);
    await userEvent.dblClick(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('TextField links its error to the input and marks it invalid', () => {
    wrap(<TextField label="Email" value="x" onChange={() => {}} error="Wrong email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription('Wrong email');
  });
});

describe('ConfirmDialog', () => {
  const props = { title: 'Leave this page?', confirmLabel: 'Leave', onConfirm: () => {}, onCancel: () => {} };

  it('shows the title and body; confirm and cancel call their handlers; cancel defaults to common.cancel', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    wrap(
      <ConfirmDialog {...props} isOpen onConfirm={onConfirm} onCancel={onCancel}>
        Unsaved changes will be lost.
      </ConfirmDialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Leave this page?' });
    expect(dialog).toHaveTextContent('Unsaved changes will be lost.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Leave' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(within(dialog).getByRole('button', { name: en.common.cancel }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Esc calls onCancel, not onConfirm', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    wrap(<ConfirmDialog {...props} isOpen cancelLabel="Stay" onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByRole('button', { name: 'Stay' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('tone danger styles the confirm button; while pending neither Esc nor the buttons act', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    wrap(<ConfirmDialog {...props} isOpen tone="danger" isPending onConfirm={onConfirm} onCancel={onCancel} />);
    const confirm = screen.getByRole('button', { name: 'Leave' });
    expect(confirm.className).toContain('bg-danger');
    await userEvent.click(confirm);
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: en.common.cancel }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('renders nothing while closed', () => {
    wrap(<ConfirmDialog {...props} isOpen={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
