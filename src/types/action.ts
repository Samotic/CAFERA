import type { ApiErrorCode, FieldError } from './common';

/**
 * The result of a Server Action.
 *
 * This is the surviving half of the Express error envelope. The middleware that
 * produced it is gone — there is no single error handler to funnel through when
 * every mutation is its own function — but the *shape* is worth keeping, for the
 * same reason it was worth having: the caller narrows on one discriminant and
 * maps a machine-readable code to copy, instead of rendering whatever string the
 * server happened to throw.
 *
 * `ok` rather than `success`, because a Server Action result is not an HTTP
 * response and should not read like one.
 *
 * Actions must **return** failures rather than throw them. A thrown error in a
 * Server Action reaches the client as a generic digest with no field detail,
 * which is right for an unexpected fault and useless for "that email is already
 * registered".
 */
export interface ActionSuccess<TData> {
  ok: true;
  data: TData;
}

export interface ActionFailure {
  ok: false;
  error: {
    code: ApiErrorCode;
    /** Developer-facing. The client maps `code` to copy; this is for logs. */
    message: string;
    /** Keyed by dotted form path, so react-hook-form can place each one. */
    fields?: FieldError[];
  };
}

export type ActionResult<TData> = ActionSuccess<TData> | ActionFailure;

export function actionOk<TData>(data: TData): ActionSuccess<TData> {
  return { ok: true, data };
}

export function actionError(
  code: ApiErrorCode,
  message: string,
  fields?: FieldError[],
): ActionFailure {
  return { ok: false, error: { code, message, ...(fields ? { fields } : {}) } };
}
