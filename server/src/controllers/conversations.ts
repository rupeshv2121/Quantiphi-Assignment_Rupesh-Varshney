import type { Request, Response } from "express";
import mongoose from "mongoose";

import { Conversation } from "../models/conversation.js";
import { streamAssistantReply, type PromptTurn } from "../services/groq.js";
import { isAssistantTone, type AssistantTone } from "../services/tone.js";

function validId(value: string | string[] | undefined): boolean {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

function getTone(value: unknown, fallback: AssistantTone): AssistantTone {
  return isAssistantTone(value) ? value : fallback;
}

function getText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 100_000
    ? value.trim()
    : null;
}

export async function listConversations(_request: Request, response: Response): Promise<void> {
  const conversations = await Conversation.find()
    .sort({ updatedAt: -1 })
    .select("title tone createdAt updatedAt")
    .lean();
  response.json(
    conversations.map((conversation) => ({
      id: conversation._id.toString(),
      title: conversation.title,
      tone: conversation.tone,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    })),
  );
}

export async function createConversation(request: Request, response: Response): Promise<void> {
  const tone = getTone(request.body?.tone, "professional");
  const conversation = await Conversation.create({ title: "New chat", tone, messages: [] });
  response.status(201).json({
    id: conversation.id,
    title: conversation.title,
    tone: conversation.tone,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messages: [],
  });
}

export async function getConversation(request: Request, response: Response): Promise<void> {
  if (!validId(request.params.id ?? "")) {
    response.status(400).json({ error: "That conversation ID is not valid." });
    return;
  }
  const conversation = await Conversation.findById(request.params.id);
  if (!conversation) {
    response.status(404).json({ error: "Conversation not found." });
    return;
  }
  response.json({
    id: conversation.id,
    title: conversation.title,
    tone: conversation.tone,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messages: conversation.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
  });
}

export async function deleteConversation(request: Request, response: Response): Promise<void> {
  if (!validId(request.params.id ?? "")) {
    response.status(400).json({ error: "That conversation ID is not valid." });
    return;
  }
  const deleted = await Conversation.findByIdAndDelete(request.params.id);
  if (!deleted) {
    response.status(404).json({ error: "Conversation not found." });
    return;
  }
  response.status(204).end();
}

async function streamReply(
  request: Request,
  response: Response,
  regenerate: boolean,
): Promise<void> {
  if (!validId(request.params.id ?? "")) {
    response.status(400).json({ error: "That conversation ID is not valid." });
    return;
  }

  const conversation = await Conversation.findById(request.params.id);
  if (!conversation) {
    response.status(404).json({ error: "Conversation not found." });
    return;
  }

  const prompt = getText(request.body?.prompt);
  if (!regenerate && !prompt) {
    response.status(400).json({ error: "Enter a message before sending." });
    return;
  }
  const tone = getTone(request.body?.tone, conversation.tone);
  conversation.tone = tone;

  if (regenerate) {
    const latestMessage = conversation.messages.at(-1);
    if (latestMessage?.role === "assistant") conversation.messages.pop();
    if (conversation.messages.at(-1)?.role !== "user") {
      response.status(400).json({ error: "There is no latest user message to regenerate." });
      return;
    }
  } else if (prompt) {
    if (conversation.messages.length === 0) conversation.title = prompt.slice(0, 72);
    conversation.messages.push({ role: "user", content: prompt });
  }

  const turns: PromptTurn[] = conversation.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  await conversation.save();

  response.status(200);
  response.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.flushHeaders();

  const controller = new AbortController();
  response.on("close", () => {
    if (!response.writableEnded) controller.abort();
  });

  let assistantContent = "";
  try {
    for await (const text of streamAssistantReply(turns, tone, controller.signal)) {
      assistantContent += text;
      response.write(`data: ${JSON.stringify({ type: "delta", text })}\n\n`);
    }
    if (controller.signal.aborted) return;
    if (!assistantContent.trim()) throw new Error("The AI returned an empty response.");

    conversation.messages.push({ role: "assistant", content: assistantContent });
    await conversation.save();
    response.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    response.end();
  } catch (error) {
    if (controller.signal.aborted) return;
    const message = error instanceof Error ? error.message : "The AI response could not be completed.";
    console.error("Groq stream failed:", error);
    response.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
    response.end();
  }
}

export async function sendMessage(request: Request, response: Response): Promise<void> {
  await streamReply(request, response, false);
}

export async function regenerateResponse(request: Request, response: Response): Promise<void> {
  await streamReply(request, response, true);
}