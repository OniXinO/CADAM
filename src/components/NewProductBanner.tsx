import { ArrowRight, X } from 'lucide-react';
import posthog from 'posthog-js';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Copy lives in one place so the owner can swap headline/subtext/CTA without
// touching the markup. See the PR summary for runner-up options.
const COPY = {
  headline: 'The new Adam is here',
  subtext:
    'Adam now works inside your real CAD in Onshape and Fusion, editing models, BOMs, and drawings.',
  cta: 'Try now',
} as const;

// Versioned so a redesign can re-surface the banner for users who dismissed an
// older iteration (v3: Fusion logo, pink Adam mark, white CTA, refreshed
// motion). Un-scoped: CADAM has no team/integration concept, so one key is enough.
const DISMISSED_KEY = 'adam-product-banner-dismissed:v3';

// Dismissal lives in localStorage but is read through useSyncExternalStore so
// same-tab writes re-render the banner immediately; the native "storage" event
// only fires in other tabs.
const DISMISSAL_CHANGE_EVENT = 'adam-product-banner-dismissal-change';

// Session-scoped fallback so a dismissal still sticks when localStorage is
// unavailable (private mode, storage-blocking extensions) — without it the
// snapshot would read false again and the banner would reappear post-exit.
let memoryDismissed = false;

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return memoryDismissed;
  }
}

function writeDismissed(dismissed: boolean): void {
  memoryDismissed = dismissed;
  try {
    if (dismissed) {
      localStorage.setItem(DISMISSED_KEY, '1');
    } else {
      localStorage.removeItem(DISMISSED_KEY);
    }
  } catch {
    // localStorage unavailable — the in-memory fallback above still holds.
  }
  window.dispatchEvent(new Event(DISMISSAL_CHANGE_EVENT));
}

