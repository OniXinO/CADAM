import { useState } from 'react';
import { getLevel, useAuth } from '@/contexts/AuthContext';
import { TrialDialog } from '@/components/auth/TrialDialog';
import { cn } from '@/lib/utils';

/**
 * "Free plan | Start free trial" pill shown above the greeting for signed-in
 * free-plan users who haven't used their trial yet — the CADAM port of the
 * workspace pill. It stays hidden while billing is loading (`isLoading`) so it
 * never flashes on a paying user, and once the trial has been used the pill
 * disappears entirely. The CTA opens the existing 7-day trial flow.
 *
 * `reveal` is the shared fade gate: the page holds the pill back until the
 * greeting chrome is ready so the pill fades in with the rest of the view
 * instead of popping in the moment billing alone resolves.
 */
export function FreePlanTrialPill({ reveal }: { reveal: boolean }) {
  const { user, billing, isLoading } = useAuth();
  const [trialOpen, setTrialOpen] = useState(false);

  const level = getLevel(billing);
  const hasTrialed = billing?.user.hasTrialed ?? false;

  // Only signed-in free-plan users who can still start a trial, and only once
  // billing has resolved so the pill never flashes on a paid user.
  if (!user || isLoading || level !== 'free' || hasTrialed) return null;

  return (
    <>
      <div
        className={cn(
          'mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
          'motion-safe:transition-opacity motion-safe:duration-1000 motion-safe:ease-out',
          reveal ? 'opacity-100' : 'opacity-0',
        )}
      >
        <span className="text-adam-text-secondary">Free plan</span>
        <span className="h-4 w-px bg-white/10" />
        <button
          type="button"
          onClick={() => setTrialOpen(true)}
          className="font-medium text-adam-blue transition-colors hover:text-adam-blue/80"
        >
          Start free trial
        </button>
      </div>
      <TrialDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </>
  );
}
