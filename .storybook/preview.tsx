import '../src/index.css';

import type { Decorator, Preview } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthContext, type SubscriptionLevel } from '@/contexts/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ToastProvider } from '@/components/ui/toast';

// A single offline query client — no retries, so any query a story fires
// settles immediately instead of hanging. Stories never hit a real backend.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false, staleTime: Infinity },
  },
});

// A literal, env-free stand-in for the signed-in user. Lets every component
// that reads auth context render in the canvas without a real session.
const mockAuth = {
  session: { user: { id: 'user_storybook', email: 'demo@adam.new' } },
  user: { id: 'user_storybook', email: 'demo@adam.new' },
  billing: {
    user: { hasTrialed: true },
    subscription: {
      level: 'pro' as SubscriptionLevel,
      status: 'active',
      currentPeriodEnd: null,
    },
    tokens: { free: 50, subscription: 5000, purchased: 0, total: 5050 },
  },
  isLoading: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  signInWithMagicLink: async () => {},
  verifyOtp: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
} as unknown as React.ContextType<typeof AuthContext>;

// Global providers every story renders inside. App-wide context (data
// fetching, auth, tooltips, toasts) is provided here so components draw in
// the canvas without wiring each story by hand.
const withAppProviders: Decorator = (Story) => (
  <QueryClientProvider client={queryClient}>
    <AuthContext.Provider value={mockAuth}>
      <TooltipProvider>
        <ToastProvider>
          <Story />
        </ToastProvider>
      </TooltipProvider>
    </AuthContext.Provider>
  </QueryClientProvider>
);

const preview: Preview = {
  decorators: [withAppProviders],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
