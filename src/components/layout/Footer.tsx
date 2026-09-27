import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { CATEGORY_META } from '@/lib/constants/categories';

/**
 * The footer carries the links a crawler needs and a returning visitor expects:
 * category entry points, the legal pages that analytics and consent require,
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
    <footer className="mt-16 border-t border-border bg-sunken">
      <div className="content-container py-12">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo showTagline />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-text-muted">
              A calmer way to find your next cup. Twenty-five specialty recipes, proper brewing
              guides and a collection that is yours.
            </p>
          </div>

          <nav aria-labelledby="footer-categories">
            <h2 id="footer-categories" className="mb-3 text-sm font-semibold text-text">
              Browse
            </h2>
            <ul className="flex flex-col gap-2">
              {CATEGORY_META.slice(0, 5).map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/discover?category=${category.slug}`}
                    className="rounded text-sm text-text-muted hover:text-accent-text"
                  >
                    {category.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-legal">
            <h2 id="footer-legal" className="mb-3 text-sm font-semibold text-text">
              CAFERA
            </h2>
            <ul className="flex flex-col gap-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="rounded text-sm text-text-muted hover:text-accent-text"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-10 border-t border-border pt-6 text-xs text-text-muted">
          &copy; {new Date().getFullYear()} CAFERA. Brewed with care.
        </p>
      </div>
    </footer>
  );
}
