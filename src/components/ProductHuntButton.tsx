import { ArrowUpRight } from 'lucide-react';
import posthog from 'posthog-js';
import { cn } from '@/lib/utils';

// We're live on Product Hunt for a few days only. Rather than rely on someone
// remembering to delete this, the badge hides itself once the launch window
// closes. Push the date out to keep it up longer, or set it in the past to
// retire the badge early. Stored as UTC; ~end of 2026-06-24 Pacific.
const LAUNCH_ENDS_AT = new Date('2026-06-25T07:00:00Z');

const PRODUCT_HUNT_URL = 'https://www.producthunt.com/products/cadam?bc=1';

// Product Hunt's brand orange.
const PH_ORANGE = '#FF6154';

// The Product Hunt "P" logomark, inlined so the badge is instantly recognizable
// without shipping another asset to /public.
function ProductHuntLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="20" cy="20" r="20" fill={PH_ORANGE} />
      <path
        d="M22.667 20.667H17V14h5.667a3.333 3.333 0 0 1 0 6.667m0-10.667H13.667v20H17v-6h5.667a6.667 6.667 0 1 0 0-13.333"
        fill="#fff"
      />
    </svg>
  );
}

/**
 * Time-boxed "upvote us on Product Hunt" badge. Branded with Product Hunt's
 * mark + orange so it reads as special against the neutral UI, but kept to a
 * single pill so it stays out of the way — it sits in the top-right header next
 * to the credits counter. Returns null once {@link LAUNCH_ENDS_AT} passes, so
 * the launch promo cleans up after itself (and leaves no empty node behind).
 *
 * The label collapses to just "Product Hunt" below `md` so the pill stays
 * compact in the cramped mobile top bar; the verb returns on wider screens.
 */
export function ProductHuntButton({ className }: { className?: string }) {
  // Only needs to be correct at mount; the launch window is measured in days,
  // so there's no need to tick a timer to hide it mid-session.
  if (new Date() > LAUNCH_ENDS_AT) {
    return null;
  }

  return (
    <a
      href={PRODUCT_HUNT_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        try {
          posthog.capture('product_hunt_upvote_click', {
            location: 'home_header',
          });
        } catch {
          // Analytics failures (e.g. blocked by an ad-blocker) must never
          // block the link's navigation.
        }
      }}
      className={cn(
        'group inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#FF6154]/40 bg-[#FF6154]/10 px-3 py-1.5 text-sm font-medium text-adam-text-primary shadow-sm transition-colors hover:border-[#FF6154]/70 hover:bg-[#FF6154]/15',
        className,
      )}
    >
      <ProductHuntLogo className="size-4 shrink-0" />
      <span>
        <span className="hidden md:inline">Upvote us on </span>
        <span className="font-semibold text-[#FF6154]">Product Hunt</span>
      </span>
      <ArrowUpRight className="h-3.5 w-3.5 text-[#FF6154] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </a>
  );
}
