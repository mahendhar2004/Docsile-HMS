/**
 * Structured, PII-redacting logger for docsile-hms Edge Functions.
 *
 * Rules (from observability-principles.md and Phase 2 §10.1):
 * - Every log line is JSON with mandatory fields: timestamp, level, correlationId,
 *   hospitalId, module, action, durationMs (optional), statusCode (optional), message.
 * - PII fields (patient name, phone, DOB, health data) are NEVER logged.
 *   redactPII() strips them from any object before it reaches the log output.
 * - console.log / console.error are banned — all logging goes through this module.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  correlationId: string;
  hospitalId?: string;
  userId?: string;
  module: string;
  action: string;
  durationMs?: number;
  statusCode?: number;
  [key: string]: unknown;
}

/** Fields that are considered PII and must never appear in log output. */
const PII_FIELDS = new Set([
  'name',
  'firstName',
  'lastName',
  'fullName',
  'phone',
  'email',
  'dateOfBirth',
  'dob',
  'address',
  'diagnosis',
  'medicines',
  'investigations',
  'password',
  'newPassword',
  'token',
  'refreshToken',
  'accessToken',
  // Add any additional PII field names here
]);

/**
 * Recursively strips PII fields from an object before logging.
 * Replaces the value with "[REDACTED]" so the key is visible (useful for debugging shape issues)
 * without exposing the sensitive content.
 */
export function redactPII<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return (obj as unknown[]).map(redactPII) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (PII_FIELDS.has(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactPII(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

function emit(level: LogLevel, message: string, ctx: LogContext, extra?: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    correlationId: ctx.correlationId,
    hospitalId: ctx.hospitalId,
    userId: ctx.userId,
    module: ctx.module,
    action: ctx.action,
    durationMs: ctx.durationMs,
    statusCode: ctx.statusCode,
    message,
    ...(extra ? redactPII(extra) : {}),
  };
  // Use console.error for warn/error so they appear in Supabase Edge Function logs,
  // console.log for info/debug. This is the ONLY permitted use of console.* in this codebase.
  if (level === 'error' || level === 'warn') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  debug: (message: string, ctx: LogContext, extra?: Record<string, unknown>) =>
    emit('debug', message, ctx, extra),
  info: (message: string, ctx: LogContext, extra?: Record<string, unknown>) =>
    emit('info', message, ctx, extra),
  warn: (message: string, ctx: LogContext, extra?: Record<string, unknown>) =>
    emit('warn', message, ctx, extra),
  error: (message: string, ctx: LogContext, extra?: Record<string, unknown>) =>
    emit('error', message, ctx, extra),
};
