import { createFileRoute } from '@tanstack/react-router';
import { billing, BillingClientError } from '@/server/billingClient';
import { isRecord, json } from '@/server/api';
import {
  getServiceRoleSupabaseClient,
  type SupabaseClient,
} from '@/server/supabaseClient';

type CancellationFeedback =
  | 'customer_service'
  | 'low_quality'
  | 'missing_features'
  | 'other'
  | 'switched_service'
  | 'too_complex'
  | 'too_expensive'
  | 'unused';

function isCancellationFeedback(value: unknown): value is CancellationFeedback {
  switch (value) {
    case 'customer_service':
    case 'low_quality':
    case 'missing_features':
    case 'other':
    case 'switched_service':
    case 'too_complex':
    case 'too_expensive':
    case 'unused':
      return true;
    default:
      return false;
  }
}

export const Route = createFileRoute('/api/delete-user')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabase = getServiceRoleSupabaseClient();
        const token = request.headers
          .get('Authorization')
          ?.replace('Bearer ', '');
        const body = await request.json().catch(() => ({}));
        const reason =
          isRecord(body) && isCancellationFeedback(body.reason)
            ? body.reason
            : undefined;
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user?.email)
          return json({ error: 'Unauthorized' }, 401);

        let subscriptionCancellationFailed = false;
        try {
          await billing.cancelSubscription(data.user.email, {
            feedback: reason,
          });
        } catch (subscriptionError) {
          subscriptionCancellationFailed = true;
          if (subscriptionError instanceof BillingClientError) {
            console.error('Failed to cancel user subscription:', {
              status: subscriptionError.status,
              body: subscriptionError.body,
            });
          } else {
            console.error(
              'Failed to cancel user subscription:',
              subscriptionError,
            );
          }
        }
        let storageCleanupFailed = false;
        try {
          await deleteUserStorageItems(supabase, data.user.id);
        } catch (storageError) {
          storageCleanupFailed = true;
          console.error('Failed to delete user storage items:', storageError);
        }

        const { error: deleteError } = await supabase.auth.admin.deleteUser(
          data.user.id,
        );
        if (deleteError) return json({ error: 'Failed to delete user' }, 500);
        return json({
          success: true,
          storageCleanupFailed,
          subscriptionCancellationFailed,
        });
      },
    },
  },
});

async function deleteUserStorageItems(
  supabase: SupabaseClient,
  userId: string,
) {
  for (const bucket of ['images', 'meshes', 'previews']) {
    const paths = await listAllPaths(supabase, bucket, userId);
    for (let i = 0; i < paths.length; i += 1000) {
      await supabase.storage.from(bucket).remove(paths.slice(i, i + 1000));
    }
  }
}

async function listAllPaths(
  supabase: SupabaseClient,
  bucket: string,
  folder: string,
): Promise<string[]> {
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  });
  if (error) throw error;
  const paths: string[] = [];
  for (const item of data ?? []) {
    const path = `${folder}/${item.name}`;
    if ('id' in item && item.id) paths.push(path);
    else paths.push(...(await listAllPaths(supabase, bucket, path)));
  }
  return paths;
}
