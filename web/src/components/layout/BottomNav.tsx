'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { isNavItemActive, NAV_ITEMS } from './nav-items';

/**
 * The mobile primary navigation, hidden from `lg` upwards where the top nav
 * takes over.
 *
 * The active item is marked three ways — colour, a thicker label, and a caramel
 * indicator bar above the icon — plus `aria-current="page"`. Colour alone would
 * be invisible to a colour-blind user, and the spec is explicit that state must
 * never depend on it.
 *
 * `safe-bottom` keeps the row clear of the home indicator on notched phones,
 * where a flush-bottom bar is partly unreachable.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'bg-card/95 border-border safe-bottom scrollbar-compensated fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md',
        'lg:hidden',
      )}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive = isNavItemActive(item, pathname);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex min-h-[3.5rem] flex-col items-center justify-center gap-1 px-1 py-2',
                  'transition-colors duration-150',
                  isActive ? 'text-accent-text' : 'text-text-muted hover:text-text',
                )}
              >
                {/* Non-colour indicator. */}
                <span
                  aria-hidden
                  className={cn(
                    'bg-accent-line absolute top-0 h-0.5 w-8 rounded-full transition-opacity duration-200',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <Icon
                  aria-hidden
                  className="size-5.5"
                  strokeWidth={isActive ? 2.4 : 1.8}
                  fill={isActive && item.label === 'Favorites' ? 'currentColor' : 'none'}
                />
                <span
                  className={cn('text-[0.6875rem]', isActive ? 'font-semibold' : 'font-medium')}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
