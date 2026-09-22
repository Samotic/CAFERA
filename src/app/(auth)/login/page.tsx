'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';

export default function LoginPage() {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.22em] text-accent-text uppercase">
        Welcome back
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold">Sign in to CAFERA</h1>
      <p className="mt-3 text-text-secondary">
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
      <p className="mt-6 text-sm text-text-secondary">
        New here?{' '}
        <Link href="/register" className="font-semibold text-accent-text">
          Create an account
        </Link>
      </p>
    </div>
  );
}
