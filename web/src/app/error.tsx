'use client';

import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';

/**
 * The root error boundary.
 *
 * It shows the `digest` — the identifier Next assigns to the server-side error —
 * and nothing else from the error object. A stack trace or a raw database
 * message on screen tells an attacker about the internals and tells the user
 * nothing they can act on; the digest lets support find the exact log line.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replaced by the Sentry handler in production (see §37).
    console.error('Unhandled application error:', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="bg-page flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <span className="bg-danger-soft text-danger flex size-16 items-center justify-center rounded-full">
        <TriangleAlert aria-hidden className="size-7" />
      </span>

      <h1 className="font-display text-text mt-6 text-3xl font-semibold">Something spilled</h1>
      <p className="text-text-muted mt-3 max-w-md text-[0.9375rem] leading-relaxed">
        We hit an unexpected problem loading this page. Trying again usually sorts it out.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Back to home
        </ButtonLink>
      </div>

      {error.digest ? (
        <p className="text-text-muted mt-8 font-mono text-xs">Reference: {error.digest}</p>
      ) : null}
    </div>
  );
}
