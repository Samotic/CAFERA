import { BottomNav } from '@/components/layout/BottomNav';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

/**
 * The chrome shared by every browsing screen: Home, Discover, recipe detail,
 * Favorites, My Café and Profile.
 *
 * Auth screens and Brew Mode deliberately sit outside this group. Brew Mode is
 * a full-viewport focus route, and a sign-in page with a bottom nav offering
 * "Favorites" is offering something the visitor cannot yet have.
 *
 * `pb-20 lg:pb-0` reserves room for the fixed bottom bar so the last card on a
 * page is never trapped underneath it.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="main" className="flex-1 pb-20 lg:pb-0">
        {children}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
