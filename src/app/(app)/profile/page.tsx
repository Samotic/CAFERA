import Link from 'next/link';
import { ArrowRight, UserRound } from 'lucide-react';
import { PROFILE_SECTIONS } from '@/lib/constants/site';
import { Card, CardBody, CardDescription, CardTitle } from '@/components/ui/Card';

export default function ProfilePage() {
  return (
    <div className="content-container py-10 sm:py-14">
      <div className="flex items-center gap-4">
        <span className="bg-accent-soft text-accent-text flex size-14 items-center justify-center rounded-full">
          <UserRound className="size-7" />
        </span>
        <div>
          <p className="text-accent-text text-xs font-semibold uppercase tracking-[0.22em]">
            Your account
          </p>
          <h1 className="font-display mt-1 text-[length:var(--text-display-md)] font-semibold">
            Profile
          </h1>
        </div>
      </div>
      <p className="text-text-secondary mt-5 max-w-2xl text-lg leading-relaxed">
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
                className="text-accent-text mt-5 inline-flex items-center gap-2 text-sm font-semibold"
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
