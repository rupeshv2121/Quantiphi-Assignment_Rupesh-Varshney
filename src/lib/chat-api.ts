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

export interface AuthUser {
  id: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

const apiBaseUrl = (
  import.meta.env.VITE_API_URL?.trim() ||
  (import.meta.env.PROD ? "" : "http://localhost:4000")
).replace(/\/$/, "");

const TOKEN_KEY = "nexa_auth_token";
const USER_KEY = "nexa_auth_user";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function saveAuth(auth: AuthResponse): void {
  localStorage.setItem(TOKEN_KEY, auth.token);
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

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

export async function registerUser(username: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw await responseError(response);
  const data = (await response.json()) as AuthResponse;
  saveAuth(data);
  return data;
}

export async function loginUser(username: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw await responseError(response);
  const data = (await response.json()) as AuthResponse;
  saveAuth(data);
  return data;
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const response = await fetch(`${apiBaseUrl}/api/conversations`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw await responseError(response);
  return (await response.json()) as ConversationSummary[];
}

export async function createConversation(
  tone: AssistantTone,
): Promise<ConversationSummary> {
  const response = await fetch(`${apiBaseUrl}/api/conversations`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ tone }),
  });
  if (!response.ok) throw await responseError(response);
  return (await response.json()) as ConversationSummary;
}

export async function loadConversation(id: string): Promise<ConversationSummary> {
  const response = await fetch(`${apiBaseUrl}/api/conversations/${encodeURIComponent(id)}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw await responseError(response);
  return (await response.json()) as ConversationSummary;
}

export async function deleteConversation(id: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/conversations/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
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
  const headers = getAuthHeaders();
  headers["Accept"] = "text/event-stream";

  const response = await fetch(
    `${apiBaseUrl}/api/conversations/${encodeURIComponent(options.conversationId)}/${options.regenerate ? "regenerate" : "messages"}`,
    {
      method: "POST",
      headers,
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
