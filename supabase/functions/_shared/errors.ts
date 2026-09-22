/**
 * Typed error classes for docsile-hms Edge Functions.
 * Each class maps to a specific HTTP status code.
 * Error messages must always name the resource, the identifier, and what was invalid —
 * never a bare "Not found" or "Bad request".
 */

export class AppError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

/** 400 — Input failed schema validation or a state constraint was violated. */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

/** 401 — Missing, expired, or revoked authentication credential. */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required. Provide a valid docsile-session cookie.') {
    super(message, 401);
  }
}

/** 403 — Authenticated, but the session does not hold the required permission. */
export class ForbiddenError extends AppError {
  constructor(permission: string) {
    super(
      `Forbidden: your session does not include the required permission "${permission}".`,
      403,
    );
  }
}

/** 404 — Named resource not found under the given identifier(s). */
export class NotFoundError extends AppError {
  constructor(resourceType: string, id: string) {
    super(`${resourceType} with id "${id}" not found.`, 404);
  }
}

/** 409 — Uniqueness or state conflict. Message must name the conflicting value. */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

/** 422 — Request is well-formed but semantically unprocessable. */
export class UnprocessableError extends AppError {
  constructor(message: string) {
    super(message, 422);
  }
}

/** 429 — Rate limit exceeded. */
export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded. Please retry after the window resets.') {
    super(message, 429);
  }
}

/** 501 — Phase 7 stub: business logic not yet implemented. */
export class NotImplementedError extends AppError {
  constructor(location: string) {
    super(
      `Not implemented: ${location} — Phase 7 will fill this in. Do not call this endpoint in production yet.`,
      501,
    );
  }
}

/** 503 — Downstream dependency (e.g. Supabase) is unavailable. */
export class ServiceUnavailableError extends AppError {
  constructor(dependency: string, detail?: string) {
    super(
      `Service unavailable: ${dependency} is unreachable.${detail ? ` Detail: ${detail}` : ''}`,
      503,
    );
  }
}
