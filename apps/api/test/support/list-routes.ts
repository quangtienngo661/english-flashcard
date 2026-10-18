import { type INestApplication, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import type { Permission } from '../../src/identity/identity.types.js';
import { REQUIRED_PERMISSION_KEY } from '../../src/identity/staff/require-permission.decorator.js';

export function listRoutes(app: INestApplication): Array<{ method: string; path: string; permissions: Permission[] | null }> {
  const discovery = app.get(DiscoveryService);
  const scanner = app.get(MetadataScanner);
  const reflector = app.get(Reflector);
  const routes: ReturnType<typeof listRoutes> = [];
  for (const { instance, metatype } of discovery.getControllers()) {
    if (!instance || !metatype) continue;
    const controllerPaths = reflector.get<string | string[]>(PATH_METADATA, metatype);
    if (controllerPaths === undefined) continue;
    const prototype = Object.getPrototypeOf(instance) as Record<string, (...args: never[]) => unknown>;
    for (const name of scanner.getAllMethodNames(prototype)) {
      const handler = prototype[name];
      const methodPaths = reflector.get<string | string[]>(PATH_METADATA, handler);
      const method = reflector.get<RequestMethod>(METHOD_METADATA, handler);
      if (methodPaths === undefined || method === undefined) continue;
      const permissions = reflector.getAllAndOverride<Permission[]>(REQUIRED_PERMISSION_KEY, [handler, metatype]) ?? null;
      for (const controllerPath of Array.isArray(controllerPaths) ? controllerPaths : [controllerPaths]) {
        for (const methodPath of Array.isArray(methodPaths) ? methodPaths : [methodPaths]) {
          const path = '/' + ['v1', controllerPath, methodPath].flatMap((part) => part.split('/')).filter(Boolean).join('/');
          routes.push({ method: RequestMethod[method], path, permissions: permissions === null ? null : [...permissions] });
        }
      }
    }
  }
  return routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}
