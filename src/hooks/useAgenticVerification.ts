import { useContext, useEffect, useRef } from 'react';
import { ViewRequest } from '@shared/types';
import { supabase } from '@/lib/supabase';
import { useConversation } from '@/contexts/ConversationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOpenSCAD } from '@/hooks/useOpenSCAD';
import { MeshFilesContext } from '@/contexts/MeshFilesContext';
import { renderArtifactFromViews, viewLabel } from '@/utils/agenticRenderer';

interface VerifyRequestPayload {
  requestId: string;
  code: string;
  views: ViewRequest[];
  reasoning?: string;
  conversationId: string;
  newMessageId: string;
}

export type AgenticCompileResult =
  | { type: 'pending' }
  | { type: 'stl'; output: Blob; sourceCode: string };

type FreshCompileResult =
  | { type: 'stl'; stl: Blob; off?: Blob }
  | { type: 'compile_error'; errorText: string };

const logVerificationEvent = (
  _event: string,
  _details: Record<string, unknown>,
) => {};

function assertNever(value: never): never {
  throw new Error(`Unhandled compile result: ${JSON.stringify(value)}`);
}

function assertActive(signal: AbortSignal) {
  if (signal.aborted) throw new Error('verification_aborted');
}

function isAbortError(error: unknown, signal: AbortSignal) {
  return (
    signal.aborted ||
    (error instanceof Error &&
      (error.message === 'verification_aborted' || error.name === 'AbortError'))
  );
}

function compileErrorText(error: unknown) {
  if (!(error instanceof Error)) return 'OpenSCAD failed to compile';
  const stdErr = Reflect.get(error, 'stdErr');
  if (Array.isArray(stdErr)) return stdErr.join('\n').trim();
  return error.message || 'OpenSCAD failed to compile';
}

function extractImportFilenames(code: string): string[] {
  const filenames: string[] = [];
  const importRegex = /import\s*\(\s*"([^"]+)"\s*\)/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    filenames.push(match[1]);
  }
  return filenames;
}

async function uploadVerificationImage(
  path: string,
  file: File,
  accessToken: string,
  signal: AbortSignal,
) {
  assertActive(signal);
  const form = new FormData();
  form.append('cacheControl', '3600');
  form.append('', file);

  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/images/${encodedPath}`,
    {
      method: 'POST',
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        'x-upsert': 'false',
      },
      body: form,
      signal,
    },
  );
  if (!response.ok) {
    throw new Error(`image_upload_failed:${response.status}`);
  }
}

export function useAgenticVerification() {
  const { conversation } = useConversation();
  const { session } = useAuth();
  const { previewScad, writeFile } = useOpenSCAD();
  const meshFilesCtx = useContext(MeshFilesContext);

  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (conversation.type !== 'parametric') return;
    if (!conversation.id) return;

    const lifecycleAbort = new AbortController();
    const signal = lifecycleAbort.signal;

    const channelName = `verify-conv-${conversation.id}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false, ack: true } },
    });

    const sendError = async (requestId: string, error: string) => {
      if (signal.aborted) return;
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

    const compileCandidate = async (
      code: string,
      signal: AbortSignal,
    ): Promise<FreshCompileResult> => {
      const filenames = extractImportFilenames(code);
      for (const filename of filenames) {
        assertActive(signal);
        const content = meshFilesCtx?.getMeshFile(filename);
        if (content) {
          await writeFile(filename, content);
          assertActive(signal);
        }
      }

      try {
        assertActive(signal);
        const result = await previewScad(code);
        assertActive(signal);
        return { type: 'stl', stl: result.stl, off: result.off };
      } catch (err) {
        if (isAbortError(err, signal)) throw err;
        return { type: 'compile_error', errorText: compileErrorText(err) };
      }
    };

    const handleVerifyRequest = async (payload: VerifyRequestPayload) => {
      const { requestId, code, views } = payload;
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

      const compileResult = await compileCandidate(code, signal);
      switch (compileResult.type) {
        case 'compile_error':
          await sendError(
            requestId,
            `compile_error: ${compileResult.errorText.slice(0, 4000)}`,
          );
          return;
        case 'stl':
          break;
        default:
          assertNever(compileResult);
      }
      assertActive(signal);
      logVerificationEvent('fresh_stl.ready', {
        requestId,
        conversationId: conversation.id,
        size: compileResult.stl.size,
      });

      try {
        const blobs = await renderArtifactFromViews(
          compileResult.stl,
          views,
          compileResult.off,
        );
        assertActive(signal);
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
          await uploadVerificationImage(path, file, sess.access_token, signal);
          assertActive(signal);
          const { error: rowErr } = await supabase
            .from('images')
            .upsert(
              {
                id,
                prompt: {
                  text: `verification render: ${viewLabel(views[i])}`,
                },
                status: 'success',
                user_id: userId,
                conversation_id: conversationId,
              },
              { onConflict: 'id', ignoreDuplicates: true },
            )
            .abortSignal(signal);
          if (rowErr) throw rowErr;
          assertActive(signal);
          imageIds.push(id);
        }

        assertActive(signal);
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
      } catch (err) {
        if (isAbortError(err, signal)) return;
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
        void handleVerifyRequest(payload).catch((err) => {
          if (isAbortError(err, signal)) return;
          void sendError(
            payload.requestId,
            err instanceof Error ? err.message : 'render_failed',
          );
        });
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
  }, [
    conversation.id,
    conversation.type,
    meshFilesCtx,
    previewScad,
    writeFile,
  ]);
}
