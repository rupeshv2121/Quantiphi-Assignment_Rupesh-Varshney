import { Router } from "express";
import { optionalAuth } from "../middleware/auth.js";

import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  regenerateResponse,
  sendMessage,
} from "../controllers/conversations.js";

const router = Router();
router.use(optionalAuth);

router.get("/", (request, response, next) => {
  void listConversations(request, response).catch(next);
});
router.post("/", (request, response, next) => {
  void createConversation(request, response).catch(next);
});
router.get("/:id", (request, response, next) => {
  void getConversation(request, response).catch(next);
});
router.delete("/:id", (request, response, next) => {
  void deleteConversation(request, response).catch(next);
});
router.post("/:id/messages", (request, response, next) => {
  void sendMessage(request, response).catch(next);
});
router.post("/:id/regenerate", (request, response, next) => {
  void regenerateResponse(request, response).catch(next);
});

export { router as conversationRouter };
