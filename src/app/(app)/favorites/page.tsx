import { Heart, ArrowRight } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardBody, CardDescription, CardTitle } from '@/components/ui/Card';

export default function FavoritesPage() {
  return (
    <div className="content-container py-10 sm:py-14">
      <p className="text-xs font-semibold tracking-[0.22em] text-accent-text uppercase">
        Your collection
      </p>
      <h1 className="mt-3 font-display text-[length:var(--text-display-md)] font-semibold">
        Favorites
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-text-secondary">
        Save recipes you want to return to, then find them here whenever you are ready to brew.
      </p>
      <Card className="mt-10 max-w-2xl" variant="outline">
        <CardBody>
          <Heart className="size-7 text-accent-text" />
          <CardTitle className="mt-4">Nothing saved yet</CardTitle>
          <CardDescription>
            Browse the recipe library and save your next favorite cup.
          </CardDescription>
          <ButtonLink href="/discover" size="lg" className="mt-6">
            Explore recipes <ArrowRight className="size-4" />
          </ButtonLink>
        </CardBody>
      </Card>
    </div>
  );
}
