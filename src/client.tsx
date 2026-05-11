import * as Sentry from '@sentry/react';
import { StartClient } from '@tanstack/react-start/client';
import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN ?? '',
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? 'local',
  tracesSampleRate: 1.0,
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
});
