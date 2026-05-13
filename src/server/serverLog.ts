export function logError(
  error: unknown,
  context: {
    functionName: string;
    statusCode: number;
    userId?: string;
    conversationId?: string;
    additionalContext?: Record<string, unknown>;
  },
) {
  console.error(`[${context.functionName}] Error (${context.statusCode}):`, {
    error: error instanceof Error ? error.message : 'Unknown error',
    userId: context.userId,
    conversationId: context.conversationId,
    additionalContext: context.additionalContext,
  });
}

export function logApiError(
  error: unknown,
  context: {
    functionName: string;
    apiName: string;
    statusCode: number;
    userId?: string;
    conversationId?: string;
    requestData?: Record<string, unknown>;
  },
) {
  logError(error, {
    functionName: context.functionName,
    statusCode: context.statusCode,
    userId: context.userId,
    conversationId: context.conversationId,
    additionalContext: {
      apiName: context.apiName,
      requestData: context.requestData,
    },
  });
}
