import Link from 'next/link';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { Card, CardBody, CardDescription, CardTitle } from '@/components/ui/Card';

export default function AccountPage() {
  return (
    <div className="content-container max-w-3xl py-10 sm:py-14">
      <Link
        href="/profile"
        className="text-text-secondary hover:text-text inline-flex items-center gap-2 text-sm font-semibold"
      >
        <ArrowLeft className="size-4" /> Profile
      </Link>
      <p className="text-accent-text mt-8 text-xs font-semibold uppercase tracking-[0.22em]">
        Account
      </p>
      <h1 className="font-display mt-3 text-[length:var(--text-display-md)] font-semibold">
        Account details
      </h1>
      <p className="text-text-secondary mt-4 text-lg leading-relaxed">
        Manage your identity and sign-in details in one place.
      </p>
      <Card className="mt-10" variant="outline">
        <CardBody>
          <LockKeyhole className="text-accent-text size-6" />
          <CardTitle className="mt-4">Sign-in required</CardTitle>
          <CardDescription>
            Account editing will be enabled when Better Auth is connected to this app. Your public
            recipe browsing remains available without an account.
          </CardDescription>
          <Link href="/" className="text-accent-text mt-6 inline-flex text-sm font-semibold">
            Continue browsing
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
