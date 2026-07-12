/**
 * Shared kernel types — no domain-specific models.
 */

export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };

/** Discriminated result for service / use-case boundaries */
export type Result<T, E = string> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}
