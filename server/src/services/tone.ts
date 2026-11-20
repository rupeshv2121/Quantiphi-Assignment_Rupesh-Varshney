export const assistantTones = ["professional", "casual", "concise"] as const;

export type AssistantTone = (typeof assistantTones)[number];

const toneInstructions: Record<AssistantTone, string> = {
  professional: "Use a professional tone. Be clear, respectful, and precise.",
  casual:
    "Use a casual, friendly tone. Keep the conversation natural and approachable.",
  concise:
    "Use a concise tone. Prioritize the essential information and avoid unnecessary detail.",
};

export function getToneInstruction(tone: AssistantTone): string {
  return toneInstructions[tone];
}

export function isAssistantTone(value: unknown): value is AssistantTone {
  return typeof value === "string" && assistantTones.some((tone) => tone === value);
}