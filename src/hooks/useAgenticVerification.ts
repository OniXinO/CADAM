import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Content, Message, ToolCall, ViewRequest } from '@shared/types';
import { supabase } from '@/lib/supabase';
import { useConversation } from '@/contexts/ConversationContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  useInsertMessageMutation,
  useParametricChatMutation,
} from '@/services/messageService';
import { renderArtifactFromViews, viewLabel } from '@/utils/agenticRenderer';
import * as Sentry from '@sentry/react';

// Mirror of MAX_AGENTIC_ITERATIONS in supabase/functions/parametric-chat.
// The server is the source of truth for cap enforcement; the client mirrors
// it only to short-circuit the auto-trigger so we don't fire a doomed fetch.
const MAX_AGENTIC_ITERATIONS = 3;

// Best-effort de-dup so the orchestrator never fires twice for the same
// assistant turn even across re-renders or message-list refetches.
const ACTED_ON: Set<string> = new Set();

interface Args {
  // The user-facing artifact that's currently being viewed. We only verify
  // the artifact that was just produced — not historical ones — by gating on
  // whether the latest assistant message in the branch has it.
  latestAssistantMessage: Message | undefined;
  // The compiled STL blob from OpenSCADPreview. We need this to render
  // screenshots; if it's missing we wait (the user is still compiling).
  currentOutput: Blob | undefined;
  // Whether a chat fetch is already in flight — we never overlap.
  isLoading: boolean;
  // The branch the user is currently viewing, in chronological order.
  branch: Message[];
}

function findLatestAgenticIteration(branch: Message[]): number {
  let max = 0;
  for (const msg of branch) {
    if (
      msg.role === 'user' &&
      msg.content.isVerification &&
      typeof msg.content.agenticIteration === 'number'
    ) {
      max = Math.max(max, msg.content.agenticIteration);
    }
  }
  return max;
}

// Find the original (non-verification) request that kicked off this chain so
// we can quote it back to the agent in the verification nudge — keeps the
// "does this match?" prompt grounded.
function findRootUserRequest(branch: Message[]): string | undefined {
  for (let i = branch.length - 1; i >= 0; i--) {
    const msg = branch[i];
    if (msg.role === 'user' && !msg.content.isVerification) {
      return msg.content.text?.trim() || undefined;
    }
  }
  return undefined;
}

function findPendingVerificationToolCall(
  message: Message | undefined,
): ToolCall | undefined {
  return message?.content.toolCalls?.find(
    (c) => c.name === 'view_model' && c.status === 'pending_verification',
  );
}

