import OpenAI from "openai";

import type { AssistantTone } from "./tone.js";
import { getToneInstruction } from "./tone.js";

export type PromptTurn = { role: "user" | "assistant"; content: string };

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured on the server.");
  return new OpenAI({ apiKey });
}

export async function* streamAssistantReply(
  messages: PromptTurn[],
  tone: AssistantTone,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const client = getOpenAIClient();
  const stream = await client.chat.completions.create(
    {
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      stream: true,
      messages: [
        { role: "system", content: getToneInstruction(tone) },
        ...messages,
      ],
    },
    { signal },
  );

  for await (const event of stream) {
    const delta = event.choices[0]?.delta.content;
    if (typeof delta === "string" && delta.length > 0) yield delta;
  }
}