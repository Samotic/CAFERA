/**
 * Full-viewport, chrome-free routes: onboarding at /welcome and Brew Mode at
 * /recipes/[slug]/brew.
 *
 * `100dvh` rather than `100vh` is load-bearing here. On mobile browsers the
 * visual viewport shrinks as the URL bar appears, and a `100vh` brewing screen
 * would push its timer controls underneath the browser chrome — exactly the
 * controls someone is reaching for with a milk jug in the other hand.
 */
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-page flex min-h-dvh flex-col">
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
