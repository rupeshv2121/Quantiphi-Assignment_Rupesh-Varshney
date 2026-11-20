import { Schema, model, type InferSchemaType } from "mongoose";

const messageSchema = new Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: { type: String, required: true, maxlength: 100_000 },
  },
  { timestamps: true },
);

const conversationSchema = new Schema(
  {
    userId: { type: String, required: true, default: "anonymous", index: true },
    title: { type: String, required: true, maxlength: 120, default: "New chat" },
    tone: {
      type: String,
      enum: ["professional", "casual", "concise"],
      required: true,
      default: "professional",
    },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true },
);

export type ConversationRecord = InferSchemaType<typeof conversationSchema>;
export const Conversation = model("Conversation", conversationSchema);
