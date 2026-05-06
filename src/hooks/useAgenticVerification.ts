import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Message, ViewRequest } from '@shared/types';
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
  // Entry-file source code that produced `currentOutput`. The hook waits
  // for this to match the latest streamed artifact's entry before taking
  // screenshots — protects against the race where a verify_request lands
  // while a freshly-streamed artifact is still being recompiled, and
  // `currentOutput` still reflects the prior model.
  currentOutputCode: string | null;
}

// How long the hook is willing to wait for the OpenSCAD compile to
// produce an STL whose source matches the latest artifact before giving
// up. Has to be shorter than the server's VIEW_MODEL_TIMEOUT_MS (60s) so
// the browser surfaces an actionable error instead of hitting the
// server's silent timeout. ~25s comfortably covers slow compiles
// (multi-megabyte parts) on cold WASM workers.
const FRESH_STL_TIMEOUT_MS = 25_000;
const FRESH_STL_POLL_INTERVAL_MS = 100;

export function useAgenticVerification({
  currentOutput,
  currentOutputCode,
}: Args) {
  const queryClient = useQueryClient();
  const { conversation } = useConversation();
  const { session } = useAuth();

  // Always-fresh refs so the broadcast handler reads the *current* values
  // — not whichever ones closed over when the subscription opened.
  const outputRef = useRef<Blob | undefined>(currentOutput);
  useEffect(() => {
    outputRef.current = currentOutput;
  }, [currentOutput]);
  const outputCodeRef = useRef<string | null>(currentOutputCode);
  useEffect(() => {
    outputCodeRef.current = currentOutputCode;
  }, [currentOutputCode]);
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (conversation.type !== 'parametric') return;
    if (!conversation.id) return;

    // Aborted on unmount/conversation-switch so any in-flight
    // waitForFreshStl polling loops bail out instead of running for
    // their full 25s timeout against state that no longer matters
    // (the channel is being torn down anyway). Without this, navigating
    // away mid-verification leaks the loop and forces the server to hit
    // its 60s view_model timeout instead of getting a clean error.
    const lifecycleAbort = new AbortController();

    const channelName = `verify-conv-${conversation.id}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false, ack: true } },
    });

    // Pulled out so both `handleVerifyRequest` and the subscribe-status
    // callback below can broadcast a clean error chip instead of the
    // server timing out at 60s with no signal of what went wrong.
    const sendError = async (requestId: string, error: string) => {
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

    // Read the latest assistant message's entry-file source from the
    // messages cache. Used to verify outputRef reflects the artifact the
    // agent just produced (not a stale one).
    const expectedArtifactCode = (): string | undefined => {
      const messages = queryClient.getQueryData<Message[]>([
        'messages',
        conversation.id,
      ]);
      if (!messages || messages.length === 0) return undefined;
      // Walk in reverse — most recent first.
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.role === 'assistant' && msg.content.artifact?.code) {
          return msg.content.artifact.code;
        }
      }
      return undefined;
    };

    // Block until the locally-compiled STL's source matches the latest
    // artifact in the messages cache (or until we time out). Without
    // this, a verify_request arriving while OpenSCAD is still compiling
    // the freshly-streamed entry would fall through to whatever STL was
    // sitting in outputRef from the *previous* build — and the agent
    // would self-review the wrong model.
    //
    // Critically, we also wait for the messages cache to populate with
    // an artifact in the first place. The earlier "fall back to any
    // non-empty STL when cache is cold" path was unsafe: on the very
    // first build of a conversation the broadcast can race ahead of the
    // SSE chunk that lands the artifact in the cache, and accepting
    // any STL there would screenshot whatever stale geometry happened
    // to be in outputRef. Waiting for `expected` to be defined before
    // accepting the STL is what makes this race-free.
    const waitForFreshStl = async (): Promise<Blob | undefined> => {
      const start = Date.now();
      while (Date.now() - start < FRESH_STL_TIMEOUT_MS) {
        // Bail early if the hook has been torn down (e.g. user
        // navigated away). Without this the loop keeps running for
        // its full timeout and the server hits its own 60s view_model
        // timeout instead of getting our clean error.
        if (lifecycleAbort.signal.aborted) return undefined;
        const expected = expectedArtifactCode();
        const stl = outputRef.current;
        const code = outputCodeRef.current;
        if (expected && stl && code === expected) return stl;
        await new Promise((r) =>
          setTimeout(r, FRESH_STL_POLL_INTERVAL_MS),
        );
      }
      return undefined;
    };

    const handleVerifyRequest = async (payload: VerifyRequestPayload) => {
      const { requestId, views } = payload;
      const sess = sessionRef.current;

      if (!sess?.user?.id) {
        await sendError(requestId, 'no_session');
        return;
      }

      const stl = await waitForFreshStl();
      if (!stl) {
        await sendError(requestId, 'no_compiled_stl');
        return;
      }

      try {
        const blobs = await renderArtifactFromViews(stl, views);
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
        await sendError(
          requestId,
          err instanceof Error ? err.message : 'render_failed',
        );
      }
    };

    // Track the latest in-flight requestId so a subscribe-status failure
    // (CHANNEL_ERROR / TIMED_OUT) can be reflected back to the server
    // *for that specific request* rather than silently letting the
    // server hit its 60s view_model timeout. The handler captures the
    // requestId by reference; broadcasting from the status callback
    // would require already-subscribed state, so we only escalate to
    // Sentry there. The next handleVerifyRequest invocation will see
    // the still-broken channel and report `realtime_unavailable`.
    let realtimeBroken = false;

    channel.on(
      'broadcast',
      { event: 'verify_request' },
      ({ payload }: { payload: VerifyRequestPayload }) => {
        if (realtimeBroken) {
          // Channel is in a known-bad state — surface a clean error so
          // the server unblocks instead of waiting for its 60s timeout.
          void sendError(payload.requestId, 'realtime_unavailable');
          return;
        }
        // Fire-and-forget: we don't block the channel handler on render.
        void handleVerifyRequest(payload);
      },
    );

    channel.subscribe((status, err) => {
      // Without this callback, CHANNEL_ERROR / TIMED_OUT outcomes get
      // silently swallowed and the user stares at a 60-second
      // "Inspecting model" spinner before the server-side view_model
      // timeout fires. Surface it to Sentry and flip a flag so any
      // verify_request that arrives on the broken channel can return
      // an error to the server immediately.
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        realtimeBroken = true;
        Sentry.captureException(
          err ?? new Error(`verify channel ${status}`),
          {
            extra: {
              hook: 'useAgenticVerification:subscribe',
              conversationId: conversation.id,
              status,
            },
          },
        );
      } else if (status === 'SUBSCRIBED') {
        realtimeBroken = false;
      }
    });

    return () => {
      lifecycleAbort.abort();
      supabase.removeChannel(channel);
    };
  }, [conversation.id, conversation.type, queryClient]);
}
