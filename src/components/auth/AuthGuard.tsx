import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

// When `VITE_PREVIEW_DEMO_MODE=true` is set on a Vercel preview build, the
// guard skips the redirect-to-/signin path and instead asks Supabase for an
// anonymous session. This lets the agentic feature be exercised on PR
// previews where Google OAuth isn't configured on the preview Supabase
// branch. Production builds leave the flag unset and behave unchanged.
const PREVIEW_DEMO_MODE =
  import.meta.env.VITE_PREVIEW_DEMO_MODE === 'true';

export function AuthGuard({ children }: AuthGuardProps) {
  const { session, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // One-shot guard so re-renders don't fire repeated anonymous sign-in
  // attempts while the first one is still in flight.
  const anonAttemptedRef = useRef(false);
  const [anonError, setAnonError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (session && user) return;

    const currentPath = location.pathname + location.search;
    const redirectParam =
      currentPath !== '/'
        ? `?redirect=${encodeURIComponent(currentPath)}`
        : '';

    if (PREVIEW_DEMO_MODE) {
      if (anonAttemptedRef.current) return;
      anonAttemptedRef.current = true;
      supabase.auth.signInAnonymously().then(({ error }) => {
        if (error) {
          // Most likely cause: anonymous sign-in isn't enabled on the
          // preview Supabase project. Surface a useful message instead
          // of bouncing forever between this guard and /signin.
          console.error('[AuthGuard] anonymous sign-in failed:', error);
          setAnonError(error.message);
        }
      });
      return;
    }

    navigate(`/signin${redirectParam}`);
  }, [session, user, navigate, isLoading, location.pathname, location.search]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (PREVIEW_DEMO_MODE && !session && anonError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-adam-text-primary">
        <div className="max-w-md space-y-2">
          <p className="font-medium">Preview demo unavailable</p>
          <p className="text-adam-text-secondary">
            Anonymous sign-in is disabled on this preview's Supabase project.
            Enable it under Authentication → Settings (or unset
            VITE_PREVIEW_DEMO_MODE in Vercel) to continue.
          </p>
          <p className="break-all text-xs text-adam-text-secondary/70">
            {anonError}
          </p>
        </div>
      </div>
    );
  }

  if (!session || !user) {
    return null;
  }

  return <>{children}</>;
}
