/**
 * Structural permission guard for docsile-hms Edge Functions.
 *
 * Implements ADR-002: every route declares its required permission at registration time.
 * The guard reads the declared permission and throws 403 if the session does not include it.
 *
 * Usage in index.ts:
 *   app.get('/patients', requirePermission('patients:view'), async (c) => { ... })
 *
 * A route without requirePermission() is visibly missing it in the one-screen index.ts.
 * A CI lint rule greps for `app.<method>(` without a `requirePermission` argument and fails
 * the build — this is the "structural, not conventional" guarantee.
 */

import type { MiddlewareHandler } from 'hono';
import type { Session } from './auth.ts';
import { ForbiddenError } from './errors.ts';

/**
 * Returns a Hono middleware that enforces a specific RBAC permission.
 * Must run after requireAuth (which attaches `session` to the context).
 */
export function requirePermission(permission: string): MiddlewareHandler {
  return async (c, next) => {
    const session = c.get('session') as Session | undefined;
    if (!session) {
      // This should not happen if requireAuth ran first, but guard defensively
      throw new ForbiddenError(permission);
    }

    if (!session.permissions.includes(permission)) {
      throw new ForbiddenError(permission);
    }

    await next();
  };
}
