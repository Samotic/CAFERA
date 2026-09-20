import Link from 'next/link';
import { ArrowRight, Coffee, Plus } from 'lucide-react';
import { MY_CAFE_SECTIONS } from '@/lib/constants/site';
import { Card, CardBody, CardDescription, CardTitle } from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';

export default function MyCafePage() {
  return (
    <div className="content-container py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-accent-text text-xs font-semibold uppercase tracking-[0.22em]">
            Your coffee space
          </p>
          <h1 className="font-display mt-3 text-[length:var(--text-display-md)] font-semibold">
            My Café
          </h1>
          <p className="text-text-secondary mt-4 max-w-2xl text-lg leading-relaxed">
            Keep your saved recipes, brewing history, and custom creations together.
          </p>
        </div>
        <ButtonLink href="/my-cafe/custom/new" size="lg">
          <Plus className="size-4" /> Create recipe
        </ButtonLink>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MY_CAFE_SECTIONS.map((section) => (
          <Card key={section.href} as="article">
            <CardBody>
              <Coffee className="text-accent-text size-6" />
              <CardTitle className="mt-4">{section.label}</CardTitle>
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