function subscribeToDismissal(onChange: () => void): () => void {
  window.addEventListener(DISMISSAL_CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(DISMISSAL_CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/**
 * Announcement card on the CADAM home page inviting users up to the full Adam
 * product (https://adam.new). Floats in the space below the composer, shows
 * unless dismissed, then fades + slides + scales out and stays gone (persisted
 * in localStorage).
 */
export function NewProductBanner() {
  const [dismissing, setDismissing] = useState(false);
  // Starts hidden so the entrance transition has a "from" frame to animate out
  // of; flipped on after first paint (rAF), matching PromptView's fade-in.
  const [entered, setEntered] = useState(false);
  // The server snapshot (hidden) is also what renders during hydration, so a
  // stored dismissal can't mismatch SSR'd markup and the card never flashes.
  const dismissed = useSyncExternalStore(
    subscribeToDismissal,
    readDismissed,
    () => true,
  );
  // Tracks the exit-fallback timer so it can be cancelled if the card unmounts
  // mid-exit (e.g. navigating away during the 450ms window) — otherwise the
  // callback fires on a stale fiber.
  const dismissTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(
    () => () => {
      if (dismissTimeoutRef.current !== null) {
        window.clearTimeout(dismissTimeoutRef.current);
      }
    },
    [],
  );

  if (dismissed && !dismissing) {
    return null;
  }

  // visible drives the single enter/exit transition: false on first paint
  // (slide-up entrance) and again once dismissing (slide-down exit).
  const visible = entered && !dismissing;

  // Persist immediately, but keep the card mounted while the exit plays; the
  // card's transitionend handler does the actual unmount. The timeout is a
  // fallback for environments where transitionend never fires (zeroed durations
  // under reduced-motion overrides) — a no-op if the handler already ran.
  const dismiss = () => {
    setDismissing(true);
    writeDismissed(true);
    dismissTimeoutRef.current = window.setTimeout(() => {
      dismissTimeoutRef.current = null;
      setDismissing(false);
    }, 450);
  };

  const handleCtaClick = () => {
    try {
      posthog.capture('new_product_banner_click', { location: 'prompt_view' });
    } catch {
      // Analytics failures (e.g. blocked by an ad-blocker) must never block
      // the link's navigation.
    }
  };

  return (
    <div
      className={cn(
        'group relative mx-auto max-w-xl rounded-xl border border-white/10 bg-adam-bg-dark shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition will-change-[transform,opacity] hover:border-white/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)]',
        // Decelerate in over 500ms; accelerate out a touch faster on dismiss.
        dismissing
          ? 'pointer-events-none duration-300 ease-in'
          : 'duration-500 ease-out',
        visible
          ? 'translate-y-0 scale-100 opacity-100'
          : 'translate-y-4 scale-95 opacity-0',
      )}
      onTransitionEnd={(event) => {
        if (
          dismissing &&
          event.target === event.currentTarget &&
          event.propertyName === 'opacity'
        ) {
          if (dismissTimeoutRef.current !== null) {
            window.clearTimeout(dismissTimeoutRef.current);
            dismissTimeoutRef.current = null;
          }
          setDismissing(false);
        }
      }}
    >
      {/* Dismiss peels out of the corner so it doesn't crowd the CTA inside the card. */}
      <button
        aria-label="Dismiss"
        className="absolute -right-2 -top-2 z-10 grid size-6 place-items-center rounded-full border border-white/10 bg-adam-bg-dark text-adam-text-secondary transition-colors hover:bg-adam-neutral-800 hover:text-adam-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-adam-bg-dark"
        onClick={dismiss}
        type="button"
      >
        <X className="size-3" />
      </button>

      <div className="flex flex-col items-start gap-4 px-5 py-4 sm:flex-row sm:items-center">
        {/* Hub-and-spoke: Adam is the centered hub (largest, on top, lifted),
            with Onshape and Fusion a tad smaller and tucked behind it on either
            side. The overlap reads as "Adam plugs into both your CAD tools."
            On hover the two tools ease outward to reveal themselves. */}
        <div className="pointer-events-none flex shrink-0 items-center -space-x-3">
          <div className="grid size-10 translate-y-1 -rotate-6 place-items-center rounded-lg border border-white/10 bg-adam-neutral-950 transition-transform duration-300 ease-out group-hover:-translate-x-1.5 group-hover:-rotate-[9deg]">
            <img
              alt="Onshape"
              className="size-6 object-contain"
              src={`${import.meta.env.BASE_URL}/onshape.png`}
            />
          </div>
          <div className="relative z-20 grid size-12 place-items-center rounded-xl border border-white/10 bg-adam-neutral-950 shadow-[0_4px_14px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out group-hover:-translate-y-0.5">
            <img
              alt="Adam"
              className="size-7 object-contain"
              src={`${import.meta.env.BASE_URL}/adam-logo-pink.svg`}
            />
          </div>
          <div className="grid size-10 translate-y-1 rotate-6 place-items-center rounded-lg border border-white/10 bg-adam-neutral-950 transition-transform duration-300 ease-out group-hover:translate-x-1.5 group-hover:rotate-[9deg]">
            <img
              alt="Fusion 360"
              className="size-6 object-contain"
              src={`${import.meta.env.BASE_URL}/fusion.svg`}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold tracking-tight text-adam-text-primary">
            {COPY.headline}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-adam-text-secondary">
            {COPY.subtext}
          </p>
        </div>

        <Button
          asChild
          // White button, black label. The `light` variant has no hover:text
          // rule, so on hover only the background darkens (to neutral-200), the
          // text stays black. Explicit white focus ring because the app sets no
          // `.dark` class — the default `ring-ring` would be near-black/invisible.
          //
          // after:absolute after:inset-0 stretches this link's hit area over the
          // whole card (its nearest positioned ancestor), so a click anywhere on
          // the banner opens adam.new and fires the same event — maximizing the
          // clickable surface. The dismiss button (z-10) sits above this overlay,
          // and the logo cluster opts out via pointer-events-none, so both still
          // get their own clicks.
          className="shrink-0 gap-1.5 bg-white font-semibold text-black transition-colors after:absolute after:inset-0 after:content-[''] hover:bg-neutral-200 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-adam-bg-dark sm:mr-3"
          size="sm"
          variant="light"
        >
          <a
            href="https://adam.new"
            onClick={handleCtaClick}
            rel="noopener noreferrer"
            target="_blank"
          >
            {COPY.cta}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}
