'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';

export default function RegisterPage() {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.22em] text-accent-text uppercase">
        Join CAFERA
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold">Make coffee yours.</h1>
      <p className="mt-3 text-text-secondary">
        Create an account to sync favorites, preferences, and custom recipes.
      </p>
      <form className="mt-8 space-y-5">
        <Field label="Name" required>
          {({ id, ...props }) => <Input {...props} id={id} autoComplete="name" />}
        </Field>
        <Field label="Email" required>
          {({ id, ...props }) => <Input {...props} id={id} type="email" autoComplete="email" />}
        </Field>
        <Field label="Password" required>
          {({ id, ...props }) => (
            <Input {...props} id={id} type="password" autoComplete="new-password" />
          )}
        </Field>
        <Button type="button" fullWidth size="lg">
          Create account
        </Button>
      </form>
      <p className="mt-6 text-sm text-text-secondary">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-accent-text">
          Sign in
        </Link>
      </p>
    </div>
  );
}
