import { Clock3, MapPin } from 'lucide-react';
import { CATEGORY_LABELS } from '@/lib/constants/categories';
import { DIFFICULTY_LABELS } from '@/lib/constants/enums';
import type { Recipe } from '@/types/recipe';
import { CardLink, CardBody, CardDescription, CardTitle } from '@/components/ui/Card';
import { RatingDisplay } from '@/components/ui/Rating';

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <CardLink href={`/recipes/${recipe.slug}`} className="h-full">
      <div className="bg-sunken aspect-[4/3] overflow-hidden">
        <img
          src={recipe.imageSquare}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover/card:scale-105"
        />
      </div>
      <CardBody>
        <div className="text-accent-text flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em]">
          <span>{CATEGORY_LABELS[recipe.category]}</span>
          <span>{DIFFICULTY_LABELS[recipe.difficulty]}</span>
        </div>
        <CardTitle className="mt-2">{recipe.name}</CardTitle>
        <CardDescription className="line-clamp-2">{recipe.description}</CardDescription>
        <div className="text-text-muted mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3.5" /> {recipe.preparationTime} min
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" /> {recipe.origin}
          </span>
        </div>
        <RatingDisplay
          value={recipe.rating}
          count={recipe.reviewCount}
          size="sm"
          className="mt-3"
        />
      </CardBody>
    </CardLink>
  );
}
