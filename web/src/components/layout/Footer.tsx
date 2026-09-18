import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { CATEGORY_META } from '@cafera/shared';

/**
 * The footer carries the links a crawler needs and a returning visitor expects:
 * category entry points, the legal pages that Cloudinary and analytics require,
 * and the brand statement. It is hidden behind the bottom nav on mobile, so it
 * gets clearance padding there.
 */
const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/profile/about', label: 'About CAFERA' },
];

export function Footer() {
  return (
    <footer className="border-border bg-sunken mt-16 border-t">
      <div className="content-container py-12">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo showTagline />
            <p className="text-text-muted mt-4 max-w-xs text-sm leading-relaxed">
              A calmer way to find your next cup. Twenty-five specialty recipes, proper brewing
              guides and a collection that is yours.
            </p>
          </div>

          <nav aria-labelledby="footer-categories">
            <h2 id="footer-categories" className="text-text mb-3 text-sm font-semibold">
              Browse
            </h2>
            <ul className="flex flex-col gap-2">
              {CATEGORY_META.slice(0, 5).map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/discover?category=${category.slug}`}
                    className="text-text-muted hover:text-accent-text focus-visible:outline-focus rounded text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {category.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-legal">
            <h2 id="footer-legal" className="text-text mb-3 text-sm font-semibold">
              CAFERA
            </h2>
            <ul className="flex flex-col gap-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-text-muted hover:text-accent-text focus-visible:outline-focus rounded text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="border-border text-text-muted mt-10 border-t pt-6 text-xs">
          &copy; {new Date().getFullYear()} CAFERA. Brewed with care.
        </p>
      </div>
    </footer>
  );
}
