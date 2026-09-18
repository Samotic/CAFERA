'use client';

import { Star } from 'lucide-react';
import { useId, useState } from 'react';
import { REVIEW_MAX_RATING } from '@cafera/shared';
import { cn } from '@/lib/cn';

/**
 * Read-only rating display.
 *
 * The stars are decorative (`aria-hidden`); the number beside them is the real
 * content. A screen reader hears "4.8 out of 5, 126 reviews" rather than five
 * ambiguous star glyphs, and sighted users get the number too — a half-filled
 * star is not a precise readout.
 */
export function RatingDisplay({
  value,
  count,
  size = 'md',
  className,
}: {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const rounded = Math.round(value * 10) / 10;
  const percent = Math.max(0, Math.min(100, (value / REVIEW_MAX_RATING) * 100));
  const starSize = size === 'sm' ? 'size-3.5' : 'size-4';

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span aria-hidden className="relative inline-flex">
        <span className="text-border-strong inline-flex gap-0.5">
          {Array.from({ length: REVIEW_MAX_RATING }, (_, index) => (
            <Star key={index} className={starSize} fill="currentColor" strokeWidth={0} />
          ))}
        </span>
        {/* `accent-line`, not `accent`. The raw brand caramel measures 2.83:1 on a
            card — below the 3:1 that WCAG 1.4.11 asks of a meaningful graphic.
            `accent-line` is the variant solved for exactly this and reads the same.

            The filled layer is clipped to the exact percentage, so 4.3 looks like 4.3. */}
        <span
          className="text-accent-line absolute inset-0 inline-flex gap-0.5 overflow-hidden"
          style={{ width: `${percent}%` }}
        >
          {Array.from({ length: REVIEW_MAX_RATING }, (_, index) => (
            <Star
              key={index}
              className={cn(starSize, 'shrink-0')}
              fill="currentColor"
              strokeWidth={0}
            />
          ))}
        </span>
      </span>

      <span
        className={cn('text-text-secondary font-medium', size === 'sm' ? 'text-xs' : 'text-sm')}
      >
        {rounded.toFixed(1)}
        {typeof count === 'number' ? (
          <span className="text-text-muted font-normal"> ({count})</span>
        ) : null}
      </span>

      <span className="sr-only">
        Rated {rounded.toFixed(1)} out of {REVIEW_MAX_RATING}
        {typeof count === 'number' ? ` from ${count} review${count === 1 ? '' : 's'}` : ''}
      </span>
    </span>
  );
}

/**
 * The star input.
 *
 * It is a genuine radio group, not a row of divs with mouse handlers. That
 * means arrow keys move between values, the group takes one tab stop, the
 * selection participates in form submission, and the current value is announced
 * — none of which a hover-driven widget provides.
 */
export function RatingInput({
  name,
  value,
  onChange,
  disabled = false,
  label = 'Your rating',
}: {
  name: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
}) {
  const groupId = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? value;

  return (
    <fieldset disabled={disabled} className="border-0 p-0" onMouseLeave={() => setHovered(null)}>
      <legend className="text-text mb-2 text-sm font-medium">{label}</legend>
      <div className="flex items-center gap-1">
        {Array.from({ length: REVIEW_MAX_RATING }, (_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= shown;
          return (
            <label
              key={starValue}
              onMouseEnter={() => setHovered(starValue)}
              className={cn(
                'cursor-pointer rounded p-1 transition-transform duration-150',
                'hover:scale-110 motion-reduce:hover:scale-100',
                /* The radio itself is sr-only, so the ring is drawn on this label instead.
                   Same two-tone treatment as every other focusable thing. */
                'focus-ring-within',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <input
                type="radio"
                name={name}
                id={`${groupId}-${starValue}`}
                value={starValue}
                checked={value === starValue}
                onChange={() => onChange(starValue)}
                className="sr-only"
              />
              <Star
                aria-hidden
                className={cn('size-7', isFilled ? 'text-accent-line' : 'text-border-strong')}
                fill={isFilled ? 'currentColor' : 'none'}
                strokeWidth={isFilled ? 0 : 1.5}
              />
              <span className="sr-only">
                {starValue} star{starValue === 1 ? '' : 's'}
              </span>
            </label>
          );
        })}
        <span aria-live="polite" className="text-text-muted ml-2 text-sm">
          {value > 0 ? `${value} of ${REVIEW_MAX_RATING}` : 'Not rated'}
        </span>
      </div>
    </fieldset>
  );
}
