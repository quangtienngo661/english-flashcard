import { AsyncLocalStorage } from 'node:async_hooks';

const requestContext = new AsyncLocalStorage<string>();

export function getOperationId(): string | undefined {
  return requestContext.getStore();
}

export function runWithOperationId<T>(id: string, fn: () => T): T {
  return requestContext.run(id, fn);
}
