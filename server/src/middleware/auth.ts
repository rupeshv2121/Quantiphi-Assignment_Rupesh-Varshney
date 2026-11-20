import type { Request, Response, NextFunction } from "express";
import { verifyAuthToken } from "../models/user.js";

export interface AuthenticatedUser {
  id: string;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function requireAuth(request: Request, response: Response, next: NextFunction): void {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    response.status(401).json({ error: "Authentication required. Please sign in." });
    return;
  }

  const token = authHeader.slice(7).trim();
  const payload = verifyAuthToken(token);
  if (!payload) {
    response.status(401).json({ error: "Session expired or invalid. Please sign in again." });
    return;
  }

  request.user = { id: payload.userId, username: payload.username };
  next();
}

export function optionalAuth(request: Request, _response: Response, next: NextFunction): void {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const payload = verifyAuthToken(token);
    if (payload) {
      request.user = { id: payload.userId, username: payload.username };
    }
  }
  next();
}
