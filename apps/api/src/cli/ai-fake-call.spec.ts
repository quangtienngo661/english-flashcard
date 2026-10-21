import { describe, expect, it, vi } from 'vitest';
import { AI_OPERATIONS, type AiResult, type AiService, type RunReport } from '../ai/index.js';
import { AI_FAKE_CALL_USAGE, parseAiFakeCallArgs, runAiFakeCalls } from './ai-fake-call-args.js';

const USER = '00000000-0000-4000-8000-000000000001';
const DATA = '{"word":"borrow"}';
const files: Record<string, string> = { 'input.json': '{"text":"borrow"}', 'bad.json': 'not json' };
const readFile = (path: string) => {
  if (!(path in files)) throw new Error('ENOENT');
  return files[path];
};
const parse = (argv: string[]) => parseAiFakeCallArgs(argv, readFile);

describe('parseAiFakeCallArgs', () => {
  it('valid forms', () => {
    expect(parse(['generate_cloze', '--user', USER, '--data', DATA])).toEqual({
      ok: true, action: 'call', operation: 'generate_cloze', user: USER, data: { word: 'borrow' }, purpose: 'learner',
      operationIds: [expect.stringMatching(/^[0-9a-f-]{36}$/)],
    });
    expect(parse(['lookup_word', '--user', USER.toUpperCase(), '--data', '@input.json', '--purpose', 'test'])).toMatchObject({
      ok: true, operation: 'lookup_word', user: USER, data: { text: 'borrow' }, purpose: 'test',
    });
    expect(parse(['translate_sentence', '--user', USER, '--data', DATA, '--operation-id', 'q1#2'])).toMatchObject({
      ok: true, operationIds: ['q1#2'],
    });
  });

  it.each([
    ['unknown operation', ['summarize', '--user', USER, '--data', DATA]],
    ['--user not a uuid', ['generate_cloze', '--user', 'lan', '--data', DATA]],
    ['--user missing', ['generate_cloze', '--data', DATA]],
    ['--data missing', ['generate_cloze', '--user', USER]],
    ['--data not JSON', ['generate_cloze', '--user', USER, '--data', '{word']],
    ['--data @missing.json', ['generate_cloze', '--user', USER, '--data', '@missing.json']],
    ['--data @file not JSON', ['generate_cloze', '--user', USER, '--data', '@bad.json']],
    ['--parallel 0', ['generate_cloze', '--user', USER, '--data', DATA, '--parallel', '0']],
    ['--parallel 51', ['generate_cloze', '--user', USER, '--data', DATA, '--parallel', '51']],
    ['--parallel 1.5', ['generate_cloze', '--user', USER, '--data', DATA, '--parallel', '1.5']],
    ['--purpose other', ['generate_cloze', '--user', USER, '--data', DATA, '--purpose', 'other']],
    ["--operation-id 'a b'", ['generate_cloze', '--user', USER, '--data', DATA, '--operation-id', 'a b']],
    ['--operation-id with --purpose test', ['generate_cloze', '--user', USER, '--data', DATA, '--purpose', 'test', '--operation-id', 'q1']],
    ['an unknown flag', ['generate_cloze', '--user', USER, '--data', DATA, '--model', 'fake:ok']],
    ['a repeated flag', ['generate_cloze', '--user', USER, '--user', USER, '--data', DATA]],
    ['a flag without a value', ['generate_cloze', '--user', USER, '--data']],
  ])('%s → refused', (_name, argv) => {
    expect(parse(argv)).toEqual({ ok: false, error: expect.any(String) });
  });

  it('the operation’s input rules are not applied here (the gate does it)', () => {
    expect(parse(['generate_cloze', '--user', USER, '--data', JSON.stringify({ word: 'w'.repeat(150) })])).toMatchObject({ ok: true });
  });

  it('--parallel 3 --operation-id X → three calls with X', () => {
    expect(parse(['generate_cloze', '--user', USER, '--data', DATA, '--parallel', '3', '--operation-id', 'X'])).toMatchObject({
      ok: true, operationIds: ['X', 'X', 'X'],
    });
  });

  it('--parallel 3 → three distinct uuids', () => {
    const args = parse(['generate_cloze', '--user', USER, '--data', DATA, '--parallel', '3']);
    if (!args.ok || args.action !== 'call') throw new Error('expected a call');
    expect(new Set(args.operationIds).size).toBe(3);
  });

  it('delete-user-data takes only --user', () => {
    expect(parse(['delete-user-data', '--user', USER])).toEqual({ ok: true, action: 'delete-user-data', user: USER });
    expect(parse(['delete-user-data', '--user', USER, '--data', DATA])).toMatchObject({ ok: false });
    expect(parse(['delete-user-data'])).toMatchObject({ ok: false });
  });

  it('the usage text names every form', () => {
    for (const word of [...AI_OPERATIONS, 'delete-user-data', '--parallel', '--purpose']) {
      expect(AI_FAKE_CALL_USAGE).toContain(word);
    }
  });
});

