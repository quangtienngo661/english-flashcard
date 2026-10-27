import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { appRoutes } from './routes';

/** The whole route tree as a data router at `path`; `providers` wraps it (and whatever else the test mounts beside it). */
export function renderRoutes(path: string, providers: (node: ReactNode) => ReactNode) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  return { router, ...render(providers(<RouterProvider router={router} />)) };
}

/** A test's own route tree (e.g. a test-only page inside the real `Shell`) as a data router; the router is returned so a test can drive history. */
export function renderRouteTree(
  routes: RouteObject[],
  opts: Parameters<typeof createMemoryRouter>[1],
  providers: (node: ReactNode) => ReactNode,
) {
  const router = createMemoryRouter(routes, opts);
  return { router, ...render(providers(<RouterProvider router={router} />)) };
}
