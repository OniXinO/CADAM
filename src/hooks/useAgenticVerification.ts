import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ViewRequest } from '@shared/types';
import { supabase } from '@/lib/supabase';
import { useConversation } from '@/contexts/ConversationContext';
import { useAuth } from '@/contexts/AuthContext';
import { renderArtifactFromViews, viewLabel } from '@/utils/agenticRenderer';
import * as Sentry from '@sentry/react';

// Inside the parametric-chat agent loop, the agent emits `view_model` and
// the server pauses on a Supabase Realtime broadcast waiting for the
// browser to render the requested angles and reply. This hook is the
// browser side of that bridge: while a parametric conversation is open
// it stays subscribed to the per-conversation verify channel, listens
// for `verify_request` events, captures screenshots from the live STL,
// uploads them, and broadcasts `verify_response` back so the server can
// resume the agent loop.
//
// Subscription is conversation-scoped (not per-request) so the listener
// is always alive when the editor is mounted — no race against the
// agent emitting view_model immediately after a request starts.

interface VerifyRequestPayload {
  requestId: string;
  views: ViewRequest[];
  reasoning?: string;
  conversationId: string;
  newMessageId: string;
}

interface Args {
  // The compiled STL the agent is asking us to verify. Captured into a ref
  // so changing outputs don't re-subscribe the channel.
  currentOutput: Blob | undefined;
}

export function useAgenticVerification({ currentOutput }: Args) {
  const queryClient = useQueryClient();
  const { conversation } = useConversation();
  const { session } = useAuth();

  // Always-fresh refs so the broadcast handler reads the *current* STL and
  // session, not whichever values closed over when the subscription opened.
  const outputRef = useRef<Blob | undefined>(currentOutput);
  useEffect(() => {
    outputRef.current = currentOutput;
  }, [currentOutput]);
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (conversation.type !== 'parametric') return;
    if (!conversation.id) return;

    const channelName = `verify-conv-${conversation.id}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false, ack: true } },
    });

    const handleVerifyRequest = async (payload: VerifyRequestPayload) => {
      const { requestId, views } = payload;
      const sess = sessionRef.current;
      const stl = outputRef.current;

      const sendError = async (error: string) => {
        try {
          await channel.send({
            type: 'broadcast',
            event: 'verify_response',
            payload: { requestId, error },
          });
        } catch (e) {
          console.error('Failed to broadcast verify_response error', e);
        }
      };

      if (!sess?.user?.id) {
        await sendError('no_session');
        return;
      }
      if (!stl) {
        // Compilation hasn't finished yet — wait briefly and retry once.
        // Most builds compile in <1s, but very large models can lag.
        await new Promise((r) => setTimeout(r, 1500));
        if (!outputRef.current) {
          await sendError('no_compiled_stl');
          return;
        }
      }

      try {
        const blobs = await renderArtifactFromViews(
          outputRef.current!,
          views,
        );
        const userId = sess.user.id;
        const conversationId = conversation.id;

        const imageIds: string[] = [];
        for (let i = 0; i < blobs.length; i++) {
          const id = crypto.randomUUID();
          const path = `${userId}/${conversationId}/${id}`;
          const file = new File([blobs[i]], `verify-${id}.png`, {
            type: 'image/png',
          });
          const { error: uploadErr } = await supabase.storage
            .from('images')
            .upload(path, file, { contentType: 'image/png' });
          if (uploadErr) throw uploadErr;
          const { error: rowErr } = await supabase.from('images').upsert(
            {
              id,
              prompt: { text: `verification render: ${viewLabel(views[i])}` },
              status: 'success',
              user_id: userId,
              conversation_id: conversationId,
            },
            { onConflict: 'id', ignoreDuplicates: true },
          );
          if (rowErr) throw rowErr;
          imageIds.push(id);
        }

        await channel.send({
          type: 'broadcast',
          event: 'verify_response',
          payload: { requestId, imageIds },
        });

        // Touch the messages query so any optimistic UI tied to the
        // streaming message picks up the screenshots once the server
        // streams back the next content snapshot.
        queryClient.invalidateQueries({
          queryKey: ['messages', conversation.id],
        });
      } catch (err) {
        Sentry.captureException(err, {
          extra: {
            hook: 'useAgenticVerification:fulfill',
            conversationId: conversation.id,
            views,
          },
        });
        await sendError(err instanceof Error ? err.message : 'render_failed');
      }
    };

    channel.on(
      'broadcast',
      { event: 'verify_request' },
      ({ payload }: { payload: VerifyRequestPayload }) => {
        // Fire-and-forget: we don't block the channel handler on render.
        void handleVerifyRequest(payload);
      },
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, conversation.type, queryClient]);
}
