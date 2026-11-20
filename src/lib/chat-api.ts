export type AssistantTone = "professional" | "casual" | "concise";
export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  tone: AssistantTone;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

const apiBaseUrl = (import.meta.env.VITE_API_URL?.trim() || "http://localhost:4000").replace(/\/$/, "");

async function responseError(response: Response): Promise<Error> {
  try {
    const payload: unknown = await response.json();
    if (
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
    ) {
      return new Error(payload.error);
    }
  } catch {
    // Use the status-based message below when the response is not JSON.
  }
  return new Error(`The chat service returned ${response.status}.`);
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const response = await fetch(`${apiBaseUrl}/api/conversations`);
  if (!response.ok) throw await responseError(response);
  return (await response.json()) as ConversationSummary[];
}

export async function createConversation(
  tone: AssistantTone,
): Promise<ConversationSummary> {
  const response = await fetch(`${apiBaseUrl}/api/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tone }),
  });
  if (!response.ok) throw await responseError(response);
  return (await response.json()) as ConversationSummary;
}

export async function loadConversation(id: string): Promise<ConversationSummary> {
  const response = await fetch(`${apiBaseUrl}/api/conversations/${encodeURIComponent(id)}`);
  if (!response.ok) throw await responseError(response);
  return (await response.json()) as ConversationSummary;
}

export async function deleteConversation(id: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/conversations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw await responseError(response);
}

export async function streamConversationMessage(options: {
  conversationId: string;
  prompt?: string;
  tone: AssistantTone;
  regenerate?: boolean;
  signal: AbortSignal;
  onDelta: (text: string) => void;
}): Promise<void> {
  const response = await fetch(
    `${apiBaseUrl}/api/conversations/${encodeURIComponent(options.conversationId)}/${options.regenerate ? "regenerate" : "messages"}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ prompt: options.prompt, tone: options.tone }),
      signal: options.signal,
    },
  );

  if (!response.ok) throw await responseError(response);
  if (!response.body) throw new Error("The chat service did not start a response stream.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;

  const handleFrame = (frame: string) => {
    const dataLine = frame.split(/\r?\n/).find((line) => line.startsWith("data: "));
    if (!dataLine) return;
    const event: unknown = JSON.parse(dataLine.slice(6));
    if (typeof event !== "object" || event === null || !("type" in event)) return;
    if (event.type === "delta" && "text" in event && typeof event.text === "string") {
      options.onDelta(event.text);
    } else if (event.type === "error" && "message" in event && typeof event.message === "string") {
      throw new Error(event.message);
    } else if (event.type === "done") {
      completed = true;
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? "";
      for (const frame of frames) handleFrame(frame);
      if (done) break;
    }
    if (buffer.trim()) handleFrame(buffer);
    if (!completed && !options.signal.aborted) {
      throw new Error("The chat response ended before it was complete.");
    }
  } finally {
    reader.releaseLock();
  }
}