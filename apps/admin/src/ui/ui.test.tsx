import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'use-intl';
import { describe, expect, it, vi } from 'vitest';
import en from '../../messages/en.json';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { DataList } from './DataList';
import { FileDrop } from './FileDrop';
import { ListState } from './ListState';
import { TextField } from './TextField';

const wrap = (ui: React.ReactNode) => render(<IntlProvider locale="en" messages={en}>{ui}</IntlProvider>);

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
