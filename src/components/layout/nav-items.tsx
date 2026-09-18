import { Coffee, Compass, Heart, House, User } from 'lucide-react';

/**
 * The five primary destinations, shared by the desktop header and the mobile
 * bottom bar so the two can never drift apart.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: typeof House;
  /** `/my-cafe/custom` should light up "My Café"; `/` should not light up everything. */
  matchesNested: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Home', icon: House, matchesNested: false },
  { href: '/discover', label: 'Discover', icon: Compass, matchesNested: true },
  { href: '/favorites', label: 'Favorites', icon: Heart, matchesNested: true },
  { href: '/my-cafe', label: 'My Café', icon: Coffee, matchesNested: true },
  { href: '/profile', label: 'Profile', icon: User, matchesNested: true },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (!item.matchesNested) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
