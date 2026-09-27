'use client';

import { useEffect } from 'react';

/**
 * Registers `public/sw.js`.
 *
 * `enabled` is passed in from the root layout rather than read here, because
 * `process.env` is confined to `src/lib/env.ts` (see decision 3) and a client
 * component cannot import that module — it parses the connection string at load.
 * A prop from a server component carries the one boolean across without carrying
 * the schema.
 *
 * When disabled, any previously installed worker is actively unregistered. A
 * worker left over from a production build on the same origin is a genuinely
 * nasty development experience: it serves yesterday's chunks against today's
 * dev server, and every symptom points at the bundler.
 */
export function ServiceWorkerRegistration({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (!enabled) {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
        .catch(() => {
          /* Nothing actionable: there was no worker, or the browser refused. */
        });
      return;
    }

    /* Registration competes with the page's own resources for bandwidth, and the
       precache sweep it kicks off fetches every public page. Waiting for `load`
       keeps all of that behind the first paint rather than in front of it. */
    const register = () => {
      void navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(() => navigator.serviceWorker.ready)
        .then((registration) => {
          /* Install precaches once, on first registration. This nudge is what
             keeps the offline catalogue current afterwards: the worker itself
             throttles the sweep to once a day, so asking on every load is cheap
             and means a visitor who has not cleared storage in a month still has
             the recipes added last week. */
          registration.active?.postMessage({ type: 'sync-precache' });
        })
        .catch(() => {
          /* Offline support is an enhancement. A browser that refuses the
             worker — Safari in private browsing, a locked-down enterprise
             policy — must still get a working site, so this is swallowed. */
        });
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }

    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, [enabled]);

  return null;
}
