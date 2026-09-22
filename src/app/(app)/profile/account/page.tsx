import Link from 'next/link';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { Card, CardBody, CardDescription, CardTitle } from '@/components/ui/Card';

export default function AccountPage() {
  return (
    <div className="content-container max-w-3xl py-10 sm:py-14">
      <Link
        href="/profile"
        className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text"
      >
        <ArrowLeft className="size-4" /> Profile
      </Link>
      <p className="mt-8 text-xs font-semibold tracking-[0.22em] text-accent-text uppercase">
        Account
      </p>
      <h1 className="mt-3 font-display text-[length:var(--text-display-md)] font-semibold">
        Account details
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-text-secondary">
        Manage your identity and sign-in details in one place.
      </p>
      <Card className="mt-10" variant="outline">
        <CardBody>
          <LockKeyhole className="size-6 text-accent-text" />
          <CardTitle className="mt-4">Sign-in required</CardTitle>
          <CardDescription>
            Account editing will be enabled when Better Auth is connected to this app. Your public
            recipe browsing remains available without an account.
          </CardDescription>
          <Link href="/" className="mt-6 inline-flex text-sm font-semibold text-accent-text">
            Continue browsing
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
