import Groq from "groq-sdk";

import type { AssistantTone } from "./tone.js";
import { getToneInstruction } from "./tone.js";

export type PromptTurn = { role: "user" | "assistant"; content: string };

export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured on the server.");
  return new Groq({ apiKey });
}

export async function* streamAssistantReply(
  messages: PromptTurn[],
  tone: AssistantTone,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const client = getGroqClient();
  const stream = await client.chat.completions.create(
    {
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
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