import Image from 'next/image';
import { Clock3, MapPin } from 'lucide-react';
import { CATEGORY_LABELS } from '@/lib/constants/categories';
import { DIFFICULTY_LABELS } from '@/lib/constants/enums';
import { IMAGE_SIZES } from '@/theme/tokens';
import type { Recipe } from '@/types/recipe';
import { CardLink, CardBody, CardDescription, CardTitle } from '@/components/ui/Card';
import { RatingDisplay } from '@/components/ui/Rating';

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <CardLink href={`/recipes/${recipe.slug}`} className="h-full">
      {/* The aspect ratio is on the wrapper and `fill` on the image, so the box
          is reserved before the photograph arrives. This is what keeps CLS at
          zero on a grid that loads twenty of them at once. */}
      <div className="relative aspect-[4/3] overflow-hidden bg-sunken">
        <Image
          src={recipe.imageSquare}
          alt=""
          fill
          /* Without `sizes`, next/image assumes 100vw and ships a full-width
             source to a card that is a quarter of the viewport. */
          sizes={IMAGE_SIZES.grid}
          className="object-cover transition duration-500 group-hover/card:scale-105"
          {...(recipe.blurDataURL
            ? { placeholder: 'blur' as const, blurDataURL: recipe.blurDataURL }
            : {})}
        />
      </div>
      <CardBody>
        <div className="flex items-center justify-between gap-3 text-xs font-semibold tracking-[0.12em] text-accent-text uppercase">
          <span>{CATEGORY_LABELS[recipe.category]}</span>
          <span>{DIFFICULTY_LABELS[recipe.difficulty]}</span>
        </div>
        <CardTitle className="mt-2">{recipe.name}</CardTitle>
        <CardDescription className="line-clamp-2">{recipe.description}</CardDescription>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-muted">
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
