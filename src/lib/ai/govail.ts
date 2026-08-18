import type { GoVailChatResult } from "@/lib/ai/types";

export interface ChatMessage {
  role: "system" | "developer" | "user";
  content: string;
}

const DEFAULT_BASE_URL = "https://api.govail.cloud/v1";
const DEFAULT_MODEL = "worker";
const DEFAULT_TIMEOUT_MS = 25_000;

export function govailConfig() {
  const baseUrl = (process.env.GOVAIL_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const apiKey = process.env.GOVAIL_API_KEY ?? "";
  const model = process.env.GOVAIL_MODEL || DEFAULT_MODEL;
  const timeoutMs = Number(process.env.GOVAIL_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return { baseUrl, apiKey, model, timeoutMs };
}

function toOpenAiMessages(messages: ChatMessage[]) {
  return messages.map((message) =>
    message.role === "developer"
      ? { role: "system" as const, content: message.content }
      : { role: message.role, content: message.content },
  );
}

export async function govailChat(messages: ChatMessage[]): Promise<GoVailChatResult> {
  const { baseUrl, apiKey, model, timeoutMs } = govailConfig();
  if (!apiKey) {
    throw new GoVailError("GoVail is not configured", 500, "CONFIG");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 900,
        reasoning_effort: "none",
        chat_template_kwargs: { enable_thinking: false },
        messages: toOpenAiMessages(messages),
      }),
      signal: controller.signal,
    });

    const raw = await response.text();
    let payload: Record<string, unknown>;
    try {
      payload = parseJsonLenient(raw) as Record<string, unknown>;
    } catch {
      throw new GoVailError("GoVail returned a non-JSON body", 502, "UPSTREAM");
    }

    if (!response.ok) {
      const error = payload.error as { message?: string; code?: string } | undefined;
      throw new GoVailError(error?.message || `GoVail HTTP ${response.status}`, response.status, "UPSTREAM");
    }

    const choices = payload.choices as Array<{ message?: { content?: string; reasoning_content?: string } }> | undefined;
    const message = choices?.[0]?.message;
    const content = (message?.content || "").trim() || (message?.reasoning_content || "").trim();
    const usage = payload.usage as
      | { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
      | undefined;

    return {
      content,
      model: typeof payload.model === "string" ? payload.model : model,
      usage: usage
        ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          }
        : undefined,
    };
  } catch (error) {
    if (error instanceof GoVailError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new GoVailError("GoVail timed out", 504, "TIMEOUT");
    }
    throw new GoVailError("GoVail request failed", 502, "UPSTREAM");
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonLenient(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(raw.replace(/[\u0000-\u001F]/g, " "));
  }
}

export class GoVailError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: "CONFIG" | "UPSTREAM" | "TIMEOUT",
  ) {
    super(message);
    this.name = "GoVailError";
  }
}
