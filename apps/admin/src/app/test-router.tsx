import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { appRoutes } from './routes';

/** The whole route tree as a data router at `path`; `providers` wraps it (and whatever else the test mounts beside it). */
export function renderRoutes(path: string, providers: (node: ReactNode) => ReactNode): ReturnType<typeof render> {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  return render(providers(<RouterProvider router={router} />));
}
