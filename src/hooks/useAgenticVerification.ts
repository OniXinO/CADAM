import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Message, ViewRequest } from '@shared/types';
import { supabase } from '@/lib/supabase';
import { useConversation } from '@/contexts/ConversationContext';
import { useAuth } from '@/contexts/AuthContext';
import { renderArtifactFromViews, viewLabel } from '@/utils/agenticRenderer';

interface VerifyRequestPayload {
  requestId: string;
  views: ViewRequest[];
  reasoning?: string;
  conversationId: string;
  newMessageId: string;
}

export type AgenticCompileResult =
  | { type: 'pending' }
  | { type: 'stl'; output: Blob; sourceCode: string }
  | { type: 'compile_error'; sourceCode: string; errorText: string };

interface Args {
  compileResult: AgenticCompileResult;
}

// How long the hook is willing to wait for the OpenSCAD compile to
// produce an STL whose source matches the latest artifact before giving
// up. Has to be shorter than the server's screenshot timeout so
// the browser surfaces an actionable error instead of hitting the
// server's silent timeout. ~25s comfortably covers slow compiles
// (multi-megabyte parts) on cold WASM workers.
const FRESH_STL_TIMEOUT_MS = 25_000;
const FRESH_STL_POLL_INTERVAL_MS = 100;

type FreshCompileResult =
  | { type: 'stl'; stl: Blob }
  | { type: 'compile_error'; errorText: string }
  | { type: 'timeout' };

const logVerificationEvent = (
  _event: string,
  _details: Record<string, unknown>,
) => {};

function assertNever(value: never): never {
  throw new Error(`Unhandled compile result: ${JSON.stringify(value)}`);
}

export function useAgenticVerification({ compileResult }: Args) {
  const queryClient = useQueryClient();
  const { conversation } = useConversation();
  const { session } = useAuth();

  const compileResultRef = useRef<AgenticCompileResult>(compileResult);
  useEffect(() => {
    compileResultRef.current = compileResult;
  }, [compileResult]);
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (conversation.type !== 'parametric') return;
    if (!conversation.id) return;

    const lifecycleAbort = new AbortController();

    const channelName = `verify-conv-${conversation.id}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false, ack: true } },
    });

    const sendError = async (requestId: string, error: string) => {
      logVerificationEvent('verify_response.error', {
        requestId,
        conversationId: conversation.id,
        error,
      });
      await channel.send({
        type: 'broadcast',
        event: 'verify_response',
        payload: { requestId, error },
      });
    };

    const expectedArtifactCode = (): string | undefined => {
      const messages = queryClient.getQueryData<Message[]>([
        'messages',
        conversation.id,
      ]);
      if (!messages || messages.length === 0) return undefined;
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.role === 'assistant' && msg.content.artifact?.code) {
          return msg.content.artifact.code;
        }
      }
      return undefined;
    };

    const waitForFreshCompileResult = async (): Promise<FreshCompileResult> => {
      const start = Date.now();
      while (Date.now() - start < FRESH_STL_TIMEOUT_MS) {
        if (lifecycleAbort.signal.aborted) return { type: 'timeout' };
        const expected = expectedArtifactCode();
        const result = compileResultRef.current;
        switch (result.type) {
          case 'pending':
            break;
          case 'compile_error':
            if (expected && result.sourceCode === expected) {
              return { type: 'compile_error', errorText: result.errorText };
            }
            break;
          case 'stl':
            if (expected && result.sourceCode === expected) {
              return { type: 'stl', stl: result.output };
            }
            break;
          default:
            assertNever(result);
        }
        await new Promise((r) => setTimeout(r, FRESH_STL_POLL_INTERVAL_MS));
      }
      return { type: 'timeout' };
    };

    const handleVerifyRequest = async (payload: VerifyRequestPayload) => {
      const { requestId, views } = payload;
      const sess = sessionRef.current;
      logVerificationEvent('verify_request.received', {
        requestId,
        conversationId: conversation.id,
        viewCount: views.length,
        views: views.map((v) => v.label ?? v.view),
      });

      if (!sess?.user?.id) {
        await sendError(requestId, 'no_session');
        return;
      }

      const compileResult = await waitForFreshCompileResult();
      switch (compileResult.type) {
        case 'compile_error':
          await sendError(
            requestId,
            `compile_error: ${compileResult.errorText.slice(0, 4000)}`,
          );
          return;
        case 'timeout':
          await sendError(requestId, 'no_compiled_stl');
          return;
        case 'stl':
          break;
        default:
          assertNever(compileResult);
      }
      logVerificationEvent('fresh_stl.ready', {
        requestId,
        conversationId: conversation.id,
        size: compileResult.stl.size,
      });

      try {
        const blobs = await renderArtifactFromViews(compileResult.stl, views);
        logVerificationEvent('screenshots.rendered', {
          requestId,
          conversationId: conversation.id,
          count: blobs.length,
        });
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
        logVerificationEvent('verify_response.sent', {
          requestId,
          conversationId,
          imageIds,
        });

        queryClient.invalidateQueries({
          queryKey: ['messages', conversation.id],
        });
      } catch (err) {
        await sendError(
          requestId,
          err instanceof Error ? err.message : 'render_failed',
        );
      }
    };

    channel.on(
      'broadcast',
      { event: 'verify_request' },
      ({ payload }: { payload: VerifyRequestPayload }) => {
        void handleVerifyRequest(payload).catch((err) =>
          sendError(
            payload.requestId,
            err instanceof Error ? err.message : 'render_failed',
          ),
        );
      },
    );

    channel.subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        logVerificationEvent('channel.failed', {
          conversationId: conversation.id,
          status,
          error: err instanceof Error ? err.message : String(err),
        });
      } else if (status === 'SUBSCRIBED') {
        logVerificationEvent('channel.subscribed', {
          conversationId: conversation.id,
        });
      }
    });

    return () => {
      lifecycleAbort.abort();
      supabase.removeChannel(channel);
    };
  }, [conversation.id, conversation.type, queryClient]);
}
