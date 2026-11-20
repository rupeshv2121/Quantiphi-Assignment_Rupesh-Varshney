import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  listConversations,
  createConversation,
  loadConversation,
  deleteConversation,
  streamConversationMessage,
  type AssistantTone,
  type ChatMessage,
  type ConversationSummary,
} from "@/lib/chat-api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Moon,
  Sun,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Loader2,
  Bot,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  component: Index,
});

// ---------------------------------------------------------------------------
// Dark-mode helpers
// ---------------------------------------------------------------------------

function useDarkMode() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("nexa-dark-mode");
    if (stored !== null) {
      setDark(stored === "true");
    } else {
      setDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("nexa-dark-mode", String(dark));
  }, [dark]);

  return [dark, setDark] as const;
}

// ---------------------------------------------------------------------------
// Timestamp formatter
// ---------------------------------------------------------------------------

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Copy-to-clipboard hook
// ---------------------------------------------------------------------------

function useCopyToClipboard() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const copy = useCallback((text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
  }, []);

  return { copiedId, copy };
}

// ---------------------------------------------------------------------------
// Shimmer / streaming indicator
// ---------------------------------------------------------------------------

function StreamingIndicator() {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground text-xs py-1">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      <span
        className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse"
        style={{ animationDelay: "0.2s" }}
      />
      <span
        className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse"
        style={{ animationDelay: "0.4s" }}
      />
      <span className="ml-1">Thinking…</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function Index() {
  const queryClient = useQueryClient();
  const [dark, setDark] = useDarkMode();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tone, setTone] = useState<AssistantTone>("professional");
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { copiedId, copy } = useCopyToClipboard();

  // ---- Data queries ----

  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: listConversations,
    refetchInterval: 30_000,
  });

  const conversationDetailQuery = useQuery({
    queryKey: ["conversation", activeId],
    queryFn: () => loadConversation(activeId!),
    enabled: activeId !== null,
  });

  // Sync messages from loaded conversation
  useEffect(() => {
    if (conversationDetailQuery.data?.messages) {
      setMessages(conversationDetailQuery.data.messages);
    }
  }, [conversationDetailQuery.data]);

  // Sync tone from loaded conversation
  useEffect(() => {
    if (conversationDetailQuery.data?.tone) {
      setTone(conversationDetailQuery.data.tone);
    }
  }, [conversationDetailQuery.data]);

  // ---- Mutations ----

  const createMutation = useMutation({
    mutationFn: (t: AssistantTone) => createConversation(t),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setActiveId(data.id);
      setMessages(data.messages ?? []);
      setTone(data.tone);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
    },
  });

  // ---- Auto-scroll ----

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // ---- Send / stream handler ----

  const sendMessage = useCallback(
    async (regenerate = false) => {
      if (!activeId) return;
      if (!regenerate && !inputValue.trim()) return;

      const prompt = regenerate ? undefined : inputValue.trim();

      if (!regenerate && prompt) {
        const userMsg: ChatMessage = {
          id: `temp-${Date.now()}`,
          role: "user",
          content: prompt,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInputValue("");
      }

      setIsStreaming(true);
      setStreamingText("");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamConversationMessage({
          conversationId: activeId,
          prompt,
          tone,
          regenerate,
          signal: controller.signal,
          onDelta: (text) => {
            setStreamingText((prev) => prev + text);
          },
        });
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error("Streaming error:", err);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        // Reload conversation to get the final persisted messages
        void queryClient.invalidateQueries({
          queryKey: ["conversation", activeId],
        });
        void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        setStreamingText("");
      }
    },
    [activeId, inputValue, tone, queryClient],
  );

  // ---- Keyboard handling ----

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && inputValue.trim()) {
        void sendMessage(false);
      }
    }
  };

  // ---- Select conversation ----

  const selectConversation = (conv: ConversationSummary) => {
    if (activeId === conv.id) return;
    setActiveId(conv.id);
  };

  // ---- Sorted conversations ----

  const sortedConversations = [
    ...(conversationsQuery.data ?? []),
  ].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen bg-background text-foreground">
        {/* ========== SIDEBAR ========== */}
        <aside
          className={cn(
            "flex flex-col border-r border-border bg-muted/30 transition-all duration-200",
            sidebarOpen ? "w-72" : "w-0 overflow-hidden",
          )}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">Nexa AI</span>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setDark((d) => !d)}
                  >
                    {dark ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {dark ? "Light mode" : "Dark mode"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Close sidebar</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* New chat button */}
          <div className="p-3">
            <Button
              className="w-full justify-start gap-2"
              onClick={() => createMutation.mutate(tone)}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              New Chat
            </Button>
          </div>

          {/* Conversation list */}
          <ScrollArea className="flex-1">
            <div className="px-2 pb-2 space-y-1">
              {conversationsQuery.isLoading && (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading…
                </div>
              )}
              {sortedConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer text-sm transition-colors",
                    activeId === conv.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-foreground",
                  )}
                  onClick={() => selectConversation(conv)}
                >
                  <MessageSquare className="h-4 w-4 shrink-0 opacity-60" />
                  <span className="flex-1 truncate">
                    {conv.title || "Untitled"}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(conv.id);
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </div>
              ))}
              {!conversationsQuery.isLoading &&
                sortedConversations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    No conversations yet.
                    <br />
                    Click "New Chat" to start.
                  </div>
                )}
            </div>
          </ScrollArea>
        </aside>

        {/* ========== MAIN CHAT AREA ========== */}
        <main className="flex flex-1 flex-col min-w-0">
          {/* Top bar */}
          <header className="flex items-center gap-2 border-b border-border px-4 py-2 shrink-0">
            {!sidebarOpen && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <PanelLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open sidebar</TooltipContent>
              </Tooltip>
            )}

            {!sidebarOpen && (
              <div className="flex items-center gap-2 mr-2">
                <Bot className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">Nexa AI</span>
              </div>
            )}

            {/* Tone selector */}
            {activeId && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Vibe:</span>
                <Select
                  value={tone}
                  onValueChange={(v) => setTone(v as AssistantTone)}
                >
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">
                      💼 Professional
                    </SelectItem>
                    <SelectItem value="casual">😊 Casual</SelectItem>
                    <SelectItem value="concise">⚡ Concise</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="secondary" className="text-[10px]">
                  Vibe Check
                </Badge>
              </div>
            )}

            <div className="flex-1" />

            {/* Dark mode toggle (also visible when sidebar closed) */}
            {!sidebarOpen && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDark((d) => !d)}
                  >
                    {dark ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {dark ? "Light mode" : "Dark mode"}
                </TooltipContent>
              </Tooltip>
            )}
          </header>

          {/* Messages area */}
          {!activeId ? (
            /* ---- Empty state ---- */
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center space-y-4 max-w-sm px-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Welcome to Nexa AI</h2>
                <p className="text-sm text-muted-foreground">
                  Start a new conversation to chat with the AI assistant. Choose
                  your preferred tone and start typing!
                </p>
                <Button
                  onClick={() => createMutation.mutate(tone)}
                  disabled={createMutation.isPending}
                  className="gap-2"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Start New Chat
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* ---- Scrollable messages ---- */}
              <ScrollArea className="flex-1">
                <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
                  {conversationDetailQuery.isLoading && (
                    <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading messages…
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-3",
                        msg.role === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Bot className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}

                      <div
                        className={cn(
                          "group relative max-w-[80%] rounded-2xl px-4 py-2.5",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md",
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                        <div
                          className={cn(
                            "mt-1 flex items-center gap-2 text-[10px]",
                            msg.role === "user"
                              ? "text-primary-foreground/60 justify-end"
                              : "text-muted-foreground",
                          )}
                        >
                          <span>{formatTime(msg.createdAt)}</span>
                        </div>

                        {/* Action buttons for assistant messages */}
                        {msg.role === "assistant" && (
                          <div className="absolute -bottom-3 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6 bg-background shadow-sm"
                                  onClick={() => copy(msg.content, msg.id)}
                                >
                                  {copiedId === msg.id ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {copiedId === msg.id ? "Copied!" : "Copy"}
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6 bg-background shadow-sm"
                                  onClick={() => void sendMessage(true)}
                                  disabled={isStreaming}
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Regenerate</TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </div>

                      {msg.role === "user" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Streaming assistant message */}
                  {isStreaming && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted text-foreground px-4 py-2.5">
                        {streamingText ? (
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {streamingText}
                            <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                          </p>
                        ) : (
                          <StreamingIndicator />
                        )}
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* ---- Input area ---- */}
              <div className="border-t border-border p-4 shrink-0">
                <div className="max-w-3xl mx-auto flex gap-2 items-end">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Type a message… (Shift+Enter for newline)"
                    className="min-h-[44px] max-h-[160px] resize-none flex-1"
                    rows={1}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isStreaming}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        className="h-[44px] w-[44px] shrink-0"
                        disabled={
                          isStreaming || !inputValue.trim() || !activeId
                        }
                        onClick={() => void sendMessage(false)}
                      >
                        {isStreaming ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Send message</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}
