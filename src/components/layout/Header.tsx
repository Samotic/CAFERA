'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, Search, User, X } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { ButtonLink, IconButton } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/lib/cn';
import { isNavItemActive, NAV_ITEMS } from './nav-items';

/**
 * The sticky top header.
 *
 * Desktop (>= lg): logo, centred primary nav, search trigger and account menu.
 * Mobile: logo, search and a menu button that opens a sheet — the five primary
 * destinations already live in the bottom bar there, so the sheet carries the
 * secondary links instead of duplicating them.
 */
export function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header
        className={cn(
          'bg-page/85 border-border safe-top sticky top-0 z-40 border-b backdrop-blur-md',
        )}
      >
        <div className="content-container flex h-16 items-center justify-between gap-4">
          <Link href="/" className="rounded-md">
            <Logo size="sm" />
          </Link>

          {/* Desktop navigation */}
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = isNavItemActive(item, pathname);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'relative inline-flex h-11 items-center rounded-md px-4 text-[0.9375rem] transition-colors duration-150',
                        '',
                        isActive
                          ? 'text-accent-text font-semibold'
                          : 'text-text-secondary hover:text-text hover:bg-sunken font-medium',
                      )}
                    >
                      {item.label}
                      {/* Weight and an underline carry the state alongside colour. */}
                      <span
                        aria-hidden
                        className={cn(
                          'bg-accent-line absolute inset-x-4 bottom-1.5 h-0.5 rounded-full transition-opacity duration-200',
                          isActive ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-1">
            <IconButton label="Search coffee and ingredients" size="md">
              <Search aria-hidden className="size-5" />
            </IconButton>

            <ButtonLink href="/profile" variant="ghost" size="sm" className="hidden lg:inline-flex">
              <User aria-hidden className="size-4" />
              Account
            </ButtonLink>

            <IconButton
              label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
              className="lg:hidden"
            >
              {isMenuOpen ? (
                <X aria-hidden className="size-5" />
              ) : (
                <Menu aria-hidden className="size-5" />
              )}
            </IconButton>
          </div>
        </div>
      </header>

      <Sheet isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} title="Menu" side="right">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = isNavItemActive(item, pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex min-h-12 items-center gap-3 rounded-lg px-3 text-[0.9375rem] transition-colors',
                    isActive
                      ? 'bg-accent-soft text-accent-text font-semibold'
                      : 'text-text-secondary hover:bg-sunken font-medium',
                  )}
                >
                  <Icon aria-hidden className="size-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}
