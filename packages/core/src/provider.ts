export interface CompletionRequest {
  system: string;
  input: string;
  responseFormat: {
    type: "json_schema";
    schemaName: string;
    jsonSchema: Record<string, unknown>;
  };
  metadata: {
    providerId: string;
    sourceSessionId: string;
  };
}

export interface CompletionResult {
  output: unknown;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface ModelProvider {
  id: string;
  complete(request: CompletionRequest): Promise<CompletionResult>;
}
