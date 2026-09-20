import { Heart, ArrowRight } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardBody, CardDescription, CardTitle } from '@/components/ui/Card';

export default function FavoritesPage() {
  return (
    <div className="content-container py-10 sm:py-14">
      <p className="text-accent-text text-xs font-semibold uppercase tracking-[0.22em]">
        Your collection
      </p>
      <h1 className="font-display mt-3 text-[length:var(--text-display-md)] font-semibold">
        Favorites
      </h1>
      <p className="text-text-secondary mt-4 max-w-2xl text-lg leading-relaxed">
        Save recipes you want to return to, then find them here whenever you are ready to brew.
      </p>
      <Card className="mt-10 max-w-2xl" variant="outline">
        <CardBody>
          <Heart className="text-accent-text size-7" />
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
