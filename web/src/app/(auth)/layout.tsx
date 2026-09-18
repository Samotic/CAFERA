import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

/**
 * Authentication screens: a single centred column, no navigation.
 *
 * Everything that could pull attention away from the form is removed. The only
 * link out is the logo, which returns to browsing — signing in should never feel
 * like a wall a visitor cannot step back from.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-page flex min-h-dvh flex-col">
      <header className="content-container flex h-20 items-center">
        <Link
          href="/"
          className="focus-visible:outline-focus rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <Logo size="sm" />
        </Link>
      </header>

      <main
        id="main"
        className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center sm:pt-0"
      >
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
