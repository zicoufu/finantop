import { ApiError } from './api';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

/**
 * Apply server-side validation errors to react-hook-form and return a user-facing message.
 * - Handles Zod-style fieldErrors returned by backend (status 400)
 * - Falls back to server message or a provided default i18n key
 */
export function handleApiFormError<TForm extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<TForm>,
  t: (key: string, opts?: any) => string,
  opts?: {
    defaultMessageKey?: string; // e.g. 'expenses.createError'
  }
): string {
  const defaultMsg = opts?.defaultMessageKey ? t(opts.defaultMessageKey) : t('errors.generic');

  if (err instanceof ApiError) {
    // Zod validation error with fieldErrors
    if (err.status === 400) {
      const fieldErrors = (err.data?.errors ?? err.data?.fieldErrors) as
        | Record<string, string[] | undefined>
        | undefined;

      if (fieldErrors && typeof fieldErrors === 'object') {
        Object.entries(fieldErrors).forEach(([field, messages]) => {
          const msg = Array.isArray(messages) && messages.length > 0 ? messages[0] : undefined;
          if (msg) {
            try {
              setError(field as Path<TForm>, { type: 'server', message: msg });
            } catch (_) {
              // Ignore if field name doesn't exist in the form
            }
          }
        });
      }

      // Prefer server message if present
      if (typeof err.data?.message === 'string' && err.data.message.trim().length > 0) {
        return err.data.message;
      }
      return defaultMsg;
    }

    // Other statuses: try to surface server message when available
    if (typeof err.data?.message === 'string' && err.data.message.trim().length > 0) {
      return err.data.message;
    }

    // Use error.message if set
    return err.message || defaultMsg;
  }

  // Non-ApiError
  if (err && typeof (err as any).message === 'string') {
    return (err as any).message as string;
  }
  return defaultMsg;
}
