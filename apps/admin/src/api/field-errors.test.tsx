import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Select } from '../ui/Select';
import { TextField } from '../ui/TextField';
import { useFocusFirstError, violationsToFields } from './field-errors';

const FIELD_PREFIX = 'values.';
const fieldOf = (path: string) => (path.startsWith(FIELD_PREFIX) ? path.slice(FIELD_PREFIX.length) : null);

describe('violationsToFields', () => {
  it('maps a path to its field id and sends the rest to form', () => {
    const out = violationsToFields(
      ['values.practice.default_questions_per_session: Expected at most max_questions_per_session', 'x: y'],
      fieldOf,
    );
    expect(out.fields).toEqual({ 'practice.default_questions_per_session': 'Expected at most max_questions_per_session' });
    expect(out.form).toEqual(['x: y']);
  });

  it('a violation without ": " goes to form whole, and several on one field are joined', () => {
    const out = violationsToFields(['same_as_current', 'values.a: one', 'values.a: two'], fieldOf);
    expect(out.form).toEqual(['same_as_current']);
    expect(out.fields).toEqual({ a: 'one two' });
  });

  it('keeps ": " inside the message', () => {
    expect(violationsToFields(['values.a: bad: really'], fieldOf).fields).toEqual({ a: 'bad: really' });
  });
});

function Form({ initial }: { initial: Record<string, string> }) {
  const [fields, setFields] = useState(initial);
  useFocusFirstError(fields, ['name', 'mode', 'note']);
  return (
    <>
      <TextField id="name" label="Name" value="" onChange={() => undefined} error={fields.name} />
      <Select id="mode" label="Mode" items={[{ id: 'a', label: 'A' }]} value="" onChange={() => undefined} error={fields.mode} />
      <TextField id="note" label="Note" value="" onChange={() => undefined} error={fields.note} />
      <button onClick={() => setFields({ ...fields })}>same</button>
      <button onClick={() => setFields({ name: 'bad', mode: 'bad', note: 'bad' })}>all</button>
    </>
  );
}

describe('useFocusFirstError', () => {
  it('focuses the first errored field in order, not the first in the object', () => {
    render(<Form initial={{ note: 'bad', name: 'bad' }} />);
    expect(document.activeElement).toBe(screen.getByLabelText('Name'));
  });

  it('focuses the control inside a Select', () => {
    render(<Form initial={{ mode: 'bad' }} />);
    expect(document.activeElement?.tagName).toBe('BUTTON');
    expect(document.activeElement?.closest('#mode')).not.toBeNull();
  });

  it('does nothing without errors', () => {
    render(<Form initial={{}} />);
    expect(document.activeElement).toBe(document.body);
  });

  it('refocuses only when the set of errored fields changes', async () => {
    const user = userEvent.setup();
    render(<Form initial={{ note: 'bad' }} />);
    expect(document.activeElement).toBe(screen.getByLabelText('Note'));

    screen.getByLabelText('Name').focus();
    await user.click(screen.getByText('same'));
    expect(document.activeElement).toBe(screen.getByText('same'));

    await user.click(screen.getByText('all'));
    expect(document.activeElement).toBe(screen.getByLabelText('Name'));
  });
});
