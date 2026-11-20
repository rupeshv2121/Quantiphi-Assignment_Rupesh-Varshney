import "dotenv/config";

import cors from "cors";
import express from "express";
import mongoose from "mongoose";

import { conversationRouter } from "./routes/conversations.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:8080,http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});
app.use("/api/conversations", conversationRouter);
app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error("API request failed:", error);
  if (response.headersSent) {
    response.end();
    return;
  }
  response.status(500).json({ error: "The chat service could not complete that request." });
});

async function start(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is required. Copy server/.env.example to server/.env and configure it.");

  await mongoose.connect(mongoUri);
  app.listen(port, () => {
    console.info(`Nexa AI API ready at http://localhost:${port}`);
  });
}

start().catch((error: unknown) => {
  console.error("Could not start Nexa AI API:", error);
  process.exitCode = 1;
});