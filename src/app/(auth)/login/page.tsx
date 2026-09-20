'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';

export default function LoginPage() {
  return (
    <div>
      <p className="text-accent-text text-xs font-semibold uppercase tracking-[0.22em]">
        Welcome back
      </p>
      <h1 className="font-display mt-3 text-4xl font-semibold">Sign in to CAFERA</h1>
      <p className="text-text-secondary mt-3">
        Authentication is ready for the Better Auth connection.
      </p>
      <form className="mt-8 space-y-5">
        <Field label="Email" required>
          {({ id, ...props }) => <Input {...props} id={id} type="email" autoComplete="email" />}
        </Field>
        <Field label="Password" required>
          {({ id, ...props }) => (
            <Input {...props} id={id} type="password" autoComplete="current-password" />
          )}
        </Field>
        <Button type="button" fullWidth size="lg">
          Sign in
        </Button>
      </form>
      <p className="text-text-secondary mt-6 text-sm">
        New here?{' '}
        <Link href="/register" className="text-accent-text font-semibold">
          Create an account
        </Link>
      </p>
    </div>
  );
}
