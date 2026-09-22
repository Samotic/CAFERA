import Link from 'next/link';
import { ArrowRight, UserRound } from 'lucide-react';
import { PROFILE_SECTIONS } from '@/lib/constants/site';
import { Card, CardBody, CardDescription, CardTitle } from '@/components/ui/Card';

export default function ProfilePage() {
  return (
    <div className="content-container py-10 sm:py-14">
      <div className="flex items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent-text">
          <UserRound className="size-7" />
        </span>
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-accent-text uppercase">
            Your account
          </p>
          <h1 className="mt-1 font-display text-[length:var(--text-display-md)] font-semibold">
            Profile
          </h1>
        </div>
      </div>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-text-secondary">
        Your coffee preferences and account settings will live here. Sign in to sync them across
        devices.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROFILE_SECTIONS.map((section) => (
          <Card key={section.href} as="article">
            <CardBody>
              <CardTitle>{section.label}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
              <Link
                href={section.href}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent-text"
              >
                Open <ArrowRight className="size-4" />
              </Link>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
