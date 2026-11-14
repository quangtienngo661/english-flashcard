'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { groupError, useGroupMutations } from './groups-api';
import { TOPIC_PICKER_KEY, type TopicAddBody, type TopicScope, type TopicTarget } from './topic-picker-api';

const BATCH_SIZE = 100;
// Each key's receipt is retained for 24 hours on the server.
const RECEIPT_WINDOW = 24 * 60 * 60 * 1000;

type Request = { body: TopicAddBody; key: string; expiresAt: number };
type Attempt = {
  operationId: string;
  scope: TopicScope;
  ids: string[];
  mode: TopicAddBody['mode'];
  target: TopicTarget;
  name: string;
  batch: number;
  pending?: Request;
  confirmed: { added: number; full: number; already: number; missing: number };
};
type Options = { scope: TopicScope; target: TopicTarget; name: string; ids: string[]; mode: TopicAddBody['mode'] };
type Callbacks = {
  onReconcile: (ids: string[]) => void;
  onGroup: (id: string, name: string) => void;
  onComplete: (attempt: Attempt) => void;
  onInvalidTarget: (target: TopicTarget, error: ApiError) => void;
  onError: (error: unknown) => void;
};
type Pause = { error: unknown; attempt: Attempt; canRetryAt: number };

export function useTopicAdd(callbacks: Callbacks) {
  const client = useQueryClient();
  const { addFromTopic } = useGroupMutations();
  const running = useRef(false);
  const attempt = useRef<Attempt | null>(null);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState<Pause | null>(null);
  const [interrupted, setInterrupted] = useState<Attempt | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [expired, setExpired] = useState(false);

  const retryAt = paused?.canRetryAt;
  const expiresAt = paused?.attempt.pending?.expiresAt;
  useEffect(() => {
    if (retryAt === undefined || expiresAt === undefined) return;
    const retryTimer = setTimeout(() => setWaiting(false), Math.max(0, retryAt - Date.now()));
    const expiryTimer = setTimeout(() => setExpired(true), Math.max(0, expiresAt - Date.now()));
    return () => { clearTimeout(retryTimer); clearTimeout(expiryTimer); };
  }, [expiresAt, retryAt]);

  const refresh = (scope: TopicScope) => void client.refetchQueries({
    queryKey: [...TOPIC_PICKER_KEY, scope.topic, scope.level],
    type: 'active',
  });

  async function run(options?: Options) {
    if (running.current) return;
    const previous = attempt.current;
    const now = Date.now();
    if (options ? previous !== null : !previous || !paused || now < paused.canRetryAt) return;
    if (previous?.pending && now >= previous.pending.expiresAt) {
      setExpired(true);
      return;
    }

    const current = attempt.current = previous ?? {
      ...options!,
      operationId: crypto.randomUUID(),
      batch: 0,
      confirmed: { added: 0, full: 0, already: 0, missing: 0 },
    };
    running.current = true;
    setBusy(true);
    setPaused(null);
    setInterrupted(null);
    setExpired(false);
    let received = false;
    try {
      do {
        const { scope, target, mode, batch, operationId } = current;
        // A retry reuses the request exactly, even if a refresh changed choices or eligibility.
        const entry = current.pending ??= {
          body: mode === 'all_unlearned' ? { ...scope, target, mode } : {
            ...scope,
            target,
            mode,
            sense_ids: current.ids.slice(batch * BATCH_SIZE, (batch + 1) * BATCH_SIZE),
          },
          key: `${operationId}:add:${batch}`,
          expiresAt: Date.now() + RECEIPT_WINDOW,
        };
        const receipt = await addFromTopic(entry.body, entry.key);
        received = true;
        current.pending = undefined;
        current.batch += 1;
        if (receipt.group_id && 'new_group_name' in target) {
          current.target = { group_id: receipt.group_id };
          callbacks.onGroup(receipt.group_id, current.name);
        }
        current.confirmed.added += receipt.added;
        current.confirmed.full += receipt.skipped_group_full;
        if (receipt.mode === 'selected') {
          current.confirmed.already += receipt.already_learning_ids.length;
          current.confirmed.missing += receipt.unavailable_ids.length;
          callbacks.onReconcile([...receipt.added_ids, ...receipt.already_learning_ids, ...receipt.unavailable_ids]);
        }
      } while (current.mode === 'selected' && current.batch * BATCH_SIZE < current.ids.length);
      attempt.current = null;
      callbacks.onComplete(current);
    } catch (error) {
      const status = error instanceof ApiError ? error.problem.status : undefined;
      const inProgress = error instanceof ApiError && status === 409 && error.problem.slug === '';
      const delay = status === 429 || inProgress ? ((error as ApiError).retryAfterSeconds ?? (inProgress ? 2 : 10)) * 1000 : 0;
      if (current.pending && (!status || status >= 500 || status === 429 || inProgress)) {
        setWaiting(delay > 0);
        setPaused({ attempt: current, error, canRetryAt: Date.now() + delay });
      } else {
        attempt.current = null;
        if (current.batch) setInterrupted(current);
        const kind = groupError(error)?.kind;
        if (error instanceof ApiError && (status === 404 || status === 403 || kind === 'limit' || kind === 'name-taken')) {
          callbacks.onInvalidTarget(current.target, error);
        } else {
          callbacks.onError(error);
        }
      }
    } finally {
      if (received) refresh(current.scope);
      running.current = false;
      setBusy(false);
    }
  }

  function leave() {
    const current = attempt.current;
    if (running.current || !current) return;
    attempt.current = null;
    setPaused(null);
    setInterrupted(current.batch > 0 ? current : null);
    refresh(current.scope);
  }

  return { run, busy, paused, interrupted, waiting, expired, leave };
}
