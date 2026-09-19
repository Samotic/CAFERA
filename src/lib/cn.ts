import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Conditional class names, with later Tailwind utilities winning over earlier
 * ones of the same kind. Without the merge step a caller's `px-6` would sit
 * beside a component's built-in `px-4` and the outcome would depend on stylesheet
 * order rather than on intent.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