export function useAgenticVerification({
  latestAssistantMessage,
  currentOutput,
  isLoading,
  branch,
}: Args) {
  const queryClient = useQueryClient();
  const { conversation } = useConversation();
  const { session } = useAuth();
  const { mutateAsync: insertMessageAsync } = useInsertMessageMutation();
  const { mutateAsync: sendToParametricChat } = useParametricChatMutation({
    conversationId: conversation.id,
  });
  const inFlightRef = useRef(false);

  useEffect(() => {
    // Only orchestrate parametric conversations.
    if (conversation.type !== 'parametric') return;
    // Never overlap with an in-flight chat fetch — the message list is mid-
    // mutation and any new mutation would race with the streaming update.
    if (isLoading || inFlightRef.current) return;
    if (!latestAssistantMessage) return;
    if (!session?.user?.id) return;
    // Only orchestrate the branch the user is viewing — i.e. the current
    // leaf. Otherwise switching branches mid-stream could trigger spurious
    // verifications for stale artifacts.
    if (latestAssistantMessage.id !== conversation.current_message_leaf_id)
      return;

    const turnKey = `${conversation.id}:${latestAssistantMessage.id}`;
    if (ACTED_ON.has(turnKey)) return;

    const iterationsSoFar = findLatestAgenticIteration(branch);

    // Path A: agent emitted view_model and is waiting for screenshots.
    const pendingViewCall = findPendingVerificationToolCall(
      latestAssistantMessage,
    );
    if (pendingViewCall) {
      // Need a compiled STL to render. If compilation hasn't finished yet,
      // bail and let the next render cycle retry.
      if (!currentOutput) return;
      // Iteration cap also covers screenshot fulfillment so we don't keep
      // firing if the cap was exceeded server-side.
      if (iterationsSoFar >= MAX_AGENTIC_ITERATIONS) return;

      ACTED_ON.add(turnKey);
      inFlightRef.current = true;

      const views: ViewRequest[] = (pendingViewCall.views || []).map(
        (v) => ({
          view: v.view,
          azimuth: v.azimuth,
          elevation: v.elevation,
          label: v.label,
        }),
      );
      const reasoning = pendingViewCall.reasoning;

      void (async () => {
        try {
          const blobs = await renderArtifactFromViews(currentOutput, views);
          const userId = session.user.id;
          const conversationId = conversation.id;

          // Upload renders to storage and create matching `images` rows so
          // they show up in the chat just like any other reference image.
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
            if (uploadErr) {
              throw uploadErr;
            }
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

          // Mark the pending tool call as `verified` and persist the image
          // IDs so the chat UI can render thumbnails next to the chip.
          const updatedContent: Content = {
            ...latestAssistantMessage.content,
            toolCalls: (latestAssistantMessage.content.toolCalls || []).map(
              (c) =>
                c.id === pendingViewCall.id
                  ? { ...c, status: 'verified', screenshots: imageIds }
                  : c,
            ),
          };
          await supabase
            .from('messages')
            .update({ content: updatedContent })
            .eq('id', latestAssistantMessage.id);
          queryClient.setQueryData<Message[] | undefined>(
            ['messages', conversation.id],
            (old) =>
              old?.map((m) =>
                m.id === latestAssistantMessage.id
                  ? { ...m, content: updatedContent }
                  : m,
              ),
          );

          // Fire a hidden user message carrying the screenshots back. The
          // text is short and structured so the agent can act on it without
          // wading through prose.
          const summary = views.map(viewLabel).join(', ');
          const verificationContent: Content = {
            isVerification: true,
            agenticIteration: iterationsSoFar + 1,
            text: `Here are the rendered screenshots from these views: ${summary}.${
              reasoning ? ` (You wanted to verify: ${reasoning}.)` : ''
            } Critically evaluate them against the user's original request. If something is wrong, call build_parametric_model with a fix description. If everything matches, briefly confirm completion to the user without calling view_model again.`,
            images: imageIds,
            model: latestAssistantMessage.content.model,
          };
          const verificationUserMessage = await insertMessageAsync({
            role: 'user',
            content: verificationContent,
            parent_message_id: latestAssistantMessage.id,
            conversation_id: conversation.id,
          });

          await sendToParametricChat({
            model:
              verificationContent.model ??
              conversation.settings?.model ??
              'fast',
            messageId: verificationUserMessage.id,
            conversationId: conversation.id,
          });
        } catch (err) {
          Sentry.captureException(err, {
            extra: {
              hook: 'useAgenticVerification:fulfill',
              messageId: latestAssistantMessage.id,
              conversationId: conversation.id,
            },
          });
          // Mark the pending tool call as errored so the bubble doesn't
          // spin forever. Best-effort — if the DB write fails too, we at
          // least won't retry this turn (ACTED_ON.add already happened).
          try {
            const erroredContent: Content = {
              ...latestAssistantMessage.content,
              toolCalls: (latestAssistantMessage.content.toolCalls || []).map(
                (c) =>
                  c.id === pendingViewCall.id ? { ...c, status: 'error' } : c,
              ),
            };
            await supabase
              .from('messages')
              .update({ content: erroredContent })
              .eq('id', latestAssistantMessage.id);
            queryClient.setQueryData<Message[] | undefined>(
              ['messages', conversation.id],
              (old) =>
                old?.map((m) =>
                  m.id === latestAssistantMessage.id
                    ? { ...m, content: erroredContent }
                    : m,
                ),
            );
          } catch (innerErr) {
            console.error('Failed to mark verification tool as error', innerErr);
          }
        } finally {
          inFlightRef.current = false;
        }
      })();
      return;
    }

    // Path B: agent just produced an artifact with no pending verification
    // and we haven't yet reviewed it. Nudge the agent to call view_model.
    const hasArtifact = !!latestAssistantMessage.content.artifact;
    const stillStreaming = !!latestAssistantMessage.content.toolCalls?.some(
      (c) => c.status === 'pending',
    );
    const hasErrors = !!latestAssistantMessage.content.toolCalls?.some(
      (c) => c.status === 'error',
    );
    const alreadyVerifiedThisTurn =
      !!latestAssistantMessage.content.toolCalls?.some(
        (c) => c.name === 'view_model' && c.status === 'verified',
      );
    const hasOpenscadCompileError = !!latestAssistantMessage.content.error;

    if (
      !hasArtifact ||
      stillStreaming ||
      hasErrors ||
      alreadyVerifiedThisTurn ||
      hasOpenscadCompileError
    )
      return;

    if (iterationsSoFar >= MAX_AGENTIC_ITERATIONS) return;

    ACTED_ON.add(turnKey);
    inFlightRef.current = true;

    void (async () => {
      try {
        const rootRequest = findRootUserRequest(branch);
        const verificationContent: Content = {
          isVerification: true,
          agenticIteration: iterationsSoFar + 1,
          text: rootRequest
            ? `Verify the model you just produced visually matches my original request: "${rootRequest}". Call view_model with 2-4 angles that best reveal whether it matches, then react to the screenshots.`
            : `Verify the model you just produced visually. Call view_model with 2-4 angles that best reveal whether it matches my last request, then react to the screenshots.`,
          model: latestAssistantMessage.content.model,
        };
        const verificationUserMessage = await insertMessageAsync({
          role: 'user',
          content: verificationContent,
          parent_message_id: latestAssistantMessage.id,
          conversation_id: conversation.id,
        });
        await sendToParametricChat({
          model:
            verificationContent.model ??
            conversation.settings?.model ??
            'fast',
          messageId: verificationUserMessage.id,
          conversationId: conversation.id,
        });
      } catch (err) {
        Sentry.captureException(err, {
          extra: {
            hook: 'useAgenticVerification:nudge',
            messageId: latestAssistantMessage.id,
            conversationId: conversation.id,
          },
        });
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [
    latestAssistantMessage,
    currentOutput,
    isLoading,
    branch,
    conversation,
    session,
    insertMessageAsync,
    sendToParametricChat,
    queryClient,
  ]);
}