describe('runAiFakeCalls', () => {
  const succeeded = (operationId: string): AiResult => ({
    status: 'succeeded', operation_id: operationId, result: {},
    meta: { operation: 'generate_cloze', provider: 'fake', model: 'fake:ok', effort: null, prompt_revision: 1, schema_version: 1, replayed: false },
  });

  function service() {
    return {
      run: vi.fn(async (_op: string, _data: unknown, options: { operationId: string }) => succeeded(options.operationId)),
      runAdminTest: vi.fn(async (): Promise<RunReport> => ({ result: succeeded('test-1'), calls: [], rawOutput: '{}' })),
      deleteUserData: vi.fn(async () => {}),
    };
  }

  it('every printed result line carries kind ai_fake_call', async () => {
    const ai = service();
    const lines: string[] = [];
    const args = parse(['generate_cloze', '--user', USER, '--data', DATA, '--parallel', '2', '--operation-id', 'X']);
    if (!args.ok) throw new Error(args.error);
    await runAiFakeCalls(ai as unknown as AiService, args, (line) => lines.push(line));
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(JSON.parse(line)).toEqual({ kind: 'ai_fake_call', operation_id: 'X', elapsed_ms: expect.any(Number), result: succeeded('X') });
    }
    expect(ai.run).toHaveBeenCalledWith('generate_cloze', { word: 'borrow' }, { operationId: 'X', userId: USER, purpose: 'learner' });
  });

  it('B6#27: the parallel calls start at once', async () => {
    let running = 0; let peak = 0;
    const ai = service();
    ai.run.mockImplementation(async (_op, _data, options) => {
      running += 1; peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 10));
      running -= 1;
      return succeeded(options.operationId);
    });
    const args = parse(['generate_cloze', '--user', USER, '--data', DATA, '--parallel', '5']);
    if (!args.ok) throw new Error(args.error);
    await runAiFakeCalls(ai as unknown as AiService, args, () => {});
    expect(peak).toBe(5);
  });

  it('purpose test → runAdminTest with the user as the actor', async () => {
    const ai = service();
    const lines: string[] = [];
    const args = parse(['lookup_word', '--user', USER, '--data', '@input.json', '--purpose', 'test']);
    if (!args.ok) throw new Error(args.error);
    await runAiFakeCalls(ai as unknown as AiService, args, (line) => lines.push(line));
    expect(ai.runAdminTest).toHaveBeenCalledWith('lookup_word', { text: 'borrow' }, USER);
    expect(ai.run).not.toHaveBeenCalled();
    expect(JSON.parse(lines[0])).toMatchObject({ kind: 'ai_fake_call', operation_id: 'test-1' });
  });

  it('delete-user-data prints deleted_for', async () => {
    const ai = service();
    const lines: string[] = [];
    const args = parse(['delete-user-data', '--user', USER]);
    if (!args.ok) throw new Error(args.error);
    await runAiFakeCalls(ai as unknown as AiService, args, (line) => lines.push(line));
    expect(ai.deleteUserData).toHaveBeenCalledWith(USER);
    expect(lines.map((line) => JSON.parse(line))).toEqual([{ kind: 'ai_fake_call', deleted_for: USER }]);
  });
});
