import { z } from "zod";
import { ProviderError } from "./errors.js";
import type { CompletionRequest, CompletionResult, ModelProvider } from "./provider.js";
import { redactSensitiveText } from "./redaction.js";

const DEFAULT_OPENAI_MODEL = "gpt-5.5";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

const OpenAIResponsesBodySchema = z
  .object({
    status: z.string().optional(),
    output_text: z.string().optional(),
    output: z.array(z.unknown()).optional(),
    usage: z
      .object({
        input_tokens: z.number().int().nonnegative().optional(),
        output_tokens: z.number().int().nonnegative().optional(),
        total_tokens: z.number().int().nonnegative().optional(),
      })
      .passthrough()
      .optional(),
    incomplete_details: z
      .object({
        reason: z.string().optional(),
      })
      .passthrough()
      .optional(),
    error: z
      .object({
        message: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const OpenAIMessageSchema = z
  .object({
    type: z.literal("message"),
    content: z.array(z.unknown()),
  })
  .passthrough();

const OpenAIOutputTextSchema = z
  .object({
    type: z.literal("output_text"),
    text: z.string(),
  })
  .passthrough();

const OpenAIRefusalSchema = z
  .object({
    type: z.literal("refusal"),
    refusal: z.string(),
  })
  .passthrough();

export interface OpenAIModelProviderOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class OpenAIModelProvider implements ModelProvider {
  readonly id: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly model: string;

  constructor(options: OpenAIModelProviderOptions) {
    if (options.apiKey.trim().length === 0) {
      throw new ProviderError("OPENAI_API_KEY is required for the OpenAI provider");
    }

    this.apiKey = options.apiKey;
    this.model = options.model ?? DEFAULT_OPENAI_MODEL;
    this.baseUrl = (options.baseUrl ?? DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.id = `openai:${this.model}`;
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env): OpenAIModelProvider {
    const apiKey = env.OPENAI_API_KEY;

    if (apiKey === undefined || apiKey.trim().length === 0) {
      throw new ProviderError("OPENAI_API_KEY is missing. Add it to .env or the environment.");
    }

    const options: OpenAIModelProviderOptions = { apiKey };

    if (env.OPENAI_MODEL !== undefined) {
      options.model = env.OPENAI_MODEL;
    }

    if (env.OPENAI_BASE_URL !== undefined) {
      options.baseUrl = env.OPENAI_BASE_URL;
    }

    return new OpenAIModelProvider(options);
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const response = await this.fetchImpl(`${this.baseUrl}/responses`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input: [
          { role: "system", content: request.system },
          { role: "user", content: request.input },
        ],
        text: {
          format: {
            type: "json_schema",
            name: request.responseFormat.schemaName,
            strict: true,
            schema: request.responseFormat.jsonSchema,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = redactSensitiveText(await response.text()).text;
      throw new ProviderError(
        `OpenAI request failed with HTTP ${response.status}: ${truncate(errorText)}`,
      );
    }

    const rawResponse: unknown = await response.json();
    const parsedResponse = OpenAIResponsesBodySchema.safeParse(rawResponse);

    if (!parsedResponse.success) {
      throw new ProviderError("OpenAI response did not match the expected Responses API shape", {
        cause: parsedResponse.error,
      });
    }

    const outputText = extractOutputText(parsedResponse.data);
    const output = parseJsonOutput(outputText);
    const usage = parseUsage(parsedResponse.data.usage);

    return {
      output,
      ...(usage === undefined ? {} : { usage }),
    };
  }
}

function extractOutputText(response: z.infer<typeof OpenAIResponsesBodySchema>): string {
  if (response.status === "incomplete") {
    throw new ProviderError(
      `OpenAI response was incomplete: ${response.incomplete_details?.reason ?? "unknown reason"}`,
    );
  }

  if (response.error?.message !== undefined) {
    throw new ProviderError(`OpenAI returned an error: ${truncate(response.error.message)}`);
  }

  if (response.output_text !== undefined && response.output_text.trim().length > 0) {
    return response.output_text;
  }

  for (const item of response.output ?? []) {
    const message = OpenAIMessageSchema.safeParse(item);

    if (!message.success) {
      continue;
    }

    for (const content of message.data.content) {
      const refusal = OpenAIRefusalSchema.safeParse(content);

      if (refusal.success) {
        throw new ProviderError(`OpenAI refused the request: ${truncate(refusal.data.refusal)}`);
      }

      const outputText = OpenAIOutputTextSchema.safeParse(content);

      if (outputText.success) {
        return outputText.data.text;
      }
    }
  }

  throw new ProviderError("OpenAI response did not contain output text");
}

function parseJsonOutput(outputText: string): unknown {
  try {
    return JSON.parse(outputText) as unknown;
  } catch (error) {
    throw new ProviderError("OpenAI response output was not valid JSON", { cause: error });
  }
}

function parseUsage(
  usage: z.infer<typeof OpenAIResponsesBodySchema>["usage"],
): CompletionResult["usage"] {
  if (usage === undefined) {
    return undefined;
  }

  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    totalTokens: usage.total_tokens ?? (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
  };
}

function truncate(value: string): string {
  return value.length > 500 ? `${value.slice(0, 500)}...` : value;
}
