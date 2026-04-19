import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Loader2,
  Info,
  User,
  Bell,
  CreditCard,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useManageSubscription,
  useTokenPackPurchase,
} from '@/services/subscriptionService';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { DeleteAccountDialog } from '@/components/auth/DeleteAccountDialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import * as Sentry from '@sentry/react';
import { useProfile, useUpdateProfile } from '@/services/profileService';
import { AvatarUpdateDialog } from '@/components/auth/AvatarUpdateDialog';
import { useTokenPacks } from '@/hooks/useTokenPacks';
import { useTokenCosts } from '@/hooks/useTokenCosts';

export default function SettingsView() {
  const {
    subscription,
    subscriptionTokens,
    purchasedTokens,
    totalTokens,
    subscriptionTokenLimit,
    user,
    resetPassword,
  } = useAuth();
  const { data: profile } = useProfile();
  const { mutate: updateProfile, isPending: isUpdateLoading } =
    useUpdateProfile();
  const { toast } = useToast();
  const [newName, setNewName] = useState(profile?.full_name || '');
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { data: tokenPacks = [] } = useTokenPacks();
  const { data: tokenCosts = [] } = useTokenCosts();
  const {
    mutate: purchaseTokenPack,
    isPending: isPurchaseLoading,
    variables: purchaseVariables,
  } = useTokenPackPurchase();

  const subscriptionUsed = subscriptionTokenLimit - subscriptionTokens;
  const usagePercent =
    subscriptionTokenLimit > 0
      ? (subscriptionUsed / subscriptionTokenLimit) * 100
      : 0;

  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus();
    }
  }, [editingName]);

  useEffect(() => {
    setNewName(profile?.full_name || '');
  }, [profile?.full_name]);

  const { mutate: handleManageSubscription, isPending: isManageLoading } =
    useManageSubscription();

  const handleUpdateName = () => {
    updateProfile(
      { full_name: newName },
      {
        onSuccess: () => {
          setEditingName(false);
          setNewName(profile?.full_name || '');
          toast({
            title: 'Success',
            description: 'Your name has been updated',
          });
        },
        onError: (e) => {
          Sentry.captureException(e);
          toast({
            title: 'Error',
            description: 'Failed to update name',
            variant: 'destructive',
          });
        },
      },
    );
  };

  const handleUpdateNotifications = async (notificationsEnabled: boolean) => {
    updateProfile(
      {
        notifications_enabled: notificationsEnabled,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Success',
            description: 'Your notifications have been updated',
          });
        },
        onError: (e) => {
          Sentry.captureException(e);
          toast({
            title: 'Error',
            description: 'Failed to update notifications',
            variant: 'destructive',
          });
        },
      },
    );
  };

  const { mutate: handleResetPassword, isPending: isResetLoading } =
    useMutation({
      mutationFn: async () => {
        if (!user?.email) throw new Error('User email not found');
        await resetPassword(user?.email);
      },
      onSuccess: () => {
        toast({
          title: 'Success',
          description:
            'Password reset instructions have been sent to your email',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to reset password',
          variant: 'destructive',
        });
      },
    });

  const tierLabel =
    subscription === 'free'
      ? 'Adam Free'
      : subscription === 'standard'
        ? 'Adam Standard'
        : 'Adam Pro';

  const tierAccent =
    subscription === 'free'
      ? 'bg-adam-neutral-700 text-adam-neutral-50'
      : subscription === 'standard'
        ? 'bg-adam-blue/15 text-adam-blue'
        : 'bg-gradient-to-r from-adam-blue/20 to-fuchsia-500/20 text-adam-neutral-50';

  return (
    <div className="flex min-h-full w-full items-center justify-center bg-adam-background-1 px-6 py-10 sm:px-10 sm:py-12">
      <div className="w-full max-w-5xl">
        <header className="mb-10 flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight text-adam-neutral-50">
            Settings
          </h1>
          <p className="text-sm text-adam-neutral-200">
            Manage your account, billing, and preferences.
          </p>
        </header>

        <div className="flex flex-col gap-5">
          {/* Account */}
          <section className="rounded-2xl border border-adam-neutral-800 bg-adam-background-2 p-6 sm:p-8">
            <div className="grid gap-6 md:grid-cols-[220px_1fr] md:gap-12">
              <div className="flex items-start gap-3 md:flex-col md:gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-adam-neutral-800">
                  <User className="h-4 w-4 text-adam-neutral-50" />
                </div>
                <div>
                  <h2 className="text-base font-medium text-adam-neutral-50">
                    Account
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-adam-neutral-200">
                    Your profile and login details
                  </p>
                </div>
              </div>

              <div className="divide-y divide-adam-neutral-800">
                <div className="flex items-center justify-between gap-4 pb-5 first:pt-0">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <AvatarUpdateDialog />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 text-xs uppercase tracking-wide text-adam-neutral-300">
                        Name
                      </div>
                      {editingName ? (
                        <Input
                          ref={nameInputRef}
                          value={newName}
                          className="h-9 w-full max-w-xs"
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleUpdateName();
                            }
                          }}
                        />
                      ) : (
                        <div className="truncate text-sm font-medium text-adam-neutral-50">
                          {profile?.full_name || user?.email}
                        </div>
                      )}
                    </div>
                  </div>
                  {editingName ? (
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <Button
                        onClick={() => handleUpdateName()}
                        variant="light"
                        disabled={isUpdateLoading}
                        className="rounded-full font-light"
                      >
                        {isUpdateLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </div>
                        ) : (
                          'Save'
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingName(false);
                          setNewName(profile?.full_name || '');
                        }}
                        variant="dark"
                        className="rounded-full font-light"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setEditingName(true)}
                      variant="dark"
                      className="flex-shrink-0 rounded-full font-light"
                    >
                      Edit
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4 py-5">
                  <div className="min-w-0">
                    <div className="mb-1 text-xs uppercase tracking-wide text-adam-neutral-300">
                      Email
                    </div>
                    <div className="truncate text-sm font-medium text-adam-neutral-50">
                      {user?.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-5 last:pb-0">
                  <div>
                    <div className="text-sm font-medium text-adam-neutral-50">
                      Password
                    </div>
                    <div className="mt-1 text-xs text-adam-neutral-200">
                      Send a reset link to your email
                    </div>
                  </div>
                  <Button
                    onClick={() => handleResetPassword()}
                    disabled={isResetLoading}
                    variant="dark"
                    className="flex-shrink-0 rounded-full font-light"
                  >
                    {isResetLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </div>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section className="rounded-2xl border border-adam-neutral-800 bg-adam-background-2 p-6 sm:p-8">
            <div className="grid gap-6 md:grid-cols-[220px_1fr] md:gap-12">
              <div className="flex items-start gap-3 md:flex-col md:gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-adam-neutral-800">
                  <Bell className="h-4 w-4 text-adam-neutral-50" />
                </div>
                <div>
                  <h2 className="text-base font-medium text-adam-neutral-50">
                    Notifications
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-adam-neutral-200">
                    Choose what Adam can ping you about
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="text-sm font-medium text-adam-neutral-50">
                    Responses
                  </div>
                  <div className="mt-1 text-xs text-adam-neutral-200">
                    Get notified when Adam finishes a long-running request, like
                    a highest quality mesh generation.
                  </div>
                </div>
                <Switch
                  checked={profile?.notifications_enabled ?? false}
                  onCheckedChange={handleUpdateNotifications}
                />
              </div>
            </div>
          </section>

          {/* Billing */}
          <section className="rounded-2xl border border-adam-neutral-800 bg-adam-background-2 p-6 sm:p-8">
            <div className="grid gap-6 md:grid-cols-[220px_1fr] md:gap-12">
              <div className="flex items-start gap-3 md:flex-col md:gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-adam-neutral-800">
                  <CreditCard className="h-4 w-4 text-adam-neutral-50" />
                </div>
                <div>
                  <h2 className="text-base font-medium text-adam-neutral-50">
                    Billing
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-adam-neutral-200">
                    Your plan and token usage
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                {/* Plan card */}
                <div className="rounded-xl border border-adam-neutral-800 bg-adam-background-1 p-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                          tierAccent,
                        )}
                      >
                        {subscription === 'pro' && (
                          <Sparkles className="h-3 w-3" />
                        )}
                        {tierLabel}
                      </span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-adam-neutral-300 transition-colors hover:text-adam-neutral-50" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{subscriptionTokenLimit} tokens per period</p>
                          {tokenCosts.map((tc) => (
                            <p key={tc.operation}>
                              {tc.operation}: {tc.cost} tokens
                            </p>
                          ))}
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {subscription !== 'free' ? (
                      <Button
                        onClick={() => handleManageSubscription()}
                        className="flex-shrink-0 rounded-full font-light"
                        variant="dark"
                        disabled={isManageLoading}
                      >
                        {isManageLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </div>
                        ) : (
                          'Manage'
                        )}
                      </Button>
                    ) : (
                      <Link to="/subscription" className="flex-shrink-0">
                        <Button
                          className="rounded-full font-light"
                          variant="light"
                        >
                          Upgrade
                        </Button>
                      </Link>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-adam-neutral-200">
                        Subscription tokens
                      </span>
                      <span className="text-xs font-medium tabular-nums text-adam-neutral-50">
                        {subscriptionTokens.toLocaleString()} /{' '}
                        {subscriptionTokenLimit.toLocaleString()}
                      </span>
                    </div>
                    <Progress
                      indicatorClassName={cn(
                        usagePercent < 70
                          ? 'bg-lime-500'
                          : usagePercent < 90
                            ? 'bg-amber-500'
                            : 'bg-[#FB2C2C]',
                      )}
                      className={cn(
                        'h-2',
                        usagePercent < 70
                          ? 'bg-lime-950'
                          : usagePercent < 90
                            ? 'bg-amber-950'
                            : 'bg-[#3a1818]',
                      )}
                      max={subscriptionTokenLimit}
                      value={subscriptionUsed}
                    />

                    {purchasedTokens > 0 && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-adam-neutral-200">
                          Purchased tokens
                        </span>
                        <span className="text-xs font-medium tabular-nums text-adam-neutral-50">
                          {purchasedTokens.toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-adam-neutral-800 pt-3">
                      <span className="text-sm font-medium text-adam-neutral-50">
                        Total available
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-adam-neutral-50">
                        {totalTokens.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Buy Tokens */}
                {tokenPacks.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-baseline justify-between">
                      <div className="text-sm font-medium text-adam-neutral-50">
                        Buy Tokens
                      </div>
                      <div className="text-xs text-adam-neutral-200">
                        Never expire
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {tokenPacks.map((pack) => {
                        const isThisPending =
                          isPurchaseLoading &&
                          purchaseVariables?.lookupKey ===
                            pack.stripe_lookup_key;
                        return (
                          <button
                            key={pack.id}
                            type="button"
                            disabled={isPurchaseLoading}
                            onClick={() =>
                              purchaseTokenPack({
                                lookupKey: pack.stripe_lookup_key,
                              })
                            }
                            className={cn(
                              'group relative flex flex-col items-start gap-1 rounded-xl border border-adam-neutral-800 bg-adam-background-1 p-4 text-left transition-all',
                              'hover:border-adam-blue/50 hover:bg-adam-neutral-800/50',
                              'disabled:cursor-not-allowed disabled:opacity-50',
                            )}
                          >
                            {isThisPending && (
                              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-adam-neutral-200" />
                            )}
                            <div className="text-base font-semibold tabular-nums text-adam-neutral-50">
                              {pack.token_amount.toLocaleString()}
                            </div>
                            <div className="text-xs text-adam-neutral-200">
                              tokens
                            </div>
                            <div className="mt-2 text-sm font-medium tabular-nums text-adam-blue">
                              ${(pack.price_cents / 100).toFixed(2)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Data & Privacy */}
          <section className="rounded-2xl border border-adam-neutral-800 bg-adam-background-2 p-6 sm:p-8">
            <div className="grid gap-6 md:grid-cols-[220px_1fr] md:gap-12">
              <div className="flex items-start gap-3 md:flex-col md:gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-adam-neutral-800">
                  <ShieldAlert className="h-4 w-4 text-adam-neutral-50" />
                </div>
                <div>
                  <h2 className="text-base font-medium text-adam-neutral-50">
                    Data and Privacy
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-adam-neutral-200">
                    Control your data on Adam
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-red-900/30 bg-red-950/10 p-4">
                <div className="flex-1">
                  <div className="text-sm font-medium text-adam-neutral-50">
                    Delete Account
                  </div>
                  <div className="mt-1 text-xs text-adam-neutral-200">
                    Permanently delete your account and all associated data from
                    Adam.
                  </div>
                </div>
                <DeleteAccountDialog>
                  <Button
                    className="flex-shrink-0 rounded-full font-light"
                    variant="destructive"
                  >
                    Delete
                  </Button>
                </DeleteAccountDialog>
              </div>
            </div>
          </section>

          {/* Legal footer */}
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-adam-neutral-300">
            <Link
              to="/terms-of-service"
              className="transition-colors hover:text-adam-neutral-50"
            >
              Terms of Service
            </Link>
            <span aria-hidden className="text-adam-neutral-700">
              •
            </span>
            <Link
              to="/privacy-policy"
              className="transition-colors hover:text-adam-neutral-50"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
